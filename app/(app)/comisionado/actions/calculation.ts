'use server'

import { revalidatePath } from 'next/cache'
import { getAdminClient } from '@/lib/supabase/admin'
import type { ActionResult } from './auth'
import type { CommissionModel } from '@/lib/types'

interface CalcResult extends ActionResult {
  gross_commission?: number
  gnew_margin?: number
  payout_partner_base?: number
}

interface HierarchyUser {
  id: string
  parent_id: string | null
  tier_name: string | null
  tier_rate_pct: number | null
}

export async function calculateContractCommissions(contractId: string): Promise<CalcResult> {
  const admin = getAdminClient()

  const { data: contract } = await admin
    .from('contracts')
    .select('*')
    .eq('id', contractId)
    .single()

  if (!contract) return { ok: false, error: 'Contrato no encontrado.' }

  const companyId = contract.energy_company_id as number | null
  const productId = contract.energy_product_id as number | null

  if (!companyId || !productId) {
    return { ok: false, error: 'Faltan comercializadora o producto energetico.' }
  }

  const { data: company } = await admin
    .from('energy_companies')
    .select('*')
    .eq('id', companyId)
    .single()

  if (!company) return { ok: false, error: 'Comercializadora no encontrada.' }

  const model = company.commission_model as CommissionModel
  const tarifa = contract.tarifa as string | null
  const consumoAnual = Number(contract.consumo_anual ?? 0)

  let grossCommission = 0
  let commissionGnew = 0
  let payoutPartnerBase = 0

  // PASO 1: COMISION BRUTA
  if (model === 'table') {
    if (!tarifa || !consumoAnual) {
      return { ok: false, error: 'Faltan tarifa o consumo anual para modelo tabla.' }
    }

    const { data: rate } = await admin
      .from('commission_rates')
      .select('gross_amount')
      .eq('product_id', productId)
      .eq('tariff', tarifa)
      .lte('consumption_min', consumoAnual)
      .gte('consumption_max', consumoAnual)
      .limit(1)
      .maybeSingle()

    if (!rate) {
      return { ok: false, error: `No hay comision para producto ${productId}, tarifa ${tarifa}, consumo ${consumoAnual}.` }
    }

    grossCommission = Number(rate.gross_amount)

  } else if (model === 'formula') {
    const { data: config } = await admin
      .from('formula_configs')
      .select('*')
      .eq('product_id', productId)
      .maybeSingle()

    if (!config) {
      return { ok: false, error: 'Producto sin configuracion de formula.' }
    }

    const feeEne = Number(contract.selected_fee_energia ?? config.fee_energia ?? 0)
    const feePot = Number(contract.selected_fee_potencia ?? config.fee_potencia ?? 0)
    const mi = Number(config.margen_intermediacion ?? 0)
    const factorEnergia = Number(config.factor_energia ?? 1)
    const factorPotencia = Number(config.factor_potencia ?? 1)
    const comServicio = Number(config.comision_servicio ?? 0)
    const pricingType = config.pricing_type as string

    let comEnergia: number
    if (pricingType === 'fijo') {
      comEnergia = consumoAnual * Number(config.fee_energia_fijo ?? 0)
    } else {
      comEnergia = consumoAnual * (feeEne + mi)
    }

    let comPotencia = 0
    const calcMethod = config.potencia_calc_method as string

    if (calcMethod === 'sum_periods') {
      const potencias = [
        contract.potencia_1, contract.potencia_2, contract.potencia_3,
        contract.potencia_4, contract.potencia_5, contract.potencia_6,
      ]
      for (const p of potencias) {
        if (p != null) {
          comPotencia += Number(p) * feePot
        }
      }
    } else {
      comPotencia = Number(contract.media_potencia ?? 0) * feePot
    }

    const comEnergiaAjustada = comEnergia * factorEnergia
    const comPotenciaAjustada = comPotencia * factorPotencia

    grossCommission = comPotenciaAjustada + comEnergiaAjustada + comServicio
  }

  grossCommission = Math.round(grossCommission * 100) / 100

  // PASO 2: commission_gnew, payout, gnew_margin
  let gnewMargin = 0

  if (model === 'table') {
    commissionGnew = grossCommission
    const gnewMarginPct = Number(company.gnew_margin_pct ?? 0)
    gnewMargin = Math.round(grossCommission * gnewMarginPct * 100) / 100
    payoutPartnerBase = Math.round((grossCommission - gnewMargin) * 100) / 100
  } else {
    commissionGnew = grossCommission

    if (!tarifa || !consumoAnual) {
      return { ok: false, error: 'Faltan tarifa o consumo anual para calcular payout.' }
    }

    const { data: payoutRate } = await admin
      .from('commission_rates')
      .select('gross_amount')
      .eq('product_id', productId)
      .eq('tariff', tarifa)
      .lte('consumption_min', consumoAnual)
      .gte('consumption_max', consumoAnual)
      .limit(1)
      .maybeSingle()

    if (!payoutRate) {
      return { ok: false, error: `No hay tabla de payout definida para producto ${productId}, tarifa ${tarifa}, rango ${consumoAnual} kWh. Configure commission_rates para este producto.` }
    }

    payoutPartnerBase = Number(payoutRate.gross_amount)
    gnewMargin = Math.round((commissionGnew - payoutPartnerBase) * 100) / 100
  }

  // PASO 3: GUARDAR EN CONTRATO
  await admin
    .from('contracts')
    .update({
      gross_commission: grossCommission,
      commission_gnew: commissionGnew,
      gnew_margin: gnewMargin,
      payout_partner_base: payoutPartnerBase,
      status_commission_gnew: model === 'table' ? 'cargada_excel' : 'calculada_formula',
    })
    .eq('id', contractId)

  // PASO 4: COMISIONES DE LA RED
  await calculateNetworkCommissions(admin, contractId, contract.owner_id as string, payoutPartnerBase, commissionGnew)

  revalidatePath('/comisionado')
  revalidatePath(`/contratos/${contractId}`)
  return { ok: true, gross_commission: grossCommission, gnew_margin: commissionGnew, payout_partner_base: payoutPartnerBase }
}

async function calculateNetworkCommissions(
  admin: ReturnType<typeof getAdminClient>,
  contractId: string,
  ownerId: string,
  payoutPartnerBase: number,
  _commissionGnew: number // eslint-disable-line @typescript-eslint/no-unused-vars
): Promise<void> {
  await admin
    .from('contract_commissions')
    .delete()
    .eq('contract_id', contractId)

  const chain = await getHierarchyChain(admin, ownerId)
  if (chain.length === 0) return

  const { data: contract } = await admin
    .from('contracts')
    .select('energy_product_id')
    .eq('id', contractId)
    .single()

  const productId = contract?.energy_product_id as number | null

  // Batch-fetch overrides para toda la cadena
  const userIds = chain.map(u => u.id)
  const { data: allOverrides } = await admin
    .from('user_commission_overrides')
    .select('user_id, product_id, override_type, override_value')
    .in('user_id', userIds)

  const overridesMap = new Map<string, Array<{ product_id: number | null; override_type: string; override_value: number }>>()
  for (const ov of allOverrides ?? []) {
    const key = ov.user_id as string
    if (!overridesMap.has(key)) overridesMap.set(key, [])
    overridesMap.get(key)!.push({
      product_id: ov.product_id as number | null,
      override_type: ov.override_type as string,
      override_value: ov.override_value as number,
    })
  }

  let comisionNivelInferior: number | null = null

  for (let i = 0; i < chain.length; i++) {
    const user = chain[i]
    const comisionEfectiva = calculateUserCommissionFromMap(
      user.id, productId, payoutPartnerBase, user.tier_rate_pct, overridesMap
    )

    if (i === 0) {
      await admin.from('contract_commissions').insert({
        contract_id: contractId,
        user_id: user.id,
        commission_paid: Math.round(comisionEfectiva * 100) / 100,
        tier_name: user.tier_name,
        rate_applied: user.tier_rate_pct,
        is_differential: false,
      })
      comisionNivelInferior = comisionEfectiva
    } else {
      const diferencial = comisionEfectiva - (comisionNivelInferior ?? 0)
      if (diferencial > 0) {
        await admin.from('contract_commissions').insert({
          contract_id: contractId,
          user_id: user.id,
          commission_paid: Math.round(diferencial * 100) / 100,
          tier_name: user.tier_name,
          rate_applied: user.tier_rate_pct,
          is_differential: true,
          differential_from_user_id: chain[i - 1].id,
        })
      }
      comisionNivelInferior = comisionEfectiva
    }
  }

  const { data: allCommissions } = await admin
    .from('contract_commissions')
    .select('commission_paid')
    .eq('contract_id', contractId)

  const totalPaid = (allCommissions ?? []).reduce((sum, c) => sum + Number(c.commission_paid), 0)

  await admin
    .from('contracts')
    .update({ decomission_gnew: Math.round(totalPaid * 100) / 100 })
    .eq('id', contractId)
}

async function getHierarchyChain(
  admin: ReturnType<typeof getAdminClient>,
  userId: string
): Promise<HierarchyUser[]> {
  const chain: HierarchyUser[] = []
  let currentId: string | null = userId
  const visited = new Set<string>()

  while (currentId && !visited.has(currentId)) {
    visited.add(currentId)

    const { data: profile } = await admin
      .from('profiles')
      .select('id, parent_id, commission_tier_id')
      .eq('id', currentId)
      .single()

    if (!profile) break

    let tierName: string | null = null
    let tierRate: number | null = null

    if (profile.commission_tier_id) {
      const { data: tier } = await admin
        .from('commission_tiers')
        .select('name, rate_pct')
        .eq('id', profile.commission_tier_id)
        .single()

      if (tier) {
        tierName = tier.name as string
        tierRate = tier.rate_pct as number | null
      }
    }

    chain.push({
      id: profile.id as string,
      parent_id: profile.parent_id as string | null,
      tier_name: tierName,
      tier_rate_pct: tierRate,
    })

    currentId = profile.parent_id as string | null
  }

  return chain
}

function calculateUserCommissionFromMap(
  userId: string,
  productId: number | null,
  payoutPartnerBase: number,
  tierRate: number | null,
  overridesMap: Map<string, Array<{ product_id: number | null; override_type: string; override_value: number }>>
): number {
  const userOverrides = overridesMap.get(userId) ?? []

  if (productId) {
    const specificOverride = userOverrides.find(o => o.product_id === productId)
    if (specificOverride) {
      if (specificOverride.override_type === 'fixed') return Number(specificOverride.override_value)
      return payoutPartnerBase * Number(specificOverride.override_value)
    }

    const globalOverride = userOverrides.find(o => o.product_id === null)
    if (globalOverride) {
      if (globalOverride.override_type === 'fixed') return Number(globalOverride.override_value)
      return payoutPartnerBase * Number(globalOverride.override_value)
    }
  }

  if (tierRate !== null) {
    return payoutPartnerBase * tierRate
  }

  return 0
}
