import Tabs from "@/components/ui/Tabs"
import Bookings from "@/features/bookings/components/Bookings"
import CalendarView from "@/features/calendar/components/CalendarView"
import Customers from "@/features/customers/components/Customers"
import Services from "@/features/services/components/Services"
import Staffs from "@/features/staff/components/Staffs"

export default function Dashboard() {
  return (
    <div className="space-y-4">
      <h1 className="page-title">Inicio</h1>
      <Tabs tabs={[
        { key: "bookings", label: "Citas", content: <Bookings /> },
        { key: "calendar", label: "Calendario", content: <CalendarView /> },
        { key: "services", label: "Servicios", content: <Services /> },
        { key: "staff", label: "Colaboradores", content: <Staffs /> },
        { key: "customers", label: "Clientes", content: <Customers /> },
      ]} />
    </div>
  )
}
