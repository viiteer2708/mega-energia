import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { getProducts, getAssignableUsers, getEnergyCompaniesForForm, getEnergyProductsForForm } from '../actions'
import { ContratoForm } from '@/components/contratos/ContratoForm'

export default async function NuevoContratoPage() {
  const user = await getSession()
  if (!user) redirect('/login')

  const isAdminOrBo = user.role === 'ADMIN' || user.role === 'BACKOFFICE'

  const [products, assignableUsers, energyCompanies, energyProducts] = await Promise.all([
    getProducts(),
    isAdminOrBo ? getAssignableUsers() : Promise.resolve(undefined),
    getEnergyCompaniesForForm(),
    getEnergyProductsForForm(),
  ])

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-6 text-2xl font-bold text-foreground">Nuevo Contrato</h1>
      <ContratoForm
        mode="create"
        user={user}
        products={products}
        energyCompanies={energyCompanies}
        energyProducts={energyProducts}
        assignableUsers={assignableUsers}
      />
    </div>
  )
}
