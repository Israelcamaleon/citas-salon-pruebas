// ═══════════════════════════════════════════════════════
// LoyaltyHub — Backend API (Node.js + Express + MySQL)
// ═══════════════════════════════════════════════════════
// Instalar: npm install express mysql2 bcryptjs jsonwebtoken cors dotenv qrcode

const express    = require('express');
const mysql      = require('mysql2/promise');
const bcrypt     = require('bcryptjs');
const jwt        = require('jsonwebtoken');
const QRCode     = require('qrcode');
const cors       = require('cors');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors({ origin: process.env.FRONTEND_URL || '*' }));

// ── Conexión MySQL ─────────────────────────────────────
const pool = mysql.createPool({
  host:     process.env.DB_HOST     || 'localhost',
  user:     process.env.DB_USER     || 'root',
  password: process.env.DB_PASS     || '',
  database: process.env.DB_NAME     || 'loyaltyhub',
  waitForConnections: true,
  connectionLimit: 10,
});

// ── Middleware auth JWT ────────────────────────────────
const auth = (roles = []) => async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Sin token' });
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'secret_cambiar');
    if (roles.length && !roles.includes(payload.role))
      return res.status(403).json({ error: 'Sin permiso' });
    req.employee = payload;
    next();
  } catch { res.status(401).json({ error: 'Token inválido' }); }
};

// ════════════════════════════════════════════════════════
// AUTH — Empleados
// ════════════════════════════════════════════════════════

// POST /api/auth/login
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  const [rows] = await pool.query(
    'SELECT * FROM employees WHERE email = ? AND active = 1', [email]
  );
  const emp = rows[0];
  if (!emp || !await bcrypt.compare(password, emp.password))
    return res.status(401).json({ error: 'Credenciales incorrectas' });
  const token = jwt.sign(
    { id: emp.id, name: emp.name, role: emp.role },
    process.env.JWT_SECRET || 'secret_cambiar',
    { expiresIn: '12h' }
  );
  res.json({ token, employee: { id: emp.id, name: emp.name, role: emp.role } });
});

// GET /api/employees  (solo superadmin/admin)
app.get('/api/employees', auth(['superadmin','admin']), async (req, res) => {
  const [rows] = await pool.query(
    'SELECT id, name, email, role, active, created_at FROM employees ORDER BY id'
  );
  res.json(rows);
});

// POST /api/employees
app.post('/api/employees', auth(['superadmin']), async (req, res) => {
  const { name, email, password, role } = req.body;
  const hash = await bcrypt.hash(password, 10);
  const [r] = await pool.query(
    'INSERT INTO employees (name, email, password, role) VALUES (?,?,?,?)',
    [name, email, hash, role || 'cashier']
  );
  res.json({ id: r.insertId });
});

// ════════════════════════════════════════════════════════
// PROGRAMAS DE LEALTAD
// ════════════════════════════════════════════════════════

// GET /api/programs
app.get('/api/programs', auth(), async (req, res) => {
  const [rows] = await pool.query(
    'SELECT * FROM programs ORDER BY created_at DESC'
  );
  res.json(rows);
});

// POST /api/programs
app.post('/api/programs', auth(['superadmin','admin']), async (req, res) => {
  const { name, type, description, color, config, starts_at, expires_at } = req.body;
  const [r] = await pool.query(
    `INSERT INTO programs (name, type, description, color, config, starts_at, expires_at, created_by)
     VALUES (?,?,?,?,?,?,?,?)`,
    [name, type, description, color, JSON.stringify(config), starts_at, expires_at, req.employee.id]
  );
  res.json({ id: r.insertId });
});

// PUT /api/programs/:id
app.put('/api/programs/:id', auth(['superadmin','admin']), async (req, res) => {
  const { name, description, color, config, active, expires_at } = req.body;
  await pool.query(
    'UPDATE programs SET name=?, description=?, color=?, config=?, active=?, expires_at=? WHERE id=?',
    [name, description, color, JSON.stringify(config), active, expires_at, req.params.id]
  );
  res.json({ ok: true });
});

// ════════════════════════════════════════════════════════
// CLIENTES — por número celular
// ════════════════════════════════════════════════════════

// POST /api/customers/lookup  (acceso por celular desde el QR)
app.post('/api/customers/lookup', async (req, res) => {
  const { phone } = req.body;
  if (!phone) return res.status(400).json({ error: 'Teléfono requerido' });

  // Buscar o crear cliente
  let [rows] = await pool.query('SELECT * FROM customers WHERE phone = ?', [phone]);
  let customer = rows[0];

  if (!customer) {
    const [r] = await pool.query(
      'INSERT INTO customers (phone) VALUES (?)', [phone]
    );
    customer = { id: r.insertId, phone };
  }

  // Traer sus tarjetas activas con info del programa
  const [cards] = await pool.query(`
    SELECT c.*, p.name AS program_name, p.type, p.color, p.config, p.description
    FROM cards c
    JOIN programs p ON c.program_id = p.id
    WHERE c.customer_id = ? AND c.status = 'active'
      AND (p.expires_at IS NULL OR p.expires_at >= CURDATE())
  `, [customer.id]);

  res.json({ customer, cards });
});

// GET /api/customers  (listado admin)
app.get('/api/customers', auth(), async (req, res) => {
  const search = req.query.q ? `%${req.query.q}%` : '%';
  const [rows] = await pool.query(
    `SELECT c.*, COUNT(ca.id) AS card_count
     FROM customers c
     LEFT JOIN cards ca ON ca.customer_id = c.id
     WHERE c.phone LIKE ? OR c.name LIKE ?
     GROUP BY c.id ORDER BY c.created_at DESC LIMIT 100`,
    [search, search]
  );
  res.json(rows);
});

// ════════════════════════════════════════════════════════
// TARJETAS
// ════════════════════════════════════════════════════════

// POST /api/cards/issue  — emitir tarjeta a cliente
app.post('/api/cards/issue', auth(), async (req, res) => {
  const { customer_id, program_id } = req.body;
  const [prog] = await pool.query('SELECT * FROM programs WHERE id = ?', [program_id]);
  if (!prog[0]) return res.status(404).json({ error: 'Programa no encontrado' });

  const cfg = typeof prog[0].config === 'string'
    ? JSON.parse(prog[0].config) : prog[0].config;

  // Saldo inicial según tipo
  const initialBalance = prog[0].type === 'stamp'  ? (cfg.welcome_stamps || 0)
    : prog[0].type === 'gift'    ? (cfg.initial_balance || 0)
    : 0;

  const [r] = await pool.query(
    `INSERT INTO cards (customer_id, program_id, balance)
     VALUES (?,?,?)
     ON DUPLICATE KEY UPDATE status='active'`,
    [customer_id, program_id, initialBalance]
  );
  res.json({ id: r.insertId || r.insertId });
});

// ════════════════════════════════════════════════════════
// TRANSACCIONES — el corazón del sistema
// ════════════════════════════════════════════════════════

// POST /api/transactions/stamp  — añadir sello
app.post('/api/transactions/stamp', auth(['superadmin','admin','cashier']), async (req, res) => {
  const { card_id, quantity = 1, purchase_amt } = req.body;
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [cards] = await conn.query(
      `SELECT c.*, p.config, p.type FROM cards c
       JOIN programs p ON c.program_id = p.id
       WHERE c.id = ? AND c.status = 'active'`, [card_id]
    );
    const card = cards[0];
    if (!card) throw new Error('Tarjeta no encontrada');
    if (card.type !== 'stamp') throw new Error('No es tarjeta de sellos');

    const cfg = typeof card.config === 'string' ? JSON.parse(card.config) : card.config;
    const newBalance = parseFloat(card.balance) + quantity;
    const completed = newBalance >= cfg.stamps_needed;

    await conn.query('UPDATE cards SET balance = ? WHERE id = ?', [newBalance, card_id]);
    await conn.query(
      `INSERT INTO transactions (card_id, employee_id, type, amount, purchase_amt, notes)
       VALUES (?, ?, 'stamp', ?, ?, ?)`,
      [card_id, req.employee.id, quantity, purchase_amt,
       completed ? `Premio desbloqueado: ${cfg.reward}` : null]
    );

    if (completed) {
      await conn.query('UPDATE cards SET balance = 0 WHERE id = ?', [card_id]);
    }

    await conn.commit();
    res.json({ ok: true, new_balance: completed ? 0 : newBalance, reward_unlocked: completed, reward: cfg.reward });
  } catch (e) {
    await conn.rollback();
    res.status(400).json({ error: e.message });
  } finally { conn.release(); }
});

// POST /api/transactions/redeem  — canjear saldo (prepago/gift/cashback)
app.post('/api/transactions/redeem', auth(['superadmin','admin','cashier']), async (req, res) => {
  const { card_id, amount } = req.body;
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [cards] = await conn.query(
      'SELECT * FROM cards WHERE id = ? AND status = "active"', [card_id]
    );
    const card = cards[0];
    if (!card) throw new Error('Tarjeta no encontrada');
    if (parseFloat(card.balance) < amount) throw new Error('Saldo insuficiente');

    const newBalance = parseFloat(card.balance) - parseFloat(amount);
    await conn.query('UPDATE cards SET balance = ? WHERE id = ?', [newBalance, card_id]);
    await conn.query(
      `INSERT INTO transactions (card_id, employee_id, type, amount)
       VALUES (?, ?, 'redeem', ?)`,
      [card_id, req.employee.id, amount]
    );
    await conn.commit();
    res.json({ ok: true, new_balance: newBalance });
  } catch (e) {
    await conn.rollback();
    res.status(400).json({ error: e.message });
  } finally { conn.release(); }
});

// POST /api/transactions/load  — recargar prepago
app.post('/api/transactions/load', auth(['superadmin','admin','cashier']), async (req, res) => {
  const { card_id, amount } = req.body;
  const [cards] = await pool.query(
    `SELECT c.*, p.config FROM cards c JOIN programs p ON c.program_id = p.id
     WHERE c.id = ? AND p.type = 'prepaid'`, [card_id]
  );
  const card = cards[0];
  if (!card) return res.status(404).json({ error: 'Tarjeta no encontrada' });
  const cfg = typeof card.config === 'string' ? JSON.parse(card.config) : card.config;
  const bonus = parseFloat(amount) * (cfg.bonus_percent / 100);
  const newBalance = parseFloat(card.balance) + parseFloat(amount) + bonus;
  await pool.query('UPDATE cards SET balance = ? WHERE id = ?', [newBalance, card_id]);
  await pool.query(
    `INSERT INTO transactions (card_id, employee_id, type, amount, notes)
     VALUES (?, ?, 'load', ?, ?)`,
    [card_id, req.employee.id, amount, `Bono: +$${bonus.toFixed(2)}`]
  );
  res.json({ ok: true, new_balance: newBalance, bonus });
});

// POST /api/transactions/cashback  — registrar compra con cashback
app.post('/api/transactions/cashback', auth(['superadmin','admin','cashier']), async (req, res) => {
  const { card_id, purchase_amt } = req.body;
  const [cards] = await pool.query(
    `SELECT c.*, p.config FROM cards c JOIN programs p ON c.program_id = p.id
     WHERE c.id = ? AND p.type = 'cashback'`, [card_id]
  );
  const card = cards[0];
  if (!card) return res.status(404).json({ error: 'Tarjeta no encontrada' });
  const cfg = typeof card.config === 'string' ? JSON.parse(card.config) : card.config;
  if (purchase_amt < cfg.min_purchase) return res.status(400).json({ error: 'Monto mínimo no alcanzado' });
  const earned = Math.min(purchase_amt * (cfg.percent / 100), cfg.max_per_tx);
  const newBalance = parseFloat(card.balance) + earned;
  await pool.query('UPDATE cards SET balance = ? WHERE id = ?', [newBalance, card_id]);
  await pool.query(
    `INSERT INTO transactions (card_id, employee_id, type, amount, purchase_amt)
     VALUES (?, ?, 'cashback_earn', ?, ?)`,
    [card_id, req.employee.id, earned, purchase_amt]
  );
  res.json({ ok: true, earned, new_balance: newBalance });
});

// GET /api/transactions?card_id=X&limit=50
app.get('/api/transactions', auth(), async (req, res) => {
  const { card_id, limit = 50 } = req.query;
  const where = card_id ? 'WHERE t.card_id = ?' : '';
  const params = card_id ? [card_id, parseInt(limit)] : [parseInt(limit)];
  const [rows] = await pool.query(
    `SELECT t.*, e.name AS employee_name
     FROM transactions t
     LEFT JOIN employees e ON t.employee_id = e.id
     ${where} ORDER BY t.created_at DESC LIMIT ?`,
    params
  );
  res.json(rows);
});

// ════════════════════════════════════════════════════════
// QR — Generación de QR para el punto de venta
// ════════════════════════════════════════════════════════

// GET /api/qr?phone=5214421234567
app.get('/api/qr', async (req, res) => {
  const { phone } = req.query;
  if (!phone) return res.status(400).json({ error: 'Teléfono requerido' });
  const url = `${process.env.CLIENT_URL || 'https://tu-dominio.com/cliente'}?tel=${phone}`;
  const qr = await QRCode.toDataURL(url);
  res.json({ qr, url });
});

// ════════════════════════════════════════════════════════
// REPORTES
// ════════════════════════════════════════════════════════

// GET /api/reports/summary
app.get('/api/reports/summary', auth(['superadmin','admin']), async (req, res) => {
  const [[stats]] = await pool.query(`
    SELECT
      (SELECT COUNT(*) FROM customers)                   AS total_customers,
      (SELECT COUNT(*) FROM cards WHERE status='active') AS active_cards,
      (SELECT COUNT(*) FROM transactions
        WHERE DATE(created_at) = CURDATE())              AS today_transactions,
      (SELECT COALESCE(SUM(balance),0) FROM cards
        WHERE status='active'
        AND program_id IN (SELECT id FROM programs
          WHERE type IN ('prepaid','gift')))              AS prepaid_float
  `);
  const [by_program] = await pool.query(`
    SELECT p.name, p.type, p.color,
      COUNT(DISTINCT c.customer_id) AS users,
      COUNT(t.id) AS transactions
    FROM programs p
    LEFT JOIN cards c ON c.program_id = p.id
    LEFT JOIN transactions t ON t.card_id = c.id
    WHERE p.active = 1
    GROUP BY p.id ORDER BY users DESC
  `);
  res.json({ stats, by_program });
});

// ════════════════════════════════════════════════════════
// INTEGRACIÓN CON TU AGENDA
// ════════════════════════════════════════════════════════
// Vincula un cliente de lealtad con un contacto de tu agenda
// PUT /api/customers/:id/link-agenda
app.put('/api/customers/:id/link-agenda', auth(['superadmin','admin']), async (req, res) => {
  const { agenda_ref_id } = req.body;
  await pool.query(
    'UPDATE customers SET agenda_ref_id = ? WHERE id = ?',
    [agenda_ref_id, req.params.id]
  );
  res.json({ ok: true });
});

// GET /api/customers/by-agenda/:agenda_id
// Busca el perfil de lealtad de un cliente desde tu agenda
app.get('/api/customers/by-agenda/:agenda_id', auth(), async (req, res) => {
  const [rows] = await pool.query(
    `SELECT c.*, GROUP_CONCAT(ca.id) AS card_ids
     FROM customers c
     LEFT JOIN cards ca ON ca.customer_id = c.id
     WHERE c.agenda_ref_id = ? GROUP BY c.id`,
    [req.params.agenda_id]
  );
  res.json(rows[0] || null);
});

// ── Start ──────────────────────────────────────────────
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`LoyaltyHub API corriendo en :${PORT}`));
