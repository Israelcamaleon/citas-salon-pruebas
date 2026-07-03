export type Service = {
  id: number
  name: string
  durationMin: number
  priceMXN: number
  isActive: boolean
  createdAt?: string
  updatedAt?: string
}

export type Staff = {
  id: number
  name: string
  role: string
  email: string
  phone: string | null
  isActive: boolean
  hasLogin?: boolean
}

export type Location = {
  id: number
  name: string
  address: string
  phone: string | null
  isActive: boolean
}

export type Customer = {
  id: number
  name: string
  phone: string | null
  email: string | null
  notes: string | null
}

export type Booking = {
  id: number
  date: string
  durationMin: number
  status: string
  serviceId: number
  staffId: number
  locationId: number
  customerId: number
  service?: Service
  staff?: Staff
  customer?: Customer
  location?: Location
}

export type AppSettings = {
  businessName: string
  address: string
  logoUrl?: string | null
}

export type Role = {
  id: number
  name: string
  description?: string
  permissions: Record<string, boolean>
}

export type DayKey = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun"

export type DaySchedule = {
  open: boolean
  start: string
  end: string
}

export type LocationSchedule = Record<DayKey, DaySchedule>
