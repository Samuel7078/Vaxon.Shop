-- Active: 1777696741671@@db.xdkvgijkvcnmkyrvnwns.supabase.co@5432@postgres
-- =============================================
-- VAXON CATÁLOGO — Schema de Base de Datos
-- Motor: PostgreSQL (Supabase)
-- Fecha: 2026-05-02
-- =============================================

-- -------------------------------------------
-- Tabla: admin_user
-- Propósito: Credenciales del administrador
-- -------------------------------------------
CREATE TABLE IF NOT EXISTS admin_user (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL DEFAULT 'admin',
    password TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uk_username UNIQUE (username)
);

-- -------------------------------------------
-- Tabla: categories
-- Propósito: Categorías de productos del catálogo
-- -------------------------------------------
CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- -------------------------------------------
-- Tabla: contacts
-- Propósito: Vendedores/Equipo con número WhatsApp
-- -------------------------------------------
CREATE TABLE IF NOT EXISTS contacts (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    number VARCHAR(20) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- -------------------------------------------
-- Tabla: products
-- Propósito: Productos del catálogo
-- images: JSON array de URLs de Cloudinary
-- whatsappCustomMsg: Mensaje personalizado para WhatsApp
-- -------------------------------------------
CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    price NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    description TEXT,
    images JSONB DEFAULT '[]'::jsonb,
    "categoryId" INT REFERENCES categories(id) ON DELETE SET NULL,
    "contactId" INT REFERENCES contacts(id) ON DELETE SET NULL,
    "whatsappCustomMsg" TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- -------------------------------------------
-- Tabla: stories
-- Propósito: Historias temporales (24h) estilo Instagram
-- "createdAt": timestamp en milisegundos para filtrar por 24h
-- -------------------------------------------
CREATE TABLE IF NOT EXISTS stories (
    id SERIAL PRIMARY KEY,
    "imageUrl" TEXT NOT NULL,
    "contactId" INT REFERENCES contacts(id) ON DELETE SET NULL,
    "customMsg" TEXT DEFAULT '',
    "createdAt" BIGINT NOT NULL
);

-- -------------------------------------------
-- Tabla: logs
-- Propósito: Historial de acciones del admin
-- -------------------------------------------
CREATE TABLE IF NOT EXISTS logs (
    id SERIAL PRIMARY KEY,
    action VARCHAR(100) NOT NULL,
    detail TEXT,
    ip VARCHAR(50) DEFAULT 'ADMIN_PANEL',
    "timestamp" VARCHAR(100),
    "rawTime" BIGINT NOT NULL
);

-- -------------------------------------------
-- Índices adicionales para rendimiento
-- -------------------------------------------
CREATE INDEX IF NOT EXISTS idx_products_category ON products("categoryId");
CREATE INDEX IF NOT EXISTS idx_products_contact ON products("contactId");
CREATE INDEX IF NOT EXISTS idx_stories_created ON stories("createdAt");
CREATE INDEX IF NOT EXISTS idx_logs_rawtime ON logs("rawTime");

-- -------------------------------------------
-- Función para auto-actualizar updated_at
-- -------------------------------------------
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_products_updated
    BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE OR REPLACE TRIGGER trg_admin_user_updated
    BEFORE UPDATE ON admin_user
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- -------------------------------------------
-- Datos iniciales: Usuario administrador
-- Contraseña por defecto: 1234
-- Para generar un nuevo hash, ejecuta: node public/fix.js
-- Luego copia el resultado aquí:
-- -------------------------------------------
INSERT INTO admin_user (username, password) VALUES ('admin', 'e3a112c63666c9a8b9b5f48fb09208b6:d2f3abcd7e3a65a4a08addf955588f9d8c7ef9abb376478251ea446c963bf35b789eb9669a31252c5f5f001543dac6e13d8bc1d95d9bb1409645a5a97e6b22fb');
