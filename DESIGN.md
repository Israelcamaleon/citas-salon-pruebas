# Módulo de Lealtad — Documento de diseño (integrado)

> **Propósito:** Spec del submódulo de tarjetas de lealtad dentro de `codigo-cliente` (Glam Schedule).  
> **Arquitectura:** Monolito modular — misma app, misma BD PostgreSQL, activación por env var.  
> **Stack:** Next.js 15 + Prisma + PostgreSQL (Supabase) + Supabase Auth.

---

## 1. Decisiones de producto (cerradas)

| # | Pregunta | Decisión |
|---|----------|----------|
| 1 | ¿Dónde vive? | **Submódulo** dentro de `codigo-cliente`, no repo aparte |
| 2 | ¿Multi-tenant? | **No** — un despliegue = un negocio |
| 3 | ¿Activar/desactivar? | **Env var** `LOYALTY_ENABLED=true\|false` por despliegue |
| 4 | ¿Auth? | **Supabase Auth** compartido con agenda |
| 5 | ¿Clientes? | **Unificados** — `Customer` existente, FK en `LoyaltyCard` |
| 6 | ¿Staff? | **Reutilizar** `Staff` (+ `authUserId` para Supabase) |
| 7 | ¿Tipos V1? | **STAMP + SERVICE**; enums y Zod listos para los otros 5 |
| 8 | ¿Apple/Google Wallet? | **V2** |
| 9 | ¿Integración agenda profunda? | **V2** — mismo `Customer`, sin sync extra |
| 10 | ¿Facturación SaaS? | **Fuera de alcance** |

### Alcance MVP (V1)

- Programas STAMP y SERVICE (CRUD)
- Clientes unificados (`Customer`)
- Emitir tarjetas, sellar, marcar uso de servicio
- Panel admin en `/loyalty` (condicionado a `LOYALTY_ENABLED`)
- Vista pública en `/tarjetas` (lookup por celular)
- Reportes básicos (dashboard summary)
- APIs bajo `/api/loyalty/*`

### Fuera de MVP (V2+)

- DISCOUNT, GIFT, COUPON, PREPAID, CASHBACK (infra lista, falta UI + lógica)
- PassKit / Apple Wallet / Google Wallet
- SSO avanzado
- Facturación / planes SaaS

---

## 2. Arquitectura integrada

```
codigo-cliente/
├── prisma/schema.prisma       # + LoyaltyProgram, LoyaltyCard, LoyaltyTransaction...
├── src/
│   ├── features/loyalty/      # UI (Fase 3+)
│   ├── services/loyalty/      # Lógica de negocio
│   ├── schemas/loyalty/       # Zod — config discriminated union
│   ├── types/loyalty.ts
│   ├── lib/
│   │   ├── loyalty.ts         # isLoyaltyEnabled(), colores, guards
│   │   └── loyalty-api.ts     # withLoyaltyGuard para API routes
│   └── app/
│       ├── (dashboard)/loyalty/
│       ├── (public)/tarjetas/
│       └── api/loyalty/
```

### Feature flag

```env
LOYALTY_ENABLED=true   # Vercel: por proyecto/despliegue
```

- `false` → rutas `/loyalty` y `/api/loyalty/*` responden 404 o mensaje deshabilitado
- Venta separada: proyecto Vercel con/sin la variable

### Convención de nombres

| Agenda | Lealtad |
|--------|---------|
| `Service` (cita) | `LoyaltyProgram` |
| `Customer` | mismo `Customer` |
| `Staff` | mismo `Staff` (`staffId` en transacciones) |
| — | `LoyaltyCard`, `LoyaltyTransaction` |

---

## 3. Modelo de datos Prisma

### Enums (todos definidos desde V1)

```prisma
enum LoyaltyProgramType { STAMP DISCOUNT GIFT COUPON PREPAID CASHBACK SERVICE }
enum LoyaltyCardStatus { ACTIVE REDEEMED EXPIRED BLOCKED }
enum LoyaltyTransactionType { STAMP REDEEM LOAD DISCOUNT_APPLY COUPON_USE CASHBACK_EARN CASHBACK_REDEEM SERVICE_USE }
```

### Tablas

```
LoyaltyProgram     → name, type, config (Json), color, active, dates
LoyaltyCard        → customerId → Customer, programId, balance, serviceUsage (Json?)
LoyaltyTransaction → cardId, staffId → Staff, type, amount, notes
LoyaltyCouponUse   → programId + customerId (para V2 COUPON)
Staff              → + authUserId String? @unique (Supabase Auth)
```

### Config JSON por tipo

Validado en `src/schemas/loyalty/program-config.schema.ts` (Zod discriminated union).

| Tipo | V1 | Campos clave |
|------|----|--------------|
| `STAMP` | ✅ | `stampsNeeded`, `welcomeStamps`, `rewards?` |
| `SERVICE` | ✅ | `services: [{ name, total, icon }]`, `price?` |
| `DISCOUNT` | V2 | `discountType`, `value`, `minPurchase` |
| `GIFT` | V2 | `initialBalance`, `rechargeable` |
| `COUPON` | V2 | `code`, `discount`, `maxUses` |
| `PREPAID` | V2 | `minLoad`, `bonusPercent` |
| `CASHBACK` | V2 | `percent`, `minPurchase` |

---

## 4. API — endpoints

Prefijo: `/api/loyalty/*` — todas protegidas por `withLoyaltyGuard`.

### Programas

| Método | Ruta | V1 |
|--------|------|-----|
| GET | `/api/loyalty/programs` | ✅ |
| POST | `/api/loyalty/programs` | ✅ STAMP/SERVICE |
| GET | `/api/loyalty/programs/[id]` | ✅ |
| PUT | `/api/loyalty/programs/[id]` | ✅ |

### Tarjetas y transacciones

| Método | Ruta | V1 |
|--------|------|-----|
| POST | `/api/loyalty/cards/issue` | ✅ |
| POST | `/api/loyalty/transactions/stamp` | ✅ |
| POST | `/api/loyalty/transactions/service-use` | ✅ |
| GET | `/api/loyalty/reports/summary` | ✅ |

### Público

| Método | Ruta | V1 |
|--------|------|-----|
| POST | `/api/loyalty/public/lookup` | ✅ buscar/crear por teléfono |

### V2 (stubs en transaction.service)

- `POST /api/loyalty/transactions/redeem`
- `POST /api/loyalty/transactions/load`
- `POST /api/loyalty/transactions/cashback`

---

## 5. Pantallas

### Admin — `/loyalty` (dashboard)

| Pantalla | Fase | Prioridad |
|----------|------|-----------|
| Programas CRUD | 3 | P0 |
| Sellar / usar servicio | 3 | P0 |
| Emitir tarjeta | 3 | P1 |
| Dashboard stats | 3 | P1 |
| QR del negocio | 4 | P1 |

### Público — `/tarjetas` (QR apunta aquí)

| Pantalla | Fase | Prioridad |
|----------|------|-----------|
| Login por celular | 4 | P0 |
| Lista de tarjetas | 4 | P0 |
| Detalle por tipo | 4 | P0 |

---

## 6. Auth (Fase 1 — pendiente)

- Supabase Auth email/password
- `Staff.authUserId` enlaza usuario Supabase ↔ colaborador
- Middleware protege `(dashboard)` y APIs
- Permisos en `Role.permissions`:
  - `manageLoyalty` — CRUD programas
  - `stampCards` — sellar / usar servicio

---

## 7. Plan de implementación

### Fase 0 — Scaffold ✅

- [x] Schema Prisma + modelos loyalty
- [x] `LOYALTY_ENABLED` + guards
- [x] Zod schemas (STAMP + SERVICE + placeholders V2)
- [x] Services + API routes core
- [x] Páginas placeholder `/loyalty`
- [x] Permisos en roles default

### Fase 1 — Auth ✅

- [x] Supabase Auth login/logout (`@supabase/ssr`)
- [x] Middleware + sesión (protege dashboard y APIs)
- [x] `Staff.authUserId` sync (`npm run seed:auth`)
- [x] `staffId` en transacciones loyalty desde sesión
- [x] Permisos `manageLoyalty` / `stampCards` en rutas loyalty

### Fase 2 — APIs polish

- [ ] Validación auth en rutas loyalty
- [ ] Listado clientes con tarjetas
- [ ] Historial transacciones

### Fase 3 — Admin UI ✅

- [x] Layout lealtad (tabs: Resumen, Programas, Sellar, Emitir)
- [x] CRUD programas con preview tarjeta (STAMP + SERVICE)
- [x] Flujo sellar / usar servicio
- [x] Emitir tarjeta
- [x] Dashboard stats + URL pública para QR

### Fase 4 — Vista pública + QR ✅

- [x] `/tarjetas` con lookup por teléfono
- [x] Render tarjetas STAMP/SERVICE
- [x] Soporte `?tel=` en URL (QR personalizado)
- [x] Registro de cliente nuevo con nombre
- [x] URL pública en dashboard admin (copiar)

---

## 8. Variables de entorno

```env
LOYALTY_ENABLED=true
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
DATABASE_URL=...
DIRECT_URL=...
NEXT_PUBLIC_SITE_URL=https://tu-dominio.vercel.app
```

---

## 9. Criterios de éxito MVP

- [x] Empleado crea programa STAMP, emite tarjeta a cliente por celular
- [x] Cliente abre `/tarjetas`, ingresa celular, ve tarjeta
- [x] Cajero sella desde admin; cliente ve cambio al refrescar
- [x] Despliegue con `LOYALTY_ENABLED=false` no expone el módulo
- [x] `npm run build` pasa sin errores

---

## Apéndice — Colores por tipo

```typescript
const LOYALTY_TYPE_COLORS = {
  STAMP:    '#378ADD',
  SERVICE:  '#0f766e',
  GIFT:     '#b45309',
  DISCOUNT: '#639922',
  COUPON:   '#D4537E',
  PREPAID:  '#7F77DD',
  CASHBACK: '#D85A30',
}
```
