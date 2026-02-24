import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { getProducts } from '../actions'
import { ContratoForm } from '@/components/contratos/ContratoForm'

export default async function NuevoContratoPage() {
  const user = await getSession()
  if (!user) redirect('/login')

  const products = await getProducts()

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-6 text-2xl font-bold text-foreground">Nuevo Contrato</h1>
      <ContratoForm
        mode="create"
        user={user}
        products={products}
      />
    </div>
  )
}
