// Re-exportar todo para mantener compatibilidad con imports existentes
// No incluye 'use server' — cada módulo individual lo declara

export type { ActionResult } from './auth'

export { getCommissionLines, updateCommissionLineStatus, applyDecomission } from './lines'

export { getEnergyCompanies, createEnergyCompany, updateEnergyCompany } from './companies'

export { getEnergyProducts, createEnergyProduct, updateEnergyProduct } from './products'

export {
  getCommissionRates, updateCommissionRate, createCommissionRate,
  deleteCommissionRate, getCommissionRatesForCompany,
} from './rates'

export {
  getFormulaConfigs, upsertFormulaConfig, getFormulaFeeOptions,
  getFeeOptionsForProduct, saveFeeOptions,
} from './formula'

export { getCommissionTiers, upsertCommissionTier } from './tiers'

export { getUserOverrides, setUserOverride } from './overrides'

export { calculateContractCommissions } from './calculation'

export { processCommissionExcelUpload, getCommissionUploads } from './excel-upload'
