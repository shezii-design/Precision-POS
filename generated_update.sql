-- IDEMPOTENT SUPABASE SCHEMA UPDATE SCRIPT
-- Auto-generated to match the exact data models

-- Table: customers
CREATE TABLE IF NOT EXISTS customers (id TEXT PRIMARY KEY);

DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE customers ADD COLUMN name TEXT;
    EXCEPTION WHEN duplicate_column THEN null;
    END;
END $$;

DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE customers ADD COLUMN type TEXT;
    EXCEPTION WHEN duplicate_column THEN null;
    END;
END $$;

DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE customers ADD COLUMN contact_person TEXT;
    EXCEPTION WHEN duplicate_column THEN null;
    END;
END $$;

DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE customers ADD COLUMN phone TEXT;
    EXCEPTION WHEN duplicate_column THEN null;
    END;
END $$;

DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE customers ADD COLUMN secondary_phone TEXT;
    EXCEPTION WHEN duplicate_column THEN null;
    END;
END $$;

DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE customers ADD COLUMN email TEXT;
    EXCEPTION WHEN duplicate_column THEN null;
    END;
END $$;

DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE customers ADD COLUMN address TEXT;
    EXCEPTION WHEN duplicate_column THEN null;
    END;
END $$;

DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE customers ADD COLUMN city TEXT;
    EXCEPTION WHEN duplicate_column THEN null;
    END;
END $$;

DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE customers ADD COLUMN ntn TEXT;
    EXCEPTION WHEN duplicate_column THEN null;
    END;
END $$;

DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE customers ADD COLUMN strn TEXT;
    EXCEPTION WHEN duplicate_column THEN null;
    END;
END $$;

DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE customers ADD COLUMN opening_balance NUMERIC;
    EXCEPTION WHEN duplicate_column THEN null;
    END;
END $$;

DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE customers ADD COLUMN total_purchases NUMERIC;
    EXCEPTION WHEN duplicate_column THEN null;
    END;
END $$;

DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE customers ADD COLUMN machines JSONB;
    EXCEPTION WHEN duplicate_column THEN null;
    END;
END $$;

DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE customers ADD COLUMN notes TEXT;
    EXCEPTION WHEN duplicate_column THEN null;
    END;
END $$;

DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE customers ADD COLUMN updated_at TEXT;
    EXCEPTION WHEN duplicate_column THEN null;
    END;
END $$;

-- Table: vendors
CREATE TABLE IF NOT EXISTS vendors (id TEXT PRIMARY KEY);

DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE vendors ADD COLUMN business_name TEXT;
    EXCEPTION WHEN duplicate_column THEN null;
    END;
END $$;

DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE vendors ADD COLUMN contact_person TEXT;
    EXCEPTION WHEN duplicate_column THEN null;
    END;
END $$;

DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE vendors ADD COLUMN phone TEXT;
    EXCEPTION WHEN duplicate_column THEN null;
    END;
END $$;

DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE vendors ADD COLUMN secondary_phone TEXT;
    EXCEPTION WHEN duplicate_column THEN null;
    END;
END $$;

DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE vendors ADD COLUMN email TEXT;
    EXCEPTION WHEN duplicate_column THEN null;
    END;
END $$;

DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE vendors ADD COLUMN address TEXT;
    EXCEPTION WHEN duplicate_column THEN null;
    END;
END $$;

DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE vendors ADD COLUMN city TEXT;
    EXCEPTION WHEN duplicate_column THEN null;
    END;
END $$;

DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE vendors ADD COLUMN opening_balance NUMERIC;
    EXCEPTION WHEN duplicate_column THEN null;
    END;
END $$;

DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE vendors ADD COLUMN linked_product_ids JSONB;
    EXCEPTION WHEN duplicate_column THEN null;
    END;
END $$;

DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE vendors ADD COLUMN notes TEXT;
    EXCEPTION WHEN duplicate_column THEN null;
    END;
END $$;

DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE vendors ADD COLUMN updated_at TEXT;
    EXCEPTION WHEN duplicate_column THEN null;
    END;
END $$;

-- Table: purchase_orders
CREATE TABLE IF NOT EXISTS purchase_orders (id TEXT PRIMARY KEY);

DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE purchase_orders ADD COLUMN po_number TEXT;
    EXCEPTION WHEN duplicate_column THEN null;
    END;
END $$;

DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE purchase_orders ADD COLUMN vendor_id TEXT;
    EXCEPTION WHEN duplicate_column THEN null;
    END;
END $$;

DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE purchase_orders ADD COLUMN vendor_name TEXT;
    EXCEPTION WHEN duplicate_column THEN null;
    END;
END $$;

DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE purchase_orders ADD COLUMN vendor_phone TEXT;
    EXCEPTION WHEN duplicate_column THEN null;
    END;
END $$;

DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE purchase_orders ADD COLUMN vendor_address TEXT;
    EXCEPTION WHEN duplicate_column THEN null;
    END;
END $$;

DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE purchase_orders ADD COLUMN order_date TEXT;
    EXCEPTION WHEN duplicate_column THEN null;
    END;
END $$;

DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE purchase_orders ADD COLUMN expected_delivery_date TEXT;
    EXCEPTION WHEN duplicate_column THEN null;
    END;
END $$;

DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE purchase_orders ADD COLUMN receiving_date TEXT;
    EXCEPTION WHEN duplicate_column THEN null;
    END;
END $$;

DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE purchase_orders ADD COLUMN costs_finalized_date TEXT;
    EXCEPTION WHEN duplicate_column THEN null;
    END;
END $$;

DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE purchase_orders ADD COLUMN status TEXT;
    EXCEPTION WHEN duplicate_column THEN null;
    END;
END $$;

DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE purchase_orders ADD COLUMN items JSONB;
    EXCEPTION WHEN duplicate_column THEN null;
    END;
END $$;

DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE purchase_orders ADD COLUMN total_ordered_qty NUMERIC;
    EXCEPTION WHEN duplicate_column THEN null;
    END;
END $$;

DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE purchase_orders ADD COLUMN total_received_qty NUMERIC;
    EXCEPTION WHEN duplicate_column THEN null;
    END;
END $$;

DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE purchase_orders ADD COLUMN cargo_cost NUMERIC;
    EXCEPTION WHEN duplicate_column THEN null;
    END;
END $$;

DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE purchase_orders ADD COLUMN cargo_cost_per_unit NUMERIC;
    EXCEPTION WHEN duplicate_column THEN null;
    END;
END $$;

DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE purchase_orders ADD COLUMN subtotal_base_cost NUMERIC;
    EXCEPTION WHEN duplicate_column THEN null;
    END;
END $$;

DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE purchase_orders ADD COLUMN total_landed_cost NUMERIC;
    EXCEPTION WHEN duplicate_column THEN null;
    END;
END $$;

DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE purchase_orders ADD COLUMN bill_number TEXT;
    EXCEPTION WHEN duplicate_column THEN null;
    END;
END $$;

DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE purchase_orders ADD COLUMN bilty_number TEXT;
    EXCEPTION WHEN duplicate_column THEN null;
    END;
END $$;

DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE purchase_orders ADD COLUMN transporter_name TEXT;
    EXCEPTION WHEN duplicate_column THEN null;
    END;
END $$;

DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE purchase_orders ADD COLUMN amount_paid NUMERIC;
    EXCEPTION WHEN duplicate_column THEN null;
    END;
END $$;

DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE purchase_orders ADD COLUMN payment_status TEXT;
    EXCEPTION WHEN duplicate_column THEN null;
    END;
END $$;

DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE purchase_orders ADD COLUMN is_stock_received BOOLEAN;
    EXCEPTION WHEN duplicate_column THEN null;
    END;
END $$;

DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE purchase_orders ADD COLUMN is_billed BOOLEAN;
    EXCEPTION WHEN duplicate_column THEN null;
    END;
END $$;

DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE purchase_orders ADD COLUMN notes TEXT;
    EXCEPTION WHEN duplicate_column THEN null;
    END;
END $$;

DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE purchase_orders ADD COLUMN updated_at TEXT;
    EXCEPTION WHEN duplicate_column THEN null;
    END;
END $$;

-- Table: purchases
CREATE TABLE IF NOT EXISTS purchases (id TEXT PRIMARY KEY);

DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE purchases ADD COLUMN bill_number TEXT;
    EXCEPTION WHEN duplicate_column THEN null;
    END;
END $$;

DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE purchases ADD COLUMN po_number TEXT;
    EXCEPTION WHEN duplicate_column THEN null;
    END;
END $$;

DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE purchases ADD COLUMN vendor_id TEXT;
    EXCEPTION WHEN duplicate_column THEN null;
    END;
END $$;

DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE purchases ADD COLUMN vendor_name TEXT;
    EXCEPTION WHEN duplicate_column THEN null;
    END;
END $$;

DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE purchases ADD COLUMN date TEXT;
    EXCEPTION WHEN duplicate_column THEN null;
    END;
END $$;

DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE purchases ADD COLUMN items JSONB;
    EXCEPTION WHEN duplicate_column THEN null;
    END;
END $$;

DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE purchases ADD COLUMN subtotal NUMERIC;
    EXCEPTION WHEN duplicate_column THEN null;
    END;
END $$;

DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE purchases ADD COLUMN discount_amount NUMERIC;
    EXCEPTION WHEN duplicate_column THEN null;
    END;
END $$;

DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE purchases ADD COLUMN total_amount NUMERIC;
    EXCEPTION WHEN duplicate_column THEN null;
    END;
END $$;

DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE purchases ADD COLUMN amount_paid NUMERIC;
    EXCEPTION WHEN duplicate_column THEN null;
    END;
END $$;

DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE purchases ADD COLUMN balance_due NUMERIC;
    EXCEPTION WHEN duplicate_column THEN null;
    END;
END $$;

DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE purchases ADD COLUMN payment_status TEXT;
    EXCEPTION WHEN duplicate_column THEN null;
    END;
END $$;

DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE purchases ADD COLUMN bilty_number TEXT;
    EXCEPTION WHEN duplicate_column THEN null;
    END;
END $$;

DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE purchases ADD COLUMN transporter_name TEXT;
    EXCEPTION WHEN duplicate_column THEN null;
    END;
END $$;

DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE purchases ADD COLUMN cargo_cost NUMERIC;
    EXCEPTION WHEN duplicate_column THEN null;
    END;
END $$;

DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE purchases ADD COLUMN notes TEXT;
    EXCEPTION WHEN duplicate_column THEN null;
    END;
END $$;

-- Table: inventory_products
CREATE TABLE IF NOT EXISTS inventory_products (id TEXT PRIMARY KEY);

DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE inventory_products ADD COLUMN product_id TEXT;
    EXCEPTION WHEN duplicate_column THEN null;
    END;
END $$;

DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE inventory_products ADD COLUMN product_name TEXT;
    EXCEPTION WHEN duplicate_column THEN null;
    END;
END $$;

DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE inventory_products ADD COLUMN internal_id TEXT;
    EXCEPTION WHEN duplicate_column THEN null;
    END;
END $$;

DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE inventory_products ADD COLUMN brand_name TEXT;
    EXCEPTION WHEN duplicate_column THEN null;
    END;
END $$;

DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE inventory_products ADD COLUMN type_name TEXT;
    EXCEPTION WHEN duplicate_column THEN null;
    END;
END $$;

DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE inventory_products ADD COLUMN unit TEXT;
    EXCEPTION WHEN duplicate_column THEN null;
    END;
END $$;

DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE inventory_products ADD COLUMN change NUMERIC;
    EXCEPTION WHEN duplicate_column THEN null;
    END;
END $$;

DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE inventory_products ADD COLUMN previous_stock NUMERIC;
    EXCEPTION WHEN duplicate_column THEN null;
    END;
END $$;

DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE inventory_products ADD COLUMN new_stock NUMERIC;
    EXCEPTION WHEN duplicate_column THEN null;
    END;
END $$;

DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE inventory_products ADD COLUMN reason TEXT;
    EXCEPTION WHEN duplicate_column THEN null;
    END;
END $$;

DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE inventory_products ADD COLUMN movement_type TEXT;
    EXCEPTION WHEN duplicate_column THEN null;
    END;
END $$;

DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE inventory_products ADD COLUMN reference_id TEXT;
    EXCEPTION WHEN duplicate_column THEN null;
    END;
END $$;

DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE inventory_products ADD COLUMN reference_number TEXT;
    EXCEPTION WHEN duplicate_column THEN null;
    END;
END $$;

DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE inventory_products ADD COLUMN entity_name TEXT;
    EXCEPTION WHEN duplicate_column THEN null;
    END;
END $$;

DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE inventory_products ADD COLUMN unit_rate TEXT;
    EXCEPTION WHEN duplicate_column THEN null;
    END;
END $$;

DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE inventory_products ADD COLUMN total_movement_value TEXT;
    EXCEPTION WHEN duplicate_column THEN null;
    END;
END $$;

DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE inventory_products ADD COLUMN location_name TEXT;
    EXCEPTION WHEN duplicate_column THEN null;
    END;
END $$;

DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE inventory_products ADD COLUMN cabin_number TEXT;
    EXCEPTION WHEN duplicate_column THEN null;
    END;
END $$;

DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE inventory_products ADD COLUMN timestamp TEXT;
    EXCEPTION WHEN duplicate_column THEN null;
    END;
END $$;

DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE inventory_products ADD COLUMN notes TEXT;
    EXCEPTION WHEN duplicate_column THEN null;
    END;
END $$;

-- Table: employee_accounts
CREATE TABLE IF NOT EXISTS employee_accounts (id TEXT PRIMARY KEY);

DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE employee_accounts ADD COLUMN name TEXT;
    EXCEPTION WHEN duplicate_column THEN null;
    END;
END $$;

DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE employee_accounts ADD COLUMN email TEXT;
    EXCEPTION WHEN duplicate_column THEN null;
    END;
END $$;

DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE employee_accounts ADD COLUMN phone TEXT;
    EXCEPTION WHEN duplicate_column THEN null;
    END;
END $$;

DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE employee_accounts ADD COLUMN pin TEXT;
    EXCEPTION WHEN duplicate_column THEN null;
    END;
END $$;

DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE employee_accounts ADD COLUMN password TEXT;
    EXCEPTION WHEN duplicate_column THEN null;
    END;
END $$;

DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE employee_accounts ADD COLUMN role TEXT;
    EXCEPTION WHEN duplicate_column THEN null;
    END;
END $$;

DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE employee_accounts ADD COLUMN designation TEXT;
    EXCEPTION WHEN duplicate_column THEN null;
    END;
END $$;

DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE employee_accounts ADD COLUMN status TEXT;
    EXCEPTION WHEN duplicate_column THEN null;
    END;
END $$;

DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE employee_accounts ADD COLUMN permissions TEXT;
    EXCEPTION WHEN duplicate_column THEN null;
    END;
END $$;

DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE employee_accounts ADD COLUMN restrict_to_devices BOOLEAN;
    EXCEPTION WHEN duplicate_column THEN null;
    END;
END $$;

DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE employee_accounts ADD COLUMN allowed_device_ids JSONB;
    EXCEPTION WHEN duplicate_column THEN null;
    END;
END $$;

DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE employee_accounts ADD COLUMN avatar_color TEXT;
    EXCEPTION WHEN duplicate_column THEN null;
    END;
END $$;

DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE employee_accounts ADD COLUMN last_login_at TEXT;
    EXCEPTION WHEN duplicate_column THEN null;
    END;
END $$;

DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE employee_accounts ADD COLUMN last_login_device_id TEXT;
    EXCEPTION WHEN duplicate_column THEN null;
    END;
END $$;

DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE employee_accounts ADD COLUMN notes TEXT;
    EXCEPTION WHEN duplicate_column THEN null;
    END;
END $$;

-- Table: registered_devices
CREATE TABLE IF NOT EXISTS registered_devices (id TEXT PRIMARY KEY);

DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE registered_devices ADD COLUMN name TEXT;
    EXCEPTION WHEN duplicate_column THEN null;
    END;
END $$;

DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE registered_devices ADD COLUMN os TEXT;
    EXCEPTION WHEN duplicate_column THEN null;
    END;
END $$;

DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE registered_devices ADD COLUMN device_type TEXT;
    EXCEPTION WHEN duplicate_column THEN null;
    END;
END $$;

DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE registered_devices ADD COLUMN browser TEXT;
    EXCEPTION WHEN duplicate_column THEN null;
    END;
END $$;

DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE registered_devices ADD COLUMN user_agent TEXT;
    EXCEPTION WHEN duplicate_column THEN null;
    END;
END $$;

DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE registered_devices ADD COLUMN registered_at TEXT;
    EXCEPTION WHEN duplicate_column THEN null;
    END;
END $$;

DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE registered_devices ADD COLUMN last_seen_at TEXT;
    EXCEPTION WHEN duplicate_column THEN null;
    END;
END $$;

DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE registered_devices ADD COLUMN is_trusted BOOLEAN;
    EXCEPTION WHEN duplicate_column THEN null;
    END;
END $$;

DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE registered_devices ADD COLUMN notes TEXT;
    EXCEPTION WHEN duplicate_column THEN null;
    END;
END $$;

-- Table: inventory_brands
CREATE TABLE IF NOT EXISTS inventory_brands (id TEXT PRIMARY KEY);

-- Table: inventory_categories
CREATE TABLE IF NOT EXISTS inventory_categories (id TEXT PRIMARY KEY);

-- Table: inventory_locations
CREATE TABLE IF NOT EXISTS inventory_locations (id TEXT PRIMARY KEY);

