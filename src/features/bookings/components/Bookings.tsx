"use client";

import { useState, useMemo, useEffect } from "react";
import useSWR from "swr";

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error("Error cargando " + url);
  }
  return res.json();
};

type Customer = {
  id: number;
  name: string;
  phone: string | null;
  email?: string | null;
  notes?: string | null;
};

type Service = {
  id: number;
  name: string;
  durationMin: number;
  priceMXN: number;
  isActive: boolean;
};

type Staff = {
  id: number;
  name: string;
  isActive: boolean;
};

type Location = {
  id: number;
  name: string;
  isActive: boolean;
};

type Booking = {
  id: number;
  date: string;
  durationMin: number;
  serviceId: number;
  staffId: number;
  locationId: number;
  customerId: number;
  status?: string | null;
  notes?: string | null;
  service?: Service | null;
  staff?: Staff | null;
  customer?: Customer | null;
  location?: Location | null;
};

function formatDateTimeLocal(value: string) {
  if (!value) return "";
  // value ISO -> "YYYY-MM-DDTHH:mm"
  return value.slice(0, 16);
}

function formatDateTimeHuman(value: string) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  const pad = (n: number) => (n < 10 ? "0" + n : "" + n);
  const yyyy = d.getFullYear();
  const mm = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const hh = pad(d.getHours());
  const mi = pad(d.getMinutes());
  return `${dd}/${mm}/${yyyy} ${hh}:${mi}`;
}

export default function BookingsSection() {
  // --- Datos de catálogos ---
  const {
    data: services = [],
    isLoading: loadingServices,
  } = useSWR<Service[]>("/api/services", fetcher);

  const {
    data: staffs = [],
    isLoading: loadingStaffs,
  } = useSWR<Staff[]>("/api/staffs", fetcher);

  const {
    data: locations = [],
    isLoading: loadingLocations,
  } = useSWR<Location[]>("/api/locations", fetcher);

  const {
    data: customers = [],
    mutate: mutateCustomers,
    isLoading: loadingCustomers,
  } = useSWR<Customer[]>("/api/customers", fetcher);

  const { data: bookings = [], mutate: mutateBookings } = useSWR<Booking[]>(
    "/api/bookings",
    fetcher
  );

  // --- Estado del formulario de cita ---
  const [date, setDate] = useState<string>(() => {
    const now = new Date();
    const minutes = now.getMinutes();
    const rounded = Math.ceil(minutes / 15) * 15;
    now.setMinutes(rounded, 0, 0);
    return now.toISOString().slice(0, 16); // para input type=datetime-local
  });
  const [serviceId, setServiceId] = useState<string>("");
  const [staffId, setStaffId] = useState<string>("");
  const [locationId, setLocationId] = useState<string>("");
  const [durationMin, setDurationMin] = useState<string>("");
  const [customerId, setCustomerId] = useState<string>("");

  // --- Estado para cliente rápido ---
  const [showNewCustomer, setShowNewCustomer] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState("");
  const [newCustomerPhone, setNewCustomerPhone] = useState("");
  const [newCustomerEmail, setNewCustomerEmail] = useState("");
  const [savingCustomer, setSavingCustomer] = useState(false);

  const [savingBooking, setSavingBooking] = useState(false);

  // ordenar clientes por nombre para el select
  const sortedCustomers = useMemo(
    () =>
      [...customers].sort((a, b) =>
        (a.name || "").localeCompare(b.name || "", "es")
      ),
    [customers]
  );

  // si cambiamos de servicio, sugerir duración
  useEffect(() => {
    if (!serviceId) return;
    const svc = services.find((s) => s.id === Number(serviceId));
    if (svc && !durationMin) {
      setDurationMin(String(svc.durationMin));
    }
  }, [serviceId, services, durationMin]);

  const creatingOrLoadingCatalogs =
    loadingServices || loadingStaffs || loadingLocations || loadingCustomers;

  const canSubmitBooking =
    !!date &&
    !!serviceId &&
    !!staffId &&
    !!locationId &&
    !!durationMin &&
    !!customerId &&
    !savingBooking;

  async function handleCreateCustomer() {
    if (!newCustomerName.trim() || !newCustomerPhone.trim()) {
      alert("Nombre y teléfono son obligatorios para crear un cliente.");
      return;
    }
    try {
      setSavingCustomer(true);
      const res = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newCustomerName.trim(),
          phone: newCustomerPhone.trim(),
          email: newCustomerEmail.trim() || null,
          notes: null,
        }),
      });
      if (!res.ok) {
        let message = "No se pudo crear el cliente.";
        try {
          const data = await res.json();
          if (data?.error) message = data.error;
        } catch {
          // ignore
        }
        alert(message);
        return;
      }
      const created: Customer = await res.json();
      // seleccionar al cliente recién creado
      setCustomerId(String(created.id));
      setShowNewCustomer(false);
      setNewCustomerName("");
      setNewCustomerPhone("");
      setNewCustomerEmail("");
      try {
        await mutateCustomers();
      } catch {
        // ignore
      }
      alert("Cliente creado correctamente.");
    } catch (err) {
      console.error(err);
      alert("Error inesperado creando el cliente.");
    } finally {
      setSavingCustomer(false);
    }
  }

  async function handleCreateBooking(e: any) {
    e.preventDefault();
    if (!canSubmitBooking) {
      alert("Completa todos los campos, incluyendo cliente.");
      return;
    }
    try {
      setSavingBooking(true);
      const payload = {
        date: new Date(date).toISOString(),
        durationMin: Number(durationMin),
        serviceId: Number(serviceId),
        staffId: Number(staffId),
        locationId: Number(locationId),
        customerId: Number(customerId),
      };
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        let message = "No se pudo crear la cita.";
        try {
          const data = await res.json();
          if (data?.error) message = data.error;
        } catch {
          // ignore
        }
        alert(message);
        return;
      }
      await res.json();
      try {
        await mutateBookings();
      } catch {
        // ignore
      }
      alert("Cita creada correctamente.");
    } catch (err) {
      console.error(err);
      alert("Error inesperado creando la cita.");
    } finally {
      setSavingBooking(false);
    }
  }

  return (
    <section id="bookings" className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">Citas rápidas</h2>
          <p className="text-sm text-gray-600">
            Flujo simplificado: selecciona servicio, cliente y confirma.
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Formulario principal de cita */}
        <form
          onSubmit={handleCreateBooking}
          className="space-y-4 rounded-lg border bg-white p-4 shadow-sm"
        >
          {creatingOrLoadingCatalogs && (
            <p className="text-sm text-gray-500">
              Cargando catálogos (servicios, staff, clientes)...
            </p>
          )}

          <div className="space-y-2">
            <label className="block text-sm font-medium">
              Fecha y hora de la cita
            </label>
            <input
              type="datetime-local"
              className="w-full rounded-md border px-3 py-2 text-sm"
              value={formatDateTimeLocal(date)}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <label className="block text-sm font-medium">Servicio</label>
              <select
                className="w-full rounded-md border px-3 py-2 text-sm"
                value={serviceId}
                onChange={(e) => setServiceId(e.target.value)}
                required
              >
                <option value="">Selecciona servicio</option>
                {services
                  .filter((s) => s.isActive)
                  .map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} · {s.durationMin} min
                    </option>
                  ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium">
                Duración (minutos)
              </label>
              <input
                type="number"
                min={5}
                step={5}
                className="w-full rounded-md border px-3 py-2 text-sm"
                value={durationMin}
                onChange={(e) => setDurationMin(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <label className="block text-sm font-medium">Staff</label>
              <select
                className="w-full rounded-md border px-3 py-2 text-sm"
                value={staffId}
                onChange={(e) => setStaffId(e.target.value)}
                required
              >
                <option value="">Selecciona staff</option>
                {staffs
                  .filter((s) => s.isActive)
                  .map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium">Sucursal</label>
              <select
                className="w-full rounded-md border px-3 py-2 text-sm"
                value={locationId}
                onChange={(e) => setLocationId(e.target.value)}
                required
              >
                <option value="">Selecciona sucursal</option>
                {locations
                  .filter((l) => l.isActive)
                  .map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          {/* Selección y alta rápida de cliente */}
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <label className="block text-sm font-medium mb-1">
                Cliente
              </label>
              <button
                type="button"
                onClick={() => setShowNewCustomer((prev) => !prev)}
                className="text-xs text-indigo-600 underline"
              >
                {showNewCustomer ? "Cancelar nuevo cliente" : "Nuevo cliente rápido"}
              </button>
            </div>

            {/* Selector de cliente existente */}
            <select
              className="w-full rounded-md border px-3 py-2 text-sm"
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              required
            >
              <option value="">Selecciona cliente</option>
              {sortedCustomers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} · {c.phone || "sin teléfono"}
                </option>
              ))}
            </select>

            {/* Formulario inline para crear cliente */}
            {showNewCustomer && (
              <div className="mt-3 space-y-2 rounded-md border bg-gray-50 p-3 text-left">
                <p className="text-xs font-medium text-gray-700">
                  Crear nuevo cliente rápido
                </p>
                <div className="grid gap-2 md:grid-cols-2">
                  <input
                    type="text"
                    placeholder="Nombre"
                    className="w-full rounded-md border px-3 py-2 text-sm"
                    value={newCustomerName}
                    onChange={(e) => setNewCustomerName(e.target.value)}
                    required
                  />
                  <input
                    type="tel"
                    placeholder="Teléfono"
                    className="w-full rounded-md border px-3 py-2 text-sm"
                    value={newCustomerPhone}
                    onChange={(e) => setNewCustomerPhone(e.target.value)}
                    required
                  />
                </div>
                <input
                  type="email"
                  placeholder="Correo (opcional)"
                  className="w-full rounded-md border px-3 py-2 text-sm"
                  value={newCustomerEmail}
                  onChange={(e) => setNewCustomerEmail(e.target.value)}
                />
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    className="rounded-md border px-3 py-1 text-xs"
                    onClick={() => setShowNewCustomer(false)}
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    disabled={savingCustomer}
                    onClick={handleCreateCustomer}
                    className="rounded-md bg-indigo-600 px-3 py-1 text-xs font-medium text-white disabled:opacity-60"
                  >
                    {savingCustomer ? "Guardando..." : "Guardar cliente"}
                  </button>
                </div>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={!canSubmitBooking}
            className="mt-4 w-full rounded-md bg-black px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {savingBooking ? "Guardando cita..." : "Crear cita"}
          </button>
        </form>

        {/* Resumen de próximas citas (solo lectura, para contexto) */}
        <div className="space-y-3 rounded-lg border bg-white p-4 shadow-sm">
          <h3 className="text-sm font-semibold">Próximas citas</h3>
          {!bookings.length && (
            <p className="text-sm text-gray-500">
              Aún no hay citas agendadas. Empieza creando una a la izquierda.
            </p>
          )}
          <ul className="space-y-2 max-h-[380px] overflow-y-auto text-sm">
            {bookings.map((b) => (
              <li
                key={b.id}
                className="flex flex-col rounded-md border px-3 py-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">
                    {b.service?.name || `Servicio #${b.serviceId}`}
                  </span>
                  <span className="text-xs text-gray-500">
                    {formatDateTimeHuman(b.date)}
                  </span>
                </div>
                <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-600">
                  <span>
                    Cliente: {b.customer?.name || `#${b.customerId}`}
                  </span>
                  <span>Staff: {b.staff?.name || `#${b.staffId}`}</span>
                  <span>{b.durationMin} min</span>
                  {b.location && <span>Sucursal: {b.location.name}</span>}
                  {b.status && <span>Estado: {b.status}</span>}
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
