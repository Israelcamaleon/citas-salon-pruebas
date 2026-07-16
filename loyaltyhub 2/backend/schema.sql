-- ═══════════════════════════════════════════════════════
-- LoyaltyHub — Schema MySQL / MariaDB
-- Compatible con tu base de datos existente de la agenda
-- ═══════════════════════════════════════════════════════

CREATE DATABASE IF NOT EXISTS loyaltyhub CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE loyaltyhub;

-- ── Empleados y roles ──────────────────────────────────
CREATE TABLE employees (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(100) NOT NULL,
  email       VARCHAR(150) NOT NULL UNIQUE,
  password    VARCHAR(255) NOT NULL,
  role        ENUM('superadmin','admin','cashier') DEFAULT 'cashier',
  active      TINYINT(1) DEFAULT 1,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_email (email)
);

-- ── Clientes (identificados por celular) ───────────────
CREATE TABLE customers (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  phone         VARCHAR(20) NOT NULL UNIQUE,   -- clave de acceso por QR
  name          VARCHAR(100),
  email         VARCHAR(150),
  birthdate     DATE,
  -- Si quieres vincular con tu agenda existente:
  agenda_ref_id INT DEFAULT NULL,              -- FK opcional a tu tabla de contactos
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_phone (phone)
);

-- ── Programas de lealtad ───────────────────────────────
CREATE TABLE programs (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(120) NOT NULL,
  type          ENUM('stamp','discount','gift','coupon','prepaid','cashback') NOT NULL,
  description   TEXT,
  color         VARCHAR(7) DEFAULT '#378ADD',  -- color hex de la tarjeta
  -- Configuración por tipo (JSON flexible):
  config        JSON NOT NULL,
  -- Ejemplos por tipo:
  -- stamp:    {"stamps_needed":10,"welcome_stamps":0,"reward":"Café gratis"}
  -- discount: {"type":"percent","value":15,"min_purchase":0}
  -- gift:     {"initial_balance":500,"rechargeable":false}
  -- coupon:   {"code":"FIN20","discount":20,"max_uses":200,"uses_per_customer":1}
  -- prepaid:  {"min_load":200,"bonus_percent":5,"max_balance":5000}
  -- cashback: {"percent":3,"min_purchase":100,"max_per_tx":50}
  active        TINYINT(1) DEFAULT 1,
  starts_at     DATE DEFAULT NULL,
  expires_at    DATE DEFAULT NULL,
  created_by    INT REFERENCES employees(id),
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_type (type),
  INDEX idx_active (active)
);

-- ── Tarjetas emitidas a cada cliente ───────────────────
CREATE TABLE cards (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  customer_id   INT NOT NULL REFERENCES customers(id),
  program_id    INT NOT NULL REFERENCES programs(id),
  -- Estado universal de la tarjeta:
  balance       DECIMAL(10,2) DEFAULT 0.00,   -- sellos, saldo, cashback acumulado
  status        ENUM('active','redeemed','expired','blocked') DEFAULT 'active',
  -- Para wallet pass (PassKit / Google):
  pass_serial   VARCHAR(100) UNIQUE,           -- serial ID del wallet pass
  pass_type     VARCHAR(100) DEFAULT NULL,     -- pass type identifier
  issued_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
  expires_at    DATE DEFAULT NULL,
  UNIQUE KEY uq_customer_program (customer_id, program_id),
  INDEX idx_customer (customer_id),
  INDEX idx_program (program_id),
  INDEX idx_pass (pass_serial)
);

-- ── Historial de transacciones ─────────────────────────
CREATE TABLE transactions (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  card_id       INT NOT NULL REFERENCES cards(id),
  employee_id   INT REFERENCES employees(id),
  type          ENUM('stamp','redeem','load','discount_apply','coupon_use','cashback_earn','cashback_redeem') NOT NULL,
  amount        DECIMAL(10,2) DEFAULT 0.00,    -- sellos añadidos, saldo usado, etc.
  purchase_amt  DECIMAL(10,2) DEFAULT NULL,    -- monto de compra del cliente
  notes         TEXT,
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_card (card_id),
  INDEX idx_employee (employee_id),
  INDEX idx_date (created_at)
);

-- ── Cupones (seguimiento de uso por cliente) ───────────
CREATE TABLE coupon_uses (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  program_id    INT NOT NULL REFERENCES programs(id),
  customer_id   INT NOT NULL REFERENCES customers(id),
  used_at       DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_use (program_id, customer_id)
);

-- ── Datos de muestra ───────────────────────────────────
INSERT INTO employees (name, email, password, role) VALUES
('Israel (Superadmin)', 'admin@micafe.com', '$2b$10$REEMPLAZA_CON_HASH_BCRYPT', 'superadmin'),
('Empleado Demo', 'cajero@micafe.com', '$2b$10$REEMPLAZA_CON_HASH_BCRYPT', 'cashier');

INSERT INTO programs (name, type, description, color, config) VALUES
('Café Frecuente', 'stamp', '10 visitas = café gratis', '#378ADD',
  '{"stamps_needed":10,"welcome_stamps":0,"reward":"Café americano gratis"}'),
('VIP 15%', 'discount', 'Descuento permanente para clientes frecuentes', '#639922',
  '{"type":"percent","value":15,"min_purchase":0}'),
('Gift Card', 'gift', 'Tarjeta de regalo recargable', '#EF9F27',
  '{"initial_balance":500,"rechargeable":true}'),
('Cupón Fin de Semana', 'coupon', '20% sábados y domingos', '#D4537E',
  '{"code":"FIN20","discount":20,"max_uses":200,"uses_per_customer":1,"days":["saturday","sunday"]}'),
('Prepago Premium', 'prepaid', 'Recarga y obtén 5% extra', '#7F77DD',
  '{"min_load":200,"bonus_percent":5,"max_balance":5000}'),
('Cashback 3%', 'cashback', '3% de regreso en cada compra', '#D85A30',
  '{"percent":3,"min_purchase":100,"max_per_tx":50}');
