import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { 
  Brand,
  Customer, 
  CustomerLedgerEntry, 
  Demand, 
  DimensionLabelConfig, 
  DimensionUnit, 
  EmployeeAccount, 
  Expense, 
  LocationItem, 
  Product, 
  ProductDimensions, 
  ProductSellingPrice, 
  ProductType, 
  Purchase, 
  PurchaseOrder, 
  Quotation, 
  RegisteredDevice, 
  StockLog, 
  SupabaseConfig, 
  Vendor, 
  VendorLedgerEntry 
} from '../types';

let supabaseInstance: SupabaseClient | null = null;
let currentClientKey = '';

/**
 * Reads Supabase Project URL and Anon API Key strictly from environment variables (.env / process.env).
 * Credentials are not stored or inputted via the client-side UI.
 */
export function getEnvSupabaseConfig(): { 
  url: string; 
  anonKey: string; 
  isConfigured: boolean; 
  source: 'env' | 'none';
} {
  let url = '';
  let anonKey = '';
  let source: 'env' | 'none' = 'none';

  // 1. Check Vite import.meta.env (.env file)
  try {
    if (typeof import.meta !== 'undefined' && (import.meta as any)?.env) {
      const viteUrl = ((import.meta as any).env.VITE_SUPABASE_URL as string | undefined)?.trim();
      const viteKey = ((import.meta as any).env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim();
      if (viteUrl && viteKey) {
        url = viteUrl;
        anonKey = viteKey;
        source = 'env';
      }
    }
  } catch {
    // Graceful fallback
  }

  // 2. Check process.env
  if (!url && typeof process !== 'undefined' && process.env) {
    const pUrl = (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '')?.trim();
    const pKey = (process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '')?.trim();
    if (pUrl && pKey) {
      url = pUrl;
      anonKey = pKey;
      source = 'env';
    }
  }

  return {
    url,
    anonKey,
    isConfigured: Boolean(url && anonKey),
    source,
  };
}

/**
 * Returns a cached SupabaseClient instance using environment variables or supplied config.
 */
export function getSupabaseClient(config?: Partial<SupabaseConfig>): SupabaseClient | null {
  const env = getEnvSupabaseConfig();
  const url = (config?.url || env.url)?.trim();
  const anonKey = (config?.anonKey || env.anonKey)?.trim();
  const enabled = config?.enabled !== undefined ? config.enabled : Boolean(url && anonKey);

  if (!enabled || !url || !anonKey) {
    return null;
  }

  const keySignature = `${url}::${anonKey}`;

  try {
    if (!supabaseInstance || currentClientKey !== keySignature) {
      supabaseInstance = createClient(url, anonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
        }
      });
      currentClientKey = keySignature;
    }
    return supabaseInstance;
  } catch (err) {
    console.error('Failed to init Supabase client', err);
    return null;
  }
}

export function resetSupabaseClient(): void {
  supabaseInstance = null;
  currentClientKey = '';
}

/**
 * Authenticates user credentials directly against Supabase Auth (signInWithPassword).
 */
export async function authenticateWithSupabase(
  email: string, 
  password: string
): Promise<{ success: boolean; user?: any; error?: string }> {
  const env = getEnvSupabaseConfig();
  if (!env.isConfigured) {
    return {
      success: false,
      error: 'Supabase credentials are not configured. Please add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env or Settings.'
    };
  }

  const client = getSupabaseClient();
  if (!client) {
    return {
      success: false,
      error: 'Could not connect to Supabase service. Please check your connection.'
    };
  }

  try {
    const { data, error } = await client.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    if (data?.user) {
      return { success: true, user: data.user };
    }

    return { success: false, error: 'Authentication failed. Please verify your Supabase credentials.' };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return { success: false, error: errorMsg };
  }
}

/**
 * Signs out active session from Supabase Auth.
 */
export async function signOutSupabase(): Promise<void> {
  try {
    const client = getSupabaseClient();
    if (client) {
      await client.auth.signOut();
    }
  } catch (err) {
    console.error('Failed to sign out of Supabase', err);
  }
}

export interface TableInspectionResult {
  tableName: string;
  label: string;
  exists: boolean;
  rowCount: number;
  status: 'ready' | 'missing' | 'error';
  errorMessage?: string;
}

export interface DetailedConnectionResult {
  success: boolean;
  message: string;
  latencyMs?: number;
  projectHost?: string;
  tables: TableInspectionResult[];
  readyTableCount: number;
  totalTableCount: number;
}

/**
 * Performs a comprehensive health-check of the Supabase connection,
 * testing latency and inspecting all 15 key relational tables.
 */
export async function testSupabaseConnection(
  customUrl?: string, 
  customAnonKey?: string
): Promise<DetailedConnectionResult> {
  const env = getEnvSupabaseConfig();
  const url = (customUrl || env.url)?.trim();
  const anonKey = (customAnonKey || env.anonKey)?.trim();

  const monitoredTables: { name: string; label: string }[] = [
    { name: 'inventory_products', label: 'Inventory Products (Cell-by-Cell)' },
    { name: 'inventory_categories', label: 'Product Categories' },
    { name: 'inventory_brands', label: 'Brands & Manufacturers' },
    { name: 'inventory_locations', label: 'Shop Aisles & Locations' },
    { name: 'customers', label: 'Customer Directory' },
    { name: 'customer_ledger', label: 'Customer Financial Ledger' },
    { name: 'vendors', label: 'Vendor Directory' },
    { name: 'purchase_orders', label: 'Purchase Orders' },
    { name: 'purchases', label: 'Purchase Bills' },
    { name: 'quotations', label: 'Quotations & Estimates' },
    { name: 'demands', label: 'Customer Out-of-Stock Demands' },
    { name: 'expenses', label: 'Operating Expense Records' },
    { name: 'employee_accounts', label: 'Staff Accounts & Roles' },
    { name: 'registered_devices', label: 'Registered Workstations' },
    { name: 'stock_logs', label: 'Stock Movement Audit Logs' },
  ];

  if (!url || !anonKey) {
    return { 
      success: false, 
      message: 'Supabase credentials not found. Enter your Project URL & Anon Key or set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.',
      tables: monitoredTables.map(t => ({ tableName: t.name, label: t.label, exists: false, rowCount: 0, status: 'missing' })),
      readyTableCount: 0,
      totalTableCount: monitoredTables.length,
    };
  }

  let projectHost = '';
  try {
    projectHost = new URL(url).hostname;
  } catch {
    projectHost = url;
  }

  try {
    const client = createClient(url, anonKey);
    const startTime = performance.now();

    // Inspect each table concurrently
    const tablePromises = monitoredTables.map(async (t): Promise<TableInspectionResult> => {
      try {
        const { data, error, count } = await client
          .from(t.name)
          .select('*', { count: 'exact', head: true });

        if (error) {
          if (error.code === '42P01' || error.message?.includes('does not exist')) {
            return { tableName: t.name, label: t.label, exists: false, rowCount: 0, status: 'missing' };
          }
          return { 
            tableName: t.name, 
            label: t.label, 
            exists: false, 
            rowCount: 0, 
            status: 'error', 
            errorMessage: error.message 
          };
        }
        return { 
          tableName: t.name, 
          label: t.label, 
          exists: true, 
          rowCount: count ?? (Array.isArray(data) ? data.length : 0), 
          status: 'ready' 
        };
      } catch (err: unknown) {
        const errStr = err instanceof Error ? err.message : String(err);
        return { tableName: t.name, label: t.label, exists: false, rowCount: 0, status: 'error', errorMessage: errStr };
      }
    });

    const results = await Promise.all(tablePromises);
    const endTime = performance.now();
    const latencyMs = Math.round(endTime - startTime);

    const readyCount = results.filter(r => r.status === 'ready').length;

    if (readyCount === monitoredTables.length) {
      return {
        success: true,
        message: `Connected to Supabase! All ${readyCount}/${monitoredTables.length} relational tables are active and ready (${latencyMs}ms).`,
        latencyMs,
        projectHost,
        tables: results,
        readyTableCount: readyCount,
        totalTableCount: monitoredTables.length,
      };
    } else if (readyCount > 0) {
      return {
        success: true,
        message: `Connected to Supabase project! ${readyCount}/${monitoredTables.length} tables found. Run the SQL schema script for remaining tables.`,
        latencyMs,
        projectHost,
        tables: results,
        readyTableCount: readyCount,
        totalTableCount: monitoredTables.length,
      };
    } else {
      return {
        success: true,
        message: `Connected to Supabase project (${latencyMs}ms), but database tables are not created yet. Copy and run the SQL setup script in your Supabase SQL Editor.`,
        latencyMs,
        projectHost,
        tables: results,
        readyTableCount: 0,
        totalTableCount: monitoredTables.length,
      };
    }
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return { 
      success: false, 
      message: `Failed to connect to Supabase: ${errorMsg}`,
      tables: monitoredTables.map(t => ({ tableName: t.name, label: t.label, exists: false, rowCount: 0, status: 'error', errorMessage: errorMsg })),
      readyTableCount: 0,
      totalTableCount: monitoredTables.length,
    };
  }
}

// ==========================================================
// SQL SCHEMAS (FULL MASTER & MODULAR TABBED SCRIPTS)
// ==========================================================

export const SCHEMA_FULL_DATABASE = `-- ==========================================================
-- COMPLETE SUPABASE POSTGRESQL SCHEMA FOR PRECISION INVENTORY & ERP
-- Run this in Supabase Dashboard > SQL Editor (https://supabase.com/dashboard)
-- ==========================================================

-- 1. INVENTORY PRODUCTS (Cell-by-Cell Relational Columns)
CREATE TABLE IF NOT EXISTS inventory_products (
  id TEXT PRIMARY KEY,
  internal_id TEXT NOT NULL,
  name TEXT NOT NULL,
  image TEXT,

  type_id TEXT,
  type_name TEXT,
  brand_id TEXT,
  brand_name TEXT,
  location_id TEXT,
  location_name TEXT,
  cabin_number TEXT,

  stock_quantity NUMERIC DEFAULT 0,
  min_stock_alert NUMERIC DEFAULT 5,
  unit TEXT DEFAULT 'Pcs',

  cost_price NUMERIC DEFAULT 0,
  last_purchase_price NUMERIC,
  last_purchase_date TEXT,

  wholesale_price NUMERIC DEFAULT 0,
  retail_price NUMERIC DEFAULT 0,
  tier1_name TEXT DEFAULT 'Wholesale',
  tier1_price NUMERIC DEFAULT 0,
  tier1_markup NUMERIC DEFAULT 10,
  tier2_name TEXT DEFAULT 'Retail',
  tier2_price NUMERIC DEFAULT 0,
  tier2_markup NUMERIC DEFAULT 25,
  tier3_name TEXT,
  tier3_price NUMERIC,
  tier3_markup NUMERIC,
  tier4_name TEXT,
  tier4_price NUMERIC,
  tier4_markup NUMERIC,
  tier5_name TEXT,
  tier5_price NUMERIC,
  tier5_markup NUMERIC,

  height_inch NUMERIC,
  height_mm NUMERIC,
  outer_dia_inch NUMERIC,
  outer_dia_mm NUMERIC,
  inner_dia_inch NUMERIC,
  inner_dia_mm NUMERIC,
  dimension_input_unit TEXT DEFAULT 'inch',
  thread TEXT,
  gasket_od_inch NUMERIC,
  gasket_od_mm NUMERIC,
  gasket_id_inch NUMERIC,
  gasket_id_mm NUMERIC,

  label_height TEXT DEFAULT 'H',
  label_outer_dia TEXT DEFAULT 'OD',
  label_inner_dia TEXT DEFAULT 'ID',

  machine_names TEXT,
  cross_references TEXT,
  vendor_id TEXT,
  vendor_name TEXT,
  notes TEXT,
  cost_batches JSONB,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. MASTER DATA (Categories, Brands, Locations)
CREATE TABLE IF NOT EXISTS inventory_categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  item_count NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS inventory_brands (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  item_count NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS inventory_locations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  cabins JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. CUSTOMER CRM & LEDGERS
CREATE TABLE IF NOT EXISTS customers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT DEFAULT 'customer',
  contact_person TEXT,
  phone TEXT,
  secondary_phone TEXT,
  email TEXT,
  address TEXT,
  city TEXT,
  ntn TEXT,
  strn TEXT,
  opening_balance NUMERIC DEFAULT 0,
  total_purchases NUMERIC DEFAULT 0,
  machines JSONB,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS customer_ledger (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL,
  customer_name TEXT,
  date TEXT NOT NULL,
  type TEXT NOT NULL,
  entry_code TEXT,
  bill_number TEXT,
  reference_id TEXT,
  description TEXT,
  debit NUMERIC DEFAULT 0,
  credit NUMERIC DEFAULT 0,
  amount NUMERIC DEFAULT 0,
  payment_method TEXT,
  receipt_number TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. VENDORS & PURCHASING
CREATE TABLE IF NOT EXISTS vendors (
  id TEXT PRIMARY KEY,
  business_name TEXT NOT NULL,
  contact_person TEXT,
  phone TEXT,
  secondary_phone TEXT,
  email TEXT,
  address TEXT,
  city TEXT,
  opening_balance NUMERIC DEFAULT 0,
  linked_product_ids JSONB,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS purchase_orders (
  id TEXT PRIMARY KEY,
  po_number TEXT NOT NULL,
  vendor_id TEXT NOT NULL,
  vendor_name TEXT NOT NULL,
  vendor_phone TEXT,
  vendor_address TEXT,
  order_date TEXT NOT NULL,
  expected_delivery_date TEXT,
  receiving_date TEXT,
  costs_finalized_date TEXT,
  status TEXT DEFAULT 'draft',
  items JSONB NOT NULL,
  total_ordered_qty NUMERIC DEFAULT 0,
  total_received_qty NUMERIC DEFAULT 0,
  cargo_cost NUMERIC DEFAULT 0,
  cargo_cost_per_unit NUMERIC DEFAULT 0,
  subtotal_base_cost NUMERIC DEFAULT 0,
  total_landed_cost NUMERIC DEFAULT 0,
  bill_number TEXT,
  bilty_number TEXT,
  transporter_name TEXT,
  amount_paid NUMERIC DEFAULT 0,
  payment_status TEXT,
  is_stock_received BOOLEAN DEFAULT FALSE,
  is_billed BOOLEAN DEFAULT FALSE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS purchases (
  id TEXT PRIMARY KEY,
  bill_number TEXT NOT NULL,
  po_number TEXT,
  vendor_id TEXT NOT NULL,
  vendor_name TEXT NOT NULL,
  date TEXT NOT NULL,
  items JSONB NOT NULL,
  subtotal NUMERIC DEFAULT 0,
  discount_amount NUMERIC DEFAULT 0,
  total_amount NUMERIC DEFAULT 0,
  amount_paid NUMERIC DEFAULT 0,
  balance_due NUMERIC DEFAULT 0,
  payment_status TEXT DEFAULT 'unpaid',
  bilty_number TEXT,
  transporter_name TEXT,
  cargo_cost NUMERIC DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. QUOTATIONS & ESTIMATES (7-Day Validity)
CREATE TABLE IF NOT EXISTS quotations (
  id TEXT PRIMARY KEY,
  quotation_number TEXT NOT NULL,
  customer_id TEXT,
  customer_type TEXT DEFAULT 'customer',
  customer_name TEXT NOT NULL,
  contact_person TEXT,
  customer_phone TEXT,
  customer_email TEXT,
  customer_address TEXT,
  customer_city TEXT,
  customer_ntn TEXT,
  customer_strn TEXT,
  date TEXT NOT NULL,
  valid_until TEXT NOT NULL,
  validity_days NUMERIC DEFAULT 7,
  items JSONB NOT NULL,
  subtotal NUMERIC DEFAULT 0,
  discount_type TEXT DEFAULT 'amount',
  discount_value NUMERIC DEFAULT 0,
  discount_amount NUMERIC DEFAULT 0,
  tax_percent NUMERIC DEFAULT 0,
  tax_amount NUMERIC DEFAULT 0,
  total_amount NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'active',
  terms_and_conditions TEXT,
  notes TEXT,
  converted_sale_id TEXT,
  converted_at TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. CUSTOMER DEMANDS & BACKORDERS
CREATE TABLE IF NOT EXISTS demands (
  id TEXT PRIMARY KEY,
  demand_number TEXT NOT NULL,
  customer_id TEXT,
  customer_name TEXT NOT NULL,
  customer_phone TEXT,
  location TEXT,
  item_name TEXT NOT NULL,
  product_id TEXT,
  item_details TEXT,
  quantity NUMERIC DEFAULT 1,
  unit TEXT DEFAULT 'Pcs',
  target_price NUMERIC,
  required_date TEXT,
  status TEXT DEFAULT 'pending',
  unfulfillable_reason TEXT,
  cancellation_reason TEXT,
  fulfilled_sale_id TEXT,
  fulfilled_at TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. EXPENSES & FINANCIALS
CREATE TABLE IF NOT EXISTS expenses (
  id TEXT PRIMARY KEY,
  expense_number TEXT NOT NULL,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  date TEXT NOT NULL,
  payment_method TEXT DEFAULT 'Cash',
  paid_to TEXT,
  receipt_number TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. STAFF & HARDWARE TERMINALS
CREATE TABLE IF NOT EXISTS employee_accounts (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  pin TEXT,
  password TEXT,
  role TEXT NOT NULL,
  designation TEXT,
  status TEXT DEFAULT 'active',
  permissions JSONB,
  restrict_to_devices BOOLEAN DEFAULT FALSE,
  allowed_device_ids JSONB,
  avatar_color TEXT,
  last_login_at TEXT,
  last_login_device_id TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS registered_devices (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  os TEXT,
  device_type TEXT,
  browser TEXT,
  user_agent TEXT,
  registered_at TEXT,
  last_seen_at TEXT,
  is_trusted BOOLEAN DEFAULT TRUE,
  notes TEXT
);

-- 9. STOCK AUDIT LOGS
CREATE TABLE IF NOT EXISTS stock_logs (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL,
  product_name TEXT NOT NULL,
  type TEXT NOT NULL,
  quantity_change NUMERIC NOT NULL,
  new_quantity NUMERIC NOT NULL,
  reference_id TEXT,
  reason TEXT,
  user_id TEXT,
  user_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- INDEXES FOR INSTANT QUERIES
CREATE INDEX IF NOT EXISTS idx_products_internal_id ON inventory_products(internal_id);
CREATE INDEX IF NOT EXISTS idx_products_name ON inventory_products(name);
CREATE INDEX IF NOT EXISTS idx_customer_ledger_cid ON customer_ledger(customer_id);
CREATE INDEX IF NOT EXISTS idx_quotations_qno ON quotations(quotation_number);
CREATE INDEX IF NOT EXISTS idx_po_number ON purchase_orders(po_number);
CREATE INDEX IF NOT EXISTS idx_purchases_bill ON purchases(bill_number);

-- ENABLE ROW LEVEL SECURITY (RLS) ON ALL TABLES & GRANT FULL ACCESS TO ANON KEY
ALTER TABLE inventory_products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public full access inventory_products" ON inventory_products;
CREATE POLICY "Public full access inventory_products" ON inventory_products FOR ALL USING (true);

ALTER TABLE inventory_categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public full access inventory_categories" ON inventory_categories;
CREATE POLICY "Public full access inventory_categories" ON inventory_categories FOR ALL USING (true);

ALTER TABLE inventory_brands ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public full access inventory_brands" ON inventory_brands;
CREATE POLICY "Public full access inventory_brands" ON inventory_brands FOR ALL USING (true);

ALTER TABLE inventory_locations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public full access inventory_locations" ON inventory_locations;
CREATE POLICY "Public full access inventory_locations" ON inventory_locations FOR ALL USING (true);

ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public full access customers" ON customers;
CREATE POLICY "Public full access customers" ON customers FOR ALL USING (true);

ALTER TABLE customer_ledger ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public full access customer_ledger" ON customer_ledger;
CREATE POLICY "Public full access customer_ledger" ON customer_ledger FOR ALL USING (true);

ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public full access vendors" ON vendors;
CREATE POLICY "Public full access vendors" ON vendors FOR ALL USING (true);

ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public full access purchase_orders" ON purchase_orders;
CREATE POLICY "Public full access purchase_orders" ON purchase_orders FOR ALL USING (true);

ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public full access purchases" ON purchases;
CREATE POLICY "Public full access purchases" ON purchases FOR ALL USING (true);

ALTER TABLE quotations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public full access quotations" ON quotations;
CREATE POLICY "Public full access quotations" ON quotations FOR ALL USING (true);

ALTER TABLE demands ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public full access demands" ON demands;
CREATE POLICY "Public full access demands" ON demands FOR ALL USING (true);

ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public full access expenses" ON expenses;
CREATE POLICY "Public full access expenses" ON expenses FOR ALL USING (true);

ALTER TABLE employee_accounts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public full access employee_accounts" ON employee_accounts;
CREATE POLICY "Public full access employee_accounts" ON employee_accounts FOR ALL USING (true);

ALTER TABLE registered_devices ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public full access registered_devices" ON registered_devices;
CREATE POLICY "Public full access registered_devices" ON registered_devices FOR ALL USING (true);

ALTER TABLE stock_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public full access stock_logs" ON stock_logs;
CREATE POLICY "Public full access stock_logs" ON stock_logs FOR ALL USING (true);
`;

export const SUPABASE_SQL_SCHEMA = SCHEMA_FULL_DATABASE;

export const SCHEMA_PRODUCTS_ONLY = `-- INVENTORY PRODUCTS CELL-BY-CELL RELATIONAL TABLE
CREATE TABLE IF NOT EXISTS inventory_products (
  id TEXT PRIMARY KEY,
  internal_id TEXT NOT NULL,
  name TEXT NOT NULL,
  image TEXT,
  type_id TEXT,
  type_name TEXT,
  brand_id TEXT,
  brand_name TEXT,
  location_id TEXT,
  location_name TEXT,
  cabin_number TEXT,
  stock_quantity NUMERIC DEFAULT 0,
  min_stock_alert NUMERIC DEFAULT 5,
  unit TEXT DEFAULT 'Pcs',
  cost_price NUMERIC DEFAULT 0,
  wholesale_price NUMERIC DEFAULT 0,
  retail_price NUMERIC DEFAULT 0,
  tier1_name TEXT DEFAULT 'Wholesale',
  tier1_price NUMERIC DEFAULT 0,
  tier1_markup NUMERIC DEFAULT 10,
  tier2_name TEXT DEFAULT 'Retail',
  tier2_price NUMERIC DEFAULT 0,
  tier2_markup NUMERIC DEFAULT 25,
  tier3_name TEXT,
  tier3_price NUMERIC,
  tier3_markup NUMERIC,
  tier4_name TEXT,
  tier4_price NUMERIC,
  tier4_markup NUMERIC,
  tier5_name TEXT,
  tier5_price NUMERIC,
  tier5_markup NUMERIC,
  height_inch NUMERIC,
  height_mm NUMERIC,
  outer_dia_inch NUMERIC,
  outer_dia_mm NUMERIC,
  inner_dia_inch NUMERIC,
  inner_dia_mm NUMERIC,
  dimension_input_unit TEXT DEFAULT 'inch',
  thread TEXT,
  gasket_od_inch NUMERIC,
  gasket_od_mm NUMERIC,
  gasket_id_inch NUMERIC,
  gasket_id_mm NUMERIC,
  label_height TEXT DEFAULT 'H',
  label_outer_dia TEXT DEFAULT 'OD',
  label_inner_dia TEXT DEFAULT 'ID',
  machine_names TEXT,
  cross_references TEXT,
  vendor_id TEXT,
  vendor_name TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE inventory_products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public full access inventory_products" ON inventory_products;
CREATE POLICY "Public full access inventory_products" ON inventory_products FOR ALL USING (true);
`;

export const SCHEMA_CUSTOMERS_LEDGER = `-- CUSTOMERS & FINANCIAL LEDGER
CREATE TABLE IF NOT EXISTS customers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT DEFAULT 'customer',
  contact_person TEXT,
  phone TEXT,
  secondary_phone TEXT,
  email TEXT,
  address TEXT,
  city TEXT,
  ntn TEXT,
  strn TEXT,
  opening_balance NUMERIC DEFAULT 0,
  total_purchases NUMERIC DEFAULT 0,
  machines JSONB,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS customer_ledger (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL,
  customer_name TEXT,
  date TEXT NOT NULL,
  type TEXT NOT NULL,
  entry_code TEXT,
  bill_number TEXT,
  reference_id TEXT,
  description TEXT,
  debit NUMERIC DEFAULT 0,
  credit NUMERIC DEFAULT 0,
  amount NUMERIC DEFAULT 0,
  payment_method TEXT,
  receipt_number TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public full access customers" ON customers FOR ALL USING (true);
ALTER TABLE customer_ledger ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public full access customer_ledger" ON customer_ledger FOR ALL USING (true);
`;

export const SCHEMA_VENDORS_PURCHASING = `-- VENDORS, PURCHASE ORDERS & BILLS
CREATE TABLE IF NOT EXISTS vendors (
  id TEXT PRIMARY KEY,
  business_name TEXT NOT NULL,
  contact_person TEXT,
  phone TEXT,
  secondary_phone TEXT,
  email TEXT,
  address TEXT,
  city TEXT,
  opening_balance NUMERIC DEFAULT 0,
  linked_product_ids JSONB,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS purchase_orders (
  id TEXT PRIMARY KEY,
  po_number TEXT NOT NULL,
  vendor_id TEXT NOT NULL,
  vendor_name TEXT NOT NULL,
  order_date TEXT NOT NULL,
  expected_delivery_date TEXT,
  receiving_date TEXT,
  costs_finalized_date TEXT,
  status TEXT DEFAULT 'draft',
  items JSONB NOT NULL,
  total_ordered_qty NUMERIC DEFAULT 0,
  total_received_qty NUMERIC DEFAULT 0,
  cargo_cost NUMERIC DEFAULT 0,
  cargo_cost_per_unit NUMERIC DEFAULT 0,
  subtotal_base_cost NUMERIC DEFAULT 0,
  total_landed_cost NUMERIC DEFAULT 0,
  bill_number TEXT,
  bilty_number TEXT,
  transporter_name TEXT,
  amount_paid NUMERIC DEFAULT 0,
  payment_status TEXT,
  is_stock_received BOOLEAN DEFAULT FALSE,
  is_billed BOOLEAN DEFAULT FALSE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS purchases (
  id TEXT PRIMARY KEY,
  bill_number TEXT NOT NULL,
  po_number TEXT,
  vendor_id TEXT NOT NULL,
  vendor_name TEXT NOT NULL,
  date TEXT NOT NULL,
  items JSONB NOT NULL,
  subtotal NUMERIC DEFAULT 0,
  discount_amount NUMERIC DEFAULT 0,
  total_amount NUMERIC DEFAULT 0,
  amount_paid NUMERIC DEFAULT 0,
  balance_due NUMERIC DEFAULT 0,
  payment_status TEXT DEFAULT 'unpaid',
  bilty_number TEXT,
  transporter_name TEXT,
  cargo_cost NUMERIC DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public full access vendors" ON vendors FOR ALL USING (true);
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public full access purchase_orders" ON purchase_orders FOR ALL USING (true);
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public full access purchases" ON purchases FOR ALL USING (true);
`;

export const SCHEMA_QUOTATIONS_DEMANDS = `-- QUOTATIONS & CUSTOMER DEMANDS
CREATE TABLE IF NOT EXISTS quotations (
  id TEXT PRIMARY KEY,
  quotation_number TEXT NOT NULL,
  customer_id TEXT,
  customer_type TEXT DEFAULT 'customer',
  customer_name TEXT NOT NULL,
  contact_person TEXT,
  customer_phone TEXT,
  customer_email TEXT,
  customer_address TEXT,
  customer_city TEXT,
  customer_ntn TEXT,
  customer_strn TEXT,
  date TEXT NOT NULL,
  valid_until TEXT NOT NULL,
  validity_days NUMERIC DEFAULT 7,
  items JSONB NOT NULL,
  subtotal NUMERIC DEFAULT 0,
  discount_type TEXT DEFAULT 'amount',
  discount_value NUMERIC DEFAULT 0,
  discount_amount NUMERIC DEFAULT 0,
  tax_percent NUMERIC DEFAULT 0,
  tax_amount NUMERIC DEFAULT 0,
  total_amount NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'active',
  terms_and_conditions TEXT,
  notes TEXT,
  converted_sale_id TEXT,
  converted_at TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS demands (
  id TEXT PRIMARY KEY,
  demand_number TEXT NOT NULL,
  customer_id TEXT,
  customer_name TEXT NOT NULL,
  customer_phone TEXT,
  location TEXT,
  item_name TEXT NOT NULL,
  product_id TEXT,
  item_details TEXT,
  quantity NUMERIC DEFAULT 1,
  unit TEXT DEFAULT 'Pcs',
  target_price NUMERIC,
  required_date TEXT,
  status TEXT DEFAULT 'pending',
  unfulfillable_reason TEXT,
  cancellation_reason TEXT,
  fulfilled_sale_id TEXT,
  fulfilled_at TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE quotations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public full access quotations" ON quotations FOR ALL USING (true);
ALTER TABLE demands ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public full access demands" ON demands FOR ALL USING (true);
`;

export const SCHEMA_EXPENSES_STAFF = `-- EXPENSES, STAFF ACCOUNTS & REGISTERED TERMINALS
CREATE TABLE IF NOT EXISTS expenses (
  id TEXT PRIMARY KEY,
  expense_number TEXT NOT NULL,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  date TEXT NOT NULL,
  payment_method TEXT DEFAULT 'Cash',
  paid_to TEXT,
  receipt_number TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS employee_accounts (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  pin TEXT,
  password TEXT,
  role TEXT NOT NULL,
  designation TEXT,
  status TEXT DEFAULT 'active',
  permissions JSONB,
  restrict_to_devices BOOLEAN DEFAULT FALSE,
  allowed_device_ids JSONB,
  avatar_color TEXT,
  last_login_at TEXT,
  last_login_device_id TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS registered_devices (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  os TEXT,
  device_type TEXT,
  browser TEXT,
  user_agent TEXT,
  registered_at TEXT,
  last_seen_at TEXT,
  is_trusted BOOLEAN DEFAULT TRUE,
  notes TEXT
);

CREATE TABLE IF NOT EXISTS stock_logs (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL,
  product_name TEXT NOT NULL,
  type TEXT NOT NULL,
  quantity_change NUMERIC NOT NULL,
  new_quantity NUMERIC NOT NULL,
  reference_id TEXT,
  reason TEXT,
  user_id TEXT,
  user_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public full access expenses" ON expenses FOR ALL USING (true);
ALTER TABLE employee_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public full access employee_accounts" ON employee_accounts FOR ALL USING (true);
ALTER TABLE registered_devices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public full access registered_devices" ON registered_devices FOR ALL USING (true);
ALTER TABLE stock_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public full access stock_logs" ON stock_logs FOR ALL USING (true);
`;

// ==========================================================
// ROW MAPPERS & DATA SERIALIZATION
// ==========================================================

export function productToSupabaseRow(p: Product): Record<string, any> {
  const dims = p.dimensions;
  const labels = p.dimensionLabels;
  const prices = p.sellingPrices || [];

  const tier1 = prices[0];
  const tier2 = prices[1];
  const tier3 = prices[2];
  const tier4 = prices[3];
  const tier5 = prices[4];

  const hInch = dims?.height !== undefined && dims.height !== null ? Number(dims.height) : null;
  const hMm = hInch !== null ? Number((hInch * 25.4).toFixed(3)) : null;

  const odInch = dims?.outerDia !== undefined && dims.outerDia !== null ? Number(dims.outerDia) : null;
  const odMm = odInch !== null ? Number((odInch * 25.4).toFixed(3)) : null;

  const idInch = dims?.innerDia !== undefined && dims.innerDia !== null ? Number(dims.innerDia) : null;
  const idMm = idInch !== null ? Number((idInch * 25.4).toFixed(3)) : null;

  const gOdInch = dims?.gasket_OD !== undefined && dims.gasket_OD !== null ? Number(dims.gasket_OD) : null;
  const gOdMm = gOdInch !== null ? Number((gOdInch * 25.4).toFixed(3)) : null;

  const gIdInch = dims?.gasket_ID !== undefined && dims.gasket_ID !== null ? Number(dims.gasket_ID) : null;
  const gIdMm = gIdInch !== null ? Number((gIdInch * 25.4).toFixed(3)) : null;

  return {
    id: p.id,
    internal_id: p.internalId,
    name: p.name,
    image: p.image || null,

    type_id: p.typeId || '',
    type_name: p.typeName || '',
    brand_id: p.brandId || '',
    brand_name: p.brandName || '',
    location_id: p.locationId || '',
    location_name: p.locationName || '',
    cabin_number: p.cabinNumber || '',

    stock_quantity: Number(p.stockQuantity) || 0,
    min_stock_alert: Number(p.minStockAlert) || 5,
    unit: p.unit || 'Pcs',

    cost_price: Number(p.costPrice) || 0,
    last_purchase_price: p.lastPurchasePrice !== undefined ? Number(p.lastPurchasePrice) : null,
    last_purchase_date: p.lastPurchaseDate || null,

    wholesale_price: tier1 ? Number(tier1.price) || 0 : 0,
    retail_price: tier2 ? Number(tier2.price) || 0 : 0,

    tier1_name: tier1?.tierName || 'Wholesale',
    tier1_price: tier1 ? Number(tier1.price) || 0 : 0,
    tier1_markup: tier1 ? Number(tier1.markupPercent) || 10 : 10,

    tier2_name: tier2?.tierName || 'Retail',
    tier2_price: tier2 ? Number(tier2.price) || 0 : 0,
    tier2_markup: tier2 ? Number(tier2.markupPercent) || 25 : 25,

    tier3_name: tier3?.tierName || null,
    tier3_price: tier3 ? Number(tier3.price) : null,
    tier3_markup: tier3 ? Number(tier3.markupPercent) : null,

    tier4_name: tier4?.tierName || null,
    tier4_price: tier4 ? Number(tier4.price) : null,
    tier4_markup: tier4 ? Number(tier4.markupPercent) : null,

    tier5_name: tier5?.tierName || null,
    tier5_price: tier5 ? Number(tier5.price) : null,
    tier5_markup: tier5 ? Number(tier5.markupPercent) : null,

    height_inch: hInch,
    height_mm: hMm,
    outer_dia_inch: odInch,
    outer_dia_mm: odMm,
    inner_dia_inch: idInch,
    inner_dia_mm: idMm,
    dimension_input_unit: dims?.inputUnit || 'inch',
    thread: dims?.thread || null,
    gasket_od_inch: gOdInch,
    gasket_od_mm: gOdMm,
    gasket_id_inch: gIdInch,
    gasket_id_mm: gIdMm,

    label_height: labels?.heightName || 'H',
    label_outer_dia: labels?.outerDiaName || 'OD',
    label_inner_dia: labels?.innerDiaName || 'ID',

    machine_names: p.machineNames || null,
    cross_references: p.crossReferences || null,
    vendor_id: p.vendorId || null,
    vendor_name: p.vendorName || null,
    notes: p.notes || null,
    cost_batches: p.costBatches || null,

    updated_at: new Date().toISOString(),
  };
}

export function supabaseRowToProduct(row: Record<string, any>): Product {
  const sellingPrices: ProductSellingPrice[] = [];

  if (row.tier1_name || row.tier1_price !== undefined || row.wholesale_price !== undefined) {
    sellingPrices.push({
      tierId: 'tier-1',
      tierName: row.tier1_name || 'Wholesale',
      price: Number(row.tier1_price ?? row.wholesale_price ?? 0),
      markupPercent: Number(row.tier1_markup ?? 10),
    });
  }

  if (row.tier2_name || row.tier2_price !== undefined || row.retail_price !== undefined) {
    sellingPrices.push({
      tierId: 'tier-2',
      tierName: row.tier2_name || 'Retail',
      price: Number(row.tier2_price ?? row.retail_price ?? 0),
      markupPercent: Number(row.tier2_markup ?? 25),
    });
  }

  if (row.tier3_name || (row.tier3_price !== null && row.tier3_price !== undefined && row.tier3_price > 0)) {
    sellingPrices.push({
      tierId: 'tier-3',
      tierName: row.tier3_name || 'Tier 3',
      price: Number(row.tier3_price) || 0,
      markupPercent: Number(row.tier3_markup) || 0,
    });
  }

  if (row.tier4_name || (row.tier4_price !== null && row.tier4_price !== undefined && row.tier4_price > 0)) {
    sellingPrices.push({
      tierId: 'tier-4',
      tierName: row.tier4_name || 'Tier 4',
      price: Number(row.tier4_price) || 0,
      markupPercent: Number(row.tier4_markup) || 0,
    });
  }

  if (row.tier5_name || (row.tier5_price !== null && row.tier5_price !== undefined && row.tier5_price > 0)) {
    sellingPrices.push({
      tierId: 'tier-5',
      tierName: row.tier5_name || 'Tier 5',
      price: Number(row.tier5_price) || 0,
      markupPercent: Number(row.tier5_markup) || 0,
    });
  }

  if (sellingPrices.length === 0 && Array.isArray(row.selling_prices)) {
    sellingPrices.push(...row.selling_prices);
  }

  const dimensions: ProductDimensions = {
    height: row.height_inch !== null && row.height_inch !== undefined 
      ? Number(row.height_inch) 
      : (row.dimensions?.height !== undefined ? Number(row.dimensions.height) : undefined),
    outerDia: row.outer_dia_inch !== null && row.outer_dia_inch !== undefined 
      ? Number(row.outer_dia_inch) 
      : (row.dimensions?.outerDia !== undefined ? Number(row.dimensions.outerDia) : undefined),
    innerDia: row.inner_dia_inch !== null && row.inner_dia_inch !== undefined 
      ? Number(row.inner_dia_inch) 
      : (row.dimensions?.innerDia !== undefined ? Number(row.dimensions.innerDia) : undefined),
    inputUnit: (row.dimension_input_unit as DimensionUnit) || (row.dimensions?.inputUnit) || 'inch',
    thread: row.thread || (row.dimensions?.thread) || undefined,
    gasket_OD: row.gasket_od_inch !== null && row.gasket_od_inch !== undefined 
      ? Number(row.gasket_od_inch) 
      : (row.dimensions?.gasket_OD !== undefined ? Number(row.dimensions.gasket_OD) : undefined),
    gasket_ID: row.gasket_id_inch !== null && row.gasket_id_inch !== undefined 
      ? Number(row.gasket_id_inch) 
      : (row.dimensions?.gasket_ID !== undefined ? Number(row.dimensions.gasket_ID) : undefined),
  };

  const dimensionLabels: DimensionLabelConfig = {
    heightName: (row.label_height as 'H' | 'Height') || (row.dimension_labels?.heightName) || 'H',
    outerDiaName: (row.label_outer_dia as 'OD' | 'Length') || (row.dimension_labels?.outerDiaName) || 'OD',
    innerDiaName: (row.label_inner_dia as 'ID' | 'Width') || (row.dimension_labels?.innerDiaName) || 'ID',
  };

  return {
    id: row.id,
    internalId: row.internal_id || row.id,
    name: row.name || '',
    image: row.image || undefined,
    typeId: row.type_id || '',
    typeName: row.type_name || '',
    brandId: row.brand_id || '',
    brandName: row.brand_name || '',
    locationId: row.location_id || '',
    locationName: row.location_name || '',
    cabinNumber: row.cabin_number || '',
    stockQuantity: Number(row.stock_quantity) || 0,
    minStockAlert: Number(row.min_stock_alert) || 5,
    unit: row.unit || 'Pcs',
    costPrice: Number(row.cost_price) || 0,
    lastPurchasePrice: row.last_purchase_price !== null && row.last_purchase_price !== undefined ? Number(row.last_purchase_price) : undefined,
    lastPurchaseDate: row.last_purchase_date || undefined,
    sellingPrices,
    costBatches: row.cost_batches || undefined,
    dimensions,
    dimensionLabels,
    machineNames: row.machine_names || '',
    crossReferences: row.cross_references || '',
    vendorId: row.vendor_id || undefined,
    vendorName: row.vendor_name || undefined,
    notes: row.notes || '',
    createdAt: row.created_at || new Date().toISOString(),
    updatedAt: row.updated_at || new Date().toISOString(),
  };
}

// ==========================================================
// SYNCHRONIZATION FUNCTIONS (INDIVIDUAL & BULK)
// ==========================================================

export async function syncProductsToSupabase(
  client: SupabaseClient,
  products: Product[]
): Promise<{ success: boolean; count: number; error?: string }> {
  try {
    if (products.length === 0) return { success: true, count: 0 };
    const rows = products.map(p => productToSupabaseRow(p));

    const chunkSize = 100;
    for (let i = 0; i < rows.length; i += chunkSize) {
      const chunk = rows.slice(i, i + chunkSize);
      const { error } = await client
        .from('inventory_products')
        .upsert(chunk, { onConflict: 'id' });

      if (error) {
        return { success: false, count: i, error: error.message };
      }
    }

    return { success: true, count: rows.length };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return { success: false, count: 0, error: errorMsg };
  }
}

export async function fetchProductsFromSupabase(
  client: SupabaseClient
): Promise<{ success: boolean; products: Product[]; error?: string }> {
  try {
    const { data, error } = await client
      .from('inventory_products')
      .select('*')
      .order('internal_id', { ascending: true });

    if (error) {
      return { success: false, products: [], error: error.message };
    }

    const products: Product[] = (data || []).map(row => supabaseRowToProduct(row));
    return { success: true, products };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return { success: false, products: [], error: errorMsg };
  }
}

export async function syncCustomersToSupabase(
  client: SupabaseClient,
  customers: Customer[],
  ledgerEntries: CustomerLedgerEntry[]
): Promise<{ success: boolean; customerCount: number; ledgerCount: number; error?: string }> {
  try {
    if (customers.length > 0) {
      const customerRows = customers.map(c => ({
        id: c.id,
        name: c.name,
        type: c.type || 'customer',
        contact_person: c.contactPerson || null,
        phone: c.phone || null,
        secondary_phone: c.secondaryPhone || null,
        email: c.email || null,
        address: c.address || null,
        city: c.city || null,
        ntn: c.ntn || null,
        strn: c.strn || null,
        opening_balance: Number(c.openingBalance) || 0,
        total_purchases: Number(c.totalPurchases) || 0,
        machines: c.machines || [],
        notes: c.notes || null,
        updated_at: new Date().toISOString(),
      }));

      const { error: custErr } = await client
        .from('customers')
        .upsert(customerRows, { onConflict: 'id' });

      if (custErr) return { success: false, customerCount: 0, ledgerCount: 0, error: custErr.message };
    }

    if (ledgerEntries.length > 0) {
      const ledgerRows = ledgerEntries.map(l => ({
        id: l.id,
        customer_id: l.customerId,
        customer_name: l.customerName || null,
        date: l.date,
        type: l.type,
        entry_code: l.entryCode || null,
        bill_number: l.billNumber || null,
        reference_id: l.referenceId || null,
        description: l.description || null,
        debit: Number(l.debit) || 0,
        credit: Number(l.credit) || 0,
        amount: Number(l.amount) || 0,
        payment_method: l.paymentMethod || null,
        receipt_number: l.receiptNumber || null,
        notes: l.notes || null,
      }));

      const { error: ledErr } = await client
        .from('customer_ledger')
        .upsert(ledgerRows, { onConflict: 'id' });

      if (ledErr) return { success: false, customerCount: customers.length, ledgerCount: 0, error: ledErr.message };
    }

    return { success: true, customerCount: customers.length, ledgerCount: ledgerEntries.length };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return { success: false, customerCount: 0, ledgerCount: 0, error: errorMsg };
  }
}

export async function fetchCustomersFromSupabase(
  client: SupabaseClient
): Promise<{ success: boolean; customers: Customer[]; ledger: CustomerLedgerEntry[]; error?: string }> {
  try {
    const [custRes, ledRes] = await Promise.all([
      client.from('customers').select('*').order('name', { ascending: true }),
      client.from('customer_ledger').select('*').order('date', { ascending: false }),
    ]);

    if (custRes.error) return { success: false, customers: [], ledger: [], error: custRes.error.message };
    if (ledRes.error) return { success: false, customers: [], ledger: [], error: ledRes.error.message };

    const customers: Customer[] = (custRes.data || []).map((row: any) => ({
      id: row.id,
      name: row.name,
      type: row.type || 'customer',
      contactPerson: row.contact_person || undefined,
      phone: row.phone || undefined,
      secondaryPhone: row.secondary_phone || undefined,
      email: row.email || undefined,
      address: row.address || undefined,
      city: row.city || undefined,
      ntn: row.ntn || undefined,
      strn: row.strn || undefined,
      openingBalance: Number(row.opening_balance) || 0,
      totalPurchases: Number(row.total_purchases) || 0,
      machines: row.machines || [],
      notes: row.notes || undefined,
      createdAt: row.created_at || new Date().toISOString(),
      updatedAt: row.updated_at || new Date().toISOString(),
    }));

    const ledger: CustomerLedgerEntry[] = (ledRes.data || []).map((row: any) => ({
      id: row.id,
      customerId: row.customer_id,
      customerName: row.customer_name || undefined,
      date: row.date,
      type: row.type,
      entryCode: row.entry_code || 'Entry',
      billNumber: row.bill_number || undefined,
      referenceId: row.reference_id || undefined,
      description: row.description || '',
      debit: Number(row.debit) || 0,
      credit: Number(row.credit) || 0,
      amount: Number(row.amount) || Number(row.debit || row.credit || 0),
      paymentMethod: row.payment_method || undefined,
      receiptNumber: row.receipt_number || undefined,
      notes: row.notes || undefined,
      createdAt: row.created_at || new Date().toISOString(),
    }));

    return { success: true, customers, ledger };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return { success: false, customers: [], ledger: [], error: errorMsg };
  }
}

export async function syncVendorsAndPurchasesToSupabase(
  client: SupabaseClient,
  vendors: Vendor[],
  purchases: Purchase[],
  purchaseOrders: PurchaseOrder[]
): Promise<{ success: boolean; vendorCount: number; purchaseCount: number; poCount: number; error?: string }> {
  try {
    if (vendors.length > 0) {
      const vendorRows = vendors.map(v => ({
        id: v.id,
        business_name: v.businessName,
        contact_person: v.contactPerson || null,
        phone: v.phone || null,
        secondary_phone: v.secondaryPhone || null,
        email: v.email || null,
        address: v.address || null,
        city: v.city || null,
        opening_balance: Number(v.openingBalance) || 0,
        linked_product_ids: v.linkedProductIds || [],
        notes: v.notes || null,
        updated_at: new Date().toISOString(),
      }));

      const { error } = await client.from('vendors').upsert(vendorRows, { onConflict: 'id' });
      if (error) return { success: false, vendorCount: 0, purchaseCount: 0, poCount: 0, error: error.message };
    }

    if (purchaseOrders.length > 0) {
      const poRows = purchaseOrders.map(po => ({
        id: po.id,
        po_number: po.poNumber,
        vendor_id: po.vendorId,
        vendor_name: po.vendorName,
        vendor_phone: po.vendorPhone || null,
        vendor_address: po.vendorAddress || null,
        order_date: po.orderDate,
        expected_delivery_date: po.expectedDeliveryDate || null,
        receiving_date: po.receivingDate || null,
        costs_finalized_date: po.costsFinalizedDate || null,
        status: po.status,
        items: po.items,
        total_ordered_qty: Number(po.totalOrderedQty) || 0,
        total_received_qty: Number(po.totalReceivedQty) || 0,
        cargo_cost: Number(po.cargoCost) || 0,
        cargo_cost_per_unit: Number(po.cargoCostPerUnit) || 0,
        subtotal_base_cost: Number(po.subtotalBaseCost) || 0,
        total_landed_cost: Number(po.totalLandedCost) || 0,
        bill_number: po.billNumber || null,
        bilty_number: po.biltyNumber || null,
        transporter_name: po.transporterName || null,
        amount_paid: Number(po.amountPaid) || 0,
        payment_status: po.paymentStatus || null,
        is_stock_received: po.isStockReceived ?? false,
        is_billed: po.isBilled ?? false,
        notes: po.notes || null,
        updated_at: new Date().toISOString(),
      }));

      const { error } = await client.from('purchase_orders').upsert(poRows, { onConflict: 'id' });
      if (error) return { success: false, vendorCount: vendors.length, purchaseCount: 0, poCount: 0, error: error.message };
    }

    if (purchases.length > 0) {
      const purchaseRows = purchases.map(p => ({
        id: p.id,
        bill_number: p.billNumber,
        po_number: p.poNumber || null,
        vendor_id: p.vendorId,
        vendor_name: p.vendorName,
        date: p.date,
        items: p.items,
        subtotal: Number(p.subtotal) || 0,
        discount_amount: Number(p.discountAmount) || 0,
        total_amount: Number(p.totalAmount) || 0,
        amount_paid: Number(p.amountPaid) || 0,
        balance_due: Number(p.balanceDue) || 0,
        payment_status: p.paymentStatus,
        bilty_number: p.biltyNumber || null,
        transporter_name: p.transporterName || null,
        cargo_cost: Number(p.cargoCost) || 0,
        notes: p.notes || null,
      }));

      const { error } = await client.from('purchases').upsert(purchaseRows, { onConflict: 'id' });
      if (error) return { success: false, vendorCount: vendors.length, purchaseCount: 0, poCount: purchaseOrders.length, error: error.message };
    }

    return { 
      success: true, 
      vendorCount: vendors.length, 
      purchaseCount: purchases.length, 
      poCount: purchaseOrders.length 
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return { success: false, vendorCount: 0, purchaseCount: 0, poCount: 0, error: errorMsg };
  }
}

export async function syncQuotationsToSupabase(
  client: SupabaseClient,
  quotations: Quotation[]
): Promise<{ success: boolean; count: number; error?: string }> {
  try {
    if (quotations.length === 0) return { success: true, count: 0 };
    const rows = quotations.map(q => ({
      id: q.id,
      quotation_number: q.quotationNumber,
      customer_id: q.customerId || null,
      customer_type: q.customerType || 'customer',
      customer_name: q.customerName,
      contact_person: q.contactPerson || null,
      customer_phone: q.customerPhone || null,
      customer_email: q.customerEmail || null,
      customer_address: q.customerAddress || null,
      customer_city: q.customerCity || null,
      customer_ntn: q.customerNtn || null,
      customer_strn: q.customerStrn || null,
      date: q.date,
      valid_until: q.validUntil,
      validity_days: Number(q.validityDays) || 7,
      items: q.items,
      subtotal: Number(q.subtotal) || 0,
      discount_type: q.discountType || 'amount',
      discount_value: Number(q.discountValue) || 0,
      discount_amount: Number(q.discountAmount) || 0,
      tax_percent: Number(q.taxPercent) || 0,
      tax_amount: Number(q.taxAmount) || 0,
      total_amount: Number(q.totalAmount) || 0,
      status: q.status,
      terms_and_conditions: q.termsAndConditions || null,
      notes: q.notes || null,
      converted_sale_id: q.convertedSaleId || null,
      converted_at: q.convertedAt || null,
      updated_at: new Date().toISOString(),
    }));

    const { error } = await client.from('quotations').upsert(rows, { onConflict: 'id' });
    if (error) return { success: false, count: 0, error: error.message };
    return { success: true, count: rows.length };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return { success: false, count: 0, error: errorMsg };
  }
}

export async function syncDemandsToSupabase(
  client: SupabaseClient,
  demands: Demand[]
): Promise<{ success: boolean; count: number; error?: string }> {
  try {
    if (demands.length === 0) return { success: true, count: 0 };
    const rows = demands.map(d => ({
      id: d.id,
      demand_number: d.demandNumber,
      customer_id: d.customerId || null,
      customer_name: d.customerName,
      customer_phone: d.customerPhone || null,
      location: d.location || null,
      item_name: d.itemName,
      product_id: d.productId || null,
      item_details: d.itemDetails || null,
      quantity: Number(d.quantity) || 1,
      unit: d.unit || 'Pcs',
      target_price: d.targetPrice ? Number(d.targetPrice) : null,
      required_date: d.requiredDate || null,
      status: d.status || 'pending',
      unfulfillable_reason: d.unfulfillableReason || null,
      cancellation_reason: d.cancellationReason || null,
      fulfilled_sale_id: d.fulfilledSaleId || null,
      fulfilled_at: d.fulfilledAt || null,
      notes: d.notes || null,
      updated_at: new Date().toISOString(),
    }));

    const { error } = await client.from('demands').upsert(rows, { onConflict: 'id' });
    if (error) return { success: false, count: 0, error: error.message };
    return { success: true, count: rows.length };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return { success: false, count: 0, error: errorMsg };
  }
}

export async function syncExpensesToSupabase(
  client: SupabaseClient,
  expenses: Expense[]
): Promise<{ success: boolean; count: number; error?: string }> {
  try {
    if (expenses.length === 0) return { success: true, count: 0 };
    const rows = expenses.map(e => ({
      id: e.id,
      expense_number: e.expenseNumber,
      title: e.title,
      category: e.category,
      amount: Number(e.amount) || 0,
      date: e.date,
      payment_method: e.paymentMethod || 'Cash',
      paid_to: e.paidTo || null,
      receipt_number: e.receiptNumber || null,
      notes: e.notes || null,
      updated_at: new Date().toISOString(),
    }));

    const { error } = await client.from('expenses').upsert(rows, { onConflict: 'id' });
    if (error) return { success: false, count: 0, error: error.message };
    return { success: true, count: rows.length };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return { success: false, count: 0, error: errorMsg };
  }
}

export async function syncStaffAndDevicesToSupabase(
  client: SupabaseClient,
  employees: EmployeeAccount[],
  devices: RegisteredDevice[]
): Promise<{ success: boolean; employeeCount: number; deviceCount: number; error?: string }> {
  try {
    if (employees.length > 0) {
      const empRows = employees.map(e => ({
        id: e.id,
        name: e.name,
        email: e.email,
        phone: e.phone || null,
        pin: e.pin,
        password: e.password || null,
        role: e.role,
        designation: e.designation,
        status: e.status,
        permissions: e.permissions,
        restrict_to_devices: e.restrictToDevices ?? false,
        allowed_device_ids: e.allowedDeviceIds || [],
        avatar_color: e.avatarColor || null,
        last_login_at: e.lastLoginAt || null,
        last_login_device_id: e.lastLoginDeviceId || null,
        notes: e.notes || null,
      }));

      const { error } = await client.from('employee_accounts').upsert(empRows, { onConflict: 'id' });
      if (error) return { success: false, employeeCount: 0, deviceCount: 0, error: error.message };
    }

    if (devices.length > 0) {
      const devRows = devices.map(d => ({
        id: d.id,
        name: d.name,
        os: d.os,
        device_type: d.deviceType,
        browser: d.browser || null,
        user_agent: d.userAgent || null,
        registered_at: d.registeredAt,
        last_seen_at: d.lastSeenAt,
        is_trusted: d.isTrusted ?? true,
        notes: d.notes || null,
      }));

      const { error } = await client.from('registered_devices').upsert(devRows, { onConflict: 'id' });
      if (error) return { success: false, employeeCount: employees.length, deviceCount: 0, error: error.message };
    }

    return { success: true, employeeCount: employees.length, deviceCount: devices.length };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return { success: false, employeeCount: 0, deviceCount: 0, error: errorMsg };
  }
}

export async function syncMasterDataToSupabase(
  client: SupabaseClient,
  brands: Brand[],
  types: ProductType[],
  locations: LocationItem[]
): Promise<{ success: boolean; count: number; error?: string }> {
  try {
    if (brands.length > 0) {
      const brandRows = brands.map(b => ({ id: b.id, name: b.name, item_count: b.itemCount || 0 }));
      await client.from('inventory_brands').upsert(brandRows, { onConflict: 'id' });
    }
    if (types.length > 0) {
      const typeRows = types.map(t => ({ id: t.id, name: t.name, item_count: t.itemCount || 0 }));
      await client.from('inventory_categories').upsert(typeRows, { onConflict: 'id' });
    }
    if (locations.length > 0) {
      const locRows = locations.map(l => ({ id: l.id, name: l.name, cabins: l.cabins || [] }));
      await client.from('inventory_locations').upsert(locRows, { onConflict: 'id' });
    }
    return { success: true, count: brands.length + types.length + locations.length };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return { success: false, count: 0, error: errorMsg };
  }
}

export interface FullSyncDataBundle {
  products: Product[];
  brands: Brand[];
  types: ProductType[];
  locations: LocationItem[];
  customers: Customer[];
  customerLedger: CustomerLedgerEntry[];
  vendors: Vendor[];
  purchases: Purchase[];
  purchaseOrders: PurchaseOrder[];
  quotations: Quotation[];
  demands: Demand[];
  expenses: Expense[];
  employees: EmployeeAccount[];
  registeredDevices: RegisteredDevice[];
  stockLogs: StockLog[];
}

export interface FullSyncResult {
  success: boolean;
  message: string;
  syncedCounts: {
    products: number;
    customers: number;
    customerLedger: number;
    vendors: number;
    purchases: number;
    purchaseOrders: number;
    quotations: number;
    demands: number;
    expenses: number;
    employees: number;
    devices: number;
    masterData: number;
  };
  errors: string[];
}

/**
 * Performs a complete multi-table sync from the local ERP state into all Supabase cloud tables.
 */
export async function syncAllModulesToSupabase(
  client: SupabaseClient,
  bundle: FullSyncDataBundle
): Promise<FullSyncResult> {
  const errors: string[] = [];
  const syncedCounts = {
    products: 0,
    customers: 0,
    customerLedger: 0,
    vendors: 0,
    purchases: 0,
    purchaseOrders: 0,
    quotations: 0,
    demands: 0,
    expenses: 0,
    employees: 0,
    devices: 0,
    masterData: 0,
  };

  // 1. Products
  try {
    const prodRes = await syncProductsToSupabase(client, bundle.products);
    if (prodRes.success) syncedCounts.products = prodRes.count;
    else if (prodRes.error) errors.push(`Products: ${prodRes.error}`);
  } catch (e: any) {
    errors.push(`Products: ${e.message}`);
  }

  // 2. Master Data
  try {
    const masterRes = await syncMasterDataToSupabase(client, bundle.brands, bundle.types, bundle.locations);
    if (masterRes.success) syncedCounts.masterData = masterRes.count;
    else if (masterRes.error) errors.push(`Master Data: ${masterRes.error}`);
  } catch (e: any) {
    errors.push(`Master Data: ${e.message}`);
  }

  // 3. Customers & Ledgers
  try {
    const custRes = await syncCustomersToSupabase(client, bundle.customers, bundle.customerLedger);
    if (custRes.success) {
      syncedCounts.customers = custRes.customerCount;
      syncedCounts.customerLedger = custRes.ledgerCount;
    } else if (custRes.error) errors.push(`Customers: ${custRes.error}`);
  } catch (e: any) {
    errors.push(`Customers: ${e.message}`);
  }

  // 4. Vendors & Purchases
  try {
    const vendRes = await syncVendorsAndPurchasesToSupabase(client, bundle.vendors, bundle.purchases, bundle.purchaseOrders);
    if (vendRes.success) {
      syncedCounts.vendors = vendRes.vendorCount;
      syncedCounts.purchases = vendRes.purchaseCount;
      syncedCounts.purchaseOrders = vendRes.poCount;
    } else if (vendRes.error) errors.push(`Vendors & Purchases: ${vendRes.error}`);
  } catch (e: any) {
    errors.push(`Vendors & Purchases: ${e.message}`);
  }

  // 5. Quotations
  try {
    const quoteRes = await syncQuotationsToSupabase(client, bundle.quotations);
    if (quoteRes.success) syncedCounts.quotations = quoteRes.count;
    else if (quoteRes.error) errors.push(`Quotations: ${quoteRes.error}`);
  } catch (e: any) {
    errors.push(`Quotations: ${e.message}`);
  }

  // 6. Demands
  try {
    const demRes = await syncDemandsToSupabase(client, bundle.demands);
    if (demRes.success) syncedCounts.demands = demRes.count;
    else if (demRes.error) errors.push(`Demands: ${demRes.error}`);
  } catch (e: any) {
    errors.push(`Demands: ${e.message}`);
  }

  // 7. Expenses
  try {
    const expRes = await syncExpensesToSupabase(client, bundle.expenses);
    if (expRes.success) syncedCounts.expenses = expRes.count;
    else if (expRes.error) errors.push(`Expenses: ${expRes.error}`);
  } catch (e: any) {
    errors.push(`Expenses: ${e.message}`);
  }

  // 8. Staff & Devices
  try {
    const staffRes = await syncStaffAndDevicesToSupabase(client, bundle.employees, bundle.registeredDevices);
    if (staffRes.success) {
      syncedCounts.employees = staffRes.employeeCount;
      syncedCounts.devices = staffRes.deviceCount;
    } else if (staffRes.error) errors.push(`Staff & Devices: ${staffRes.error}`);
  } catch (e: any) {
    errors.push(`Staff & Devices: ${e.message}`);
  }

  const isFullSuccess = errors.length === 0;
  const totalRecords = Object.values(syncedCounts).reduce((a, b) => a + b, 0);

  return {
    success: isFullSuccess || totalRecords > 0,
    message: isFullSuccess 
      ? `Full Cloud Synchronization completed! Total ${totalRecords} records across all modules updated in Supabase.`
      : `Synchronized ${totalRecords} records with ${errors.length} warning(s). Check missing tables.`,
    syncedCounts,
    errors,
  };
}
