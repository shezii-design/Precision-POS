import { AppWorkspaceView, AuthState, EmployeeAccount, EmployeePermissions, UserRole } from '../types';
import { getOrCreateDeviceId } from './device';
import { getSupabaseClient, authenticateEmployeeViaSupabase, saveEmployeeSecureToSupabase } from './supabase';

const AUTH_STORAGE_KEY = 'kfh_inventory_auth_v1';
const EMPLOYEES_STORAGE_KEY = 'kfh_employees_accounts_v1';
const ACTIVE_EMPLOYEE_STORAGE_KEY = 'kfh_active_employee_id_v1';

export const ALL_WORKSPACE_TABS: AppWorkspaceView[] = [
  'dashboard',
  'inventory',
  'sales',
  'purchases',
  'purchase_orders',
  'income_statement',
  'customers',
  'vendors',
  'returns',
  'quotations',
  'demands',
  'inventory_audit'
];

export const SUPER_ADMIN_PERMISSIONS: EmployeePermissions = {
  allowedTabs: [...ALL_WORKSPACE_TABS],
  isEditor: true,
  canCreateSales: true,
  canEditSales: true,
  canDeleteSales: true,
  canApplySaleDiscount: true,
  canViewCostPrices: true,
  canViewProfitMargins: true,
  canCreatePurchases: true,
  canEditPurchases: true,
  canDeletePurchases: true,
  canCreatePurchaseOrders: true,
  canReceivePurchaseOrders: true,
  canManageVendors: true,
  canRecordVendorPayments: true,
  canAddProducts: true,
  canEditProducts: true,
  canDeleteProducts: true,
  canAdjustStock: true,
  canPrintLabels: true,
  canImportExport: true,
  canManageCustomers: true,
  canRecordCustomerPayments: true,
  canProcessReturns: true,
  canManageQuotations: true,
  canManageDemands: true,
  canViewIncomeStatement: true,
  canManageExpenses: true,
  canManageSettings: true
};

export function getRoleDefaultPermissions(role: UserRole): EmployeePermissions {
  switch (role) {
    case 'admin':
      return { ...SUPER_ADMIN_PERMISSIONS };

    case 'cashier':
      // Cashier: Sales, POS Billing, Customers Khata, Quotes, Demands, Returns, Product View (Cost prices & Profit hidden, NO Purchases)
      return {
        allowedTabs: ['sales', 'inventory', 'customers', 'quotations', 'demands', 'returns'],
        isEditor: true,
        canCreateSales: true,
        canEditSales: false,
        canDeleteSales: false,
        canApplySaleDiscount: true,
        canViewCostPrices: false,
        canViewProfitMargins: false,
        canCreatePurchases: false,
        canEditPurchases: false,
        canDeletePurchases: false,
        canCreatePurchaseOrders: false,
        canReceivePurchaseOrders: false,
        canManageVendors: false,
        canRecordVendorPayments: false,
        canAddProducts: false,
        canEditProducts: false,
        canDeleteProducts: false,
        canAdjustStock: false,
        canPrintLabels: true,
        canImportExport: false,
        canManageCustomers: true,
        canRecordCustomerPayments: true,
        canProcessReturns: true,
        canManageQuotations: true,
        canManageDemands: true,
        canViewIncomeStatement: false,
        canManageExpenses: false,
        canManageSettings: false
      };

    case 'procurement':
      // Procurement: Purchases, POs, Vendors, Inventory & Costs (NO Retail Sales, NO Customer Khata)
      return {
        allowedTabs: ['purchases', 'purchase_orders', 'vendors', 'inventory', 'returns', 'demands'],
        isEditor: true,
        canCreateSales: false,
        canEditSales: false,
        canDeleteSales: false,
        canApplySaleDiscount: false,
        canViewCostPrices: true,
        canViewProfitMargins: false,
        canCreatePurchases: true,
        canEditPurchases: true,
        canDeletePurchases: false,
        canCreatePurchaseOrders: true,
        canReceivePurchaseOrders: true,
        canManageVendors: true,
        canRecordVendorPayments: true,
        canAddProducts: true,
        canEditProducts: true,
        canDeleteProducts: false,
        canAdjustStock: true,
        canPrintLabels: true,
        canImportExport: true,
        canManageCustomers: false,
        canRecordCustomerPayments: false,
        canProcessReturns: true,
        canManageQuotations: false,
        canManageDemands: true,
        canViewIncomeStatement: false,
        canManageExpenses: false,
        canManageSettings: false
      };

    case 'stockkeeper':
      // Stockkeeper: Inventory stock adjustments, Barcodes, PO receiving, Demands, Audit Trail (NO Sales, NO Purchases billing, NO financials)
      return {
        allowedTabs: ['inventory', 'demands', 'inventory_audit', 'purchase_orders'],
        isEditor: true,
        canCreateSales: false,
        canEditSales: false,
        canDeleteSales: false,
        canApplySaleDiscount: false,
        canViewCostPrices: false,
        canViewProfitMargins: false,
        canCreatePurchases: false,
        canEditPurchases: false,
        canDeletePurchases: false,
        canCreatePurchaseOrders: false,
        canReceivePurchaseOrders: true,
        canManageVendors: false,
        canRecordVendorPayments: false,
        canAddProducts: true,
        canEditProducts: true,
        canDeleteProducts: false,
        canAdjustStock: true,
        canPrintLabels: true,
        canImportExport: true,
        canManageCustomers: false,
        canRecordCustomerPayments: false,
        canProcessReturns: false,
        canManageQuotations: false,
        canManageDemands: true,
        canViewIncomeStatement: false,
        canManageExpenses: false,
        canManageSettings: false
      };

    case 'accountant':
      // Accountant: Dashboard, Customers, Vendors, P&L, Expenses, Audit (Read-only on sales/purchases, can manage payments)
      return {
        allowedTabs: ['dashboard', 'customers', 'vendors', 'income_statement', 'inventory_audit', 'sales', 'purchases'],
        isEditor: true,
        canCreateSales: false,
        canEditSales: false,
        canDeleteSales: false,
        canApplySaleDiscount: false,
        canViewCostPrices: true,
        canViewProfitMargins: true,
        canCreatePurchases: false,
        canEditPurchases: false,
        canDeletePurchases: false,
        canCreatePurchaseOrders: false,
        canReceivePurchaseOrders: false,
        canManageVendors: true,
        canRecordVendorPayments: true,
        canAddProducts: false,
        canEditProducts: false,
        canDeleteProducts: false,
        canAdjustStock: false,
        canPrintLabels: false,
        canImportExport: true,
        canManageCustomers: true,
        canRecordCustomerPayments: true,
        canProcessReturns: false,
        canManageQuotations: false,
        canManageDemands: false,
        canViewIncomeStatement: true,
        canManageExpenses: true,
        canManageSettings: false
      };

    case 'editor':
      // General Editor: Can edit and operate all general operational tabs, but cannot touch admin system settings
      return {
        allowedTabs: ['dashboard', 'inventory', 'sales', 'purchases', 'purchase_orders', 'customers', 'vendors', 'returns', 'quotations', 'demands', 'inventory_audit'],
        isEditor: true,
        canCreateSales: true,
        canEditSales: true,
        canDeleteSales: false,
        canApplySaleDiscount: true,
        canViewCostPrices: true,
        canViewProfitMargins: false,
        canCreatePurchases: true,
        canEditPurchases: true,
        canDeletePurchases: false,
        canCreatePurchaseOrders: true,
        canReceivePurchaseOrders: true,
        canManageVendors: true,
        canRecordVendorPayments: true,
        canAddProducts: true,
        canEditProducts: true,
        canDeleteProducts: false,
        canAdjustStock: true,
        canPrintLabels: true,
        canImportExport: true,
        canManageCustomers: true,
        canRecordCustomerPayments: true,
        canProcessReturns: true,
        canManageQuotations: true,
        canManageDemands: true,
        canViewIncomeStatement: false,
        canManageExpenses: true,
        canManageSettings: false
      };

    case 'viewer':
      // Read-only Viewer across all tabs
      return {
        allowedTabs: [...ALL_WORKSPACE_TABS],
        isEditor: false,
        canCreateSales: false,
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
        canRecordVendorPayments: false,
        canAddProducts: false,
        canEditProducts: false,
        canDeleteProducts: false,
        canAdjustStock: false,
        canPrintLabels: false,
        canImportExport: false,
        canManageCustomers: false,
        canRecordCustomerPayments: false,
        canProcessReturns: false,
        canManageQuotations: false,
        canManageDemands: false,
        canViewIncomeStatement: false,
        canManageExpenses: false,
        canManageSettings: false
      };

    case 'custom':
    default:
      return {
        allowedTabs: ['inventory', 'sales'],
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
        canRecordVendorPayments: false,
        canAddProducts: false,
        canEditProducts: false,
        canDeleteProducts: false,
        canAdjustStock: false,
        canPrintLabels: false,
        canImportExport: false,
        canManageCustomers: false,
        canRecordCustomerPayments: false,
        canProcessReturns: false,
        canManageQuotations: false,
        canManageDemands: false,
        canViewIncomeStatement: false,
        canManageExpenses: false,
        canManageSettings: false
      };
  }
}

/**
 * Generates a SHA-256 cryptographic hash of a secret (PIN or password) for local verification.
 */
export async function hashSecret(secret: string): Promise<string> {
  try {
    if (typeof window !== 'undefined' && window.crypto?.subtle) {
      const enc = new TextEncoder();
      const data = enc.encode(secret.trim());
      const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }
  } catch (err) {
    console.warn('Crypto subtle not available, falling back to simple hash', err);
  }
  // Simple fallback hash if subtle crypto is not available in current context
  let hash = 0;
  for (let i = 0; i < secret.length; i++) {
    const char = secret.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return `h_${Math.abs(hash).toString(16)}`;
}

export const FORBIDDEN_PASSWORDS = ['admin', '1234', 'password', '123456', '0000', '1111', 'root'];
export const INSECURE_DEFAULT_HASHES = [
  '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918', // sha256('admin')
  '03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4', // sha256('1234')
  '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8', // sha256('password')
];

export const INITIAL_EMPLOYEES: EmployeeAccount[] = [
  {
    id: 'admin-master',
    name: 'Administrator (Owner)',
    email: 'admin@inventory.pk',
    phone: '',
    role: 'admin',
    designation: 'Shop Owner & Super Admin',
    status: 'active',
    permissions: SUPER_ADMIN_PERMISSIONS,
    restrictToDevices: false,
    allowedDeviceIds: [],
    avatarColor: 'red',
    createdAt: '2026-01-01T00:00:00.000Z',
    notes: 'Primary Master Account with unrestricted access.'
  }
];

export const DEFAULT_AUTH_STATE: AuthState = {
  isLocked: true,
  isConfigured: false,
  authMethod: 'password',
  email: '',
  biometricsEnabled: false,
  rememberSession: true,
  lastUnlockedAt: '',
  currentUserId: 'admin-master'
};

export function getStoredAuthState(): AuthState {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) {
      saveAuthState(DEFAULT_AUTH_STATE);
      return DEFAULT_AUTH_STATE;
    }
    const parsed = JSON.parse(raw) as AuthState;
    if (!parsed.currentUserId) {
      parsed.currentUserId = 'admin-master';
    }
    // Never allow persisted plaintext credentials in memory state
    delete parsed.pin;
    delete parsed.password;
    return parsed;
  } catch (err) {
    console.error('Failed to load auth state', err);
    return DEFAULT_AUTH_STATE;
  }
}

export function saveAuthState(state: AuthState): void {
  try {
    // Sanitize state to prevent storing plaintext PIN or passwords in localStorage
    const safeState = { ...state };
    delete safeState.pin;
    delete safeState.password;
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(safeState));
  } catch (err) {
    console.error('Failed to save auth state', err);
  }
}

export function initializeDefaultEmployees(): EmployeeAccount[] {
  return getStoredEmployees();
}

export function getStoredActiveEmployeeId(): string {
  try {
    const raw = localStorage.getItem(ACTIVE_EMPLOYEE_STORAGE_KEY);
    if (raw && raw.trim()) {
      return raw.trim();
    }
    const authState = getStoredAuthState();
    if (authState?.currentUserId) {
      return authState.currentUserId;
    }
    return 'admin-master';
  } catch (err) {
    console.error('Failed to load active employee ID', err);
    return 'admin-master';
  }
}

export function saveStoredActiveEmployeeId(id: string): void {
  try {
    localStorage.setItem(ACTIVE_EMPLOYEE_STORAGE_KEY, id);
    const authState = getStoredAuthState();
    authState.currentUserId = id;
    saveAuthState(authState);
  } catch (err) {
    console.error('Failed to save active employee ID', err);
  }
}

export function getStoredEmployees(): EmployeeAccount[] {
  try {
    const raw = localStorage.getItem(EMPLOYEES_STORAGE_KEY);
    let list: EmployeeAccount[] = [];
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          list = parsed;
        }
      } catch (err) {
        console.error('Failed to parse stored employees', err);
      }
    }

    if (list.length === 0) {
      list = [...INITIAL_EMPLOYEES];
      saveStoredEmployees(list);
      return list;
    }

    // Sanitize every employee to guarantee valid permissions object and strip insecure default credentials
    list = list.map(emp => {
      const role = emp.role || 'cashier';
      const hasValidPerms = emp.permissions && typeof emp.permissions === 'object' && Array.isArray(emp.permissions.allowedTabs);
      const sanitized: EmployeeAccount = {
        ...emp,
        role,
        permissions: hasValidPerms ? emp.permissions : getRoleDefaultPermissions(role)
      };

      // Only strip default insecure credentials on the initial unconfigured master admin account ('admin-master')
      if (sanitized.id === 'admin-master' && sanitized.role === 'admin') {
        if (
          (sanitized.password && FORBIDDEN_PASSWORDS.includes(sanitized.password.trim().toLowerCase())) ||
          (sanitized.passwordHash && INSECURE_DEFAULT_HASHES.includes(sanitized.passwordHash.toLowerCase()))
        ) {
          delete sanitized.password;
          delete sanitized.passwordHash;
        }
        if (
          (sanitized.pin && FORBIDDEN_PASSWORDS.includes(sanitized.pin.trim().toLowerCase())) ||
          (sanitized.pinHash && INSECURE_DEFAULT_HASHES.includes(sanitized.pinHash.toLowerCase()))
        ) {
          delete sanitized.pin;
          delete sanitized.pinHash;
        }
      }

      return sanitized;
    });

    // Ensure Master Admin account exists
    const hasAdmin = list.some(e => e.role === 'admin' && e.status === 'active');
    if (!hasAdmin) {
      list.unshift(INITIAL_EMPLOYEES[0]);
    }

    return list;
  } catch (err) {
    console.error('Failed to load employees', err);
    return INITIAL_EMPLOYEES;
  }
}

/**
 * Checks if the master administrator credentials need initial setup.
 * Returns true if no administrator has a configured password or PIN and no configured staff accounts exist.
 */
export function isMasterAdminSetupRequired(): boolean {
  try {
    const employees = getStoredEmployees();
    // If an administrator has configured credentials, setup is complete
    const configuredAdmin = employees.find(e => 
      e.role === 'admin' && 
      e.status === 'active' && 
      (Boolean(e.password?.trim() || e.passwordHash?.trim()) || Boolean(e.pin?.trim() || e.pinHash?.trim()))
    );
    if (configuredAdmin) return false;

    // If active employees already exist with configured credentials, do not force setup screen
    const anyConfiguredEmployee = employees.some(e => 
      e.status === 'active' && 
      e.id !== 'admin-master' &&
      (Boolean(e.password?.trim() || e.passwordHash?.trim()) || Boolean(e.pin?.trim() || e.pinHash?.trim()))
    );
    if (anyConfiguredEmployee) return false;

    return true;
  } catch {
    return true;
  }
}

/**
 * Sets up custom, secure master administrator credentials on first run.
 * Strictly blocks default/trivial passwords like "admin", "1234", "password".
 */
export async function setupMasterAdminCredentials(params: {
  name: string;
  email: string;
  password?: string;
  pin?: string;
}): Promise<{ success: boolean; employee?: EmployeeAccount; error?: string }> {
  const cleanEmail = params.email.trim().toLowerCase();
  const cleanPassword = params.password ? params.password.trim() : '';
  const cleanPin = params.pin ? params.pin.trim() : '';

  if (!cleanEmail) {
    return { success: false, error: 'Administrator email or username is required.' };
  }
  if (!cleanPassword && !cleanPin) {
    return { success: false, error: 'Please set a secure master password or a 4-digit PIN.' };
  }
  if (cleanPassword) {
    if (cleanPassword.length < 6) {
      return { success: false, error: 'Master password must be at least 6 characters long.' };
    }
    if (FORBIDDEN_PASSWORDS.includes(cleanPassword.toLowerCase())) {
      return { success: false, error: 'Insecure default passwords like "admin" or "1234" are strictly prohibited.' };
    }
  }
  if (cleanPin) {
    if (cleanPin.length < 4) {
      return { success: false, error: 'Security PIN must be at least 4 digits.' };
    }
    if (FORBIDDEN_PASSWORDS.includes(cleanPin.toLowerCase())) {
      return { success: false, error: 'Insecure default PINs like "1234" or "0000" are strictly prohibited.' };
    }
  }

  const employees = getStoredEmployees();
  let admin = employees.find(e => e.role === 'admin') || employees.find(e => e.id === 'admin-master');

  const passwordHash = cleanPassword ? await hashSecret(cleanPassword) : undefined;
  const pinHash = cleanPin ? await hashSecret(cleanPin) : undefined;

  if (!admin) {
    admin = {
      id: 'admin-master',
      name: params.name.trim() || 'Administrator (Owner)',
      email: cleanEmail,
      role: 'admin',
      designation: 'Shop Owner & Super Admin',
      status: 'active',
      permissions: SUPER_ADMIN_PERMISSIONS,
      restrictToDevices: false,
      allowedDeviceIds: [],
      avatarColor: 'red',
      createdAt: new Date().toISOString(),
      passwordHash,
      pinHash
    };
    employees.unshift(admin);
  } else {
    admin.name = params.name.trim() || admin.name;
    admin.email = cleanEmail;
    if (passwordHash) {
      admin.passwordHash = passwordHash;
      delete admin.password;
    }
    if (pinHash) {
      admin.pinHash = pinHash;
      delete admin.pin;
    }
  }

  saveStoredEmployees(employees);

  const authState = getStoredAuthState();
  authState.isConfigured = true;
  authState.isLocked = false;
  authState.lastUnlockedAt = new Date().toISOString();
  authState.currentUserId = admin.id;
  authState.email = admin.email;
  saveAuthState(authState);

  return { success: true, employee: admin };
}

export function saveStoredEmployees(employees: EmployeeAccount[]): void {
  try {
    localStorage.setItem(EMPLOYEES_STORAGE_KEY, JSON.stringify(employees));
  } catch (err) {
    console.error('Failed to save employees', err);
  }
}

export function saveEmployee(employee: EmployeeAccount): EmployeeAccount {
  const employees = getStoredEmployees();
  const existingIdx = employees.findIndex(e => e.id === employee.id);

  if (existingIdx >= 0) {
    employees[existingIdx] = employee;
  } else {
    employees.push(employee);
  }

  saveStoredEmployees(employees);
  return employee;
}

/**
 * Saves an employee account with explicit PIN / Password and computes hashes
 * Synchronizes with Supabase cloud if connected.
 */
export async function saveEmployeeWithCredentials(
  employee: EmployeeAccount,
  rawPin?: string,
  rawPassword?: string
): Promise<EmployeeAccount> {
  const pin = rawPin !== undefined && rawPin.trim() !== '' ? rawPin.trim() : (employee.pin ? String(employee.pin).trim() : undefined);
  const password = rawPassword !== undefined && rawPassword.trim() !== '' ? rawPassword.trim() : (employee.password ? String(employee.password).trim() : undefined);

  let pinHash = employee.pinHash;
  if (pin) {
    try {
      pinHash = await hashSecret(pin);
    } catch (e) {
      console.warn('Failed to compute pin hash', e);
    }
  }

  let passwordHash = employee.passwordHash;
  if (password) {
    try {
      passwordHash = await hashSecret(password);
    } catch (e) {
      console.warn('Failed to compute password hash', e);
    }
  }

  const updated: EmployeeAccount = {
    ...employee,
    pin: pin || employee.pin,
    pinHash: pinHash || employee.pinHash,
    password: password || employee.password,
    passwordHash: passwordHash || employee.passwordHash
  };

  saveEmployee(updated);

  // Sync to Supabase in the background if client is available
  try {
    const client = getSupabaseClient();
    if (client) {
      saveEmployeeSecureToSupabase(client, updated, pin, password).catch(err => {
        console.warn('Supabase employee background sync error:', err);
      });
    }
  } catch (err) {
    console.warn('Supabase not available for employee sync', err);
  }

  return updated;
}

export function deleteEmployee(id: string): void {
  if (id === 'admin-master') {
    console.warn('Cannot delete primary master admin account');
    return;
  }
  const employees = getStoredEmployees().filter(e => e.id !== id);
  saveStoredEmployees(employees);
  if (getStoredActiveEmployeeId() === id) {
    saveStoredActiveEmployeeId('admin-master');
  }

  // Delete from Supabase as well
  try {
    const client = getSupabaseClient();
    if (client) {
      Promise.resolve(client.from('employee_accounts').delete().eq('id', id)).catch(err => console.warn('Supabase delete error', err));
    }
  } catch (err) {
    console.warn(err);
  }
}

/**
 * Returns the currently active logged-in employee account
 */
export function getCurrentActiveEmployee(
  authState: AuthState, 
  employeesList?: EmployeeAccount[]
): EmployeeAccount {
  const employees = employeesList || getStoredEmployees();
  const currentId = authState.currentUserId || 'admin-master';
  const found = employees.find(e => e.id === currentId);

  if (found) {
    return found;
  }

  // Fallback to admin
  return employees.find(e => e.role === 'admin') || INITIAL_EMPLOYEES[0];
}

/**
 * Validates if an employee is allowed to log in on the current physical Windows/device ID
 */
export function validateEmployeeDeviceAccess(
  employee: EmployeeAccount, 
  currentDeviceId?: string
): { allowed: boolean; reason?: string } {
  if (!employee.restrictToDevices) {
    return { allowed: true };
  }

  const deviceId = currentDeviceId || getOrCreateDeviceId();
  const allowedList = employee.allowedDeviceIds || [];

  if (allowedList.length === 0) {
    return { 
      allowed: false, 
      reason: `Account is restricted by Admin, but no authorized devices have been whitelisted.` 
    };
  }

  if (!allowedList.includes(deviceId)) {
    return { 
      allowed: false, 
      reason: `Login blocked. This device (${deviceId}) is not in ${employee.name}'s authorized device list.` 
    };
  }

  return { allowed: true };
}

/**
 * Authenticates employee by email/username or PIN, checking status and device restriction.
 * Seamlessly verifies against Supabase RPC if configured, then falls back to local accounts.
 */
export async function authenticateEmployee(
  identifierOrPin: string, 
  pin?: string, 
  currentDeviceId?: string
): Promise<{ success: boolean; employee?: EmployeeAccount; error?: string }> {
  const deviceId = currentDeviceId || getOrCreateDeviceId();
  const rawIdent = (identifierOrPin || '').trim();
  const rawSecret = pin !== undefined ? pin.trim() : '';

  // Explicitly reject the default admin/admin backdoor if master admin has not been customized
  if (
    rawIdent.toLowerCase() === 'admin' && 
    (rawSecret.toLowerCase() === 'admin' || rawSecret === '1234' || !rawSecret)
  ) {
    const employees = getStoredEmployees();
    const admin = employees.find(e => (e.email?.toLowerCase() === 'admin' || e.role === 'admin') && e.status === 'active');
    const hasConfiguredCredentials = admin && (admin.password || admin.passwordHash || admin.pin || admin.pinHash);
    if (!hasConfiguredCredentials) {
      return { 
        success: false, 
        error: 'Default "admin" / "admin" credentials are disabled for security. Please set master administrator credentials or sign in with your staff account.' 
      };
    }
  }

  // 1. Try Supabase cloud RPC if enabled (with strict 2.5s timeout to prevent hanging)
  try {
    const client = getSupabaseClient();
    if (client) {
      const timeoutPromise = new Promise<{ success: boolean; employee?: EmployeeAccount; error: string }>((resolve) =>
        setTimeout(() => resolve({ success: false, error: 'RPC_TIMEOUT' }), 2500)
      );
      const supaPromise = authenticateEmployeeViaSupabase(
        client,
        rawIdent,
        rawSecret || rawIdent,
        deviceId
      );
      const supaRes = await Promise.race([supaPromise, timeoutPromise]);
      if (supaRes.success && supaRes.employee) {
        saveEmployee(supaRes.employee);
        return { success: true, employee: supaRes.employee };
      }
    }
  } catch (supaErr) {
    console.warn('Supabase cloud authentication check skipped, proceeding with local store', supaErr);
  }

  // 2. Local verification against stored employee accounts
  const employees = getStoredEmployees();
  let matched: EmployeeAccount | undefined;

  const secretCandidate = rawSecret || rawIdent;
  const computedHash = secretCandidate ? await hashSecret(secretCandidate) : '';
  const computedIdHash = rawIdent ? await hashSecret(rawIdent) : '';

  // Helper to verify if candidate matches employee secret (PIN, password, or SHA-256 hash)
  const verifySecret = (e: EmployeeAccount, secret: string, hashVal: string): boolean => {
    if (!secret) return false;
    const clean = secret.trim();
    if (e.pin && String(e.pin).trim() === clean) return true;
    if (e.password && String(e.password).trim() === clean) return true;
    if (e.pinHash && (e.pinHash.toLowerCase() === hashVal.toLowerCase() || e.pinHash === clean)) return true;
    if (e.passwordHash && (e.passwordHash.toLowerCase() === hashVal.toLowerCase() || e.passwordHash === clean)) return true;
    return false;
  };

  // Helper to check if candidate identifier matches employee (email, username, name, id, phone, role)
  const verifyIdentifier = (e: EmployeeAccount, idCandidate: string): boolean => {
    if (!idCandidate) return false;
    const cId = idCandidate.toLowerCase().trim();
    const cleanPhone = (e.phone || '').replace(/\D/g, '');
    const cleanIdPhone = cId.replace(/\D/g, '');

    if (e.id && e.id.toLowerCase().trim() === cId) return true;
    if (e.email && e.email.toLowerCase().trim() === cId) return true;
    if (e.email && e.email.toLowerCase().trim().split('@')[0] === cId) return true;
    if (e.name && e.name.toLowerCase().trim() === cId) return true;
    if (e.name && e.name.toLowerCase().trim().includes(cId)) return true;
    if (e.name && cId.includes(e.name.toLowerCase().trim())) return true;
    if (cleanPhone && cleanIdPhone && cleanPhone === cleanIdPhone && cleanIdPhone.length >= 4) return true;
    if (e.designation && e.designation.toLowerCase().trim() === cId) return true;
    if (e.role && e.role.toLowerCase() === cId) return true;
    if ((cId === 'admin' || cId === 'administrator' || cId === 'owner') && e.role === 'admin') return true;
    return false;
  };

  // Case A: Both username/identifier AND password/PIN provided
  if (rawIdent && rawSecret) {
    // Normal order: rawIdent is identifier, rawSecret is secret
    matched = employees.find(e => 
      verifyIdentifier(e, rawIdent) && verifySecret(e, rawSecret, computedHash)
    );

    // If not matched, try reversed (user entered secret in 1st box and username in 2nd box)
    if (!matched) {
      matched = employees.find(e => 
        verifyIdentifier(e, rawSecret) && verifySecret(e, rawIdent, computedIdHash)
      );
    }

    // If still not matched, check if user entered their PIN/password in BOTH boxes
    if (!matched) {
      matched = employees.find(e => 
        verifySecret(e, rawSecret, computedHash) || verifySecret(e, rawIdent, computedIdHash)
      );
    }

    // If still not matched, check if the identifier exists but password was wrong
    if (!matched) {
      const userExists = employees.find(e => verifyIdentifier(e, rawIdent) || verifyIdentifier(e, rawSecret));
      if (userExists) {
        return { success: false, error: 'Incorrect password or PIN for this employee account.' };
      }
    }
  }
  // Case B: Only one field was provided (Single PIN or Password entered)
  else if (secretCandidate) {
    matched = employees.find(e => 
      e.status === 'active' && verifySecret(e, secretCandidate, computedHash)
    );

    if (!matched) {
      const inactive = employees.find(e => verifySecret(e, secretCandidate, computedHash));
      if (inactive) {
        return { success: false, error: `The employee account for "${inactive.name}" is currently deactivated.` };
      }
      return { success: false, error: 'No employee found matching this PIN or password.' };
    }
  } else {
    return { success: false, error: 'Please enter your username/email and password or PIN.' };
  }

  if (!matched) {
    return { success: false, error: 'Invalid username/email or PIN/password.' };
  }

  if (matched.status !== 'active') {
    return { success: false, error: `Account for "${matched.name}" is currently inactive. Contact your administrator.` };
  }

  // Device whitelisting check (admins bypass device lockout to prevent lockouts)
  if (matched.role !== 'admin') {
    const deviceCheck = validateEmployeeDeviceAccess(matched, deviceId);
    if (!deviceCheck.allowed) {
      return { success: false, error: deviceCheck.reason };
    }
  }

  // Update last login
  matched.lastLoginAt = new Date().toISOString();
  matched.lastLoginDeviceId = deviceId;
  saveEmployee(matched);

  return { success: true, employee: matched };
}

/**
 * Checks if a tab is visible/allowed for the employee
 */
export function isTabAllowed(user: EmployeeAccount | null | undefined, tab: AppWorkspaceView): boolean {
  if (!user || user.role === 'admin') return true;
  if (!user.permissions || !Array.isArray(user.permissions.allowedTabs)) {
    return true; // Fallback to allowed if permissions not configured
  }
  return user.permissions.allowedTabs.includes(tab);
}

/**
 * Checks if an action is permitted for the employee
 */
export function isActionAllowed(user: EmployeeAccount | null | undefined, action: keyof EmployeePermissions): boolean {
  if (!user || user.role === 'admin') {
    return true;
  }
  if (!user.permissions) {
    return true;
  }
  return Boolean(user.permissions[action]);
}

/**
 * Attempts real WebAuthn authentication.
 */
export async function authenticateWithWebAuthn(credentialId?: string): Promise<{ success: boolean; error?: string }> {
  try {
    if (typeof window === 'undefined' || !window.PublicKeyCredential) {
      return { success: false, error: 'Biometric hardware not accessible in this browser.' };
    }

    const challenge = new Uint8Array(32);
    window.crypto.getRandomValues(challenge);

    const options: CredentialRequestOptions = {
      publicKey: {
        challenge,
        timeout: 60000,
        userVerification: 'preferred',
      }
    };

    if (credentialId && options.publicKey) {
      try {
        // Convert Base64URL to Uint8Array
        let base64 = credentialId.replace(/-/g, '+').replace(/_/g, '/');
        const padLen = (4 - (base64.length % 4)) % 4;
        base64 += '='.repeat(padLen);
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
          bytes[i] = binary.charCodeAt(i);
        }
        options.publicKey.allowCredentials = [{
          type: 'public-key',
          id: bytes,
        }];
      } catch (e) {
        console.warn('Invalid credentialId format, skipping allowCredentials', e);
      }
    }

    const credential = await navigator.credentials.get(options);

    if (credential) {
      return { success: true };
    }
    return { success: false, error: 'Biometric check cancelled or not recognized.' };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.warn('WebAuthn note:', errorMsg);
    return { success: false, error: errorMsg };
  }
}

/**
 * Registers a new WebAuthn credential (Fingerprint/FaceID).
 */
export async function registerWebAuthn(): Promise<{ success: boolean; credentialId?: string; error?: string }> {
  try {
    if (typeof window === 'undefined' || !window.PublicKeyCredential) {
      return { success: false, error: 'Biometric hardware not supported.' };
    }

    const challenge = new Uint8Array(32);
    window.crypto.getRandomValues(challenge);
    const userId = new Uint8Array(16);
    window.crypto.getRandomValues(userId);

    const credential = await navigator.credentials.create({
      publicKey: {
        challenge,
        rp: { name: 'Precision Inventory', id: window.location.hostname },
        user: { id: userId, name: 'admin', displayName: 'Admin' },
        pubKeyCredParams: [
          { type: 'public-key', alg: -7 },
          { type: 'public-key', alg: -257 }
        ],
        authenticatorSelection: {
          authenticatorAttachment: 'platform',
          userVerification: 'required'
        },
        timeout: 60000,
      }
    });

    if (credential && credential.id) {
      return { success: true, credentialId: credential.id };
    }
    return { success: false, error: 'Registration cancelled.' };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return { success: false, error: errorMsg };
  }
}

