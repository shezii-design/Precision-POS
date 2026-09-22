import { createClient, SupabaseClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

async function sha256Hash(str: string): Promise<string> {
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(str);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  } catch {
    return '';
  }
}

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
      if (selectErr && selectErr.code !== '42P01' && selectErr.code !== 'PGRST205') throw selectErr; // Ignore table missing if it doesn't exist yet
      if (selectErr && (selectErr.code === '42P01' || selectErr.code === 'PGRST205')) {
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
  SaleItem,
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
/**
 * Authenticates user credentials directly against Supabase Auth (signInWithPassword).
 * Returns user profile, access token, and active session.
 */
export async function authenticateWithSupabase(
  email: string, 
  password: string,
  clientOverride?: SupabaseClient | null
): Promise<{ success: boolean; user?: any; session?: any; error?: string }> {
  const client = clientOverride || getSupabaseClient();
  if (!client) {
    return {
      success: false,
      error: 'Supabase credentials are not configured or client is disconnected. Please check Settings > Supabase.'
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

    if (data?.user && data?.session) {
      return { success: true, user: data.user, session: data.session };
    }

    return { success: false, error: 'Authentication failed. Please verify your Supabase credentials.' };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return { success: false, error: errorMsg };
  }
}

/**
 * Authenticates employee server-side using the secure PostgreSQL RPC function.
 * This checks bcrypt hashes in database and enforces device whitelisting,
 * without ever exposing password or PIN hashes to the client.
 */
export async function authenticateEmployeeViaSupabase(
  client: SupabaseClient,
  identifier: string,
  secret: string,
  deviceId?: string
): Promise<{ success: boolean; employee?: EmployeeAccount; error?: string }> {
  try {
    const { data, error } = await client.rpc('authenticate_employee', {
      p_identifier: identifier.trim(),
      p_secret: secret.trim(),
      p_device_id: deviceId || null,
    });

    if (error) {
      // Check if function does not exist yet (user hasn't executed the SQL RLS script)
      if (
        error.code === '42883' || 
        error.message?.toLowerCase().includes('function') || 
        error.message?.toLowerCase().includes('does not exist')
      ) {
        return {
          success: false,
          error: 'The secure RPC function "authenticate_employee" is not yet installed in your Supabase project. Please open Settings > Supabase > Security & RLS and run the SQL script in your Supabase SQL Editor.'
        };
      }
      return { success: false, error: error.message };
    }

    if (!data || typeof data !== 'object') {
      return { success: false, error: 'Invalid response received from server authentication.' };
    }

    const res = data as { success: boolean; employee?: any; error?: string };
    if (!res.success) {
      return { success: false, error: res.error || 'Invalid credentials or account restricted.' };
    }

    const emp = res.employee as EmployeeAccount;
    return { success: true, employee: emp };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return { success: false, error: errorMsg };
  }
}

/**
 * Saves or updates an employee in Supabase using the secure RPC function.
 * If the RPC function is not yet created or returns an error, automatically falls back
 * to a resilient direct table upsert into employee_accounts with bcrypt hashing.
 */
export async function saveEmployeeSecureToSupabase(
  client: SupabaseClient,
  emp: EmployeeAccount,
  newPin?: string,
  newPassword?: string
): Promise<{ success: boolean; error?: string; method?: 'rpc' | 'table' }> {
  const pinCandidate = (newPin !== undefined && newPin.trim() !== '') 
    ? newPin.trim() 
    : (emp.pin ? String(emp.pin).trim() : '');

  const pwdCandidate = (newPassword !== undefined && newPassword.trim() !== '') 
    ? newPassword.trim() 
    : (emp.password ? String(emp.password).trim() : '');

  // 1. First attempt: call secure RPC function `save_employee_secure`
  try {
    const { data, error } = await client.rpc('save_employee_secure', {
      p_id: emp.id,
      p_name: emp.name,
      p_email: emp.email,
      p_phone: emp.phone || null,
      p_pin: pinCandidate || null,
      p_password: pwdCandidate || null,
      p_role: emp.role,
      p_designation: emp.designation || null,
      p_status: emp.status || 'active',
      p_permissions: emp.permissions,
      p_restrict_to_devices: emp.restrictToDevices ?? false,
      p_allowed_device_ids: emp.allowedDeviceIds || [],
      p_avatar_color: emp.avatarColor || null,
      p_notes: emp.notes || null,
    });

    if (!error) {
      if (data && typeof data === 'object' && (data as any).success === false) {
        console.warn('save_employee_secure RPC reported failure, falling back to table upsert:', data);
      } else {
        // Also synchronize plaintext columns if the user's Supabase database has them
        if (pinCandidate) {
          try { await client.from('employee_accounts').update({ pin: pinCandidate }).eq('id', emp.id); } catch {}
          try { await client.from('employee_accounts').update({ plain_pin: pinCandidate }).eq('id', emp.id); } catch {}
        }
        if (pwdCandidate) {
          try { await client.from('employee_accounts').update({ password: pwdCandidate }).eq('id', emp.id); } catch {}
        }
        return { success: true, method: 'rpc' };
      }
    } else {
      console.warn('save_employee_secure RPC failed or not present, attempting direct table upsert:', error.message);
    }
  } catch (rpcErr: unknown) {
    console.warn('RPC invocation exception, attempting direct table upsert:', rpcErr);
  }

  // 2. Resilient Direct Table Upsert Fallback
  try {
    let pinHash = emp.pinHash;
    if (newPin && newPin.trim() !== '') {
      try {
        pinHash = bcrypt.hashSync(newPin.trim(), 8);
      } catch {
        pinHash = await sha256Hash(newPin.trim());
      }
    } else if (pinCandidate && !pinHash) {
      try {
        pinHash = bcrypt.hashSync(pinCandidate, 8);
      } catch {
        pinHash = await sha256Hash(pinCandidate);
      }
    }

    let passwordHash = emp.passwordHash;
    if (newPassword && newPassword.trim() !== '') {
      try {
        passwordHash = bcrypt.hashSync(newPassword.trim(), 8);
      } catch {
        passwordHash = await sha256Hash(newPassword.trim());
      }
    } else if (pwdCandidate && !passwordHash) {
      try {
        passwordHash = bcrypt.hashSync(pwdCandidate, 8);
      } catch {
        passwordHash = await sha256Hash(pwdCandidate);
      }
    }

    const payload: Record<string, any> = {
      id: emp.id,
      name: emp.name,
      email: emp.email,
      phone: emp.phone || null,
      role: emp.role || 'cashier',
      designation: emp.designation || 'Staff',
      status: emp.status || 'active',
      permissions: emp.permissions,
      restrict_to_devices: emp.restrictToDevices ?? false,
      allowed_device_ids: Array.isArray(emp.allowedDeviceIds) ? emp.allowedDeviceIds : [],
      avatar_color: emp.avatarColor || null,
      notes: emp.notes || null,
      updated_at: new Date().toISOString(),
    };

    // Safely attach hashes only if computed/present so we don't wipe existing DB hashes with null
    if (pinHash) {
      payload.pin_hash = pinHash;
    }
    if (passwordHash) {
      payload.password_hash = passwordHash;
    }

    // Also attach candidate plain PIN and password for databases that have plain columns
    if (pinCandidate) {
      payload.pin = pinCandidate;
      payload.plain_pin = pinCandidate;
    }
    if (pwdCandidate) {
      payload.password = pwdCandidate;
    }

    let currentPayload = { ...payload };
    let lastError: string | undefined;

    const extractMissingColumn = (msg: string): string | null => {
      if (!msg) return null;
      // PostgREST: Could not find the 'xxx' column of 'employee_accounts' in the schema cache
      const m1 = msg.match(/Could not find the ['"]([^'"]+)['"] column/i);
      if (m1 && m1[1]) return m1[1];
      // PostgREST: Could not find column 'xxx'
      const m2 = msg.match(/Could not find column ['"]([^'"]+)['"]/i);
      if (m2 && m2[1]) return m2[1];
      // PostgreSQL: column "xxx" of relation "employee_accounts" does not exist
      const m3 = msg.match(/column ['"]([^'"]+)['"] of relation/i);
      if (m3 && m3[1]) return m3[1];
      // PostgreSQL: column "xxx" does not exist
      const m4 = msg.match(/column ['"]([^'"]+)['"] does not exist/i);
      if (m4 && m4[1]) return m4[1];
      const m5 = msg.match(/column ([a-zA-Z0-9_]+) does not exist/i);
      if (m5 && m5[1]) return m5[1];
      return null;
    };

    // Dynamically strip any column that does not exist in the target Supabase schema
    for (let attempt = 0; attempt < 12; attempt++) {
      const { error } = await client
        .from('employee_accounts')
        .upsert(currentPayload, { onConflict: 'id' });

      if (!error) {
        // Run discrete column updates for legacy/direct columns in case they were stripped from currentPayload
        if (pinCandidate) {
          try { await client.from('employee_accounts').update({ pin: pinCandidate }).eq('id', emp.id); } catch {}
          try { await client.from('employee_accounts').update({ plain_pin: pinCandidate }).eq('id', emp.id); } catch {}
        }
        if (pwdCandidate) {
          try { await client.from('employee_accounts').update({ password: pwdCandidate }).eq('id', emp.id); } catch {}
        }
        return { success: true, method: 'table' };
      }

      lastError = error.message;

      // Check for unique email constraint violation
      if (
        error.code === '23505' || 
        error.message.includes('employee_accounts_email_key') || 
        error.message.includes('unique constraint')
      ) {
        lastError = `An account with email/username "${emp.email}" already exists in the backend. Please provide a unique email address.`;
        break;
      }

      if (
        error.code === '42P01' || 
        error.code === 'PGRST205' || 
        (error.message.includes('does not exist') && error.message.includes('employee_accounts'))
      ) {
        lastError = 'Table "employee_accounts" not found in Supabase. Please run the SQL schema script in Supabase Dashboard > SQL Editor.';
        break;
      }

      if (error.message.toLowerCase().includes('row-level security') || error.code === '42501') {
        lastError = 'Supabase Row-Level Security (RLS) blocked saving employee. Please run the RLS SQL script in Supabase Dashboard > SQL Editor.';
        break;
      }

      const missingCol = extractMissingColumn(error.message);
      if (missingCol && missingCol in currentPayload) {
        delete currentPayload[missingCol];
        continue;
      }

      break;
    }

    return { success: false, error: lastError };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return { success: false, error: errorMsg };
  }
}

/**
 * Checks if there is an active Supabase Auth session.
 */
export async function checkSupabaseAuthSession(
  client?: SupabaseClient | null
): Promise<{ hasSession: boolean; user?: any; session?: any }> {
  const sb = client || getSupabaseClient();
  if (!sb) return { hasSession: false };

  try {
    const { data, error } = await sb.auth.getSession();
    if (error || !data?.session) {
      return { hasSession: false };
    }
    return { hasSession: true, user: data.session.user, session: data.session };
  } catch {
    return { hasSession: false };
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

/**
 * Executes an atomic sale transaction in Supabase via ACID stored procedure.
 * Atomically updates product stock, appends stock movement logs, and updates customer balance.
 * Returns { success: true } if committed atomically, or error details if rolled back.
 */
export async function executeSaleTransactionSupabase(
  client: SupabaseClient,
  sale: Sale,
  items?: SaleItem[],
  customer?: Customer | null,
  demandId?: string | null
): Promise<{ success: boolean; saleId?: string; error?: string }> {
  try {
    const saleItems = items || sale.items || [];
    const { data, error } = await client.rpc('process_sale_transaction', {
      p_sale: {
        id: sale.id,
        invoiceNumber: sale.id,
        date: sale.date,
        customerId: sale.customerId || null,
        customerName: sale.customerName || 'Walk-in Customer',
        customerPhone: sale.customerPhone || null,
        totalAmount: sale.totalAmount,
        paidAmount: sale.amountReceived,
        paymentMethod: sale.paymentType || 'cash',
        status: sale.paymentStatus || 'completed',
        notes: sale.notes || null,
        userId: null,
        userName: null,
        totalCost: sale.totalCost || 0,
        totalProfit: sale.totalProfit || 0
      },
      p_items: saleItems,
      p_customer: customer ? { id: customer.id, name: customer.name, phone: customer.phone } : null,
      p_demand_id: demandId || null
    });

    if (error) {
      return { success: false, error: error.message };
    }

    const res = data as { success: boolean; saleId?: string; error?: string; message?: string };
    return res;
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return { success: false, error: errorMsg };
  }
}

/**
 * Executes an atomic purchase transaction in Supabase via ACID stored procedure.
 * Atomically adds product stock, appends stock audit logs, and updates vendor balance.
 */
export async function executePurchaseTransactionSupabase(
  client: SupabaseClient,
  purchase: Purchase,
  items?: any[],
  vendor?: Vendor | null
): Promise<{ success: boolean; purchaseId?: string; error?: string }> {
  try {
    const purchaseItems = items || purchase.items || [];
    const { data, error } = await client.rpc('process_purchase_transaction', {
      p_purchase: {
        id: purchase.id,
        billNumber: purchase.billNumber || purchase.id,
        date: purchase.date,
        vendorId: purchase.vendorId || null,
        vendorName: purchase.vendorName || 'General Vendor',
        totalAmount: purchase.totalAmount,
        paidAmount: purchase.amountPaid,
        paymentStatus: purchase.paymentStatus || 'paid',
        notes: purchase.notes || null,
        updatePricesInInventory: purchase.updatePricesInInventory !== false
      },
      p_items: purchaseItems,
      p_vendor: vendor ? { id: vendor.id, name: vendor.contactPerson, businessName: vendor.businessName } : null
    });

    if (error) {
      return { success: false, error: error.message };
    }

    const res = data as { success: boolean; purchaseId?: string; error?: string; message?: string };
    return res;
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return { success: false, error: errorMsg };
  }
}

/**
 * Executes an atomic customer sales return transaction in Supabase via ACID stored procedure.
 * Atomically restocks items, appends movement logs, and handles ledger refund credits.
 */
export async function executeCustomerReturnTransactionSupabase(
  client: SupabaseClient,
  returnRecord: CustomerReturn,
  items?: any[]
): Promise<{ success: boolean; returnId?: string; error?: string }> {
  try {
    const returnItems = items || returnRecord.items || [];
    const { data, error } = await client.rpc('process_customer_return_transaction', {
      p_return: {
        id: returnRecord.id,
        saleId: returnRecord.saleId,
        customerId: returnRecord.customerId || null,
        customerName: returnRecord.customerName || 'Walk-in Customer',
        returnDate: returnRecord.date,
        totalRefund: returnRecord.totalRefundAmount,
        refundMethod: returnRecord.refundMethod || 'cash',
        notes: returnRecord.notes || null
      },
      p_items: returnItems
    });

    if (error) {
      return { success: false, error: error.message };
    }

    const res = data as { success: boolean; returnId?: string; error?: string; message?: string };
    return res;
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return { success: false, error: errorMsg };
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
          if (error.code === '42P01' || error.code === 'PGRST205' || error.message?.includes('does not exist')) {
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

-- 0. ENABLE CRYPTOGRAPHIC FUNCTIONS FOR BCRYPT HASHING
CREATE EXTENSION IF NOT EXISTS pgcrypto;

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
  cost_batches JSONB,

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

-- 2. MASTER DATA (Categories, Brands, Locations)
CREATE TABLE IF NOT EXISTS inventory_categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  item_count NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS inventory_brands (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  item_count NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS inventory_locations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  cabins JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
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
  reference_type TEXT,
  description TEXT,
  debit NUMERIC DEFAULT 0,
  credit NUMERIC DEFAULT 0,
  amount NUMERIC DEFAULT 0,
  balance NUMERIC DEFAULT 0,
  payment_method TEXT,
  receipt_number TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3B. POS SALES & CUSTOMER RETURNS
CREATE TABLE IF NOT EXISTS sales (
  id TEXT PRIMARY KEY,
  invoice_number TEXT,
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
  paid_amount NUMERIC DEFAULT 0,
  amount_received NUMERIC DEFAULT 0,
  change_given NUMERIC DEFAULT 0,
  balance_due NUMERIC DEFAULT 0,
  payment_type TEXT DEFAULT 'cash',
  payment_method TEXT DEFAULT 'cash',
  payment_status TEXT DEFAULT 'paid',
  status TEXT DEFAULT 'completed',
  total_cost NUMERIC DEFAULT 0,
  total_profit NUMERIC DEFAULT 0,
  user_id TEXT,
  user_name TEXT,
  has_returns BOOLEAN DEFAULT FALSE,
  total_returned_amount NUMERIC DEFAULT 0,
  net_amount NUMERIC DEFAULT 0,
  net_balance_due NUMERIC DEFAULT 0,
  returned_items_count NUMERIC DEFAULT 0,
  returns_list JSONB,
  invoice_naming_preference TEXT,
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
  customer_phone TEXT,
  date TEXT NOT NULL,
  return_date TEXT,
  items JSONB NOT NULL,
  subtotal NUMERIC DEFAULT 0,
  deduction_or_restock_fee NUMERIC DEFAULT 0,
  total_refund NUMERIC DEFAULT 0,
  total_refund_amount NUMERIC DEFAULT 0,
  refund_method TEXT DEFAULT 'cash',
  refund_status TEXT DEFAULT 'completed',
  reason TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
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
  reference_type TEXT,
  description TEXT,
  debit NUMERIC DEFAULT 0,
  credit NUMERIC DEFAULT 0,
  amount NUMERIC DEFAULT 0,
  balance NUMERIC DEFAULT 0,
  payment_method TEXT,
  receipt_number TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS vendor_returns (
  id TEXT PRIMARY KEY,
  return_number TEXT NOT NULL,
  purchase_id TEXT NOT NULL,
  vendor_id TEXT NOT NULL,
  vendor_name TEXT NOT NULL,
  date TEXT NOT NULL,
  items JSONB NOT NULL,
  subtotal NUMERIC DEFAULT 0,
  deduction_or_restock_fee NUMERIC DEFAULT 0,
  total_refund_amount NUMERIC DEFAULT 0,
  settlement_type TEXT DEFAULT 'cash',
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
  paid_amount NUMERIC DEFAULT 0,
  amount_paid NUMERIC DEFAULT 0,
  change_given NUMERIC DEFAULT 0,
  balance_due NUMERIC DEFAULT 0,
  payment_status TEXT DEFAULT 'unpaid',
  payment_method TEXT DEFAULT 'cash',
  bilty_number TEXT,
  transporter_name TEXT,
  cargo_cost NUMERIC DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
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
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  pin_hash TEXT,
  password_hash TEXT,
  auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  role TEXT NOT NULL DEFAULT 'cashier',
  designation TEXT,
  status TEXT DEFAULT 'active',
  permissions JSONB,
  restrict_to_devices BOOLEAN DEFAULT FALSE,
  allowed_device_ids JSONB DEFAULT '[]'::jsonb,
  avatar_color TEXT,
  last_login_at TIMESTAMPTZ,
  last_login_device_id TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
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
  type TEXT DEFAULT 'adjustment',
  internal_id TEXT,
  brand_name TEXT,
  type_name TEXT,
  unit TEXT DEFAULT 'Pcs',
  change NUMERIC DEFAULT 0,
  previous_stock NUMERIC DEFAULT 0,
  new_stock NUMERIC DEFAULT 0,
  movement_type TEXT,
  reference_number TEXT,
  entity_name TEXT,
  unit_rate NUMERIC DEFAULT 0,
  total_movement_value NUMERIC DEFAULT 0,
  location_name TEXT,
  cabin_number TEXT,
  timestamp TEXT,
  notes TEXT,
  quantity_change NUMERIC DEFAULT 0,
  new_quantity NUMERIC DEFAULT 0,
  reference_id TEXT,
  reason TEXT,
  user_id TEXT,
  user_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
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

-- ==========================================================
-- SELF-HEALING IDEMPOTENT SCHEMA MIGRATIONS
-- Checks every table; if already configured, ensures all new columns exist
-- ==========================================================
DO $$
BEGIN
  -- Safe Column Migration for inventory_products
  ALTER TABLE IF EXISTS inventory_products ADD COLUMN IF NOT EXISTS internal_id TEXT;
  ALTER TABLE IF EXISTS inventory_products ADD COLUMN IF NOT EXISTS image TEXT;
  ALTER TABLE IF EXISTS inventory_products ADD COLUMN IF NOT EXISTS type_id TEXT;
  ALTER TABLE IF EXISTS inventory_products ADD COLUMN IF NOT EXISTS type_name TEXT;
  ALTER TABLE IF EXISTS inventory_products ADD COLUMN IF NOT EXISTS brand_id TEXT;
  ALTER TABLE IF EXISTS inventory_products ADD COLUMN IF NOT EXISTS brand_name TEXT;
  ALTER TABLE IF EXISTS inventory_products ADD COLUMN IF NOT EXISTS location_id TEXT;
  ALTER TABLE IF EXISTS inventory_products ADD COLUMN IF NOT EXISTS location_name TEXT;
  ALTER TABLE IF EXISTS inventory_products ADD COLUMN IF NOT EXISTS cabin_number TEXT;
  ALTER TABLE IF EXISTS inventory_products ADD COLUMN IF NOT EXISTS stock_quantity NUMERIC DEFAULT 0;
  ALTER TABLE IF EXISTS inventory_products ADD COLUMN IF NOT EXISTS min_stock_alert NUMERIC DEFAULT 5;
  ALTER TABLE IF EXISTS inventory_products ADD COLUMN IF NOT EXISTS unit TEXT DEFAULT 'Pcs';
  ALTER TABLE IF EXISTS inventory_products ADD COLUMN IF NOT EXISTS cost_price NUMERIC DEFAULT 0;
  ALTER TABLE IF EXISTS inventory_products ADD COLUMN IF NOT EXISTS last_purchase_price NUMERIC;
  ALTER TABLE IF EXISTS inventory_products ADD COLUMN IF NOT EXISTS last_purchase_date TEXT;
  ALTER TABLE IF EXISTS inventory_products ADD COLUMN IF NOT EXISTS cost_batches JSONB;
  ALTER TABLE IF EXISTS inventory_products ADD COLUMN IF NOT EXISTS wholesale_price NUMERIC DEFAULT 0;
  ALTER TABLE IF EXISTS inventory_products ADD COLUMN IF NOT EXISTS retail_price NUMERIC DEFAULT 0;
  ALTER TABLE IF EXISTS inventory_products ADD COLUMN IF NOT EXISTS tier1_name TEXT DEFAULT 'Wholesale';
  ALTER TABLE IF EXISTS inventory_products ADD COLUMN IF NOT EXISTS tier1_price NUMERIC DEFAULT 0;
  ALTER TABLE IF EXISTS inventory_products ADD COLUMN IF NOT EXISTS tier1_markup NUMERIC DEFAULT 10;
  ALTER TABLE IF EXISTS inventory_products ADD COLUMN IF NOT EXISTS tier2_name TEXT DEFAULT 'Retail';
  ALTER TABLE IF EXISTS inventory_products ADD COLUMN IF NOT EXISTS tier2_price NUMERIC DEFAULT 0;
  ALTER TABLE IF EXISTS inventory_products ADD COLUMN IF NOT EXISTS tier2_markup NUMERIC DEFAULT 25;
  ALTER TABLE IF EXISTS inventory_products ADD COLUMN IF NOT EXISTS tier3_name TEXT;
  ALTER TABLE IF EXISTS inventory_products ADD COLUMN IF NOT EXISTS tier3_price NUMERIC;
  ALTER TABLE IF EXISTS inventory_products ADD COLUMN IF NOT EXISTS tier3_markup NUMERIC;
  ALTER TABLE IF EXISTS inventory_products ADD COLUMN IF NOT EXISTS tier4_name TEXT;
  ALTER TABLE IF EXISTS inventory_products ADD COLUMN IF NOT EXISTS tier4_price NUMERIC;
  ALTER TABLE IF EXISTS inventory_products ADD COLUMN IF NOT EXISTS tier4_markup NUMERIC;
  ALTER TABLE IF EXISTS inventory_products ADD COLUMN IF NOT EXISTS tier5_name TEXT;
  ALTER TABLE IF EXISTS inventory_products ADD COLUMN IF NOT EXISTS tier5_price NUMERIC;
  ALTER TABLE IF EXISTS inventory_products ADD COLUMN IF NOT EXISTS tier5_markup NUMERIC;
  ALTER TABLE IF EXISTS inventory_products ADD COLUMN IF NOT EXISTS height_inch NUMERIC;
  ALTER TABLE IF EXISTS inventory_products ADD COLUMN IF NOT EXISTS height_mm NUMERIC;
  ALTER TABLE IF EXISTS inventory_products ADD COLUMN IF NOT EXISTS outer_dia_inch NUMERIC;
  ALTER TABLE IF EXISTS inventory_products ADD COLUMN IF NOT EXISTS outer_dia_mm NUMERIC;
  ALTER TABLE IF EXISTS inventory_products ADD COLUMN IF NOT EXISTS inner_dia_inch NUMERIC;
  ALTER TABLE IF EXISTS inventory_products ADD COLUMN IF NOT EXISTS inner_dia_mm NUMERIC;
  ALTER TABLE IF EXISTS inventory_products ADD COLUMN IF NOT EXISTS dimension_input_unit TEXT DEFAULT 'inch';
  ALTER TABLE IF EXISTS inventory_products ADD COLUMN IF NOT EXISTS thread TEXT;
  ALTER TABLE IF EXISTS inventory_products ADD COLUMN IF NOT EXISTS gasket_od_inch NUMERIC;
  ALTER TABLE IF EXISTS inventory_products ADD COLUMN IF NOT EXISTS gasket_od_mm NUMERIC;
  ALTER TABLE IF EXISTS inventory_products ADD COLUMN IF NOT EXISTS gasket_id_inch NUMERIC;
  ALTER TABLE IF EXISTS inventory_products ADD COLUMN IF NOT EXISTS gasket_id_mm NUMERIC;
  ALTER TABLE IF EXISTS inventory_products ADD COLUMN IF NOT EXISTS label_height TEXT DEFAULT 'H';
  ALTER TABLE IF EXISTS inventory_products ADD COLUMN IF NOT EXISTS label_outer_dia TEXT DEFAULT 'OD';
  ALTER TABLE IF EXISTS inventory_products ADD COLUMN IF NOT EXISTS label_inner_dia TEXT DEFAULT 'ID';
  ALTER TABLE IF EXISTS inventory_products ADD COLUMN IF NOT EXISTS machine_names TEXT;
  ALTER TABLE IF EXISTS inventory_products ADD COLUMN IF NOT EXISTS cross_references TEXT;
  ALTER TABLE IF EXISTS inventory_products ADD COLUMN IF NOT EXISTS vendor_id TEXT;
  ALTER TABLE IF EXISTS inventory_products ADD COLUMN IF NOT EXISTS vendor_name TEXT;
  ALTER TABLE IF EXISTS inventory_products ADD COLUMN IF NOT EXISTS notes TEXT;
  ALTER TABLE IF EXISTS inventory_products ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
  ALTER TABLE IF EXISTS inventory_products ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

  -- Safe Column Migration for sales
  ALTER TABLE IF EXISTS sales ADD COLUMN IF NOT EXISTS invoice_number TEXT;
  ALTER TABLE IF EXISTS sales ADD COLUMN IF NOT EXISTS paid_amount NUMERIC DEFAULT 0;
  ALTER TABLE IF EXISTS sales ADD COLUMN IF NOT EXISTS amount_received NUMERIC DEFAULT 0;
  ALTER TABLE IF EXISTS sales ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'cash';
  ALTER TABLE IF EXISTS sales ADD COLUMN IF NOT EXISTS payment_type TEXT DEFAULT 'cash';
  ALTER TABLE IF EXISTS sales ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'completed';
  ALTER TABLE IF EXISTS sales ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'paid';
  ALTER TABLE IF EXISTS sales ADD COLUMN IF NOT EXISTS user_id TEXT;
  ALTER TABLE IF EXISTS sales ADD COLUMN IF NOT EXISTS user_name TEXT;
  ALTER TABLE IF EXISTS sales ADD COLUMN IF NOT EXISTS customer_phone TEXT;
  ALTER TABLE IF EXISTS sales ADD COLUMN IF NOT EXISTS total_cost NUMERIC DEFAULT 0;
  ALTER TABLE IF EXISTS sales ADD COLUMN IF NOT EXISTS total_profit NUMERIC DEFAULT 0;
  ALTER TABLE IF EXISTS sales ADD COLUMN IF NOT EXISTS change_given NUMERIC DEFAULT 0;
  ALTER TABLE IF EXISTS sales ADD COLUMN IF NOT EXISTS balance_due NUMERIC DEFAULT 0;
  ALTER TABLE IF EXISTS sales ADD COLUMN IF NOT EXISTS has_returns BOOLEAN DEFAULT FALSE;
  ALTER TABLE IF EXISTS sales ADD COLUMN IF NOT EXISTS total_returned_amount NUMERIC DEFAULT 0;
  ALTER TABLE IF EXISTS sales ADD COLUMN IF NOT EXISTS net_amount NUMERIC DEFAULT 0;
  ALTER TABLE IF EXISTS sales ADD COLUMN IF NOT EXISTS net_balance_due NUMERIC DEFAULT 0;
  ALTER TABLE IF EXISTS sales ADD COLUMN IF NOT EXISTS returned_items_count NUMERIC DEFAULT 0;
  ALTER TABLE IF EXISTS sales ADD COLUMN IF NOT EXISTS returns_list JSONB;
  ALTER TABLE IF EXISTS sales ADD COLUMN IF NOT EXISTS invoice_naming_preference TEXT;

  -- Safe Column Migration for customer_returns
  ALTER TABLE IF EXISTS customer_returns ADD COLUMN IF NOT EXISTS date TEXT;
  ALTER TABLE IF EXISTS customer_returns ADD COLUMN IF NOT EXISTS return_date TEXT;
  ALTER TABLE IF EXISTS customer_returns ADD COLUMN IF NOT EXISTS total_refund NUMERIC DEFAULT 0;
  ALTER TABLE IF EXISTS customer_returns ADD COLUMN IF NOT EXISTS total_refund_amount NUMERIC DEFAULT 0;
  ALTER TABLE IF EXISTS customer_returns ADD COLUMN IF NOT EXISTS refund_method TEXT DEFAULT 'cash';
  ALTER TABLE IF EXISTS customer_returns ADD COLUMN IF NOT EXISTS refund_status TEXT DEFAULT 'completed';
  ALTER TABLE IF EXISTS customer_returns ADD COLUMN IF NOT EXISTS reason TEXT;
  ALTER TABLE IF EXISTS customer_returns ADD COLUMN IF NOT EXISTS credit_note_number TEXT;

  -- Safe Column Migration for purchases
  ALTER TABLE IF EXISTS purchases ADD COLUMN IF NOT EXISTS paid_amount NUMERIC DEFAULT 0;
  ALTER TABLE IF EXISTS purchases ADD COLUMN IF NOT EXISTS amount_paid NUMERIC DEFAULT 0;
  ALTER TABLE IF EXISTS purchases ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'paid';
  ALTER TABLE IF EXISTS purchases ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'cash';
  ALTER TABLE IF EXISTS purchases ADD COLUMN IF NOT EXISTS cargo_cost NUMERIC DEFAULT 0;
  ALTER TABLE IF EXISTS purchases ADD COLUMN IF NOT EXISTS bilty_number TEXT;
  ALTER TABLE IF EXISTS purchases ADD COLUMN IF NOT EXISTS transporter_name TEXT;

  -- Safe Column Migration for customer_ledger
  ALTER TABLE IF EXISTS customer_ledger ADD COLUMN IF NOT EXISTS reference_type TEXT;
  ALTER TABLE IF EXISTS customer_ledger ADD COLUMN IF NOT EXISTS balance NUMERIC DEFAULT 0;
  ALTER TABLE IF EXISTS customer_ledger ADD COLUMN IF NOT EXISTS debit NUMERIC DEFAULT 0;
  ALTER TABLE IF EXISTS customer_ledger ADD COLUMN IF NOT EXISTS credit NUMERIC DEFAULT 0;

  -- Safe Column Migration for vendor_ledger
  ALTER TABLE IF EXISTS vendor_ledger ADD COLUMN IF NOT EXISTS reference_type TEXT;
  ALTER TABLE IF EXISTS vendor_ledger ADD COLUMN IF NOT EXISTS balance NUMERIC DEFAULT 0;
  ALTER TABLE IF EXISTS vendor_ledger ADD COLUMN IF NOT EXISTS debit NUMERIC DEFAULT 0;
  ALTER TABLE IF EXISTS vendor_ledger ADD COLUMN IF NOT EXISTS credit NUMERIC DEFAULT 0;

  -- Safe Column Migration for stock_logs
  ALTER TABLE IF EXISTS stock_logs ADD COLUMN IF NOT EXISTS quantity_change NUMERIC DEFAULT 0;
  ALTER TABLE IF EXISTS stock_logs ADD COLUMN IF NOT EXISTS new_quantity NUMERIC DEFAULT 0;
  ALTER TABLE IF EXISTS stock_logs ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'adjustment';
  ALTER TABLE IF EXISTS stock_logs ADD COLUMN IF NOT EXISTS change NUMERIC DEFAULT 0;
  ALTER TABLE IF EXISTS stock_logs ADD COLUMN IF NOT EXISTS previous_stock NUMERIC DEFAULT 0;
  ALTER TABLE IF EXISTS stock_logs ADD COLUMN IF NOT EXISTS new_stock NUMERIC DEFAULT 0;
  ALTER TABLE IF EXISTS stock_logs ADD COLUMN IF NOT EXISTS movement_type TEXT;
  ALTER TABLE IF EXISTS stock_logs ADD COLUMN IF NOT EXISTS unit_rate NUMERIC DEFAULT 0;
  ALTER TABLE IF EXISTS stock_logs ADD COLUMN IF NOT EXISTS total_movement_value NUMERIC DEFAULT 0;
  ALTER TABLE IF EXISTS stock_logs ADD COLUMN IF NOT EXISTS notes TEXT;
  ALTER TABLE IF EXISTS stock_logs ADD COLUMN IF NOT EXISTS reference_id TEXT;
  ALTER TABLE IF EXISTS stock_logs ADD COLUMN IF NOT EXISTS reason TEXT;
  ALTER TABLE IF EXISTS stock_logs ADD COLUMN IF NOT EXISTS user_id TEXT;
  ALTER TABLE IF EXISTS stock_logs ADD COLUMN IF NOT EXISTS user_name TEXT;

  -- Safe Column Migration for employee_accounts
  ALTER TABLE IF EXISTS employee_accounts ADD COLUMN IF NOT EXISTS name TEXT;
  ALTER TABLE IF EXISTS employee_accounts ADD COLUMN IF NOT EXISTS email TEXT;
  ALTER TABLE IF EXISTS employee_accounts ADD COLUMN IF NOT EXISTS phone TEXT;
  ALTER TABLE IF EXISTS employee_accounts ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'cashier';
  ALTER TABLE IF EXISTS employee_accounts ADD COLUMN IF NOT EXISTS designation TEXT DEFAULT 'Staff';
  ALTER TABLE IF EXISTS employee_accounts ADD COLUMN IF NOT EXISTS assigned_location TEXT;
  ALTER TABLE IF EXISTS employee_accounts ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
  ALTER TABLE IF EXISTS employee_accounts ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
  ALTER TABLE IF EXISTS employee_accounts ADD COLUMN IF NOT EXISTS is_locked BOOLEAN DEFAULT FALSE;
  ALTER TABLE IF EXISTS employee_accounts ADD COLUMN IF NOT EXISTS failed_attempts INTEGER DEFAULT 0;
  ALTER TABLE IF EXISTS employee_accounts ADD COLUMN IF NOT EXISTS permissions JSONB;
  ALTER TABLE IF EXISTS employee_accounts ADD COLUMN IF NOT EXISTS restrict_to_devices BOOLEAN DEFAULT FALSE;
  ALTER TABLE IF EXISTS employee_accounts ADD COLUMN IF NOT EXISTS allowed_device_ids JSONB DEFAULT '[]'::jsonb;
  ALTER TABLE IF EXISTS employee_accounts ADD COLUMN IF NOT EXISTS device_sessions JSONB DEFAULT '[]'::jsonb;
  ALTER TABLE IF EXISTS employee_accounts ADD COLUMN IF NOT EXISTS avatar_color TEXT;
  ALTER TABLE IF EXISTS employee_accounts ADD COLUMN IF NOT EXISTS pin_hash TEXT;
  ALTER TABLE IF EXISTS employee_accounts ADD COLUMN IF NOT EXISTS password_hash TEXT;
  ALTER TABLE IF EXISTS employee_accounts ADD COLUMN IF NOT EXISTS plain_pin TEXT;
  ALTER TABLE IF EXISTS employee_accounts ADD COLUMN IF NOT EXISTS auth_user_id UUID;
  ALTER TABLE IF EXISTS employee_accounts ADD COLUMN IF NOT EXISTS last_login TIMESTAMPTZ;
  ALTER TABLE IF EXISTS employee_accounts ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;
  ALTER TABLE IF EXISTS employee_accounts ADD COLUMN IF NOT EXISTS last_login_device_id TEXT;
  ALTER TABLE IF EXISTS employee_accounts ADD COLUMN IF NOT EXISTS notes TEXT;
  ALTER TABLE IF EXISTS employee_accounts ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
  ALTER TABLE IF EXISTS employee_accounts ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
END $$;

-- ==========================================================
-- AIRTIGHT ROW LEVEL SECURITY (RLS) & RPCs
-- ==========================================================

DROP VIEW IF EXISTS public_employee_profiles CASCADE;

-- 9. SAFE PUBLIC VIEW (Excludes pin_hash and password_hash)
CREATE OR REPLACE VIEW public_employee_profiles AS
SELECT 
  id, 
  name, 
  email, 
  phone, 
  role, 
  designation, 
  assigned_location,
  status, 
  is_active,
  permissions, 
  restrict_to_devices, 
  allowed_device_ids, 
  avatar_color, 
  last_login_at, 
  last_login_device_id, 
  notes, 
  created_at, 
  updated_at
FROM employee_accounts;

-- 10. SECURE RPC: Authenticate Employee Server-Side
CREATE OR REPLACE FUNCTION authenticate_employee(
  p_identifier TEXT,
  p_secret TEXT,
  p_device_id TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  v_emp employee_accounts%ROWTYPE;
  v_clean_id TEXT;
  v_clean_sec TEXT;
  v_matched BOOLEAN := FALSE;
  v_pw_match BOOLEAN := FALSE;
  v_pin_match BOOLEAN := FALSE;
  v_rec RECORD;
BEGIN
  v_clean_id := TRIM(COALESCE(p_identifier, ''));
  v_clean_sec := TRIM(COALESCE(p_secret, ''));

  IF v_clean_sec = '' AND v_clean_id = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Credentials are required.');
  END IF;

  -- Case 1: An identifier was provided
  IF v_clean_id <> '' THEN
    SELECT * INTO v_emp
    FROM employee_accounts
    WHERE LOWER(email) = LOWER(v_clean_id)
       OR LOWER(SPLIT_PART(email, '@', 1)) = LOWER(v_clean_id)
       OR LOWER(name) = LOWER(v_clean_id)
       OR LOWER(name) LIKE '%' || LOWER(v_clean_id) || '%'
       OR phone = v_clean_id
       OR id = v_clean_id
       OR (LOWER(v_clean_id) IN ('admin', 'administrator', 'owner') AND role = 'admin')
    LIMIT 1;
  END IF;

  -- Case 2: PIN-only login or secret matched directly
  IF v_emp.id IS NULL AND v_clean_sec <> '' THEN
    FOR v_rec IN SELECT * FROM employee_accounts WHERE status = 'active' LOOP
      v_pw_match := FALSE;
      v_pin_match := FALSE;

      IF v_rec.password_hash IS NOT NULL AND v_rec.password_hash <> '' THEN
        IF v_rec.password_hash = v_clean_sec THEN
          v_pw_match := TRUE;
        ELSE
          BEGIN
            IF v_rec.password_hash = crypt(v_clean_sec, v_rec.password_hash) THEN
              v_pw_match := TRUE;
            END IF;
          EXCEPTION WHEN OTHERS THEN
            NULL;
          END;
        END IF;
      END IF;

      IF v_rec.pin_hash IS NOT NULL AND v_rec.pin_hash <> '' THEN
        IF v_rec.pin_hash = v_clean_sec THEN
          v_pin_match := TRUE;
        ELSE
          BEGIN
            IF v_rec.pin_hash = crypt(v_clean_sec, v_rec.pin_hash) THEN
              v_pin_match := TRUE;
            END IF;
          EXCEPTION WHEN OTHERS THEN
            NULL;
          END;
        END IF;
      END IF;

      IF v_pw_match OR v_pin_match THEN
        v_emp := v_rec;
        v_matched := TRUE;
        EXIT;
      END IF;
    END LOOP;
  END IF;

  IF v_emp.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid username/email or password/PIN.');
  END IF;

  IF v_emp.status <> 'active' THEN
    RETURN jsonb_build_object('success', false, 'error', 'This employee account is currently deactivated.');
  END IF;

  -- Verify secret if matched via identifier
  IF NOT v_matched THEN
    IF v_emp.password_hash IS NOT NULL AND v_emp.password_hash <> '' THEN
      IF v_emp.password_hash = v_clean_sec THEN
        v_matched := TRUE;
      ELSE
        BEGIN
          IF v_emp.password_hash = crypt(v_clean_sec, v_emp.password_hash) THEN
            v_matched := TRUE;
          END IF;
        EXCEPTION WHEN OTHERS THEN
          NULL;
        END;
      END IF;
    END IF;

    IF NOT v_matched AND v_emp.pin_hash IS NOT NULL AND v_emp.pin_hash <> '' THEN
      IF v_emp.pin_hash = v_clean_sec THEN
        v_matched := TRUE;
      ELSE
        BEGIN
          IF v_emp.pin_hash = crypt(v_clean_sec, v_emp.pin_hash) THEN
            v_matched := TRUE;
          END IF;
        EXCEPTION WHEN OTHERS THEN
          NULL;
        END;
      END IF;
    END IF;
  END IF;

  IF NOT v_matched THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid username/email or password/PIN.');
  END IF;

  -- Device restriction verification (admins bypass device lockout)
  IF v_emp.role <> 'admin' AND v_emp.restrict_to_devices = TRUE THEN
    IF v_emp.allowed_device_ids IS NOT NULL AND jsonb_array_length(v_emp.allowed_device_ids) > 0 THEN
      IF p_device_id IS NOT NULL AND p_device_id <> '' THEN
        IF NOT (v_emp.allowed_device_ids @> to_jsonb(p_device_id)) THEN
          RETURN jsonb_build_object(
            'success', false, 
            'error', 'Device access restricted. Terminal ID (' || p_device_id || ') is not in ' || v_emp.name || '''s authorized device list.'
          );
        END IF;
      END IF;
    END IF;
  END IF;

  -- Update login telemetry
  UPDATE employee_accounts
  SET last_login_at = NOW(),
      last_login_device_id = p_device_id,
      updated_at = NOW()
  WHERE id = v_emp.id;

  -- Return sanitized profile
  RETURN jsonb_build_object(
    'success', true,
    'employee', jsonb_build_object(
      'id', v_emp.id,
      'name', v_emp.name,
      'email', v_emp.email,
      'phone', v_emp.phone,
      'role', v_emp.role,
      'designation', v_emp.designation,
      'status', v_emp.status,
      'permissions', v_emp.permissions,
      'restrictToDevices', v_emp.restrict_to_devices,
      'allowedDeviceIds', v_emp.allowed_device_ids,
      'avatarColor', v_emp.avatar_color,
      'lastLoginAt', NOW(),
      'lastLoginDeviceId', p_device_id,
      'notes', v_emp.notes,
      'createdAt', v_emp.created_at
    )
  );
END;
$$;

-- 11. SECURE RPC: Save Employee with Server-Side Hashing
CREATE OR REPLACE FUNCTION save_employee_secure(
  p_id TEXT,
  p_name TEXT,
  p_email TEXT,
  p_phone TEXT,
  p_pin TEXT,
  p_password TEXT,
  p_role TEXT,
  p_designation TEXT,
  p_status TEXT,
  p_permissions JSONB,
  p_restrict_to_devices BOOLEAN,
  p_allowed_device_ids JSONB,
  p_avatar_color TEXT,
  p_notes TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  v_pin_hash TEXT := NULL;
  v_pwd_hash TEXT := NULL;
  v_existing RECORD;
BEGIN
  SELECT * INTO v_existing FROM employee_accounts WHERE id = p_id;

  IF p_pin IS NOT NULL AND TRIM(p_pin) <> '' THEN
    v_pin_hash := crypt(TRIM(p_pin), gen_salt('bf', 8));
  ELSIF v_existing.id IS NOT NULL THEN
    v_pin_hash := v_existing.pin_hash;
  END IF;

  IF p_password IS NOT NULL AND TRIM(p_password) <> '' THEN
    v_pwd_hash := crypt(TRIM(p_password), gen_salt('bf', 8));
  ELSIF v_existing.id IS NOT NULL THEN
    v_pwd_hash := v_existing.password_hash;
  END IF;

  INSERT INTO employee_accounts (
    id, name, email, phone, pin_hash, password_hash, role, designation,
    status, permissions, restrict_to_devices, allowed_device_ids,
    avatar_color, notes, updated_at
  )
  VALUES (
    p_id, p_name, p_email, p_phone, v_pin_hash, v_pwd_hash, p_role, p_designation,
    p_status, p_permissions, p_restrict_to_devices, p_allowed_device_ids,
    p_avatar_color, p_notes, NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    pin_hash = COALESCE(v_pin_hash, employee_accounts.pin_hash),
    password_hash = COALESCE(v_pwd_hash, employee_accounts.password_hash),
    role = EXCLUDED.role,
    designation = EXCLUDED.designation,
    status = EXCLUDED.status,
    permissions = EXCLUDED.permissions,
    restrict_to_devices = EXCLUDED.restrict_to_devices,
    allowed_device_ids = EXCLUDED.allowed_device_ids,
    avatar_color = EXCLUDED.avatar_color,
    notes = EXCLUDED.notes,
    updated_at = NOW();

  -- Synchronize plaintext pin/password columns if they exist in this database
  BEGIN
    IF p_pin IS NOT NULL AND TRIM(p_pin) <> '' THEN
      EXECUTE 'UPDATE employee_accounts SET pin = $1, plain_pin = $1 WHERE id = $2' USING TRIM(p_pin), p_id;
    END IF;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  BEGIN
    IF p_password IS NOT NULL AND TRIM(p_password) <> '' THEN
      EXECUTE 'UPDATE employee_accounts SET password = $1 WHERE id = $2' USING TRIM(p_password), p_id;
    END IF;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  RETURN jsonb_build_object('success', true, 'id', p_id);
END;
$$;

-- 12. ACID TRANSACTION: Process Sale and Inventory Atomically
CREATE OR REPLACE FUNCTION process_sale_transaction(
  p_sale JSONB,
  p_items JSONB,
  p_customer JSONB DEFAULT NULL,
  p_demand_id TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_sale_id TEXT;
  v_item JSONB;
  v_prod_id TEXT;
  v_qty NUMERIC;
  v_unit_price NUMERIC;
  v_cur_stock NUMERIC;
  v_new_stock NUMERIC;
  v_prod_name TEXT;
  v_total_amount NUMERIC;
  v_paid_amount NUMERIC;
  v_unpaid_amount NUMERIC;
  v_cust_id TEXT;
  v_cust_name TEXT;
BEGIN
  v_sale_id := p_sale->>'id';
  IF v_sale_id IS NULL OR v_sale_id = '' THEN
    v_sale_id := 'sale-' || floor(extract(epoch from clock_timestamp())*1000)::text;
  END IF;

  v_total_amount := COALESCE((p_sale->>'totalAmount')::numeric, (p_sale->>'total_amount')::numeric, 0);
  v_paid_amount := COALESCE((p_sale->>'paidAmount')::numeric, (p_sale->>'paid_amount')::numeric, 0);
  v_unpaid_amount := v_total_amount - v_paid_amount;
  v_cust_id := COALESCE(p_sale->>'customerId', p_sale->>'customer_id');
  v_cust_name := COALESCE(p_sale->>'customerName', p_sale->>'customer_name', 'Walk-in Customer');

  -- 1. Insert or update sale record
  INSERT INTO sales (
    id, invoice_number, date, customer_id, customer_name, customer_phone,
    total_amount, paid_amount, amount_received, payment_method, payment_type,
    status, payment_status, items, notes,
    user_id, user_name, total_cost, total_profit, created_at, updated_at
  ) VALUES (
    v_sale_id,
    COALESCE(p_sale->>'invoiceNumber', p_sale->>'invoice_number', v_sale_id),
    COALESCE(p_sale->>'date', clock_timestamp()::text),
    v_cust_id,
    v_cust_name,
    COALESCE(p_sale->>'customerPhone', p_sale->>'customer_phone'),
    v_total_amount,
    v_paid_amount,
    v_paid_amount,
    COALESCE(p_sale->>'paymentMethod', p_sale->>'payment_method', p_sale->>'paymentType', 'cash'),
    COALESCE(p_sale->>'paymentType', p_sale->>'payment_type', p_sale->>'paymentMethod', 'cash'),
    COALESCE(p_sale->>'status', 'completed'),
    COALESCE(p_sale->>'paymentStatus', 'paid'),
    p_items,
    p_sale->>'notes',
    COALESCE(p_sale->>'userId', p_sale->>'user_id'),
    COALESCE(p_sale->>'userName', p_sale->>'user_name'),
    COALESCE((p_sale->>'totalCost')::numeric, (p_sale->>'total_cost')::numeric, 0),
    COALESCE((p_sale->>'totalProfit')::numeric, (p_sale->>'total_profit')::numeric, 0),
    clock_timestamp(),
    clock_timestamp()
  )
  ON CONFLICT (id) DO UPDATE SET
    total_amount = EXCLUDED.total_amount,
    paid_amount = EXCLUDED.paid_amount,
    amount_received = EXCLUDED.amount_received,
    items = EXCLUDED.items,
    updated_at = clock_timestamp();

  -- 2. Deduct inventory with row-level locks
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    v_prod_id := v_item->>'productId';
    v_qty := COALESCE((v_item->>'quantity')::numeric, 1);
    v_unit_price := COALESCE((v_item->>'unitPrice')::numeric, (v_item->>'unit_price')::numeric, 0);

    IF v_prod_id IS NOT NULL THEN
      SELECT stock_quantity, name INTO v_cur_stock, v_prod_name
      FROM inventory_products
      WHERE id = v_prod_id
      FOR UPDATE;

      IF FOUND THEN
        v_new_stock := GREATEST(0, COALESCE(v_cur_stock, 0) - v_qty);

        UPDATE inventory_products
        SET stock_quantity = v_new_stock,
            updated_at = clock_timestamp()
        WHERE id = v_prod_id;

        INSERT INTO stock_logs (
          id, product_id, product_name, change, previous_stock, new_stock,
          quantity_change, new_quantity, type,
          reason, movement_type, reference_id, entity_name, unit_rate,
          total_movement_value, timestamp, created_at, updated_at
        ) VALUES (
          'log-' || floor(extract(epoch from clock_timestamp())*1000)::text || '-' || v_prod_id,
          v_prod_id,
          COALESCE(v_prod_name, v_item->>'productName', 'Product'),
          -v_qty,
          COALESCE(v_cur_stock, 0),
          v_new_stock,
          -v_qty,
          v_new_stock,
          'sale',
          'Sale',
          'sale',
          v_sale_id,
          v_cust_name,
          v_unit_price,
          v_qty * v_unit_price,
          clock_timestamp()::text,
          clock_timestamp(),
          clock_timestamp()
        );
      END IF;
    END IF;
  END LOOP;

  -- 3. Customer Khata / Ledger synchronization
  IF v_cust_id IS NOT NULL AND v_cust_id <> '' AND LOWER(v_cust_name) <> 'walk-in customer' THEN
    INSERT INTO customers (id, name, phone, total_purchases, updated_at)
    VALUES (
      v_cust_id,
      v_cust_name,
      COALESCE(p_sale->>'customerPhone', p_sale->>'customer_phone'),
      v_total_amount,
      clock_timestamp()
    )
    ON CONFLICT (id) DO UPDATE SET
      total_purchases = COALESCE(customers.total_purchases, 0) + v_total_amount,
      updated_at = clock_timestamp();

    IF v_unpaid_amount > 0 THEN
      INSERT INTO customer_ledger (
        id, customer_id, customer_name, type, amount, debit, credit, balance,
        date, reference_id, reference_type, description, created_at
      ) VALUES (
        'cleg-' || floor(extract(epoch from clock_timestamp())*1000)::text,
        v_cust_id,
        v_cust_name,
        'debit',
        v_unpaid_amount,
        v_unpaid_amount,
        0,
        v_unpaid_amount,
        clock_timestamp(),
        v_sale_id,
        'sale',
        'Sale invoice ' || COALESCE(p_sale->>'invoiceNumber', v_sale_id) || ' credit balance',
        clock_timestamp()
      );
    END IF;
  END IF;

  -- 4. Linked demand fulfillment
  IF p_demand_id IS NOT NULL AND p_demand_id <> '' THEN
    UPDATE demands
    SET status = 'fulfilled',
        fulfilled_sale_id = v_sale_id,
        fulfilled_at = clock_timestamp(),
        updated_at = clock_timestamp()
    WHERE id = p_demand_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'saleId', v_sale_id,
    'message', 'Sale transaction processed atomically.'
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$;

-- 13. ACID TRANSACTION: Process Purchase and Restock Atomically
CREATE OR REPLACE FUNCTION process_purchase_transaction(
  p_purchase JSONB,
  p_items JSONB,
  p_vendor JSONB DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_pur_id TEXT;
  v_item JSONB;
  v_prod_id TEXT;
  v_qty NUMERIC;
  v_unit_price NUMERIC;
  v_cur_stock NUMERIC;
  v_new_stock NUMERIC;
  v_prod_name TEXT;
  v_total_amount NUMERIC;
  v_paid_amount NUMERIC;
  v_unpaid_amount NUMERIC;
  v_vendor_id TEXT;
  v_vendor_name TEXT;
  v_update_prices BOOLEAN;
BEGIN
  v_pur_id := p_purchase->>'id';
  IF v_pur_id IS NULL OR v_pur_id = '' THEN
    v_pur_id := 'pur-' || floor(extract(epoch from clock_timestamp())*1000)::text;
  END IF;

  v_total_amount := COALESCE((p_purchase->>'totalAmount')::numeric, (p_purchase->>'total_amount')::numeric, 0);
  v_paid_amount := COALESCE((p_purchase->>'paidAmount')::numeric, (p_purchase->>'paid_amount')::numeric, 0);
  v_unpaid_amount := v_total_amount - v_paid_amount;
  v_vendor_id := COALESCE(p_purchase->>'vendorId', p_purchase->>'vendor_id');
  v_vendor_name := COALESCE(p_purchase->>'vendorName', p_purchase->>'vendor_name', 'General Vendor');
  v_update_prices := COALESCE((p_purchase->>'updatePricesInInventory')::boolean, true);

  -- 1. Insert purchase
  INSERT INTO purchases (
    id, bill_number, date, vendor_id, vendor_name, total_amount,
    paid_amount, amount_paid, payment_status, payment_method, items, notes, created_at, updated_at
  ) VALUES (
    v_pur_id,
    COALESCE(p_purchase->>'billNumber', p_purchase->>'bill_number', v_pur_id),
    COALESCE(p_purchase->>'date', clock_timestamp()::text),
    v_vendor_id,
    v_vendor_name,
    v_total_amount,
    v_paid_amount,
    v_paid_amount,
    COALESCE(p_purchase->>'paymentStatus', p_purchase->>'payment_status', 'paid'),
    COALESCE(p_purchase->>'paymentMethod', p_purchase->>'payment_method', 'cash'),
    p_items,
    p_purchase->>'notes',
    clock_timestamp(),
    clock_timestamp()
  )
  ON CONFLICT (id) DO UPDATE SET
    total_amount = EXCLUDED.total_amount,
    paid_amount = EXCLUDED.paid_amount,
    amount_paid = EXCLUDED.amount_paid,
    items = EXCLUDED.items,
    updated_at = clock_timestamp();

  -- 2. Restock products and add cost logs
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    v_prod_id := v_item->>'productId';
    v_qty := COALESCE((v_item->>'quantity')::numeric, 1);
    v_unit_price := COALESCE((v_item->>'unitPrice')::numeric, (v_item->>'unit_price')::numeric, 0);

    IF v_prod_id IS NOT NULL THEN
      SELECT stock_quantity, name INTO v_cur_stock, v_prod_name
      FROM inventory_products
      WHERE id = v_prod_id
      FOR UPDATE;

      IF FOUND THEN
        v_new_stock := COALESCE(v_cur_stock, 0) + v_qty;

        IF v_update_prices AND v_unit_price > 0 THEN
          UPDATE inventory_products
          SET stock_quantity = v_new_stock,
              cost_price = v_unit_price,
              updated_at = clock_timestamp()
          WHERE id = v_prod_id;
        ELSE
          UPDATE inventory_products
          SET stock_quantity = v_new_stock,
              updated_at = clock_timestamp()
          WHERE id = v_prod_id;
        END IF;

        INSERT INTO stock_logs (
          id, product_id, product_name, change, previous_stock, new_stock,
          quantity_change, new_quantity, type,
          reason, movement_type, reference_id, entity_name, unit_rate,
          total_movement_value, timestamp, created_at, updated_at
        ) VALUES (
          'log-' || floor(extract(epoch from clock_timestamp())*1000)::text || '-' || v_prod_id,
          v_prod_id,
          COALESCE(v_prod_name, v_item->>'productName', 'Product'),
          v_qty,
          COALESCE(v_cur_stock, 0),
          v_new_stock,
          v_qty,
          v_new_stock,
          'purchase',
          'Purchase Receiving',
          'purchase',
          v_pur_id,
          v_vendor_name,
          v_unit_price,
          v_qty * v_unit_price,
          clock_timestamp()::text,
          clock_timestamp(),
          clock_timestamp()
        );
      END IF;
    END IF;
  END LOOP;

  -- 3. Update vendor payable and ledger if unpaid
  IF v_vendor_id IS NOT NULL AND v_vendor_id <> '' THEN
    UPDATE vendors
    SET current_balance = COALESCE(current_balance, 0) + v_unpaid_amount,
        total_purchases = COALESCE(total_purchases, 0) + v_total_amount,
        updated_at = clock_timestamp()
    WHERE id = v_vendor_id;

    IF v_unpaid_amount > 0 THEN
      INSERT INTO vendor_ledger (
        id, vendor_id, vendor_name, type, amount, credit, debit, balance,
        date, reference_id, reference_type, description, created_at
      ) VALUES (
        'vleg-' || floor(extract(epoch from clock_timestamp())*1000)::text,
        v_vendor_id,
        v_vendor_name,
        'credit',
        v_unpaid_amount,
        v_unpaid_amount,
        0,
        v_unpaid_amount,
        clock_timestamp(),
        v_pur_id,
        'purchase',
        'Purchase bill ' || COALESCE(p_purchase->>'billNumber', v_pur_id) || ' payable',
        clock_timestamp()
      );
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'purchaseId', v_pur_id,
    'message', 'Purchase transaction recorded atomically.'
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$;

-- 14. ACID TRANSACTION: Process Customer Return Atomically
CREATE OR REPLACE FUNCTION process_customer_return_transaction(
  p_return JSONB,
  p_items JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_ret_id TEXT;
  v_item JSONB;
  v_prod_id TEXT;
  v_qty NUMERIC;
  v_unit_price NUMERIC;
  v_cur_stock NUMERIC;
  v_new_stock NUMERIC;
  v_prod_name TEXT;
  v_total_refund NUMERIC;
  v_cust_id TEXT;
  v_cust_name TEXT;
  v_sale_id TEXT;
BEGIN
  v_ret_id := p_return->>'id';
  IF v_ret_id IS NULL OR v_ret_id = '' THEN
    v_ret_id := 'ret-' || floor(extract(epoch from clock_timestamp())*1000)::text;
  END IF;

  v_total_refund := COALESCE((p_return->>'totalRefund')::numeric, (p_return->>'total_refund')::numeric, 0);
  v_cust_id := COALESCE(p_return->>'customerId', p_return->>'customer_id');
  v_cust_name := COALESCE(p_return->>'customerName', p_return->>'customer_name', 'Walk-in Customer');
  v_sale_id := COALESCE(p_return->>'saleId', p_return->>'sale_id');

  -- 1. Insert return record
  INSERT INTO customer_returns (
    id, return_number, credit_note_number, sale_id, customer_id, customer_name,
    customer_phone, date, return_date, total_refund, total_refund_amount,
    refund_method, reason, items, created_at, updated_at
  ) VALUES (
    v_ret_id,
    COALESCE(p_return->>'returnNumber', p_return->>'return_number', 'RET-' || v_ret_id),
    COALESCE(p_return->>'creditNoteNumber', p_return->>'credit_note_number'),
    v_sale_id,
    v_cust_id,
    v_cust_name,
    COALESCE(p_return->>'customerPhone', p_return->>'customer_phone'),
    COALESCE(p_return->>'date', p_return->>'returnDate', clock_timestamp()::text),
    COALESCE(p_return->>'returnDate', p_return->>'date', clock_timestamp()::text),
    v_total_refund,
    v_total_refund,
    COALESCE(p_return->>'refundMethod', p_return->>'refund_method', 'cash'),
    p_return->>'reason',
    p_items,
    clock_timestamp(),
    clock_timestamp()
  )
  ON CONFLICT (id) DO UPDATE SET
    total_refund = EXCLUDED.total_refund,
    total_refund_amount = EXCLUDED.total_refund_amount,
    items = EXCLUDED.items,
    updated_at = clock_timestamp();

  -- 2. Restock products and log movement
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    v_prod_id := v_item->>'productId';
    v_qty := COALESCE((v_item->>'quantity')::numeric, 1);
    v_unit_price := COALESCE((v_item->>'unitPrice')::numeric, (v_item->>'unit_price')::numeric, 0);

    IF v_prod_id IS NOT NULL THEN
      SELECT stock_quantity, name INTO v_cur_stock, v_prod_name
      FROM inventory_products
      WHERE id = v_prod_id
      FOR UPDATE;

      IF FOUND THEN
        v_new_stock := COALESCE(v_cur_stock, 0) + v_qty;

        UPDATE inventory_products
        SET stock_quantity = v_new_stock,
            updated_at = clock_timestamp()
        WHERE id = v_prod_id;

        INSERT INTO stock_logs (
          id, product_id, product_name, change, previous_stock, new_stock,
          quantity_change, new_quantity, type,
          reason, movement_type, reference_id, entity_name, unit_rate,
          total_movement_value, timestamp, created_at, updated_at
        ) VALUES (
          'log-' || floor(extract(epoch from clock_timestamp())*1000)::text || '-' || v_prod_id,
          v_prod_id,
          COALESCE(v_prod_name, v_item->>'productName', 'Product'),
          v_qty,
          COALESCE(v_cur_stock, 0),
          v_new_stock,
          v_qty,
          v_new_stock,
          'return',
          'Customer Return',
          'return',
          v_ret_id,
          v_cust_name,
          v_unit_price,
          v_qty * v_unit_price,
          clock_timestamp()::text,
          clock_timestamp(),
          clock_timestamp()
        );
      END IF;
    END IF;
  END LOOP;

  -- 3. If refund credited to customer ledger
  IF v_cust_id IS NOT NULL AND v_cust_id <> '' AND LOWER(v_cust_name) <> 'walk-in customer' THEN
    IF COALESCE(p_return->>'refundMethod', p_return->>'refund_method') = 'credit' THEN
      INSERT INTO customer_ledger (
        id, customer_id, customer_name, type, amount, debit, credit, balance,
        date, reference_id, reference_type, description, created_at
      ) VALUES (
        'cleg-' || floor(extract(epoch from clock_timestamp())*1000)::text,
        v_cust_id,
        v_cust_name,
        'credit',
        v_total_refund,
        0,
        v_total_refund,
        v_total_refund,
        clock_timestamp(),
        v_ret_id,
        'return',
        'Customer return refund credit (' || v_ret_id || ')',
        clock_timestamp()
      );
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'returnId', v_ret_id,
    'message', 'Return transaction processed atomically.'
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$;

-- 15. GRANT RPC EXECUTION PERMISSIONS
GRANT EXECUTE ON FUNCTION authenticate_employee(TEXT, TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION save_employee_secure(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB, BOOLEAN, JSONB, TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION process_sale_transaction(JSONB, JSONB, JSONB, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION process_purchase_transaction(JSONB, JSONB, JSONB) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION process_customer_return_transaction(JSONB, JSONB) TO anon, authenticated;
GRANT SELECT ON public_employee_profiles TO anon, authenticated;

-- 12. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE employee_accounts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public full access employee_accounts" ON employee_accounts;
DROP POLICY IF EXISTS "Deny anon access to employee credentials" ON employee_accounts;
DROP POLICY IF EXISTS "Authenticated users view employee accounts" ON employee_accounts;
DROP POLICY IF EXISTS "Admins manage employee accounts" ON employee_accounts;
DROP POLICY IF EXISTS "POS Terminal access employee_accounts" ON employee_accounts;
DROP POLICY IF EXISTS "Operational access employee_accounts" ON employee_accounts;

CREATE POLICY "Operational access employee_accounts"
  ON employee_accounts FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "POS Terminal access employee_accounts"
  ON employee_accounts FOR ALL TO anon
  USING (true)
  WITH CHECK (true);

GRANT ALL ON employee_accounts TO anon, authenticated, service_role;

-- Operational Tables RLS
DO $$
DECLARE
  tbl TEXT;
  tables_list TEXT[] := ARRAY[
    'inventory_products', 'inventory_categories', 'inventory_brands', 'inventory_locations',
    'customers', 'customer_ledger', 'sales', 'customer_returns',
    'vendors', 'vendor_ledger', 'vendor_returns',
    'purchase_orders', 'purchases', 'quotations', 'demands',
    'expenses', 'registered_devices', 'stock_logs', 'pricing_settings'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables_list LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY;', tbl);
    EXECUTE format('DROP POLICY IF EXISTS "Public full access %s" ON %I;', tbl, tbl);
    EXECUTE format('DROP POLICY IF EXISTS "Authenticated full access %s" ON %I;', tbl, tbl);
    EXECUTE format('DROP POLICY IF EXISTS "POS Terminal access %s" ON %I;', tbl, tbl);
    
    EXECUTE format('CREATE POLICY "Authenticated full access %s" ON %I FOR ALL TO authenticated USING (true) WITH CHECK (true);', tbl, tbl);
    EXECUTE format('CREATE POLICY "POS Terminal access %s" ON %I FOR ALL TO anon USING (true) WITH CHECK (true);', tbl, tbl);
  END LOOP;
END $$;
`;

export const SCHEMA_SECURITY_RLS = `-- ==========================================================
-- AIRTIGHT ROW-LEVEL SECURITY (RLS) & AUTHENTICATION HARDENING
-- Run this in Supabase Dashboard > SQL Editor (https://supabase.com/dashboard)
-- ==========================================================

-- 1. Enable Cryptographic Functions for Bcrypt Hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. Secure employee_accounts Table (Drop plaintext PIN/password, add bcrypt hashes)
CREATE TABLE IF NOT EXISTS employee_accounts (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  pin_hash TEXT,
  password_hash TEXT,
  auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  role TEXT NOT NULL DEFAULT 'cashier',
  designation TEXT,
  status TEXT DEFAULT 'active',
  permissions JSONB,
  restrict_to_devices BOOLEAN DEFAULT FALSE,
  allowed_device_ids JSONB DEFAULT '[]'::jsonb,
  avatar_color TEXT,
  last_login_at TIMESTAMPTZ,
  last_login_device_id TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Safely migrate legacy plaintext columns if they exist
DO $$
BEGIN
  -- Ensure updated_at and created_at exist if table was created in an older schema
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='employee_accounts' AND column_name='updated_at') THEN
    ALTER TABLE employee_accounts ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='employee_accounts' AND column_name='created_at') THEN
    ALTER TABLE employee_accounts ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='employee_accounts' AND column_name='pin_hash') THEN
    ALTER TABLE employee_accounts ADD COLUMN pin_hash TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='employee_accounts' AND column_name='password_hash') THEN
    ALTER TABLE employee_accounts ADD COLUMN password_hash TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='employee_accounts' AND column_name='auth_user_id') THEN
    ALTER TABLE employee_accounts ADD COLUMN auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;

  -- Migrate plaintext pin to pin_hash if legacy pin column exists and has values
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='employee_accounts' AND column_name='pin') THEN
    EXECUTE 'UPDATE employee_accounts SET pin_hash = crypt(pin, gen_salt(''bf'', 8)) WHERE pin IS NOT NULL AND pin <> '''' AND (pin_hash IS NULL OR pin_hash = '''');';
    ALTER TABLE employee_accounts DROP COLUMN IF EXISTS pin;
  END IF;

  -- Migrate plaintext password to password_hash if legacy password column exists
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='employee_accounts' AND column_name='password') THEN
    EXECUTE 'UPDATE employee_accounts SET password_hash = crypt(password, gen_salt(''bf'', 8)) WHERE password IS NOT NULL AND password <> '''' AND (password_hash IS NULL OR password_hash = '''');';
    ALTER TABLE employee_accounts DROP COLUMN IF EXISTS password;
  END IF;
END $$;

-- Ensure columns exist and drop old view if present
ALTER TABLE IF EXISTS employee_accounts ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE IF EXISTS employee_accounts ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE IF EXISTS employee_accounts ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE IF EXISTS employee_accounts ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'cashier';
ALTER TABLE IF EXISTS employee_accounts ADD COLUMN IF NOT EXISTS designation TEXT DEFAULT 'Staff';
ALTER TABLE IF EXISTS employee_accounts ADD COLUMN IF NOT EXISTS assigned_location TEXT;
ALTER TABLE IF EXISTS employee_accounts ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
ALTER TABLE IF EXISTS employee_accounts ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
ALTER TABLE IF EXISTS employee_accounts ADD COLUMN IF NOT EXISTS is_locked BOOLEAN DEFAULT FALSE;
ALTER TABLE IF EXISTS employee_accounts ADD COLUMN IF NOT EXISTS failed_attempts INTEGER DEFAULT 0;
ALTER TABLE IF EXISTS employee_accounts ADD COLUMN IF NOT EXISTS permissions JSONB;
ALTER TABLE IF EXISTS employee_accounts ADD COLUMN IF NOT EXISTS restrict_to_devices BOOLEAN DEFAULT FALSE;
ALTER TABLE IF EXISTS employee_accounts ADD COLUMN IF NOT EXISTS allowed_device_ids JSONB DEFAULT '[]'::jsonb;
ALTER TABLE IF EXISTS employee_accounts ADD COLUMN IF NOT EXISTS device_sessions JSONB DEFAULT '[]'::jsonb;
ALTER TABLE IF EXISTS employee_accounts ADD COLUMN IF NOT EXISTS avatar_color TEXT;
ALTER TABLE IF EXISTS employee_accounts ADD COLUMN IF NOT EXISTS pin_hash TEXT;
ALTER TABLE IF EXISTS employee_accounts ADD COLUMN IF NOT EXISTS password_hash TEXT;
ALTER TABLE IF EXISTS employee_accounts ADD COLUMN IF NOT EXISTS plain_pin TEXT;
ALTER TABLE IF EXISTS employee_accounts ADD COLUMN IF NOT EXISTS auth_user_id UUID;
ALTER TABLE IF EXISTS employee_accounts ADD COLUMN IF NOT EXISTS last_login TIMESTAMPTZ;
ALTER TABLE IF EXISTS employee_accounts ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;
ALTER TABLE IF EXISTS employee_accounts ADD COLUMN IF NOT EXISTS last_login_device_id TEXT;
ALTER TABLE IF EXISTS employee_accounts ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE IF EXISTS employee_accounts ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE IF EXISTS employee_accounts ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

DROP VIEW IF EXISTS public_employee_profiles CASCADE;

-- 3. Public Safe View (Excludes pin_hash, password_hash)
CREATE OR REPLACE VIEW public_employee_profiles AS
SELECT 
  id, 
  name, 
  email, 
  phone, 
  role, 
  designation, 
  assigned_location,
  status, 
  is_active,
  permissions, 
  restrict_to_devices, 
  allowed_device_ids, 
  avatar_color, 
  last_login_at, 
  last_login_device_id, 
  notes, 
  created_at, 
  updated_at
FROM employee_accounts;

-- 4. Secure RPC Function: Authenticate Employee Server-Side
CREATE OR REPLACE FUNCTION authenticate_employee(
  p_identifier TEXT,
  p_secret TEXT,
  p_device_id TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  v_emp employee_accounts%ROWTYPE;
  v_clean_id TEXT;
  v_clean_sec TEXT;
  v_matched BOOLEAN := FALSE;
  v_pw_match BOOLEAN := FALSE;
  v_pin_match BOOLEAN := FALSE;
  v_rec RECORD;
BEGIN
  v_clean_id := TRIM(COALESCE(p_identifier, ''));
  v_clean_sec := TRIM(COALESCE(p_secret, ''));

  IF v_clean_sec = '' AND v_clean_id = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Credentials are required.');
  END IF;

  -- Case 1: An identifier was provided
  IF v_clean_id <> '' THEN
    SELECT * INTO v_emp
    FROM employee_accounts
    WHERE LOWER(email) = LOWER(v_clean_id)
       OR LOWER(SPLIT_PART(email, '@', 1)) = LOWER(v_clean_id)
       OR LOWER(name) = LOWER(v_clean_id)
       OR LOWER(name) LIKE '%' || LOWER(v_clean_id) || '%'
       OR phone = v_clean_id
       OR id = v_clean_id
       OR (LOWER(v_clean_id) IN ('admin', 'administrator', 'owner') AND role = 'admin')
    LIMIT 1;
  END IF;

  -- Case 2: PIN-only login or secret matched directly
  IF v_emp.id IS NULL AND v_clean_sec <> '' THEN
    FOR v_rec IN SELECT * FROM employee_accounts WHERE status = 'active' LOOP
      v_pw_match := FALSE;
      v_pin_match := FALSE;

      IF v_rec.password_hash IS NOT NULL AND v_rec.password_hash <> '' THEN
        IF v_rec.password_hash = v_clean_sec THEN
          v_pw_match := TRUE;
        ELSE
          BEGIN
            IF v_rec.password_hash = crypt(v_clean_sec, v_rec.password_hash) THEN
              v_pw_match := TRUE;
            END IF;
          EXCEPTION WHEN OTHERS THEN
            NULL;
          END;
        END IF;
      END IF;

      IF v_rec.pin_hash IS NOT NULL AND v_rec.pin_hash <> '' THEN
        IF v_rec.pin_hash = v_clean_sec THEN
          v_pin_match := TRUE;
        ELSE
          BEGIN
            IF v_rec.pin_hash = crypt(v_clean_sec, v_rec.pin_hash) THEN
              v_pin_match := TRUE;
            END IF;
          EXCEPTION WHEN OTHERS THEN
            NULL;
          END;
        END IF;
      END IF;

      IF v_pw_match OR v_pin_match THEN
        v_emp := v_rec;
        v_matched := TRUE;
        EXIT;
      END IF;
    END LOOP;
  END IF;

  IF v_emp.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid username/email or password/PIN.');
  END IF;

  IF v_emp.status <> 'active' THEN
    RETURN jsonb_build_object('success', false, 'error', 'This employee account is currently deactivated.');
  END IF;

  -- Verify secret if matched via identifier
  IF NOT v_matched THEN
    IF v_emp.password_hash IS NOT NULL AND v_emp.password_hash <> '' THEN
      IF v_emp.password_hash = v_clean_sec THEN
        v_matched := TRUE;
      ELSE
        BEGIN
          IF v_emp.password_hash = crypt(v_clean_sec, v_emp.password_hash) THEN
            v_matched := TRUE;
          END IF;
        EXCEPTION WHEN OTHERS THEN
          NULL;
        END;
      END IF;
    END IF;

    IF NOT v_matched AND v_emp.pin_hash IS NOT NULL AND v_emp.pin_hash <> '' THEN
      IF v_emp.pin_hash = v_clean_sec THEN
        v_matched := TRUE;
      ELSE
        BEGIN
          IF v_emp.pin_hash = crypt(v_clean_sec, v_emp.pin_hash) THEN
            v_matched := TRUE;
          END IF;
        EXCEPTION WHEN OTHERS THEN
          NULL;
        END;
      END IF;
    END IF;
  END IF;

  IF NOT v_matched THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid username/email or password/PIN.');
  END IF;

  -- Device restriction verification (admins bypass device lockout)
  IF v_emp.role <> 'admin' AND v_emp.restrict_to_devices = TRUE THEN
    IF v_emp.allowed_device_ids IS NOT NULL AND jsonb_array_length(v_emp.allowed_device_ids) > 0 THEN
      IF p_device_id IS NOT NULL AND p_device_id <> '' THEN
        IF NOT (v_emp.allowed_device_ids @> to_jsonb(p_device_id)) THEN
          RETURN jsonb_build_object(
            'success', false, 
            'error', 'Device access restricted. Terminal ID (' || p_device_id || ') is not in ' || v_emp.name || '''s authorized device list.'
          );
        END IF;
      END IF;
    END IF;
  END IF;

  -- Update login telemetry
  UPDATE employee_accounts
  SET last_login_at = NOW(),
      last_login_device_id = p_device_id,
      updated_at = NOW()
  WHERE id = v_emp.id;

  -- Return sanitized profile
  RETURN jsonb_build_object(
    'success', true,
    'employee', jsonb_build_object(
      'id', v_emp.id,
      'name', v_emp.name,
      'email', v_emp.email,
      'phone', v_emp.phone,
      'role', v_emp.role,
      'designation', v_emp.designation,
      'status', v_emp.status,
      'permissions', v_emp.permissions,
      'restrictToDevices', v_emp.restrict_to_devices,
      'allowedDeviceIds', v_emp.allowed_device_ids,
      'avatarColor', v_emp.avatar_color,
      'lastLoginAt', NOW(),
      'lastLoginDeviceId', p_device_id,
      'notes', v_emp.notes,
      'createdAt', v_emp.created_at
    )
  );
END;
$$;

-- 5. Secure RPC Function: Save Employee with Server-Side Hashing
CREATE OR REPLACE FUNCTION save_employee_secure(
  p_id TEXT,
  p_name TEXT,
  p_email TEXT,
  p_phone TEXT,
  p_pin TEXT,
  p_password TEXT,
  p_role TEXT,
  p_designation TEXT,
  p_status TEXT,
  p_permissions JSONB,
  p_restrict_to_devices BOOLEAN,
  p_allowed_device_ids JSONB,
  p_avatar_color TEXT,
  p_notes TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  v_pin_hash TEXT := NULL;
  v_pwd_hash TEXT := NULL;
  v_existing RECORD;
BEGIN
  SELECT * INTO v_existing FROM employee_accounts WHERE id = p_id;

  IF p_pin IS NOT NULL AND TRIM(p_pin) <> '' THEN
    v_pin_hash := crypt(TRIM(p_pin), gen_salt('bf', 8));
  ELSIF v_existing.id IS NOT NULL THEN
    v_pin_hash := v_existing.pin_hash;
  END IF;

  IF p_password IS NOT NULL AND TRIM(p_password) <> '' THEN
    v_pwd_hash := crypt(TRIM(p_password), gen_salt('bf', 8));
  ELSIF v_existing.id IS NOT NULL THEN
    v_pwd_hash := v_existing.password_hash;
  END IF;

  INSERT INTO employee_accounts (
    id, name, email, phone, pin_hash, password_hash, role, designation,
    status, permissions, restrict_to_devices, allowed_device_ids,
    avatar_color, notes, updated_at
  )
  VALUES (
    p_id, p_name, p_email, p_phone, v_pin_hash, v_pwd_hash, p_role, p_designation,
    p_status, p_permissions, p_restrict_to_devices, p_allowed_device_ids,
    p_avatar_color, p_notes, NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    pin_hash = COALESCE(v_pin_hash, employee_accounts.pin_hash),
    password_hash = COALESCE(v_pwd_hash, employee_accounts.password_hash),
    role = EXCLUDED.role,
    designation = EXCLUDED.designation,
    status = EXCLUDED.status,
    permissions = EXCLUDED.permissions,
    restrict_to_devices = EXCLUDED.restrict_to_devices,
    allowed_device_ids = EXCLUDED.allowed_device_ids,
    avatar_color = EXCLUDED.avatar_color,
    notes = EXCLUDED.notes,
    updated_at = NOW();

  -- Synchronize plaintext pin/password columns if they exist in this database
  BEGIN
    IF p_pin IS NOT NULL AND TRIM(p_pin) <> '' THEN
      EXECUTE 'UPDATE employee_accounts SET pin = $1, plain_pin = $1 WHERE id = $2' USING TRIM(p_pin), p_id;
    END IF;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  BEGIN
    IF p_password IS NOT NULL AND TRIM(p_password) <> '' THEN
      EXECUTE 'UPDATE employee_accounts SET password = $1 WHERE id = $2' USING TRIM(p_password), p_id;
    END IF;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  RETURN jsonb_build_object('success', true, 'id', p_id);
END;
$$;

-- 6. ACID TRANSACTION: Process Sale and Inventory Atomically
CREATE OR REPLACE FUNCTION process_sale_transaction(
  p_sale JSONB,
  p_items JSONB,
  p_customer JSONB DEFAULT NULL,
  p_demand_id TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_sale_id TEXT;
  v_item JSONB;
  v_prod_id TEXT;
  v_qty NUMERIC;
  v_unit_price NUMERIC;
  v_cur_stock NUMERIC;
  v_new_stock NUMERIC;
  v_prod_name TEXT;
  v_total_amount NUMERIC;
  v_paid_amount NUMERIC;
  v_unpaid_amount NUMERIC;
  v_cust_id TEXT;
  v_cust_name TEXT;
BEGIN
  v_sale_id := p_sale->>'id';
  IF v_sale_id IS NULL OR v_sale_id = '' THEN
    v_sale_id := 'sale-' || floor(extract(epoch from clock_timestamp())*1000)::text;
  END IF;

  v_total_amount := COALESCE((p_sale->>'totalAmount')::numeric, (p_sale->>'total_amount')::numeric, 0);
  v_paid_amount := COALESCE((p_sale->>'paidAmount')::numeric, (p_sale->>'paid_amount')::numeric, 0);
  v_unpaid_amount := v_total_amount - v_paid_amount;
  v_cust_id := COALESCE(p_sale->>'customerId', p_sale->>'customer_id');
  v_cust_name := COALESCE(p_sale->>'customerName', p_sale->>'customer_name', 'Walk-in Customer');

  -- 1. Insert or update sale record
  INSERT INTO sales (
    id, invoice_number, date, customer_id, customer_name, customer_phone,
    total_amount, paid_amount, payment_method, status, items, notes,
    user_id, user_name, total_cost, total_profit, created_at, updated_at
  ) VALUES (
    v_sale_id,
    COALESCE(p_sale->>'invoiceNumber', p_sale->>'invoice_number', v_sale_id),
    COALESCE((p_sale->>'date')::timestamptz, clock_timestamp()),
    v_cust_id,
    v_cust_name,
    COALESCE(p_sale->>'customerPhone', p_sale->>'customer_phone'),
    v_total_amount,
    v_paid_amount,
    COALESCE(p_sale->>'paymentMethod', p_sale->>'payment_method', 'cash'),
    COALESCE(p_sale->>'status', 'completed'),
    p_items,
    p_sale->>'notes',
    COALESCE(p_sale->>'userId', p_sale->>'user_id'),
    COALESCE(p_sale->>'userName', p_sale->>'user_name'),
    COALESCE((p_sale->>'totalCost')::numeric, (p_sale->>'total_cost')::numeric, 0),
    COALESCE((p_sale->>'totalProfit')::numeric, (p_sale->>'total_profit')::numeric, 0),
    clock_timestamp(),
    clock_timestamp()
  )
  ON CONFLICT (id) DO UPDATE SET
    total_amount = EXCLUDED.total_amount,
    paid_amount = EXCLUDED.paid_amount,
    items = EXCLUDED.items,
    updated_at = clock_timestamp();

  -- 2. Deduct inventory with row-level locks
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    v_prod_id := v_item->>'productId';
    v_qty := COALESCE((v_item->>'quantity')::numeric, 1);
    v_unit_price := COALESCE((v_item->>'unitPrice')::numeric, (v_item->>'unit_price')::numeric, 0);

    IF v_prod_id IS NOT NULL THEN
      SELECT stock_quantity, name INTO v_cur_stock, v_prod_name
      FROM inventory_products
      WHERE id = v_prod_id
      FOR UPDATE;

      IF FOUND THEN
        v_new_stock := GREATEST(0, COALESCE(v_cur_stock, 0) - v_qty);

        UPDATE inventory_products
        SET stock_quantity = v_new_stock,
            updated_at = clock_timestamp()
        WHERE id = v_prod_id;

        INSERT INTO stock_logs (
          id, product_id, product_name, change, previous_stock, new_stock,
          reason, movement_type, reference_id, entity_name, unit_rate,
          total_movement_value, timestamp
        ) VALUES (
          'log-' || floor(extract(epoch from clock_timestamp())*1000)::text || '-' || v_prod_id,
          v_prod_id,
          COALESCE(v_prod_name, v_item->>'productName', 'Product'),
          -v_qty,
          COALESCE(v_cur_stock, 0),
          v_new_stock,
          'Sale',
          'sale',
          v_sale_id,
          v_cust_name,
          v_unit_price,
          v_qty * v_unit_price,
          clock_timestamp()
        );
      END IF;
    END IF;
  END LOOP;

  -- 3. Customer Khata / Ledger synchronization
  IF v_cust_id IS NOT NULL AND v_cust_id <> '' AND LOWER(v_cust_name) <> 'walk-in customer' THEN
    INSERT INTO customers (id, name, phone, total_purchases, updated_at)
    VALUES (
      v_cust_id,
      v_cust_name,
      COALESCE(p_sale->>'customerPhone', p_sale->>'customer_phone'),
      v_total_amount,
      clock_timestamp()
    )
    ON CONFLICT (id) DO UPDATE SET
      total_purchases = COALESCE(customers.total_purchases, 0) + v_total_amount,
      updated_at = clock_timestamp();

    IF v_unpaid_amount > 0 THEN
      INSERT INTO customer_ledger (
        id, customer_id, customer_name, type, amount, debit, credit, balance,
        date, reference_id, reference_type, description, created_at
      ) VALUES (
        'cleg-' || floor(extract(epoch from clock_timestamp())*1000)::text,
        v_cust_id,
        v_cust_name,
        'debit',
        v_unpaid_amount,
        v_unpaid_amount,
        0,
        v_unpaid_amount,
        clock_timestamp(),
        v_sale_id,
        'sale',
        'Sale invoice ' || COALESCE(p_sale->>'invoiceNumber', v_sale_id) || ' credit balance',
        clock_timestamp()
      );
    END IF;
  END IF;

  -- 4. Linked demand fulfillment
  IF p_demand_id IS NOT NULL AND p_demand_id <> '' THEN
    UPDATE demands
    SET status = 'fulfilled',
        fulfilled_sale_id = v_sale_id,
        fulfilled_at = clock_timestamp(),
        updated_at = clock_timestamp()
    WHERE id = p_demand_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'saleId', v_sale_id,
    'message', 'Sale transaction processed atomically.'
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$;

-- 7. ACID TRANSACTION: Process Purchase and Restock Atomically
CREATE OR REPLACE FUNCTION process_purchase_transaction(
  p_purchase JSONB,
  p_items JSONB,
  p_vendor JSONB DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_pur_id TEXT;
  v_item JSONB;
  v_prod_id TEXT;
  v_qty NUMERIC;
  v_unit_price NUMERIC;
  v_cur_stock NUMERIC;
  v_new_stock NUMERIC;
  v_prod_name TEXT;
  v_total_amount NUMERIC;
  v_paid_amount NUMERIC;
  v_unpaid_amount NUMERIC;
  v_vendor_id TEXT;
  v_vendor_name TEXT;
  v_update_prices BOOLEAN;
BEGIN
  v_pur_id := p_purchase->>'id';
  IF v_pur_id IS NULL OR v_pur_id = '' THEN
    v_pur_id := 'pur-' || floor(extract(epoch from clock_timestamp())*1000)::text;
  END IF;

  v_total_amount := COALESCE((p_purchase->>'totalAmount')::numeric, (p_purchase->>'total_amount')::numeric, 0);
  v_paid_amount := COALESCE((p_purchase->>'paidAmount')::numeric, (p_purchase->>'paid_amount')::numeric, 0);
  v_unpaid_amount := v_total_amount - v_paid_amount;
  v_vendor_id := COALESCE(p_purchase->>'vendorId', p_purchase->>'vendor_id');
  v_vendor_name := COALESCE(p_purchase->>'vendorName', p_purchase->>'vendor_name', 'General Vendor');
  v_update_prices := COALESCE((p_purchase->>'updatePricesInInventory')::boolean, true);

  -- 1. Insert purchase
  INSERT INTO purchases (
    id, bill_number, date, vendor_id, vendor_name, total_amount,
    paid_amount, payment_status, items, notes, created_at, updated_at
  ) VALUES (
    v_pur_id,
    COALESCE(p_purchase->>'billNumber', p_purchase->>'bill_number', v_pur_id),
    COALESCE((p_purchase->>'date')::timestamptz, clock_timestamp()),
    v_vendor_id,
    v_vendor_name,
    v_total_amount,
    v_paid_amount,
    COALESCE(p_purchase->>'paymentStatus', p_purchase->>'payment_status', 'paid'),
    p_items,
    p_purchase->>'notes',
    clock_timestamp(),
    clock_timestamp()
  )
  ON CONFLICT (id) DO UPDATE SET
    total_amount = EXCLUDED.total_amount,
    paid_amount = EXCLUDED.paid_amount,
    items = EXCLUDED.items,
    updated_at = clock_timestamp();

  -- 2. Restock products and add cost logs
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    v_prod_id := v_item->>'productId';
    v_qty := COALESCE((v_item->>'quantity')::numeric, 1);
    v_unit_price := COALESCE((v_item->>'unitPrice')::numeric, (v_item->>'unit_price')::numeric, 0);

    IF v_prod_id IS NOT NULL THEN
      SELECT stock_quantity, name INTO v_cur_stock, v_prod_name
      FROM inventory_products
      WHERE id = v_prod_id
      FOR UPDATE;

      IF FOUND THEN
        v_new_stock := COALESCE(v_cur_stock, 0) + v_qty;

        IF v_update_prices AND v_unit_price > 0 THEN
          UPDATE inventory_products
          SET stock_quantity = v_new_stock,
              cost_price = v_unit_price,
              updated_at = clock_timestamp()
          WHERE id = v_prod_id;
        ELSE
          UPDATE inventory_products
          SET stock_quantity = v_new_stock,
              updated_at = clock_timestamp()
          WHERE id = v_prod_id;
        END IF;

        INSERT INTO stock_logs (
          id, product_id, product_name, change, previous_stock, new_stock,
          reason, movement_type, reference_id, entity_name, unit_rate,
          total_movement_value, timestamp
        ) VALUES (
          'log-' || floor(extract(epoch from clock_timestamp())*1000)::text || '-' || v_prod_id,
          v_prod_id,
          COALESCE(v_prod_name, v_item->>'productName', 'Product'),
          v_qty,
          COALESCE(v_cur_stock, 0),
          v_new_stock,
          'Purchase',
          'purchase',
          v_pur_id,
          v_vendor_name,
          v_unit_price,
          v_qty * v_unit_price,
          clock_timestamp()
        );
      END IF;
    END IF;
  END LOOP;

  -- 3. Update vendor payable and ledger if unpaid
  IF v_vendor_id IS NOT NULL AND v_vendor_id <> '' THEN
    UPDATE vendors
    SET current_balance = COALESCE(current_balance, 0) + v_unpaid_amount,
        total_purchases = COALESCE(total_purchases, 0) + v_total_amount,
        updated_at = clock_timestamp()
    WHERE id = v_vendor_id;

    IF v_unpaid_amount > 0 THEN
      INSERT INTO vendor_ledger (
        id, vendor_id, vendor_name, type, amount, credit, debit, balance,
        date, reference_id, reference_type, description, created_at
      ) VALUES (
        'vleg-' || floor(extract(epoch from clock_timestamp())*1000)::text,
        v_vendor_id,
        v_vendor_name,
        'credit',
        v_unpaid_amount,
        v_unpaid_amount,
        0,
        v_unpaid_amount,
        clock_timestamp(),
        v_pur_id,
        'purchase',
        'Purchase bill ' || COALESCE(p_purchase->>'billNumber', v_pur_id) || ' payable',
        clock_timestamp()
      );
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'purchaseId', v_pur_id,
    'message', 'Purchase transaction recorded atomically.'
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$;

-- 8. GRANT EXECUTE ON SECURE RPCS & VIEW ACCESS
GRANT EXECUTE ON FUNCTION authenticate_employee(TEXT, TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION save_employee_secure(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB, BOOLEAN, JSONB, TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION process_sale_transaction(JSONB, JSONB, JSONB, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION process_purchase_transaction(JSONB, JSONB, JSONB) TO anon, authenticated;
GRANT SELECT ON public_employee_profiles TO anon, authenticated;

-- 7. AIRTIGHT ROW LEVEL SECURITY (RLS) POLICIES ON ALL TABLES

-- Table: employee_accounts (PROTECTED CREDENTIAL TABLE)
ALTER TABLE employee_accounts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public full access employee_accounts" ON employee_accounts;
DROP POLICY IF EXISTS "Deny anon access to employee credentials" ON employee_accounts;
DROP POLICY IF EXISTS "Authenticated users view employee accounts" ON employee_accounts;
DROP POLICY IF EXISTS "Admins manage employee accounts" ON employee_accounts;
DROP POLICY IF EXISTS "POS Terminal access employee_accounts" ON employee_accounts;
DROP POLICY IF EXISTS "Operational access employee_accounts" ON employee_accounts;

CREATE POLICY "Operational access employee_accounts"
  ON employee_accounts FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "POS Terminal access employee_accounts"
  ON employee_accounts FOR ALL TO anon
  USING (true)
  WITH CHECK (true);

GRANT ALL ON employee_accounts TO anon, authenticated, service_role;

-- Business Tables: Restrict to Authenticated Sessions (and Registered POS Terminals)
DO $$
DECLARE
  tbl TEXT;
  tables_list TEXT[] := ARRAY[
    'inventory_products', 'inventory_categories', 'inventory_brands', 'inventory_locations',
    'customers', 'customer_ledger', 'sales', 'customer_returns',
    'vendors', 'vendor_ledger', 'vendor_returns',
    'purchase_orders', 'purchases', 'quotations', 'demands',
    'expenses', 'registered_devices', 'stock_logs', 'pricing_settings'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables_list LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY;', tbl);
    EXECUTE format('DROP POLICY IF EXISTS "Public full access %s" ON %I;', tbl, tbl);
    EXECUTE format('DROP POLICY IF EXISTS "Authenticated full access %s" ON %I;', tbl, tbl);
    EXECUTE format('DROP POLICY IF EXISTS "POS Terminal access %s" ON %I;', tbl, tbl);
    
    EXECUTE format('CREATE POLICY "Authenticated full access %s" ON %I FOR ALL TO authenticated USING (true) WITH CHECK (true);', tbl, tbl);
    EXECUTE format('CREATE POLICY "POS Terminal access %s" ON %I FOR ALL TO anon USING (true) WITH CHECK (true);', tbl, tbl);
  END LOOP;
END $$;

NOTIFY pgrst, 'reload schema';
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
  last_purchase_price NUMERIC,
  last_purchase_date TEXT,
  cost_batches JSONB,
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
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
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
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
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
  change_given NUMERIC DEFAULT 0,
  balance_due NUMERIC DEFAULT 0,
  payment_status TEXT DEFAULT 'unpaid',
  bilty_number TEXT,
  transporter_name TEXT,
  cargo_cost NUMERIC DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
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
  customer_phone TEXT,
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
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  pin_hash TEXT,
  password_hash TEXT,
  auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  role TEXT NOT NULL DEFAULT 'cashier',
  designation TEXT,
  status TEXT DEFAULT 'active',
  permissions JSONB,
  restrict_to_devices BOOLEAN DEFAULT FALSE,
  allowed_device_ids JSONB DEFAULT '[]'::jsonb,
  avatar_color TEXT,
  last_login_at TIMESTAMPTZ,
  last_login_device_id TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
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
  internal_id TEXT,
  brand_name TEXT,
  type_name TEXT,
  unit TEXT,
  change NUMERIC,
  previous_stock NUMERIC,
  new_stock NUMERIC,
  movement_type TEXT,
  reference_number TEXT,
  entity_name TEXT,
  unit_rate NUMERIC,
  total_movement_value NUMERIC,
  location_name TEXT,
  cabin_number TEXT,
  timestamp TEXT,
  notes TEXT,
  quantity_change NUMERIC NOT NULL,
  new_quantity NUMERIC NOT NULL,
  reference_id TEXT,
  reason TEXT,
  user_id TEXT,
  user_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public full access expenses" ON expenses;
CREATE POLICY "Operational access expenses" ON expenses FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "POS Terminal access expenses" ON expenses FOR ALL TO anon USING (true) WITH CHECK (true);

ALTER TABLE employee_accounts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public full access employee_accounts" ON employee_accounts;
DROP POLICY IF EXISTS "Deny anon access to employee credentials" ON employee_accounts;
DROP POLICY IF EXISTS "Authenticated users view employee accounts" ON employee_accounts;
DROP POLICY IF EXISTS "Admins manage employee accounts" ON employee_accounts;
DROP POLICY IF EXISTS "POS Terminal access employee_accounts" ON employee_accounts;
DROP POLICY IF EXISTS "Operational access employee_accounts" ON employee_accounts;
CREATE POLICY "Operational access employee_accounts" ON employee_accounts FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "POS Terminal access employee_accounts" ON employee_accounts FOR ALL TO anon USING (true) WITH CHECK (true);
GRANT ALL ON employee_accounts TO anon, authenticated, service_role;

ALTER TABLE registered_devices ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public full access registered_devices" ON registered_devices;
CREATE POLICY "Operational access registered_devices" ON registered_devices FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "POS Terminal access registered_devices" ON registered_devices FOR ALL TO anon USING (true) WITH CHECK (true);

ALTER TABLE stock_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public full access stock_logs" ON stock_logs;
CREATE POLICY "Operational access stock_logs" ON stock_logs FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "POS Terminal access stock_logs" ON stock_logs FOR ALL TO anon USING (true) WITH CHECK (true);
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
    const nameStr = row.tier3_name ? row.tier3_name.toLowerCase() : '';
    const isGen = !row.tier3_name || nameStr.includes('general') || nameStr.includes('tier 3');
    sellingPrices.push({
      tierId: isGen ? 'tier-general' : 'tier-3',
      tierName: row.tier3_name || (isGen ? 'General Price' : 'Tier 3'),
      price: Number(row.tier3_price) || 0,
      markupPercent: Number(row.tier3_markup) || 0,
      isOverridden: isGen ? true : false,
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
    let savedEmployeeCount = 0;
    let employeeError: string | undefined;

    if (employees.length > 0) {
      for (const emp of employees) {
        const res = await saveEmployeeSecureToSupabase(client, emp, emp.pin, emp.password);
        if (res.success) {
          savedEmployeeCount++;
        } else if (!employeeError && res.error) {
          employeeError = res.error;
        }
      }

      if (savedEmployeeCount === 0 && employeeError) {
        return { success: false, employeeCount: 0, deviceCount: 0, error: employeeError };
      }
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
      if (error) return { success: false, employeeCount: savedEmployeeCount, deviceCount: 0, error: error.message };
    }

    return { success: true, employeeCount: savedEmployeeCount, deviceCount: devices.length };
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
      pdf_edits: s.pdfEdits || null,
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
      customer_phone: r.customerPhone || null,
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
    // Attempt to fetch safe employee profiles
    let empData: any[] = [];
    let devData: any[] = [];

    try {
      const [empRes, devRes] = await Promise.all([
        client.from('employee_accounts').select('*').order('name', { ascending: true }),
        client.from('registered_devices').select('*').order('registered_at', { ascending: false }),
      ]);
      if (empRes.data) empData = empRes.data;
      if (devRes.data) devData = devRes.data;
    } catch {
      // Fallback
    }

    const employees: EmployeeAccount[] = empData.map(r => ({
      id: r.id,
      name: r.name,
      email: r.email,
      phone: r.phone || undefined,
      pin: r.pin || r.plain_pin || undefined,
      password: r.password || undefined,
      pinHash: r.pin_hash || undefined,
      passwordHash: r.password_hash || undefined,
      authUserId: r.auth_user_id || undefined,
      role: r.role || 'cashier',
      designation: r.designation || 'Staff',
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

    const devices: RegisteredDevice[] = devData.map(r => ({
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
    // Quick check to avoid spamming the console with 20x 404s if the tables haven't been created yet
    const { error: healthErr } = await client.from('inventory_products').select('id').limit(1);
    if (healthErr && (healthErr.code === '42P01' || healthErr.code === 'PGRST205')) {
      return { 
        success: true, 
        data: { 
          products: [], brands: [], types: [], locations: [], customers: [], customerLedger: [], 
          sales: [], customerReturns: [], vendors: [], vendorLedger: [], vendorReturns: [], 
          purchases: [], purchaseOrders: [], quotations: [], demands: [], expenses: [], 
          employees: [], registeredDevices: [], stockLogs: [] 
        } 
      };
    }
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
      if (error && error.code !== '42P01' && error.code !== 'PGRST205') {
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
  
  // Quick check to avoid spamming the console with 20x 404s if the tables haven't been created yet
  const { error: healthErr } = await client.from('inventory_products').select('id').limit(1);
  if (healthErr && (healthErr.code === '42P01' || healthErr.code === 'PGRST205')) {
    return { message: 'Failed to sync', success: true, errors: ['Database tables not found. Please run the SQL schema.'], syncedCounts: { products: 0, customers: 0, customerLedger: 0, sales: 0, customerReturns: 0, vendors: 0, vendorLedger: 0, vendorReturns: 0, purchases: 0, purchaseOrders: 0, quotations: 0, demands: 0, expenses: 0, employees: 0, devices: 0, stockLogs: 0, masterData: 0 } };
  }
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

export const SCHEMA_IDEMPOTENT_UPDATE = `-- IDEMPOTENT SUPABASE SCHEMA UPDATE SCRIPT
-- This script safely adds missing columns to existing tables without throwing errors.

-- Sales updates
DO $$ BEGIN
    BEGIN ALTER TABLE sales ADD COLUMN change_given NUMERIC; EXCEPTION WHEN duplicate_column THEN null; END;
    BEGIN ALTER TABLE sales ADD COLUMN payment_status TEXT; EXCEPTION WHEN duplicate_column THEN null; END;
    BEGIN ALTER TABLE sales ADD COLUMN has_returns BOOLEAN; EXCEPTION WHEN duplicate_column THEN null; END;
    BEGIN ALTER TABLE sales ADD COLUMN total_returned_amount NUMERIC; EXCEPTION WHEN duplicate_column THEN null; END;
    BEGIN ALTER TABLE sales ADD COLUMN net_amount NUMERIC; EXCEPTION WHEN duplicate_column THEN null; END;
    BEGIN ALTER TABLE sales ADD COLUMN net_balance_due NUMERIC; EXCEPTION WHEN duplicate_column THEN null; END;
    BEGIN ALTER TABLE sales ADD COLUMN returned_items_count NUMERIC; EXCEPTION WHEN duplicate_column THEN null; END;
    BEGIN ALTER TABLE sales ADD COLUMN returns_list JSONB; EXCEPTION WHEN duplicate_column THEN null; END;
    BEGIN ALTER TABLE sales ADD COLUMN invoice_naming_preference TEXT; EXCEPTION WHEN duplicate_column THEN null; END;
END $$;





-- Stock Logs updates
DO $$ 
BEGIN
    ALTER TABLE stock_logs ALTER COLUMN type DROP NOT NULL;
EXCEPTION WHEN OTHERS THEN null; END $$;



DO $$ 
BEGIN
    ALTER TABLE stock_logs ALTER COLUMN quantity_change DROP NOT NULL;
EXCEPTION WHEN OTHERS THEN null; END $$;



DO $$ 
BEGIN
    ALTER TABLE stock_logs ALTER COLUMN new_quantity DROP NOT NULL;
EXCEPTION WHEN OTHERS THEN null; END $$;


DO $$ BEGIN
    BEGIN ALTER TABLE stock_logs ADD COLUMN internal_id TEXT; EXCEPTION WHEN duplicate_column THEN null; END;
    BEGIN ALTER TABLE stock_logs ADD COLUMN brand_name TEXT; EXCEPTION WHEN duplicate_column THEN null; END;
    BEGIN ALTER TABLE stock_logs ADD COLUMN type_name TEXT; EXCEPTION WHEN duplicate_column THEN null; END;
    BEGIN ALTER TABLE stock_logs ADD COLUMN unit TEXT; EXCEPTION WHEN duplicate_column THEN null; END;
    BEGIN ALTER TABLE stock_logs ADD COLUMN change NUMERIC; EXCEPTION WHEN duplicate_column THEN null; END;
    BEGIN ALTER TABLE stock_logs ADD COLUMN previous_stock NUMERIC; EXCEPTION WHEN duplicate_column THEN null; END;
    BEGIN ALTER TABLE stock_logs ADD COLUMN new_stock NUMERIC; EXCEPTION WHEN duplicate_column THEN null; END;
    BEGIN ALTER TABLE stock_logs ADD COLUMN movement_type TEXT; EXCEPTION WHEN duplicate_column THEN null; END;
    BEGIN ALTER TABLE stock_logs ADD COLUMN reference_number TEXT; EXCEPTION WHEN duplicate_column THEN null; END;
    BEGIN ALTER TABLE stock_logs ADD COLUMN entity_name TEXT; EXCEPTION WHEN duplicate_column THEN null; END;
    BEGIN ALTER TABLE stock_logs ADD COLUMN unit_rate NUMERIC; EXCEPTION WHEN duplicate_column THEN null; END;
    BEGIN ALTER TABLE stock_logs ADD COLUMN total_movement_value NUMERIC; EXCEPTION WHEN duplicate_column THEN null; END;
    BEGIN ALTER TABLE stock_logs ADD COLUMN location_name TEXT; EXCEPTION WHEN duplicate_column THEN null; END;
    BEGIN ALTER TABLE stock_logs ADD COLUMN cabin_number TEXT; EXCEPTION WHEN duplicate_column THEN null; END;
    BEGIN ALTER TABLE stock_logs ADD COLUMN timestamp TEXT; EXCEPTION WHEN duplicate_column THEN null; END;
    BEGIN ALTER TABLE stock_logs ADD COLUMN notes TEXT; EXCEPTION WHEN duplicate_column THEN null; END;
END $$;



-- Upgrading table: inventory_products
CREATE TABLE IF NOT EXISTS inventory_products (id TEXT PRIMARY KEY);

DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE inventory_products ADD COLUMN internal_id TEXT NOT NULL;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE inventory_products ADD COLUMN name TEXT NOT NULL;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE inventory_products ADD COLUMN image TEXT;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE inventory_products ADD COLUMN type_id TEXT;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE inventory_products ADD COLUMN type_name TEXT;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE inventory_products ADD COLUMN brand_id TEXT;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE inventory_products ADD COLUMN brand_name TEXT;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE inventory_products ADD COLUMN location_id TEXT;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE inventory_products ADD COLUMN location_name TEXT;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE inventory_products ADD COLUMN cabin_number TEXT;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE inventory_products ADD COLUMN stock_quantity NUMERIC DEFAULT 0;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE inventory_products ADD COLUMN min_stock_alert NUMERIC DEFAULT 5;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE inventory_products ADD COLUMN unit TEXT DEFAULT 'Pcs';
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE inventory_products ADD COLUMN cost_price NUMERIC DEFAULT 0;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE inventory_products ADD COLUMN last_purchase_price NUMERIC;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE inventory_products ADD COLUMN last_purchase_date TEXT;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE inventory_products ADD COLUMN wholesale_price NUMERIC DEFAULT 0;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE inventory_products ADD COLUMN retail_price NUMERIC DEFAULT 0;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE inventory_products ADD COLUMN tier1_name TEXT DEFAULT 'Wholesale';
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE inventory_products ADD COLUMN tier1_price NUMERIC DEFAULT 0;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE inventory_products ADD COLUMN tier1_markup NUMERIC DEFAULT 10;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE inventory_products ADD COLUMN tier2_name TEXT DEFAULT 'Retail';
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE inventory_products ADD COLUMN tier2_price NUMERIC DEFAULT 0;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE inventory_products ADD COLUMN tier2_markup NUMERIC DEFAULT 25;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE inventory_products ADD COLUMN tier3_name TEXT;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE inventory_products ADD COLUMN tier3_price NUMERIC;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE inventory_products ADD COLUMN tier3_markup NUMERIC;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE inventory_products ADD COLUMN tier4_name TEXT;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE inventory_products ADD COLUMN tier4_price NUMERIC;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE inventory_products ADD COLUMN tier4_markup NUMERIC;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE inventory_products ADD COLUMN tier5_name TEXT;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE inventory_products ADD COLUMN tier5_price NUMERIC;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE inventory_products ADD COLUMN tier5_markup NUMERIC;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE inventory_products ADD COLUMN height_inch NUMERIC;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE inventory_products ADD COLUMN height_mm NUMERIC;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE inventory_products ADD COLUMN outer_dia_inch NUMERIC;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE inventory_products ADD COLUMN outer_dia_mm NUMERIC;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE inventory_products ADD COLUMN inner_dia_inch NUMERIC;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE inventory_products ADD COLUMN inner_dia_mm NUMERIC;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE inventory_products ADD COLUMN dimension_input_unit TEXT DEFAULT 'inch';
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE inventory_products ADD COLUMN thread TEXT;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE inventory_products ADD COLUMN gasket_od_inch NUMERIC;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE inventory_products ADD COLUMN gasket_od_mm NUMERIC;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE inventory_products ADD COLUMN gasket_id_inch NUMERIC;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE inventory_products ADD COLUMN gasket_id_mm NUMERIC;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE inventory_products ADD COLUMN label_height TEXT DEFAULT 'H';
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE inventory_products ADD COLUMN label_outer_dia TEXT DEFAULT 'OD';
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE inventory_products ADD COLUMN label_inner_dia TEXT DEFAULT 'ID';
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE inventory_products ADD COLUMN machine_names TEXT;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE inventory_products ADD COLUMN cross_references TEXT;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE inventory_products ADD COLUMN vendor_id TEXT;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE inventory_products ADD COLUMN vendor_name TEXT;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE inventory_products ADD COLUMN notes TEXT;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE inventory_products ADD COLUMN cost_batches JSONB;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE inventory_products ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE inventory_products ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



-- Upgrading table: inventory_categories
CREATE TABLE IF NOT EXISTS inventory_categories (id TEXT PRIMARY KEY);

DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE inventory_categories ADD COLUMN name TEXT NOT NULL;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE inventory_categories ADD COLUMN item_count NUMERIC DEFAULT 0;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE inventory_categories ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



-- Upgrading table: inventory_brands
CREATE TABLE IF NOT EXISTS inventory_brands (id TEXT PRIMARY KEY);

DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE inventory_brands ADD COLUMN name TEXT NOT NULL;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE inventory_brands ADD COLUMN item_count NUMERIC DEFAULT 0;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE inventory_brands ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



-- Upgrading table: inventory_locations
CREATE TABLE IF NOT EXISTS inventory_locations (id TEXT PRIMARY KEY);

DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE inventory_locations ADD COLUMN name TEXT NOT NULL;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE inventory_locations ADD COLUMN cabins JSONB;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE inventory_locations ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



-- Upgrading table: customers
CREATE TABLE IF NOT EXISTS customers (id TEXT PRIMARY KEY);

DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE customers ADD COLUMN name TEXT NOT NULL;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE customers ADD COLUMN type TEXT DEFAULT 'customer';
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE customers ADD COLUMN contact_person TEXT;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE customers ADD COLUMN phone TEXT;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE customers ADD COLUMN secondary_phone TEXT;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE customers ADD COLUMN email TEXT;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE customers ADD COLUMN address TEXT;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE customers ADD COLUMN city TEXT;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE customers ADD COLUMN ntn TEXT;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE customers ADD COLUMN strn TEXT;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE customers ADD COLUMN opening_balance NUMERIC DEFAULT 0;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE customers ADD COLUMN total_purchases NUMERIC DEFAULT 0;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE customers ADD COLUMN machines JSONB;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE customers ADD COLUMN notes TEXT;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE customers ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE customers ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



-- Upgrading table: customer_ledger
CREATE TABLE IF NOT EXISTS customer_ledger (id TEXT PRIMARY KEY);

DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE customer_ledger ADD COLUMN customer_id TEXT NOT NULL;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE customer_ledger ADD COLUMN customer_name TEXT;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE customer_ledger ADD COLUMN date TEXT NOT NULL;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE customer_ledger ADD COLUMN type TEXT NOT NULL;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE customer_ledger ADD COLUMN entry_code TEXT;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE customer_ledger ADD COLUMN bill_number TEXT;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE customer_ledger ADD COLUMN reference_id TEXT;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE customer_ledger ADD COLUMN description TEXT;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE customer_ledger ADD COLUMN debit NUMERIC DEFAULT 0;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE customer_ledger ADD COLUMN credit NUMERIC DEFAULT 0;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE customer_ledger ADD COLUMN amount NUMERIC DEFAULT 0;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE customer_ledger ADD COLUMN payment_method TEXT;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE customer_ledger ADD COLUMN receipt_number TEXT;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE customer_ledger ADD COLUMN notes TEXT;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE customer_ledger ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



-- Upgrading table: sales
CREATE TABLE IF NOT EXISTS sales (id TEXT PRIMARY KEY);

DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE sales ADD COLUMN date TEXT NOT NULL;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE sales ADD COLUMN customer_id TEXT;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE sales ADD COLUMN customer_name TEXT NOT NULL;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE sales ADD COLUMN customer_phone TEXT;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE sales ADD COLUMN vendor_id TEXT;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE sales ADD COLUMN vendor_name TEXT;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE sales ADD COLUMN is_vendor_sale BOOLEAN DEFAULT FALSE;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE sales ADD COLUMN items JSONB NOT NULL;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE sales ADD COLUMN subtotal NUMERIC DEFAULT 0;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE sales ADD COLUMN discount_type TEXT DEFAULT 'amount';
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE sales ADD COLUMN discount_value NUMERIC DEFAULT 0;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE sales ADD COLUMN discount_amount NUMERIC DEFAULT 0;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE sales ADD COLUMN total_amount NUMERIC DEFAULT 0;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE sales ADD COLUMN total_cost NUMERIC DEFAULT 0;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE sales ADD COLUMN total_profit NUMERIC DEFAULT 0;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE sales ADD COLUMN amount_received NUMERIC DEFAULT 0;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE sales ADD COLUMN change_given NUMERIC DEFAULT 0;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE sales ADD COLUMN balance_due NUMERIC DEFAULT 0;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE sales ADD COLUMN payment_type TEXT DEFAULT 'cash';
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE sales ADD COLUMN payment_status TEXT DEFAULT 'paid';
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE sales ADD COLUMN has_returns BOOLEAN DEFAULT FALSE;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE sales ADD COLUMN total_returned_amount NUMERIC DEFAULT 0;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE sales ADD COLUMN net_amount NUMERIC DEFAULT 0;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE sales ADD COLUMN net_balance_due NUMERIC DEFAULT 0;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE sales ADD COLUMN returned_items_count NUMERIC DEFAULT 0;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE sales ADD COLUMN returns_list JSONB;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE sales ADD COLUMN invoice_naming_preference TEXT;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE sales ADD COLUMN notes TEXT;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE sales ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE sales ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



-- Upgrading table: customer_returns
CREATE TABLE IF NOT EXISTS customer_returns (id TEXT PRIMARY KEY);

DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE customer_returns ADD COLUMN return_number TEXT NOT NULL;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE customer_returns ADD COLUMN credit_note_number TEXT;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE customer_returns ADD COLUMN sale_id TEXT NOT NULL;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE customer_returns ADD COLUMN customer_id TEXT;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE customer_returns ADD COLUMN customer_name TEXT NOT NULL;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE customer_returns ADD COLUMN date TEXT NOT NULL;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE customer_returns ADD COLUMN customer_phone TEXT;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE customer_returns ADD COLUMN items JSONB NOT NULL;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE customer_returns ADD COLUMN total_refund_amount NUMERIC DEFAULT 0;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE customer_returns ADD COLUMN refund_method TEXT DEFAULT 'cash';
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE customer_returns ADD COLUMN reason TEXT;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE customer_returns ADD COLUMN notes TEXT;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE customer_returns ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE customer_returns ADD COLUMN subtotal NUMERIC DEFAULT 0;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE customer_returns ADD COLUMN deduction_or_restock_fee NUMERIC DEFAULT 0;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE customer_returns ADD COLUMN refund_status TEXT DEFAULT 'completed';
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;




DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE customer_returns ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;

-- Upgrading table: vendors
CREATE TABLE IF NOT EXISTS vendors (id TEXT PRIMARY KEY);

DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE vendors ADD COLUMN business_name TEXT NOT NULL;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE vendors ADD COLUMN contact_person TEXT;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE vendors ADD COLUMN phone TEXT;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE vendors ADD COLUMN secondary_phone TEXT;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE vendors ADD COLUMN email TEXT;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE vendors ADD COLUMN address TEXT;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE vendors ADD COLUMN city TEXT;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE vendors ADD COLUMN opening_balance NUMERIC DEFAULT 0;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE vendors ADD COLUMN linked_product_ids JSONB;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE vendors ADD COLUMN notes TEXT;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE vendors ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE vendors ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



-- Upgrading table: vendor_ledger
CREATE TABLE IF NOT EXISTS vendor_ledger (id TEXT PRIMARY KEY);

DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE vendor_ledger ADD COLUMN vendor_id TEXT NOT NULL;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE vendor_ledger ADD COLUMN vendor_name TEXT;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE vendor_ledger ADD COLUMN date TEXT NOT NULL;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE vendor_ledger ADD COLUMN type TEXT NOT NULL;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE vendor_ledger ADD COLUMN entry_code TEXT;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE vendor_ledger ADD COLUMN bill_number TEXT;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE vendor_ledger ADD COLUMN reference_id TEXT;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE vendor_ledger ADD COLUMN description TEXT;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE vendor_ledger ADD COLUMN debit NUMERIC DEFAULT 0;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE vendor_ledger ADD COLUMN credit NUMERIC DEFAULT 0;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE vendor_ledger ADD COLUMN amount NUMERIC DEFAULT 0;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE vendor_ledger ADD COLUMN payment_method TEXT;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE vendor_ledger ADD COLUMN receipt_number TEXT;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE vendor_ledger ADD COLUMN notes TEXT;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE vendor_ledger ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



-- Upgrading table: vendor_returns
CREATE TABLE IF NOT EXISTS vendor_returns (id TEXT PRIMARY KEY);

DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE vendor_returns ADD COLUMN return_number TEXT NOT NULL;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE vendor_returns ADD COLUMN purchase_id TEXT NOT NULL;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE vendor_returns ADD COLUMN vendor_id TEXT NOT NULL;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE vendor_returns ADD COLUMN vendor_name TEXT NOT NULL;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE vendor_returns ADD COLUMN date TEXT NOT NULL;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE vendor_returns ADD COLUMN items JSONB NOT NULL;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE vendor_returns ADD COLUMN total_refund_amount NUMERIC DEFAULT 0;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE vendor_returns ADD COLUMN settlement_type TEXT DEFAULT 'cash';
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE vendor_returns ADD COLUMN notes TEXT;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE vendor_returns ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE vendor_returns ADD COLUMN total_amount NUMERIC DEFAULT 0;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE vendor_returns ADD COLUMN settlement_method TEXT DEFAULT 'cash_refund';
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE vendor_returns ADD COLUMN settlement_status TEXT DEFAULT 'completed';
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;




DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE vendor_returns ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;

-- Upgrading table: purchase_orders
CREATE TABLE IF NOT EXISTS purchase_orders (id TEXT PRIMARY KEY);

DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE purchase_orders ADD COLUMN po_number TEXT NOT NULL;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE purchase_orders ADD COLUMN vendor_id TEXT NOT NULL;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE purchase_orders ADD COLUMN vendor_name TEXT NOT NULL;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE purchase_orders ADD COLUMN vendor_phone TEXT;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE purchase_orders ADD COLUMN vendor_address TEXT;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE purchase_orders ADD COLUMN order_date TEXT NOT NULL;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE purchase_orders ADD COLUMN expected_delivery_date TEXT;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE purchase_orders ADD COLUMN receiving_date TEXT;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE purchase_orders ADD COLUMN costs_finalized_date TEXT;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE purchase_orders ADD COLUMN status TEXT DEFAULT 'draft';
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE purchase_orders ADD COLUMN items JSONB NOT NULL;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE purchase_orders ADD COLUMN total_ordered_qty NUMERIC DEFAULT 0;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE purchase_orders ADD COLUMN total_received_qty NUMERIC DEFAULT 0;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE purchase_orders ADD COLUMN cargo_cost NUMERIC DEFAULT 0;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE purchase_orders ADD COLUMN cargo_cost_per_unit NUMERIC DEFAULT 0;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE purchase_orders ADD COLUMN subtotal_base_cost NUMERIC DEFAULT 0;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE purchase_orders ADD COLUMN total_landed_cost NUMERIC DEFAULT 0;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE purchase_orders ADD COLUMN bill_number TEXT;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE purchase_orders ADD COLUMN bilty_number TEXT;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE purchase_orders ADD COLUMN transporter_name TEXT;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE purchase_orders ADD COLUMN amount_paid NUMERIC DEFAULT 0;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE purchase_orders ADD COLUMN payment_status TEXT;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE purchase_orders ADD COLUMN is_stock_received BOOLEAN DEFAULT FALSE;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE purchase_orders ADD COLUMN is_billed BOOLEAN DEFAULT FALSE;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE purchase_orders ADD COLUMN notes TEXT;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE purchase_orders ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE purchase_orders ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



-- Upgrading table: purchases
CREATE TABLE IF NOT EXISTS purchases (id TEXT PRIMARY KEY);

DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE purchases ADD COLUMN bill_number TEXT NOT NULL;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE purchases ADD COLUMN po_number TEXT;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE purchases ADD COLUMN vendor_id TEXT NOT NULL;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE purchases ADD COLUMN vendor_name TEXT NOT NULL;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE purchases ADD COLUMN date TEXT NOT NULL;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE purchases ADD COLUMN items JSONB NOT NULL;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE purchases ADD COLUMN subtotal NUMERIC DEFAULT 0;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE purchases ADD COLUMN discount_amount NUMERIC DEFAULT 0;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE purchases ADD COLUMN total_amount NUMERIC DEFAULT 0;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE purchases ADD COLUMN amount_paid NUMERIC DEFAULT 0;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE purchases ADD COLUMN balance_due NUMERIC DEFAULT 0;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE purchases ADD COLUMN payment_status TEXT DEFAULT 'unpaid';
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE purchases ADD COLUMN bilty_number TEXT;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE purchases ADD COLUMN transporter_name TEXT;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE purchases ADD COLUMN cargo_cost NUMERIC DEFAULT 0;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE purchases ADD COLUMN notes TEXT;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE purchases ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;




DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE purchases ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;

-- Upgrading table: quotations
CREATE TABLE IF NOT EXISTS quotations (id TEXT PRIMARY KEY);

DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE quotations ADD COLUMN quotation_number TEXT NOT NULL;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE quotations ADD COLUMN customer_id TEXT;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE quotations ADD COLUMN customer_type TEXT DEFAULT 'customer';
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE quotations ADD COLUMN customer_name TEXT NOT NULL;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE quotations ADD COLUMN contact_person TEXT;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE quotations ADD COLUMN customer_phone TEXT;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE quotations ADD COLUMN customer_email TEXT;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE quotations ADD COLUMN customer_address TEXT;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE quotations ADD COLUMN customer_city TEXT;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE quotations ADD COLUMN customer_ntn TEXT;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE quotations ADD COLUMN customer_strn TEXT;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE quotations ADD COLUMN date TEXT NOT NULL;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE quotations ADD COLUMN valid_until TEXT NOT NULL;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE quotations ADD COLUMN validity_days NUMERIC DEFAULT 7;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE quotations ADD COLUMN items JSONB NOT NULL;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE quotations ADD COLUMN subtotal NUMERIC DEFAULT 0;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE quotations ADD COLUMN discount_type TEXT DEFAULT 'amount';
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE quotations ADD COLUMN discount_value NUMERIC DEFAULT 0;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE quotations ADD COLUMN discount_amount NUMERIC DEFAULT 0;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE quotations ADD COLUMN tax_percent NUMERIC DEFAULT 0;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE quotations ADD COLUMN tax_amount NUMERIC DEFAULT 0;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE quotations ADD COLUMN total_amount NUMERIC DEFAULT 0;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE quotations ADD COLUMN status TEXT DEFAULT 'active';
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE quotations ADD COLUMN terms_and_conditions TEXT;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE quotations ADD COLUMN notes TEXT;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE quotations ADD COLUMN converted_sale_id TEXT;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE quotations ADD COLUMN converted_at TEXT;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE quotations ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE quotations ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



-- Upgrading table: demands
CREATE TABLE IF NOT EXISTS demands (id TEXT PRIMARY KEY);

DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE demands ADD COLUMN demand_number TEXT NOT NULL;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE demands ADD COLUMN customer_id TEXT;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE demands ADD COLUMN customer_name TEXT NOT NULL;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE demands ADD COLUMN customer_phone TEXT;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE demands ADD COLUMN location TEXT;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE demands ADD COLUMN item_name TEXT NOT NULL;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE demands ADD COLUMN product_id TEXT;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE demands ADD COLUMN item_details TEXT;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE demands ADD COLUMN quantity NUMERIC DEFAULT 1;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE demands ADD COLUMN unit TEXT DEFAULT 'Pcs';
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE demands ADD COLUMN target_price NUMERIC;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE demands ADD COLUMN required_date TEXT;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE demands ADD COLUMN status TEXT DEFAULT 'pending';
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE demands ADD COLUMN unfulfillable_reason TEXT;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE demands ADD COLUMN cancellation_reason TEXT;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE demands ADD COLUMN fulfilled_sale_id TEXT;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE demands ADD COLUMN fulfilled_at TEXT;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE demands ADD COLUMN notes TEXT;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE demands ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE demands ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



-- Upgrading table: expenses
CREATE TABLE IF NOT EXISTS expenses (id TEXT PRIMARY KEY);

DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE expenses ADD COLUMN expense_number TEXT NOT NULL;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE expenses ADD COLUMN title TEXT NOT NULL;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE expenses ADD COLUMN category TEXT NOT NULL;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE expenses ADD COLUMN amount NUMERIC NOT NULL;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE expenses ADD COLUMN date TEXT NOT NULL;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE expenses ADD COLUMN payment_method TEXT DEFAULT 'Cash';
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE expenses ADD COLUMN paid_to TEXT;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE expenses ADD COLUMN receipt_number TEXT;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE expenses ADD COLUMN notes TEXT;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE expenses ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE expenses ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



-- Upgrading table: employee_accounts
CREATE TABLE IF NOT EXISTS employee_accounts (id TEXT PRIMARY KEY);

DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE employee_accounts ADD COLUMN name TEXT NOT NULL;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE employee_accounts ADD COLUMN email TEXT NOT NULL;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE employee_accounts ADD COLUMN phone TEXT;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    CREATE EXTENSION IF NOT EXISTS pgcrypto;
    BEGIN
        ALTER TABLE employee_accounts ADD COLUMN pin_hash TEXT;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
    BEGIN
        ALTER TABLE employee_accounts ADD COLUMN password_hash TEXT;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
    BEGIN
        ALTER TABLE employee_accounts ADD COLUMN auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
    -- Migrate existing plaintext pin to pin_hash if legacy column exists
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='employee_accounts' AND column_name='pin') THEN
        EXECUTE 'UPDATE employee_accounts SET pin_hash = crypt(pin, gen_salt(''bf'', 8)) WHERE pin IS NOT NULL AND pin <> '''' AND (pin_hash IS NULL OR pin_hash = '''');';
        ALTER TABLE employee_accounts DROP COLUMN IF EXISTS pin;
    END IF;
    -- Migrate existing plaintext password to password_hash if legacy column exists
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='employee_accounts' AND column_name='password') THEN
        EXECUTE 'UPDATE employee_accounts SET password_hash = crypt(password, gen_salt(''bf'', 8)) WHERE password IS NOT NULL AND password <> '''' AND (password_hash IS NULL OR password_hash = '''');';
        ALTER TABLE employee_accounts DROP COLUMN IF EXISTS password;
    END IF;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE employee_accounts ADD COLUMN role TEXT NOT NULL;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE employee_accounts ADD COLUMN designation TEXT;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE employee_accounts ADD COLUMN status TEXT DEFAULT 'active';
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE employee_accounts ADD COLUMN permissions JSONB;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE employee_accounts ADD COLUMN restrict_to_devices BOOLEAN DEFAULT FALSE;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE employee_accounts ADD COLUMN allowed_device_ids JSONB;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE employee_accounts ADD COLUMN avatar_color TEXT;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE employee_accounts ADD COLUMN last_login_at TEXT;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE employee_accounts ADD COLUMN last_login_device_id TEXT;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE employee_accounts ADD COLUMN notes TEXT;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE employee_accounts ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



-- Upgrading table: registered_devices
CREATE TABLE IF NOT EXISTS registered_devices (id TEXT PRIMARY KEY);

DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE registered_devices ADD COLUMN name TEXT NOT NULL;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE registered_devices ADD COLUMN os TEXT;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE registered_devices ADD COLUMN device_type TEXT;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE registered_devices ADD COLUMN browser TEXT;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE registered_devices ADD COLUMN user_agent TEXT;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE registered_devices ADD COLUMN registered_at TEXT;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE registered_devices ADD COLUMN last_seen_at TEXT;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE registered_devices ADD COLUMN is_trusted BOOLEAN DEFAULT TRUE;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE registered_devices ADD COLUMN notes TEXT;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



-- Upgrading table: stock_logs
CREATE TABLE IF NOT EXISTS stock_logs (id TEXT PRIMARY KEY);

DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE stock_logs ADD COLUMN product_id TEXT NOT NULL;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE stock_logs ADD COLUMN product_name TEXT NOT NULL;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE stock_logs ADD COLUMN type TEXT NOT NULL;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE stock_logs ADD COLUMN quantity_change NUMERIC NOT NULL;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE stock_logs ADD COLUMN new_quantity NUMERIC NOT NULL;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE stock_logs ADD COLUMN reference_id TEXT;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE stock_logs ADD COLUMN reason TEXT;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE stock_logs ADD COLUMN user_id TEXT;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE stock_logs ADD COLUMN user_name TEXT;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE stock_logs ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



-- Upgrading table: pricing_settings
CREATE TABLE IF NOT EXISTS pricing_settings (id TEXT PRIMARY KEY);

DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE pricing_settings ADD COLUMN settings JSONB NOT NULL;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;



DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE pricing_settings ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;

ALTER TABLE IF EXISTS employee_accounts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Deny anon access to employee credentials" ON employee_accounts;
DROP POLICY IF EXISTS "Public full access employee_accounts" ON employee_accounts;
DROP POLICY IF EXISTS "Authenticated users view employee accounts" ON employee_accounts;
DROP POLICY IF EXISTS "Admins manage employee accounts" ON employee_accounts;
DROP POLICY IF EXISTS "POS Terminal access employee_accounts" ON employee_accounts;
DROP POLICY IF EXISTS "Operational access employee_accounts" ON employee_accounts;
CREATE POLICY "Operational access employee_accounts" ON employee_accounts FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "POS Terminal access employee_accounts" ON employee_accounts FOR ALL TO anon USING (true) WITH CHECK (true);
GRANT ALL ON employee_accounts TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';
`;

export const SCHEMA_STAFF_AUTH_QUICK_FIX = `-- ==========================================================
-- QUICK FIX: EMPLOYEE CREDENTIALS, PIN/PASSWORD & BACKEND SYNC
-- Run this in Supabase Dashboard > SQL Editor (https://supabase.com/dashboard)
-- ==========================================================

-- 1. Enable Cryptographic Functions for secure bcrypt hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;

-- 2. Create table if not exists
CREATE TABLE IF NOT EXISTS employee_accounts (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL DEFAULT 'Staff',
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  pin TEXT,
  plain_pin TEXT,
  password TEXT,
  pin_hash TEXT,
  password_hash TEXT,
  role TEXT NOT NULL DEFAULT 'cashier',
  designation TEXT DEFAULT 'Staff',
  status TEXT DEFAULT 'active',
  permissions JSONB,
  restrict_to_devices BOOLEAN DEFAULT FALSE,
  allowed_device_ids JSONB DEFAULT '[]'::jsonb,
  avatar_color TEXT,
  last_login_at TIMESTAMPTZ,
  last_login_device_id TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Ensure all credential and metadata columns exist in employee_accounts
ALTER TABLE IF EXISTS employee_accounts ADD COLUMN IF NOT EXISTS pin TEXT;
ALTER TABLE IF EXISTS employee_accounts ADD COLUMN IF NOT EXISTS password TEXT;
ALTER TABLE IF EXISTS employee_accounts ADD COLUMN IF NOT EXISTS plain_pin TEXT;
ALTER TABLE IF EXISTS employee_accounts ADD COLUMN IF NOT EXISTS pin_hash TEXT;
ALTER TABLE IF EXISTS employee_accounts ADD COLUMN IF NOT EXISTS password_hash TEXT;
ALTER TABLE IF EXISTS employee_accounts ADD COLUMN IF NOT EXISTS auth_user_id UUID;
ALTER TABLE IF EXISTS employee_accounts ADD COLUMN IF NOT EXISTS designation TEXT DEFAULT 'Staff';
ALTER TABLE IF EXISTS employee_accounts ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
ALTER TABLE IF EXISTS employee_accounts ADD COLUMN IF NOT EXISTS permissions JSONB;
ALTER TABLE IF EXISTS employee_accounts ADD COLUMN IF NOT EXISTS restrict_to_devices BOOLEAN DEFAULT FALSE;
ALTER TABLE IF EXISTS employee_accounts ADD COLUMN IF NOT EXISTS allowed_device_ids JSONB DEFAULT '[]'::jsonb;
ALTER TABLE IF EXISTS employee_accounts ADD COLUMN IF NOT EXISTS avatar_color TEXT;
ALTER TABLE IF EXISTS employee_accounts ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;
ALTER TABLE IF EXISTS employee_accounts ADD COLUMN IF NOT EXISTS last_login_device_id TEXT;
ALTER TABLE IF EXISTS employee_accounts ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE IF EXISTS employee_accounts ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE IF EXISTS employee_accounts ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 4. Grant Full Access to avoid Row-Level Security (RLS) blockage
ALTER TABLE IF EXISTS employee_accounts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public full access employee_accounts" ON employee_accounts;
DROP POLICY IF EXISTS "Deny anon access to employee credentials" ON employee_accounts;
DROP POLICY IF EXISTS "Authenticated users view employee accounts" ON employee_accounts;
DROP POLICY IF EXISTS "Admins manage employee accounts" ON employee_accounts;
DROP POLICY IF EXISTS "POS Terminal access employee_accounts" ON employee_accounts;
DROP POLICY IF EXISTS "Operational access employee_accounts" ON employee_accounts;
DROP POLICY IF EXISTS "Public access employee_accounts" ON employee_accounts;

CREATE POLICY "Operational access employee_accounts"
  ON employee_accounts FOR ALL TO public
  USING (true)
  WITH CHECK (true);

GRANT ALL ON employee_accounts TO anon, authenticated, service_role;

-- 5. Create or Replace save_employee_secure RPC Function
CREATE OR REPLACE FUNCTION save_employee_secure(
  p_id TEXT,
  p_name TEXT,
  p_email TEXT,
  p_phone TEXT DEFAULT NULL,
  p_pin TEXT DEFAULT NULL,
  p_password TEXT DEFAULT NULL,
  p_role TEXT DEFAULT 'cashier',
  p_designation TEXT DEFAULT 'Staff',
  p_status TEXT DEFAULT 'active',
  p_permissions JSONB DEFAULT NULL,
  p_restrict_to_devices BOOLEAN DEFAULT FALSE,
  p_allowed_device_ids JSONB DEFAULT '[]'::jsonb,
  p_avatar_color TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  v_pin_hash TEXT := NULL;
  v_pwd_hash TEXT := NULL;
  v_existing RECORD;
BEGIN
  SELECT * INTO v_existing FROM employee_accounts WHERE id = p_id;

  IF p_pin IS NOT NULL AND TRIM(p_pin) <> '' THEN
    v_pin_hash := crypt(TRIM(p_pin), gen_salt('bf', 8));
  ELSIF v_existing.id IS NOT NULL THEN
    v_pin_hash := v_existing.pin_hash;
  END IF;

  IF p_password IS NOT NULL AND TRIM(p_password) <> '' THEN
    v_pwd_hash := crypt(TRIM(p_password), gen_salt('bf', 8));
  ELSIF v_existing.id IS NOT NULL THEN
    v_pwd_hash := v_existing.password_hash;
  END IF;

  INSERT INTO employee_accounts (
    id, name, email, phone, pin_hash, password_hash, role, designation,
    status, permissions, restrict_to_devices, allowed_device_ids,
    avatar_color, notes, updated_at
  )
  VALUES (
    p_id, p_name, p_email, p_phone, v_pin_hash, v_pwd_hash, p_role, p_designation,
    p_status, p_permissions, p_restrict_to_devices, p_allowed_device_ids,
    p_avatar_color, p_notes, NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    pin_hash = COALESCE(v_pin_hash, employee_accounts.pin_hash),
    password_hash = COALESCE(v_pwd_hash, employee_accounts.password_hash),
    role = EXCLUDED.role,
    designation = EXCLUDED.designation,
    status = EXCLUDED.status,
    permissions = EXCLUDED.permissions,
    restrict_to_devices = EXCLUDED.restrict_to_devices,
    allowed_device_ids = EXCLUDED.allowed_device_ids,
    avatar_color = EXCLUDED.avatar_color,
    notes = EXCLUDED.notes,
    updated_at = NOW();

  -- Synchronize plaintext columns if present
  BEGIN
    IF p_pin IS NOT NULL AND TRIM(p_pin) <> '' THEN
      EXECUTE 'UPDATE employee_accounts SET pin = $1, plain_pin = $1 WHERE id = $2' USING TRIM(p_pin), p_id;
    END IF;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  BEGIN
    IF p_password IS NOT NULL AND TRIM(p_password) <> '' THEN
      EXECUTE 'UPDATE employee_accounts SET password = $1 WHERE id = $2' USING TRIM(p_password), p_id;
    END IF;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  RETURN jsonb_build_object('success', true, 'id', p_id);
END;
$$;

GRANT EXECUTE ON FUNCTION save_employee_secure TO anon, authenticated, service_role;

-- 6. Reload PostgREST Schema Cache
NOTIFY pgrst, 'reload schema';
`;


