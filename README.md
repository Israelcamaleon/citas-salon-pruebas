# Glam Schedule (Alika)

Sistema de gestión de citas para salones y estéticas.

## Stack

- Next.js 15 (App Router)
- React 19 + TypeScript + Tailwind
- Prisma + PostgreSQL (Supabase)

## Estructura

```
src/
├── app/
│   ├── (public)/          # Landing y reserva pública
│   ├── (dashboard)/       # Panel y ajustes
│   └── api/               # API routes (delgadas)
├── components/
│   ├── ui/                # Componentes reutilizables
│   └── layout/            # Header, navegación
├── features/              # Módulos por dominio
├── lib/                   # Clientes y utilidades
├── schemas/               # Validación Zod
├── services/              # Lógica de negocio
└── types/                 # Tipos compartidos
prisma/
└── schema.prisma          # Esquema de BD (Supabase)
```

## Desarrollo local

```bash
npm install --legacy-peer-deps
cp .env.example .env.local   # completar credenciales Supabase
npx prisma generate
npm run dev
```

Abrir http://localhost:3000

## Scripts

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Build de producción |
| `npm run start` | Servidor de producción |
| `npm run seed` | Datos de ejemplo en Supabase |
| `npm run seed:auth` | Admin Supabase + Staff vinculado |

## Deploy en Vercel

### 1. Subir código a GitHub

```bash
git init
git add .
git commit -m "Deploy inicial: Next.js + Supabase"
git remote add origin https://github.com/TU_USUARIO/alika-schedule.git
git push -u origin main
```

### 2. Conectar en Vercel

1. [vercel.com/new](https://vercel.com/new) → Import Git Repository
2. Framework: **Next.js** (auto-detectado)
3. Root Directory: `./` (raíz del repo)
4. Build Command: `npm run build` (default)
5. Install Command: `npm install --legacy-peer-deps`

### 3. Variables de entorno en Vercel

Settings → Environment Variables → pegar desde `.env.local`:

| Variable | Entorno |
|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Production, Preview, Development |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Production, Preview, Development |
| `SUPABASE_SERVICE_ROLE_KEY` | Production, Preview, Development |
| `DATABASE_URL` | Production, Preview, Development |
| `DIRECT_URL` | Production, Preview, Development |
| `NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET` | Production, Preview, Development |
| `NEXT_PUBLIC_SITE_URL` | Production → `https://tu-dominio.vercel.app` |

**No** agregues `NODE_ENV` manualmente.

### 4. Deploy

Click **Deploy**. Tras el primer deploy, actualiza `NEXT_PUBLIC_SITE_URL` con la URL real y redeploy.

### Alternativa: CLI

```bash
npx vercel login
npx vercel --prod
```
