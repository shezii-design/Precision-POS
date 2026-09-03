import { createClient, SupabaseClient } from '@supabase/supabase-js';

async function exactSyncRows(
  client: SupabaseClient,
  tableName: string,
  rows: any[],
  idCol: string = 'id'
): Promise<{ success: boolean; count: number; error?: string }> {
  try {
    let existing: any[] = [];
    let hasMore = true;
    let from = 0;
    const step = 1000;

    while (hasMore) {
      const { data, error: selectErr } = await client.from(tableName).select(idCol).range(from, from + step - 1);
      if (selectErr && selectErr.code !== '42P01') throw selectErr; // Ignore table missing if it doesn't exist yet
      if (selectErr && selectErr.code === '42P01') {
        hasMore = false;
        break;
      }
      if (data && data.length > 0) {
        existing = existing.concat(data);
        from += step;
        if (data.length < step) hasMore = false;
      } else {
        hasMore = false;
      }
    }
    
    const existingIds = new Set(existing.map(r => r[idCol]));
    const currentIds = new Set(rows.map(r => r[idCol]));
    const idsToDelete = [...existingIds].filter(id => !currentIds.has(id));
    
    if (idsToDelete.length > 0) {
      for (let i = 0; i < idsToDelete.length; i += 100) {
        await client.from(tableName).delete().in(idCol, idsToDelete.slice(i, i + 100));
      }
    }
    
    if (rows.length > 0) {
      for (let i = 0; i < rows.length; i += 100) {
        const { error: upsertErr } = await client.from(tableName).upsert(rows.slice(i, i + 100), { onConflict: idCol });
        if (upsertErr) throw upsertErr;
      }
    }
    
    return { success: true, count: rows.length };
  } catch (err: any) {
    return { success: false, count: 0, error: err.message || String(err) };
  }
}

import { 
  Brand,
  Customer, 
  CustomerLedgerEntry, 
  CustomerReturn,
  Demand, 
  DimensionLabelConfig, 
  DimensionUnit, 
  EmployeeAccount, 
  Expense, 
  GlobalPricingSettings,
  LocationItem, 
  Product, 
  ProductDimensions, 
  ProductSellingPrice, 
  ProductType, 
  Purchase, 
  PurchaseOrder, 
  Quotation, 
  RegisteredDevice, 
  Sale,
  StockLog, 
  SupabaseConfig, 
  Vendor, 
  VendorLedgerEntry,
  VendorReturn
} from '../types';

let supabaseInstance: SupabaseClient | null = null;
let currentClientKey = '';

/**
 * Reads Supabase Project URL and Anon API Key from environment variables (.env / process.env)
 * or saved configuration in local storage.
 */
export function getEnvSupabaseConfig(): { 
  url: string; 
  anonKey: string; 
  isConfigured: boolean; 
  source: 'env' | 'localStorage' | 'none';
} {
  let url = '';
  let anonKey = '';
  let source: 'env' | 'localStorage' | 'none' = 'none';

  // 1. Check Vite import.meta.env (.env file)
  try {
    // @ts-ignore
    const viteUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
    // @ts-ignore
    const viteKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();
    if (viteUrl && viteKey) {
      url = viteUrl;
      anonKey = viteKey;
      source = 'env';
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

  // 3. Fallback to localStorage if configured via Settings
  if (!url) {
    try {
      const stored = localStorage.getItem('kfh_inventory_supabase_config_v1');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed?.url && parsed?.anonKey) {
          url = parsed.url.trim();
          anonKey = parsed.anonKey.trim();
          source = 'localStorage';
        }
      }
    } catch {
      // Graceful fallback
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
    { name: 'sales', label: 'POS Sales & Invoices' },
    { name: 'customer_returns', label: 'Customer Sales Returns' },
    { name: 'vendors', label: 'Vendor Directory' },
    { name: 'vendor_ledger', label: 'Vendor Financial Ledger' },
    { name: 'vendor_returns', label: 'Vendor Purchase Returns' },
    { name: 'purchase_orders', label: 'Purchase Orders' },
    { name: 'purchases', label: 'Purchase Bills' },
    { name: 'quotations', label: 'Quotations & Estimates' },
    { name: 'demands', label: 'Customer Out-of-Stock Demands' },
    { name: 'expenses', label: 'Operating Expense Records' },
    { name: 'employee_accounts', label: 'Staff Accounts & Roles' },
    { name: 'registered_devices', label: 'Registered Workstations' },
    { name: 'stock_logs', label: 'Stock Movement Audit Logs' },
    { name: 'pricing_settings', label: 'Global Pricing Settings' },
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

-- 3B. POS SALES & CUSTOMER RETURNS
CREATE TABLE IF NOT EXISTS sales (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL,
  customer_id TEXT,
  customer_name TEXT NOT NULL,
  customer_phone TEXT,
  vendor_id TEXT,
  vendor_name TEXT,
  is_vendor_sale BOOLEAN DEFAULT FALSE,
  items JSONB NOT NULL,
  subtotal NUMERIC DEFAULT 0,
  discount_type TEXT DEFAULT 'amount',
  discount_value NUMERIC DEFAULT 0,
  discount_amount NUMERIC DEFAULT 0,
  total_amount NUMERIC DEFAULT 0,
  total_cost NUMERIC DEFAULT 0,
  total_profit NUMERIC DEFAULT 0,
  amount_received NUMERIC DEFAULT 0,
  change_returned NUMERIC DEFAULT 0,
  balance_due NUMERIC DEFAULT 0,
  payment_type TEXT DEFAULT 'cash',
  status TEXT DEFAULT 'completed',
  return_status TEXT DEFAULT 'none',
  total_refund_amount NUMERIC DEFAULT 0,
  net_sale_amount NUMERIC DEFAULT 0,
  return_summaries JSONB,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS customer_returns (
  id TEXT PRIMARY KEY,
  return_number TEXT NOT NULL,
  credit_note_number TEXT,
  sale_id TEXT NOT NULL,
  customer_id TEXT,
  customer_name TEXT NOT NULL,
  date TEXT NOT NULL,
  items JSONB NOT NULL,
  total_refund_amount NUMERIC DEFAULT 0,
  refund_method TEXT DEFAULT 'cash',
  reason TEXT,
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

CREATE TABLE IF NOT EXISTS vendor_ledger (
  id TEXT PRIMARY KEY,
  vendor_id TEXT NOT NULL,
  vendor_name TEXT,
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

CREATE TABLE IF NOT EXISTS vendor_returns (
  id TEXT PRIMARY KEY,
  return_number TEXT NOT NULL,
  purchase_id TEXT NOT NULL,
  vendor_id TEXT NOT NULL,
  vendor_name TEXT NOT NULL,
  date TEXT NOT NULL,
  items JSONB NOT NULL,
  total_refund_amount NUMERIC DEFAULT 0,
  settlement_type TEXT DEFAULT 'cash',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
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

-- 10. GLOBAL PRICING & ERP SETTINGS
CREATE TABLE IF NOT EXISTS pricing_settings (
  id TEXT PRIMARY KEY,
  settings JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- INDEXES FOR INSTANT QUERIES
CREATE INDEX IF NOT EXISTS idx_products_internal_id ON inventory_products(internal_id);
CREATE INDEX IF NOT EXISTS idx_products_name ON inventory_products(name);
CREATE INDEX IF NOT EXISTS idx_customer_ledger_cid ON customer_ledger(customer_id);
CREATE INDEX IF NOT EXISTS idx_vendor_ledger_vid ON vendor_ledger(vendor_id);
CREATE INDEX IF NOT EXISTS idx_sales_date ON sales(date);
CREATE INDEX IF NOT EXISTS idx_sales_cid ON sales(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_returns_sale_id ON customer_returns(sale_id);
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

ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public full access sales" ON sales;
CREATE POLICY "Public full access sales" ON sales FOR ALL USING (true);

ALTER TABLE customer_returns ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public full access customer_returns" ON customer_returns;
CREATE POLICY "Public full access customer_returns" ON customer_returns FOR ALL USING (true);

ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public full access vendors" ON vendors;
CREATE POLICY "Public full access vendors" ON vendors FOR ALL USING (true);

ALTER TABLE vendor_ledger ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public full access vendor_ledger" ON vendor_ledger;
CREATE POLICY "Public full access vendor_ledger" ON vendor_ledger FOR ALL USING (true);

ALTER TABLE vendor_returns ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public full access vendor_returns" ON vendor_returns;
CREATE POLICY "Public full access vendor_returns" ON vendor_returns FOR ALL USING (true);

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

ALTER TABLE pricing_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public full access pricing_settings" ON pricing_settings;
CREATE POLICY "Public full access pricing_settings" ON pricing_settings FOR ALL USING (true);
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
    const rows = products.map(p => productToSupabaseRow(p));

    return await exactSyncRows(client, 'inventory_products', rows, 'id');
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

      const custRes = await exactSyncRows(client, 'customers', customerRows, 'id');
      if (!custRes.success) return { success: false, customerCount: 0, ledgerCount: 0, error: custRes.error };


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

      const vRes = await exactSyncRows(client, 'vendors', vendorRows, 'id');
      if (!vRes.success) return { success: false, vendorCount: 0, purchaseCount: 0, poCount: 0, error: vRes.error };
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

    return await exactSyncRows(client, 'quotations', rows, 'id');
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

    return await exactSyncRows(client, 'demands', rows, 'id');
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

    return await exactSyncRows(client, 'expenses', rows, 'id');
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
    const brandRows = brands.map(b => ({ id: b.id, name: b.name, item_count: b.itemCount || 0 }));
    await exactSyncRows(client, 'inventory_brands', brandRows, 'id');

    const typeRows = types.map(t => ({ id: t.id, name: t.name, item_count: t.itemCount || 0 }));
    await exactSyncRows(client, 'inventory_categories', typeRows, 'id');

    const locRows = locations.map(l => ({ id: l.id, name: l.name, cabins: l.cabins || [] }));
    await exactSyncRows(client, 'inventory_locations', locRows, 'id');
    return { success: true, count: brands.length + types.length + locations.length };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return { success: false, count: 0, error: errorMsg };
  }
}

export async function syncSalesToSupabase(
  client: SupabaseClient,
  sales: Sale[]
): Promise<{ success: boolean; count: number; error?: string }> {
  try {
    const rows = sales.map(s => ({
      id: s.id,
      date: s.date,
      customer_id: s.customerId || null,
      customer_name: s.customerName,
      customer_phone: s.customerPhone || null,
      vendor_id: s.vendorId || null,
      vendor_name: s.vendorName || null,
      is_vendor_sale: s.isVendorSale || false,
      items: s.items || [],
      subtotal: Number(s.subtotal) || 0,
      discount_type: s.discountType || 'amount',
      discount_value: Number(s.discountValue) || 0,
      discount_amount: Number(s.discountAmount) || 0,
      total_amount: Number(s.totalAmount) || 0,
      total_cost: Number(s.totalCost) || 0,
      total_profit: Number(s.totalProfit) || 0,
      amount_received: Number(s.amountReceived) || 0,
      change_given: Number(s.changeGiven) || 0,
      balance_due: Number(s.balanceDue) || 0,
      payment_type: s.paymentType || 'cash',
      payment_status: s.paymentStatus || 'paid',
      has_returns: s.hasReturns || false,
      total_returned_amount: Number(s.totalReturnedAmount) || 0,
      net_amount: Number(s.netAmount ?? s.totalAmount) || 0,
      net_balance_due: Number(s.netBalanceDue) || 0,
      returned_items_count: Number(s.returnedItemsCount) || 0,
      returns_list: s.returnsList || [],
      invoice_naming_preference: s.invoiceNamingPreference || 'product_name',
      notes: s.notes || null,
      created_at: s.createdAt || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));

    return await exactSyncRows(client, 'sales', rows, 'id');
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return { success: false, count: 0, error: errorMsg };
  }
}

export async function fetchSalesFromSupabase(
  client: SupabaseClient
): Promise<{ success: boolean; sales: Sale[]; error?: string }> {
  try {
    const { data, error } = await client.from('sales').select('*').order('date', { ascending: false });
    if (error) return { success: false, sales: [], error: error.message };
    const sales: Sale[] = (data || []).map(r => ({
      id: r.id,
      date: r.date,
      customerId: r.customer_id || undefined,
      customerName: r.customer_name || 'Walk-in Customer',
      customerPhone: r.customer_phone || undefined,
      vendorId: r.vendor_id || undefined,
      vendorName: r.vendor_name || undefined,
      isVendorSale: r.is_vendor_sale || false,
      items: Array.isArray(r.items) ? r.items : [],
      subtotal: Number(r.subtotal) || 0,
      discountType: r.discount_type || 'amount',
      discountValue: Number(r.discount_value) || 0,
      discountAmount: Number(r.discount_amount) || 0,
      totalAmount: Number(r.total_amount) || 0,
      totalCost: Number(r.total_cost) || 0,
      totalProfit: Number(r.total_profit) || 0,
      amountReceived: Number(r.amount_received) || 0,
      changeGiven: Number(r.change_given) || 0,
      balanceDue: Number(r.balance_due) || 0,
      paymentType: r.payment_type || 'cash',
      paymentStatus: r.payment_status || 'paid',
      hasReturns: r.has_returns || false,
      totalReturnedAmount: Number(r.total_returned_amount) || 0,
      netAmount: Number(r.net_amount ?? r.total_amount) || 0,
      netBalanceDue: Number(r.net_balance_due) || 0,
      returnedItemsCount: Number(r.returned_items_count) || 0,
      returnsList: Array.isArray(r.returns_list) ? r.returns_list : undefined,
      invoiceNamingPreference: r.invoice_naming_preference || 'product_name',
      notes: r.notes || undefined,
      createdAt: r.created_at || new Date().toISOString(),
      updatedAt: r.updated_at || undefined,
    }));
    return { success: true, sales };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return { success: false, sales: [], error: errorMsg };
  }
}

export async function syncCustomerReturnsToSupabase(
  client: SupabaseClient,
  returns: CustomerReturn[]
): Promise<{ success: boolean; count: number; error?: string }> {
  try {
    const rows = returns.map(r => ({
      id: r.id,
      return_number: r.returnNumber,
      credit_note_number: r.creditNoteNumber || null,
      sale_id: r.saleId,
      customer_id: r.customerId || null,
      customer_name: r.customerName,
      date: r.date,
      items: r.items || [],
      subtotal: Number(r.subtotal) || 0,
      deduction_or_restock_fee: Number(r.deductionOrRestockFee) || 0,
      total_refund_amount: Number(r.totalRefundAmount) || 0,
      refund_method: r.refundMethod || 'cash_refund',
      refund_status: r.refundStatus || 'completed',
      notes: r.notes || null,
      created_at: r.createdAt || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));
    return await exactSyncRows(client, 'customer_returns', rows, 'id');
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return { success: false, count: 0, error: errorMsg };
  }
}

export async function fetchCustomerReturnsFromSupabase(
  client: SupabaseClient
): Promise<{ success: boolean; returns: CustomerReturn[]; error?: string }> {
  try {
    const { data, error } = await client.from('customer_returns').select('*').order('date', { ascending: false });
    if (error) return { success: false, returns: [], error: error.message };
    const returns: CustomerReturn[] = (data || []).map(r => ({
      id: r.id,
      returnNumber: r.return_number,
      creditNoteNumber: r.credit_note_number || undefined,
      saleId: r.sale_id,
      customerId: r.customer_id || undefined,
      customerName: r.customer_name,
      customerPhone: r.customer_phone || undefined,
      date: r.date,
      items: Array.isArray(r.items) ? r.items : [],
      subtotal: Number(r.subtotal) || 0,
      deductionOrRestockFee: Number(r.deduction_or_restock_fee) || 0,
      totalRefundAmount: Number(r.total_refund_amount) || 0,
      refundMethod: r.refund_method || 'cash_refund',
      refundStatus: r.refund_status || 'completed',
      notes: r.notes || undefined,
      createdAt: r.created_at || new Date().toISOString(),
      updatedAt: r.updated_at || undefined,
    }));
    return { success: true, returns };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return { success: false, returns: [], error: errorMsg };
  }
}

export async function syncVendorLedgerToSupabase(
  client: SupabaseClient,
  ledger: VendorLedgerEntry[]
): Promise<{ success: boolean; count: number; error?: string }> {
  try {
    const rows = ledger.map(v => ({
      id: v.id,
      vendor_id: v.vendorId,
      vendor_name: v.vendorName || null,
      date: v.date,
      type: v.type,
      entry_code: v.entryCode || null,
      bill_number: v.billNumber || null,
      reference_id: v.referenceId || null,
      description: v.description || '',
      debit: Number(v.debit) || 0,
      credit: Number(v.credit) || 0,
      amount: Number(v.amount) || 0,
      payment_method: v.paymentMethod || null,
      receipt_number: v.receiptNumber || null,
      notes: v.notes || null,
    }));
    return await exactSyncRows(client, 'vendor_ledger', rows, 'id');
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return { success: false, count: 0, error: errorMsg };
  }
}

export async function fetchVendorLedgerFromSupabase(
  client: SupabaseClient
): Promise<{ success: boolean; ledger: VendorLedgerEntry[]; error?: string }> {
  try {
    const { data, error } = await client.from('vendor_ledger').select('*').order('date', { ascending: false });
    if (error) return { success: false, ledger: [], error: error.message };
    const ledger: VendorLedgerEntry[] = (data || []).map(r => ({
      id: r.id,
      vendorId: r.vendor_id,
      vendorName: r.vendor_name || undefined,
      date: r.date,
      type: r.type,
      entryCode: r.entry_code || '',
      billNumber: r.bill_number || undefined,
      referenceId: r.reference_id || undefined,
      description: r.description || '',
      debit: Number(r.debit) || 0,
      credit: Number(r.credit) || 0,
      amount: Number(r.amount) || 0,
      paymentMethod: r.payment_method || undefined,
      receiptNumber: r.receipt_number || undefined,
      notes: r.notes || undefined,
      createdAt: r.created_at || new Date().toISOString(),
    }));
    return { success: true, ledger };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return { success: false, ledger: [], error: errorMsg };
  }
}

export async function syncVendorReturnsToSupabase(
  client: SupabaseClient,
  returns: VendorReturn[]
): Promise<{ success: boolean; count: number; error?: string }> {
  try {
    const rows = returns.map(r => ({
      id: r.id,
      return_number: r.returnNumber,
      purchase_id: r.purchaseId,
      vendor_id: r.vendorId,
      vendor_name: r.vendorName,
      date: r.date,
      items: r.items || [],
      subtotal: Number(r.subtotal) || 0,
      total_amount: Number(r.totalAmount) || 0,
      settlement_method: r.settlementMethod || 'cash_refund',
      settlement_status: r.settlementStatus || 'completed',
      notes: r.notes || null,
      created_at: r.createdAt || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));
    return await exactSyncRows(client, 'vendor_returns', rows, 'id');
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return { success: false, count: 0, error: errorMsg };
  }
}

export async function fetchVendorReturnsFromSupabase(
  client: SupabaseClient
): Promise<{ success: boolean; returns: VendorReturn[]; error?: string }> {
  try {
    const { data, error } = await client.from('vendor_returns').select('*').order('date', { ascending: false });
    if (error) return { success: false, returns: [], error: error.message };
    const returns: VendorReturn[] = (data || []).map(r => ({
      id: r.id,
      returnNumber: r.return_number,
      debitNoteNumber: r.debit_note_number || undefined,
      purchaseId: r.purchase_id || undefined,
      vendorId: r.vendor_id,
      vendorName: r.vendor_name,
      date: r.date,
      items: Array.isArray(r.items) ? r.items : [],
      subtotal: Number(r.subtotal) || 0,
      totalAmount: Number(r.total_amount) || 0,
      settlementMethod: r.settlement_method || 'cash_refund',
      settlementStatus: r.settlement_status || 'completed',
      notes: r.notes || undefined,
      createdAt: r.created_at || new Date().toISOString(),
      updatedAt: r.updated_at || undefined,
    }));
    return { success: true, returns };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return { success: false, returns: [], error: errorMsg };
  }
}

export async function syncPricingSettingsToSupabase(
  client: SupabaseClient,
  settings: GlobalPricingSettings
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await client.from('pricing_settings').upsert({
      id: 'default',
      settings,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'id' });
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return { success: false, error: errorMsg };
  }
}

export async function fetchPricingSettingsFromSupabase(
  client: SupabaseClient
): Promise<{ success: boolean; settings?: GlobalPricingSettings; error?: string }> {
  try {
    const { data, error } = await client.from('pricing_settings').select('*').eq('id', 'default').single();
    if (error) return { success: false, error: error.message };
    if (data?.settings) return { success: true, settings: data.settings as GlobalPricingSettings };
    return { success: false, error: 'Settings not found' };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return { success: false, error: errorMsg };
  }
}

export async function syncStockLogsToSupabase(
  client: SupabaseClient,
  logs: StockLog[]
): Promise<{ success: boolean; count: number; error?: string }> {
  try {
    const rows = logs.map(l => ({
      id: l.id,
      product_id: l.productId,
      product_name: l.productName,
      internal_id: l.internalId,
      brand_name: l.brandName || null,
      type_name: l.typeName || null,
      unit: l.unit || null,
      change: Number(l.change) || 0,
      previous_stock: Number(l.previousStock) || 0,
      new_stock: Number(l.newStock) || 0,
      reason: l.reason || null,
      movement_type: l.movementType || null,
      reference_id: l.referenceId || null,
      reference_number: l.referenceNumber || null,
      entity_name: l.entityName || null,
      unit_rate: l.unitRate || null,
      total_movement_value: l.totalMovementValue || null,
      location_name: l.locationName || null,
      cabin_number: l.cabinNumber || null,
      timestamp: l.timestamp,
      notes: l.notes || null,
    }));
    return await exactSyncRows(client, 'stock_logs', rows, 'id');
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return { success: false, count: 0, error: errorMsg };
  }
}

export async function fetchStockLogsFromSupabase(
  client: SupabaseClient
): Promise<{ success: boolean; logs: StockLog[]; error?: string }> {
  try {
    const { data, error } = await client.from('stock_logs').select('*').order('timestamp', { ascending: false });
    if (error) return { success: false, logs: [], error: error.message };
    const logs: StockLog[] = (data || []).map(r => ({
      id: r.id,
      productId: r.product_id,
      productName: r.product_name,
      internalId: r.internal_id,
      brandName: r.brand_name || undefined,
      typeName: r.type_name || undefined,
      unit: r.unit || undefined,
      change: Number(r.change) || 0,
      previousStock: Number(r.previous_stock) || 0,
      newStock: Number(r.new_stock) || 0,
      reason: r.reason,
      movementType: r.movement_type || undefined,
      referenceId: r.reference_id || undefined,
      referenceNumber: r.reference_number || undefined,
      entityName: r.entity_name || undefined,
      unitRate: r.unit_rate ? Number(r.unit_rate) : undefined,
      totalMovementValue: r.total_movement_value ? Number(r.total_movement_value) : undefined,
      locationName: r.location_name || undefined,
      cabinNumber: r.cabin_number || undefined,
      timestamp: r.timestamp || r.created_at || new Date().toISOString(),
      notes: r.notes || undefined,
    }));
    return { success: true, logs };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return { success: false, logs: [], error: errorMsg };
  }
}

export async function fetchVendorsAndPurchasesFromSupabase(
  client: SupabaseClient
): Promise<{ success: boolean; vendors: Vendor[]; purchases: Purchase[]; purchaseOrders: PurchaseOrder[]; error?: string }> {
  try {
    const [vRes, pRes, poRes] = await Promise.all([
      client.from('vendors').select('*').order('business_name', { ascending: true }),
      client.from('purchases').select('*').order('date', { ascending: false }),
      client.from('purchase_orders').select('*').order('order_date', { ascending: false }),
    ]);

    const vendors: Vendor[] = (vRes.data || []).map(r => ({
      id: r.id,
      businessName: r.business_name,
      contactPerson: r.contact_person || undefined,
      phone: r.phone || undefined,
      secondaryPhone: r.secondary_phone || undefined,
      email: r.email || undefined,
      address: r.address || undefined,
      city: r.city || undefined,
      openingBalance: Number(r.opening_balance) || 0,
      linkedProductIds: Array.isArray(r.linked_product_ids) ? r.linked_product_ids : [],
      notes: r.notes || undefined,
      createdAt: r.created_at || new Date().toISOString(),
      updatedAt: r.updated_at || undefined,
    }));

    const purchases: Purchase[] = (pRes.data || []).map(r => ({
      id: r.id,
      billNumber: r.bill_number,
      poNumber: r.po_number || undefined,
      vendorId: r.vendor_id,
      vendorName: r.vendor_name,
      date: r.date,
      items: Array.isArray(r.items) ? r.items : [],
      subtotal: Number(r.subtotal) || 0,
      discountAmount: Number(r.discount_amount) || 0,
      totalAmount: Number(r.total_amount) || 0,
      amountPaid: Number(r.amount_paid) || 0,
      balanceDue: Number(r.balance_due) || 0,
      paymentStatus: r.payment_status || 'unpaid',
      biltyNumber: r.bilty_number || undefined,
      transporterName: r.transporter_name || undefined,
      cargoCost: Number(r.cargo_cost) || 0,
      notes: r.notes || undefined,
      createdAt: r.created_at || new Date().toISOString(),
    }));

    const purchaseOrders: PurchaseOrder[] = (poRes.data || []).map(r => ({
      id: r.id,
      poNumber: r.po_number,
      vendorId: r.vendor_id,
      vendorName: r.vendor_name,
      vendorPhone: r.vendor_phone || undefined,
      vendorAddress: r.vendor_address || undefined,
      orderDate: r.order_date,
      expectedDeliveryDate: r.expected_delivery_date || undefined,
      receivingDate: r.receiving_date || undefined,
      costsFinalizedDate: r.costs_finalized_date || undefined,
      status: r.status || 'draft',
      items: Array.isArray(r.items) ? r.items : [],
      totalOrderedQty: Number(r.total_ordered_qty) || 0,
      totalReceivedQty: Number(r.total_received_qty) || 0,
      cargoCost: Number(r.cargo_cost) || 0,
      cargoCostPerUnit: Number(r.cargo_cost_per_unit) || 0,
      subtotalBaseCost: Number(r.subtotal_base_cost) || 0,
      totalLandedCost: Number(r.total_landed_cost) || 0,
      billNumber: r.bill_number || undefined,
      biltyNumber: r.bilty_number || undefined,
      transporterName: r.transporter_name || undefined,
      amountPaid: Number(r.amount_paid) || 0,
      paymentStatus: r.payment_status || 'unpaid',
      isStockReceived: r.is_stock_received || false,
      isBilled: r.is_billed || false,
      notes: r.notes || undefined,
      createdAt: r.created_at || new Date().toISOString(),
      updatedAt: r.updated_at || undefined,
    }));

    return { success: true, vendors, purchases, purchaseOrders };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return { success: false, vendors: [], purchases: [], purchaseOrders: [], error: errorMsg };
  }
}

export async function fetchQuotationsFromSupabase(
  client: SupabaseClient
): Promise<{ success: boolean; quotations: Quotation[]; error?: string }> {
  try {
    const { data, error } = await client.from('quotations').select('*').order('date', { ascending: false });
    if (error) return { success: false, quotations: [], error: error.message };
    const quotations: Quotation[] = (data || []).map(r => ({
      id: r.id,
      quotationNumber: r.quotation_number,
      customerId: r.customer_id || undefined,
      customerType: r.customer_type || 'customer',
      customerName: r.customer_name,
      contactPerson: r.contact_person || undefined,
      customerPhone: r.customer_phone || undefined,
      customerEmail: r.customer_email || undefined,
      customerAddress: r.customer_address || undefined,
      customerCity: r.customer_city || undefined,
      customerNtn: r.customer_ntn || undefined,
      customerStrn: r.customer_strn || undefined,
      date: r.date,
      validUntil: r.valid_until,
      validityDays: Number(r.validity_days) || 7,
      items: Array.isArray(r.items) ? r.items : [],
      subtotal: Number(r.subtotal) || 0,
      discountType: r.discount_type || 'amount',
      discountValue: Number(r.discount_value) || 0,
      discountAmount: Number(r.discount_amount) || 0,
      taxPercent: Number(r.tax_percent) || 0,
      taxAmount: Number(r.tax_amount) || 0,
      totalAmount: Number(r.total_amount) || 0,
      status: r.status || 'active',
      termsAndConditions: r.terms_and_conditions || undefined,
      notes: r.notes || undefined,
      convertedSaleId: r.converted_sale_id || undefined,
      convertedAt: r.converted_at || undefined,
      createdAt: r.created_at || new Date().toISOString(),
      updatedAt: r.updated_at || undefined,
    }));
    return { success: true, quotations };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return { success: false, quotations: [], error: errorMsg };
  }
}

export async function fetchDemandsFromSupabase(
  client: SupabaseClient
): Promise<{ success: boolean; demands: Demand[]; error?: string }> {
  try {
    const { data, error } = await client.from('demands').select('*').order('created_at', { ascending: false });
    if (error) return { success: false, demands: [], error: error.message };
    const demands: Demand[] = (data || []).map(r => ({
      id: r.id,
      demandNumber: r.demand_number,
      customerId: r.customer_id || undefined,
      customerName: r.customer_name,
      customerPhone: r.customer_phone || undefined,
      location: r.location || undefined,
      itemName: r.item_name,
      productId: r.product_id || undefined,
      itemDetails: r.item_details || undefined,
      quantity: Number(r.quantity) || 1,
      unit: r.unit || 'Pcs',
      targetPrice: r.target_price !== null ? Number(r.target_price) : undefined,
      requiredDate: r.required_date || undefined,
      status: r.status || 'pending',
      unfulfillableReason: r.unfulfillable_reason || undefined,
      cancellationReason: r.cancellation_reason || undefined,
      fulfilledSaleId: r.fulfilled_sale_id || undefined,
      fulfilledAt: r.fulfilled_at || undefined,
      notes: r.notes || undefined,
      createdAt: r.created_at || new Date().toISOString(),
      updatedAt: r.updated_at || undefined,
    }));
    return { success: true, demands };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return { success: false, demands: [], error: errorMsg };
  }
}

export async function fetchExpensesFromSupabase(
  client: SupabaseClient
): Promise<{ success: boolean; expenses: Expense[]; error?: string }> {
  try {
    const { data, error } = await client.from('expenses').select('*').order('date', { ascending: false });
    if (error) return { success: false, expenses: [], error: error.message };
    const expenses: Expense[] = (data || []).map(r => ({
      id: r.id,
      expenseNumber: r.expense_number,
      title: r.title,
      category: r.category,
      amount: Number(r.amount) || 0,
      date: r.date,
      paymentMethod: r.payment_method || 'Cash',
      paidTo: r.paid_to || undefined,
      receiptNumber: r.receipt_number || undefined,
      notes: r.notes || undefined,
      createdAt: r.created_at || new Date().toISOString(),
      updatedAt: r.updated_at || undefined,
    }));
    return { success: true, expenses };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return { success: false, expenses: [], error: errorMsg };
  }
}

export async function fetchStaffAndDevicesFromSupabase(
  client: SupabaseClient
): Promise<{ success: boolean; employees: EmployeeAccount[]; devices: RegisteredDevice[]; error?: string }> {
  try {
    const [empRes, devRes] = await Promise.all([
      client.from('employee_accounts').select('*').order('name', { ascending: true }),
      client.from('registered_devices').select('*').order('registered_at', { ascending: false }),
    ]);

    const employees: EmployeeAccount[] = (empRes.data || []).map(r => ({
      id: r.id,
      name: r.name,
      email: r.email,
      phone: r.phone || undefined,
      pin: r.pin,
      password: r.password || undefined,
      role: r.role,
      designation: r.designation,
      status: r.status || 'active',
      permissions: r.permissions || {
        allowedTabs: ['sales', 'inventory'],
        isEditor: true,
        canCreateSales: true,
        canEditSales: false,
        canDeleteSales: false,
        canApplySaleDiscount: false,
        canViewCostPrices: false,
        canViewProfitMargins: false,
        canCreatePurchases: false,
        canEditPurchases: false,
        canDeletePurchases: false,
        canCreatePurchaseOrders: false,
        canReceivePurchaseOrders: false,
        canManageVendors: false,
        canCreateProducts: false,
        canEditProducts: false,
        canDeleteProducts: false,
        canAdjustStock: false,
        canManageExpenses: false,
        canViewFinancialReports: false,
        canManageCustomers: true,
        canManageCustomerLedger: false,
        canCreateQuotations: true,
        canManageQuotations: true,
        canCreateDemands: true,
        canManageDemands: true,
        canProcessCustomerReturns: true,
        canProcessVendorReturns: false,
        canManageSettings: false,
        canManageEmployees: false,
        canManageDevices: false,
        canExportData: false,
        canImportData: false,
        canPerformInventoryAudit: false,
      },
      restrictToDevices: r.restrict_to_devices || false,
      allowedDeviceIds: Array.isArray(r.allowed_device_ids) ? r.allowed_device_ids : [],
      avatarColor: r.avatar_color || undefined,
      lastLoginAt: r.last_login_at || undefined,
      lastLoginDeviceId: r.last_login_device_id || undefined,
      notes: r.notes || undefined,
      createdAt: r.created_at || new Date().toISOString(),
    }));

    const devices: RegisteredDevice[] = (devRes.data || []).map(r => ({
      id: r.id,
      name: r.name,
      os: r.os,
      deviceType: r.device_type,
      browser: r.browser || '',
      userAgent: r.user_agent || '',
      registeredAt: r.registered_at || new Date().toISOString(),
      lastSeenAt: r.last_seen_at || new Date().toISOString(),
      isTrusted: r.is_trusted ?? true,
      notes: r.notes || undefined,
    }));

    return { success: true, employees, devices };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return { success: false, employees: [], devices: [], error: errorMsg };
  }
}

export async function fetchMasterDataFromSupabase(
  client: SupabaseClient
): Promise<{ success: boolean; brands: Brand[]; types: ProductType[]; locations: LocationItem[]; error?: string }> {
  try {
    const [bRes, tRes, lRes] = await Promise.all([
      client.from('inventory_brands').select('*'),
      client.from('inventory_categories').select('*'),
      client.from('inventory_locations').select('*'),
    ]);

    const brands: Brand[] = (bRes.data || []).map(r => ({ id: r.id, name: r.name, itemCount: r.item_count || 0 }));
    const types: ProductType[] = (tRes.data || []).map(r => ({ id: r.id, name: r.name, itemCount: r.item_count || 0 }));
    const locations: LocationItem[] = (lRes.data || []).map(r => ({ id: r.id, name: r.name, cabins: Array.isArray(r.cabins) ? r.cabins : [] }));

    return { success: true, brands, types, locations };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return { success: false, brands: [], types: [], locations: [], error: errorMsg };
  }
}

/**
 * Downloads all data records from Supabase in parallel to populate the app state.
 */
export async function fetchAllFromSupabase(client: SupabaseClient): Promise<{
  success: boolean;
  data?: {
    products: Product[];
    brands: Brand[];
    types: ProductType[];
    locations: LocationItem[];
    customers: Customer[];
    customerLedger: CustomerLedgerEntry[];
    sales: Sale[];
    customerReturns: CustomerReturn[];
    vendors: Vendor[];
    vendorLedger: VendorLedgerEntry[];
    vendorReturns: VendorReturn[];
    purchases: Purchase[];
    purchaseOrders: PurchaseOrder[];
    quotations: Quotation[];
    demands: Demand[];
    expenses: Expense[];
    employees: EmployeeAccount[];
    registeredDevices: RegisteredDevice[];
    stockLogs: StockLog[];
    pricingSettings?: GlobalPricingSettings;
  };
  error?: string;
}> {
  try {
    const [
      prodRes,
      masterRes,
      custRes,
      salesRes,
      custRetRes,
      vendRes,
      vendLedgerRes,
      vendRetRes,
      quoteRes,
      demRes,
      expRes,
      staffRes,
      stockLogRes,
      pricingRes,
    ] = await Promise.all([
      fetchProductsFromSupabase(client),
      fetchMasterDataFromSupabase(client),
      fetchCustomersFromSupabase(client),
      fetchSalesFromSupabase(client),
      fetchCustomerReturnsFromSupabase(client),
      fetchVendorsAndPurchasesFromSupabase(client),
      fetchVendorLedgerFromSupabase(client),
      fetchVendorReturnsFromSupabase(client),
      fetchQuotationsFromSupabase(client),
      fetchDemandsFromSupabase(client),
      fetchExpensesFromSupabase(client),
      fetchStaffAndDevicesFromSupabase(client),
      fetchStockLogsFromSupabase(client),
      fetchPricingSettingsFromSupabase(client),
    ]);

    return {
      success: true,
      data: {
        products: prodRes.products,
        brands: masterRes.brands,
        types: masterRes.types,
        locations: masterRes.locations,
        customers: custRes.customers,
        customerLedger: custRes.ledger,
        sales: salesRes.sales,
        customerReturns: custRetRes.returns,
        vendors: vendRes.vendors,
        vendorLedger: vendLedgerRes.ledger,
        vendorReturns: vendRetRes.returns,
        purchases: vendRes.purchases,
        purchaseOrders: vendRes.purchaseOrders,
        quotations: quoteRes.quotations,
        demands: demRes.demands,
        expenses: expRes.expenses,
        employees: staffRes.employees,
        registeredDevices: staffRes.devices,
        stockLogs: stockLogRes.logs,
        pricingSettings: pricingRes.settings,
      }
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return { success: false, error: errorMsg };
  }
}

export interface FullSyncDataBundle {
  products?: Product[];
  brands?: Brand[];
  types?: ProductType[];
  locations?: LocationItem[];
  customers?: Customer[];
  customerLedger?: CustomerLedgerEntry[];
  sales?: Sale[];
  customerReturns?: CustomerReturn[];
  vendors?: Vendor[];
  vendorLedger?: VendorLedgerEntry[];
  vendorReturns?: VendorReturn[];
  purchases?: Purchase[];
  purchaseOrders?: PurchaseOrder[];
  quotations?: Quotation[];
  demands?: Demand[];
  expenses?: Expense[];
  employees?: EmployeeAccount[];
  registeredDevices?: RegisteredDevice[];
  stockLogs?: StockLog[];
  pricingSettings?: GlobalPricingSettings;
}

export interface FullSyncResult {
  success: boolean;
  message: string;
  syncedCounts: {
    products: number;
    customers: number;
    customerLedger: number;
    sales: number;
    customerReturns: number;
    vendors: number;
    vendorLedger: number;
    vendorReturns: number;
    purchases: number;
    purchaseOrders: number;
    quotations: number;
    demands: number;
    expenses: number;
    employees: number;
    devices: number;
    stockLogs: number;
    masterData: number;
  };
  errors: string[];
}

/**
 * Performs a complete multi-table sync from the local ERP state into all Supabase cloud tables.
 */

export async function wipeAllSupabaseData(client: SupabaseClient): Promise<boolean> {
  const tablesToWipe = [
    'inventory_stock_logs',
    'sales',
    'customer_returns',
    'purchases',
    'purchase_orders',
    'vendor_returns',
    'quotations',
    'demands',
    'expenses',
    'customer_ledger',
    'vendor_ledger',
    'inventory_products',
    'customers',
    'vendors',
    'inventory_brands',
    'inventory_types',
    'inventory_locations'
  ];

  try {
    for (const table of tablesToWipe) {
      const { error } = await client.from(table).delete().not('id', 'is', null);
      if (error && error.code !== '42P01') {
        console.error(`Failed to wipe table ${table}:`, error);
      }
    }
    return true;
  } catch (err) {
    console.error('Wipe data failed:', err);
    return false;
  }
}

export async function syncAllModulesToSupabase(
  client: SupabaseClient,
  bundle: FullSyncDataBundle
): Promise<FullSyncResult> {
  const errors: string[] = [];
  const syncedCounts = {
    products: 0,
    customers: 0,
    customerLedger: 0,
    sales: 0,
    customerReturns: 0,
    vendors: 0,
    vendorLedger: 0,
    vendorReturns: 0,
    purchases: 0,
    purchaseOrders: 0,
    quotations: 0,
    demands: 0,
    expenses: 0,
    employees: 0,
    devices: 0,
    stockLogs: 0,
    masterData: 0,
  };

  // 1. Products
  if (bundle.products) {
    try {
      const prodRes = await syncProductsToSupabase(client, bundle.products);
      if (prodRes.success) syncedCounts.products = prodRes.count;
      else if (prodRes.error) errors.push(`Products: ${prodRes.error}`);
    } catch (e: any) {
      errors.push(`Products: ${e.message}`);
    }
  }

  // 2. Master Data
  if (bundle.brands || bundle.types || bundle.locations) {
    try {
      const masterRes = await syncMasterDataToSupabase(client, bundle.brands || [], bundle.types || [], bundle.locations || []);
      if (masterRes.success) syncedCounts.masterData = masterRes.count;
      else if (masterRes.error) errors.push(`Master Data: ${masterRes.error}`);
    } catch (e: any) {
      errors.push(`Master Data: ${e.message}`);
    }
  }

  // 3. Customers & Ledgers
  if (bundle.customers || bundle.customerLedger) {
    try {
      const custRes = await syncCustomersToSupabase(client, bundle.customers || [], bundle.customerLedger || []);
      if (custRes.success) {
        syncedCounts.customers = custRes.customerCount;
        syncedCounts.customerLedger = custRes.ledgerCount;
      } else if (custRes.error) errors.push(`Customers: ${custRes.error}`);
    } catch (e: any) {
      errors.push(`Customers: ${e.message}`);
    }
  }

  // 4. Sales & Customer Returns
  if (bundle.sales) {
    try {
      const salesRes = await syncSalesToSupabase(client, bundle.sales);
      if (salesRes.success) syncedCounts.sales = salesRes.count;
      else if (salesRes.error) errors.push(`Sales: ${salesRes.error}`);
    } catch (e: any) {
      errors.push(`Sales: ${e.message}`);
    }
  }

  if (bundle.customerReturns) {
    try {
      const crRes = await syncCustomerReturnsToSupabase(client, bundle.customerReturns);
      if (crRes.success) syncedCounts.customerReturns = crRes.count;
      else if (crRes.error) errors.push(`Customer Returns: ${crRes.error}`);
    } catch (e: any) {
      errors.push(`Customer Returns: ${e.message}`);
    }
  }

  // 5. Vendors & Purchases
  if (bundle.vendors || bundle.purchases || bundle.purchaseOrders) {
    try {
      const vendRes = await syncVendorsAndPurchasesToSupabase(client, bundle.vendors || [], bundle.purchases || [], bundle.purchaseOrders || []);
      if (vendRes.success) {
        syncedCounts.vendors = vendRes.vendorCount;
        syncedCounts.purchases = vendRes.purchaseCount;
        syncedCounts.purchaseOrders = vendRes.poCount;
      } else if (vendRes.error) errors.push(`Vendors & Purchases: ${vendRes.error}`);
    } catch (e: any) {
      errors.push(`Vendors & Purchases: ${e.message}`);
    }
  }

  // 6. Vendor Ledger & Vendor Returns
  if (bundle.vendorLedger) {
    try {
      const vlRes = await syncVendorLedgerToSupabase(client, bundle.vendorLedger);
      if (vlRes.success) syncedCounts.vendorLedger = vlRes.count;
      else if (vlRes.error) errors.push(`Vendor Ledger: ${vlRes.error}`);
    } catch (e: any) {
      errors.push(`Vendor Ledger: ${e.message}`);
    }
  }

  if (bundle.vendorReturns) {
    try {
      const vrRes = await syncVendorReturnsToSupabase(client, bundle.vendorReturns);
      if (vrRes.success) syncedCounts.vendorReturns = vrRes.count;
      else if (vrRes.error) errors.push(`Vendor Returns: ${vrRes.error}`);
    } catch (e: any) {
      errors.push(`Vendor Returns: ${e.message}`);
    }
  }

  // 7. Quotations
  if (bundle.quotations) {
    try {
      // @ts-ignore
      const quoteRes = await syncQuotationsToSupabase(client, bundle.quotations);
      if (quoteRes.success) syncedCounts.quotations = quoteRes.count;
      else if (quoteRes.error) errors.push(`Quotations: ${quoteRes.error}`);
    } catch (e: any) {
      errors.push(`Quotations: ${e.message}`);
    }
  }

  // 8. Demands
  if (bundle.demands) {
    try {
      // @ts-ignore
      const demRes = await syncDemandsToSupabase(client, bundle.demands);
      if (demRes.success) syncedCounts.demands = demRes.count;
      else if (demRes.error) errors.push(`Demands: ${demRes.error}`);
    } catch (e: any) {
      errors.push(`Demands: ${e.message}`);
    }
  }

  // 9. Expenses
  if (bundle.expenses) {
    try {
      const expRes = await syncExpensesToSupabase(client, bundle.expenses);
      if (expRes.success) syncedCounts.expenses = expRes.count;
      else if (expRes.error) errors.push(`Expenses: ${expRes.error}`);
    } catch (e: any) {
      errors.push(`Expenses: ${e.message}`);
    }
  }

  // 10. Staff & Devices
  if (bundle.employees || bundle.registeredDevices) {
    try {
      // @ts-ignore
      const staffRes = await syncStaffAndDevicesToSupabase(client, bundle.employees || [], bundle.registeredDevices || []);
      if (staffRes.success) {
        syncedCounts.employees = staffRes.employeeCount;
        syncedCounts.devices = staffRes.deviceCount;
      } else if (staffRes.error) errors.push(`Staff & Devices: ${staffRes.error}`);
    } catch (e: any) {
      errors.push(`Staff & Devices: ${e.message}`);
    }
  }

  // 11. Stock Logs
  if (bundle.stockLogs) {
    try {
      const slRes = await syncStockLogsToSupabase(client, bundle.stockLogs);
      if (slRes.success) syncedCounts.stockLogs = slRes.count;
      else if (slRes.error) errors.push(`Stock Logs: ${slRes.error}`);
    } catch (e: any) {
      errors.push(`Stock Logs: ${e.message}`);
    }
  }

  // 12. Pricing Settings
  if (bundle.pricingSettings) {
    try {
      await syncPricingSettingsToSupabase(client, bundle.pricingSettings);
    } catch (e: any) {
      errors.push(`Pricing Settings: ${e.message}`);
    }
  }

  return {
    success: errors.length === 0,
    message: errors.length > 0 ? 'Sync completed with errors' : 'Sync successful',
    syncedCounts,
    errors: errors.length > 0 ? errors : undefined,
  };
}
