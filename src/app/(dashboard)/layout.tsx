import { redirect } from "next/navigation"
import { getCurrentStaff, getSessionUser } from "@/lib/auth"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getSessionUser()
  if (!user) redirect("/login")

  const staff = await getCurrentStaff()
  if (!staff) redirect("/login?error=staff")

  return <>{children}</>
}
