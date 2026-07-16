# LoyaltyHub — Sistema de tarjetas de lealtad

Sistema completo de tarjetas de lealtad: sellos, descuentos, prepago por
servicios, tarjetas regalo personalizables, cupones, prepago de saldo y
cashback. Incluye panel de administrador, vista del cliente vía QR, y API
backend conectable a tu base de datos MySQL/MariaDB existente.

## Contenido del paquete

```
loyaltyhub/
├── admin/
│   └── admin.html        ← Panel de administrador (crear tarjetas, sellar, reportes)
├── client/
│   └── index.html        ← Vista del cliente (se abre al escanear el QR)
├── backend/
│   ├── server.js         ← API en Node.js + Express
│   ├── schema.sql         ← Base de datos MySQL/MariaDB
│   ├── package.json
│   └── .env.example       ← Variables de entorno de referencia
└── README.md              ← Este archivo
```

## ¿Qué es cada parte?

| Carpeta | Qué hace | Quién la usa |
|---------|----------|--------------|
| `admin/admin.html` | Crear tarjetas, sellar, ver clientes, reportes, emitir regalos personalizados | Tú y tus empleados |
| `client/index.html` | Página que ve el cliente al escanear el QR — pone su celular y ve sus tarjetas | Tus clientes |
| `backend/` | API que conecta todo a tu base de datos real | El servidor |

Ahora mismo `admin.html` y `client/index.html` funcionan con datos de
demostración guardados en memoria del navegador, para que puedas probar
y ajustar el diseño sin depender del servidor. El siguiente paso es
conectarlos al backend real para que los datos sean permanentes y
compartidos entre todos tus empleados.

---

## Despliegue paso a paso

### 1. Base de datos (MySQL / MariaDB)

Sube y ejecuta el schema en tu servidor de base de datos:

```bash
mysql -u tu_usuario -p < backend/schema.sql
```

Si tu agenda actual ya vive en MySQL, puedes importar este schema en la
misma base de datos. La tabla `customers` incluye una columna
`agenda_ref_id` lista para vincular cada cliente de lealtad con su
contacto correspondiente en tu agenda.

### 2. Backend (API)

Sube la carpeta `backend/` a tu servidor (puede ser el mismo servidor
donde ya tienes la agenda, o uno aparte).

```bash
cd backend
npm install
cp .env.example .env
```

Edita `.env` con los datos reales de tu servidor:

```
DB_HOST=localhost
DB_USER=tu_usuario_mysql
DB_PASS=tu_contraseña
DB_NAME=loyaltyhub
JWT_SECRET=genera_una_cadena_aleatoria_larga_aqui
PORT=3001
```

Inícialo con un gestor de procesos para que se mantenga corriendo:

```bash
npm install -g pm2
pm2 start server.js --name loyaltyhub-api
pm2 save
```

### 3. Subir `admin.html` y `client/index.html`

Estos dos archivos son estáticos — los subes a cualquier hosting o a la
misma carpeta pública de tu servidor web (Apache/Nginx).

Antes de subirlos, abre cada uno y busca esta línea cerca del final del
`<script>`:

```js
const API = 'http://localhost:3001/api';
```

Cámbiala por la URL real de tu API, por ejemplo:

```js
const API = 'https://api.tudominio.com/api';
```

Sugerencia de rutas en tu dominio:
- `https://tudominio.com/admin` → `admin.html`
- `https://tudominio.com/cliente` → `client/index.html`

### 4. Generar el QR del negocio

El QR debe apuntar a:
```
https://tudominio.com/cliente
```

Cuando el cliente lo escanea, pone su celular y ve sus tarjetas. Puedes
generar el QR desde cualquier generador en línea o pedírmelo cuando
tengas tu dominio listo.

### 5. Conectar el frontend al backend real

Actualmente `admin.html` guarda los datos en memoria del navegador
(se pierden al recargar la página) para que pudieras probar el diseño
libremente. El siguiente paso es conectar las funciones de JavaScript
(`crearProg()`, `aplicarCanje()`, `emitirTarjeta()`, etc.) a los
endpoints reales de `server.js` con `fetch()`. Aviso cuando quieras que
hagamos esa conexión — es la última pieza para que todo quede
permanente y sincronizado entre tú y tus empleados.

---

## Roles de empleados

| Rol | Permisos |
|-----|----------|
| `superadmin` | Acceso total — crear programas, empleados, ver todo |
| `admin` | Crear/editar programas, ver clientes y reportes |
| `cashier` | Solo sellar, canjear y cargar saldo |

## Apple Wallet / Google Wallet

Para que el botón "Agregar a Wallet" funcione de verdad necesitas una
cuenta en [passkit.com](https://passkit.com) (tiene plan gratuito) y
agregar tus credenciales al `.env`:

```
PASSKIT_API_KEY=tu_api_key
PASSKIT_PASS_TYPE_ID=tu_pass_type
```

## Endpoints principales de la API

| Método | Ruta | Qué hace |
|--------|------|----------|
| POST | `/api/auth/login` | Login de empleado |
| GET/POST | `/api/programs` | Listar / crear tarjetas |
| POST | `/api/customers/lookup` | Buscar cliente por celular (usado por el QR) |
| GET | `/api/customers` | Listar clientes (admin) |
| POST | `/api/cards/issue` | Emitir tarjeta a un cliente |
| POST | `/api/transactions/stamp` | Sellar |
| POST | `/api/transactions/redeem` | Canjear saldo |
| POST | `/api/transactions/load` | Recargar prepago |
| POST | `/api/transactions/cashback` | Registrar compra con cashback |
| GET | `/api/reports/summary` | Datos del dashboard |
| GET | `/api/qr` | Generar QR |
| PUT | `/api/customers/:id/link-agenda` | Vincular cliente con tu agenda |

---

## ¿Qué sigue?

1. Sube la base de datos a tu servidor MySQL
2. Sube `backend/` y enciéndelo con `pm2`
3. Actualiza la URL del API en `admin.html` y `client/index.html`
4. Sube esos dos archivos a tu hosting o servidor web
5. Genera el QR apuntando a tu página de cliente
6. Avísame cuando quieras conectar el frontend al backend real
