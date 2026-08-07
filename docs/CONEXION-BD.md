# Conexión a la base de datos

Guía para conectarse a la base de datos PostgreSQL del proyecto (hospedada en Supabase) desde local, desde la app y con herramientas externas.

---

## 1. Qué base de datos usamos

| Concepto | Valor |
|----------|--------|
| Motor | PostgreSQL |
| Hosting | Supabase |
| ORM | Prisma |
| Proyecto Supabase | `ypwzuxrtlsqaojdjxrdd` |
| Región del pooler | `aws-1-us-east-2` |

La app **nunca** se conecta “a mano” con un cliente SQL en runtime: usa Prisma (`src/lib/prisma.ts`), que lee las variables `DATABASE_URL` y `DIRECT_URL`.

Esquema: `prisma/schema.prisma`.

---

## 2. Las dos URLs (importante)

Supabase expone dos formas de conectar. En este proyecto **ambas son obligatorias**.

| Variable | Puerto | Uso | Cuándo |
|----------|--------|-----|--------|
| `DATABASE_URL` | **6543** (Transaction pooler / PgBouncer) | Runtime de la app (Next.js, Vercel) | Siempre en local y producción |
| `DIRECT_URL` | **5432** (Session pooler / conexión más directa) | Migraciones y CLI de Prisma | `prisma migrate`, `db push`, scripts |

Formato típico (sustituye `[YOUR-PASSWORD]` por la contraseña del usuario `postgres` del proyecto):

```bash
# Runtime (Vercel / Next.js)
DATABASE_URL="postgresql://postgres.ypwzuxrtlsqaojdjxrdd:[YOUR-PASSWORD]@aws-1-us-east-2.pooler.supabase.com:6543/postgres?pgbouncer=true"

# Migraciones / CLI
DIRECT_URL="postgresql://postgres.ypwzuxrtlsqaojdjxrdd:[YOUR-PASSWORD]@aws-1-us-east-2.pooler.supabase.com:5432/postgres"
```

En `prisma/schema.prisma`:

```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}
```

**Por qué dos URLs:** en serverless (Vercel) el pooler de transacciones (6543) evita saturar conexiones. Las migraciones necesitan una conexión que soporte DDL, por eso Prisma usa `directUrl` (5432).

---

## 3. Dónde obtener la contraseña y las URLs

1. Entra a [Supabase Dashboard](https://supabase.com/dashboard).
2. Abre el proyecto `ypwzuxrtlsqaojdjxrdd` (o el que corresponda al cliente).
3. Ve a **Project Settings → Database**.
4. En **Connection string** / **Connection pooling**:
   - Copia la URI del **Transaction pooler** → úsala como `DATABASE_URL` (puerto `6543`, con `?pgbouncer=true`).
   - Copia la URI del **Session pooler** (o Direct connection si el proyecto lo permite) → úsala como `DIRECT_URL` (puerto `5432`).
5. La contraseña es la del usuario de base de datos (`postgres`). Si no la tienes:
   - **Database → Reset database password** (afecta a quien ya use esa contraseña).
   - Guárdala en un lugar seguro; no la subas a Git.

También puedes ver conexiones rápidas en **Project Settings → Database → Connect**.

---

## 4. Configurar el entorno local

### 4.1 Archivos de entorno

| Archivo | Quién lo lee |
|---------|----------------|
| `.env.local` | Next.js (`npm run dev`), y los scripts del `package.json` que usan `dotenv -e .env.local` |
| `.env` | Prisma CLI **por defecto** (si corres `npx prisma` a mano sin `dotenv`) |

Recomendación del proyecto:

```bash
cp .env.example .env.local
# Completa NEXT_PUBLIC_SUPABASE_*, SUPABASE_SERVICE_ROLE_KEY, DATABASE_URL y DIRECT_URL
```

Para migraciones, usa los scripts del repo (cargan `.env.local`):

```bash
npm run db:migrate        # prisma migrate deploy
npm run db:migrate:dev    # prisma migrate dev
```

Si prefieres `npx prisma` directo, copia también `DATABASE_URL` y `DIRECT_URL` a un archivo `.env` en la raíz (Prisma no lee `.env.local` solo).

### 4.2 Variables mínimas para la BD

En `.env.local` (valores de ejemplo en `.env.example`):

```bash
DATABASE_URL="postgresql://postgres.XXXX:[PASSWORD]@....pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.XXXX:[PASSWORD]@....pooler.supabase.com:5432/postgres"
```

Además, Auth y Storage usan Supabase (no son la conexión SQL, pero van juntas en el setup):

```bash
NEXT_PUBLIC_SUPABASE_URL=https://XXXX.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...   # solo servidor; nunca en el cliente
```

### 4.3 Generar el cliente Prisma y arrancar

```bash
npm install --legacy-peer-deps
npx prisma generate
npm run dev
```

La app usa el singleton en `src/lib/prisma.ts`. Si falla al arrancar, casi siempre es URL incorrecta, contraseña mal escapada o red bloqueada.

---

## 5. Conectarse con un cliente SQL (TablePlus, DBeaver, pgAdmin, psql)

Útil para inspeccionar tablas, correr consultas o revisar datos. **No uses la service role de Auth aquí**: es conexión PostgreSQL pura.

### Datos de conexión (pooler / recomendado)

| Campo | Valor típico |
|-------|----------------|
| Host | `aws-1-us-east-2.pooler.supabase.com` |
| Port | `5432` (sesión) o `6543` (transacción) |
| Database | `postgres` |
| User | `postgres.ypwzuxrtlsqaojdjxrdd` (usuario *con* el ref del proyecto) |
| Password | la contraseña de Database Settings |
| SSL | **Required** / enable SSL |

Para un cliente GUI, suele ir mejor el puerto **5432** (session). El **6543** es más para la app con PgBouncer.

### Con `psql`

```bash
psql "postgresql://postgres.ypwzuxrtlsqaojdjxrdd:[YOUR-PASSWORD]@aws-1-us-east-2.pooler.supabase.com:5432/postgres"
```

Si la contraseña tiene caracteres especiales (`@`, `#`, `%`, etc.), **URL-encodéala** en la cadena (por ejemplo `@` → `%40`).

### Desde el SQL Editor de Supabase

Sin instalar nada:

1. Dashboard → **SQL Editor**.
2. Escribes y ejecutas SQL contra la misma BD.

Ideal para consultas rápidas; no sustituye migraciones versionadas de Prisma para cambios de esquema en equipo.

---

## 6. Producción (Vercel)

Local y producción de este cliente **comparten la misma base Supabase** si en Vercel están las mismas `DATABASE_URL` / `DIRECT_URL` que en `.env.local`.

1. Vercel → proyecto → **Settings → Environment Variables**.
2. Define al menos:

| Variable | Entornos sugeridos |
|----------|--------------------|
| `DATABASE_URL` | Production, Preview |
| `DIRECT_URL` | Production, Preview |
| `NEXT_PUBLIC_SUPABASE_URL` | Production, Preview, Development |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Production, Preview, Development |
| `SUPABASE_SERVICE_ROLE_KEY` | Production, Preview (solo servidor) |

3. Redeploy tras cambiar variables.

**Cuidado:** un `prisma db push` o una migración contra esa BD afecta **producción** si apuntas al mismo proyecto. Coordina cambios de esquema antes de aplicarlos.

---

## 7. Comandos útiles del repo

| Comando | Qué hace |
|---------|----------|
| `npx prisma generate` | Regenera el cliente TypeScript tras cambiar el schema |
| `npm run db:migrate` | Aplica migraciones pendientes (`migrate deploy`) con `.env.local` |
| `npm run db:migrate:dev` | Crea/aplica migraciones en desarrollo |
| `npm run seed` | Datos de ejemplo (servicios, etc.) |
| `npm run seed:auth` | Crea/asegura admin + roles |
| `npm run auth:check` | Diagnóstico: colaboradores vs cuentas Supabase Auth |

Scripts de soporte (requieren `.env.local` cargado, p. ej. con `dotenv -e .env.local -- node ...`):

- `scripts/check-auth-link.mjs` — estado de accesos
- `scripts/migrate-staff-role.mjs` — migración puntual Staff.role → roleId (ya aplicada en este proyecto)

---

## 8. Cómo “entra” la app a la BD (flujo)

```
Browser / Vercel
    → Next.js API routes (src/app/api/...)
        → services (src/services/...)
            → prisma (src/lib/prisma.ts)
                → PostgreSQL vía DATABASE_URL (pooler 6543)
```

Auth de usuarios (login) **no** es la misma conexión SQL: va por Supabase Auth (JWT + cookies). La tabla `Staff` se liga al usuario con `authUserId`. Tener sesión de Auth no implica poder conectar con `psql`; son capas distintas.

---

## 9. Problemas frecuentes

### `Can't reach database server` / `P1001`

- Revisa host, puerto y que no haya firewall/VPN bloqueando.
- Confirma que la contraseña esté bien y URL-encoded.
- En redes restrictivas, prueba la connection string que muestra el Dashboard (a veces cambia el host del pooler).

### `column ... does not exist` / schema desfasado

- El código y la BD no coinciden. Genera cliente (`prisma generate`) y aplica migraciones o alinea el schema con la BD real.
- No despliegues un commit viejo contra una BD ya migrada (ni al revés) sin revisar.

### Prisma CLI “no ve” las variables

- Prisma lee `.env`, no `.env.local`.
- Usa `npm run db:migrate` o `dotenv -e .env.local -- npx prisma ...`.

### Contraseña con caracteres especiales

- En la URI, codifica: `@` → `%40`, `#` → `%23`, `/` → `%2F`, etc.

### Demasiadas conexiones

- Asegúrate de que en Vercel `DATABASE_URL` use el puerto **6543** y `?pgbouncer=true`.
- No abras muchas conexiones directas 5432 desde scripts o GUIs a la vez en proyectos pequeños.

### “Email o contraseña incorrectos” en el login

- Eso es **Supabase Auth**, no un fallo de `DATABASE_URL`.
- La contraseña de login (`admin@example.com`, etc.) es distinta de la contraseña del usuario PostgreSQL `postgres`.

---

## 10. Seguridad (checklist)

- [ ] Nunca commits de `.env`, `.env.local` ni contraseñas.
- [ ] `SUPABASE_SERVICE_ROLE_KEY` solo en servidor / Vercel (nunca `NEXT_PUBLIC_`).
- [ ] Rotar la password de la BD si se filtró (Dashboard → Reset database password) y actualizar `.env.local` + Vercel.
- [ ] Preferir consultas y cambios de esquema vía Prisma/migraciones en lugar de SQL ad hoc en producción, salvo emergencias.
- [ ] Limitar quién tiene la contraseña `postgres` del proyecto del cliente.

---

## 11. Referencia rápida de archivos

| Archivo | Rol |
|---------|-----|
| `prisma/schema.prisma` | Modelos y datasource |
| `src/lib/prisma.ts` | Cliente Prisma singleton |
| `.env.example` | Plantilla de variables (sin secretos reales) |
| `.env.local` | Secretos locales (no versionado) |
| `package.json` → `db:migrate*` | Migraciones con `.env.local` |

---

## 12. Checklist “primera conexión”

1. Acceso al Dashboard de Supabase del cliente.
2. Copiar `DATABASE_URL` (6543) y `DIRECT_URL` (5432) con la password correcta.
3. Pegarlas en `.env.local` (y en Vercel si aplica).
4. `npx prisma generate`
5. Probar con un cliente SQL o con:

   ```bash
   dotenv -e .env.local -- npx prisma db pull --print
   ```

   (o cualquier comando Prisma de solo lectura que confirme conectividad).

6. `npm run dev` y verificar que las APIs que leen BD respondan (con sesión válida).

Si algo falla, el primer dato a revisar es: **¿estoy apuntando al mismo proyecto Supabase que producción?** (URL `https://XXXX.supabase.co` y ref en el usuario `postgres.XXXX`).
