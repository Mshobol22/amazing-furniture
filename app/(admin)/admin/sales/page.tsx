import { getAllSaleEventsAdmin } from '@/lib/actions/sale-actions'
import SalesManagerClient from '@/components/admin/SalesManagerClient'

export default async function AdminSalesPage() {
  const saleEvents = await getAllSaleEventsAdmin()
  return <SalesManagerClient initialEvents={saleEvents} />
}
