import { AppWorkspaceView, AuthState, EmployeeAccount, EmployeePermissions, UserRole } from '../types';
import { getOrCreateDeviceId } from './device';

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

export const INITIAL_EMPLOYEES: EmployeeAccount[] = [
  {
    id: 'admin-master',
    name: 'Administrator (Owner)',
    email: 'admin@inventory.pk',
    phone: '+92 300 1234567',
    pin: '1234',
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
  isLocked: false,
  isConfigured: true,
  authMethod: 'pin',
  email: 'admin@inventory.pk',
  pin: '1234',
  password: 'admin',
  biometricsEnabled: true,
  rememberSession: true,
  lastUnlockedAt: new Date().toISOString(),
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
    return parsed;
  } catch (err) {
    console.error('Failed to load auth state', err);
    return DEFAULT_AUTH_STATE;
  }
}

export function saveAuthState(state: AuthState): void {
  try {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(state));
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

const CLEAN_EMPLOYEES_VERSION_KEY = 'kfh_inventory_clean_employees_v1';

export function getStoredEmployees(): EmployeeAccount[] {
  try {
    const isCleaned = localStorage.getItem(CLEAN_EMPLOYEES_VERSION_KEY);
    if (!isCleaned) {
      saveStoredEmployees(INITIAL_EMPLOYEES);
      saveStoredActiveEmployeeId('admin-master');
      localStorage.setItem(CLEAN_EMPLOYEES_VERSION_KEY, 'true');
      return INITIAL_EMPLOYEES;
    }
    const raw = localStorage.getItem(EMPLOYEES_STORAGE_KEY);
    if (!raw) {
      saveStoredEmployees(INITIAL_EMPLOYEES);
      return INITIAL_EMPLOYEES;
    }
    const parsed = JSON.parse(raw) as EmployeeAccount[];
    if (!Array.isArray(parsed) || parsed.length === 0) {
      saveStoredEmployees(INITIAL_EMPLOYEES);
      return INITIAL_EMPLOYEES;
    }
    return parsed;
  } catch (err) {
    console.error('Failed to load employees', err);
    return INITIAL_EMPLOYEES;
  }
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
 * Authenticates employee by email/username or PIN, checking status and device restriction
 */
export function authenticateEmployee(
  identifierOrPin: string, 
  pin?: string, 
  currentDeviceId?: string
): { success: boolean; employee?: EmployeeAccount; error?: string } {
  const employees = getStoredEmployees();
  const deviceId = currentDeviceId || getOrCreateDeviceId();

  let matched: EmployeeAccount | undefined;

  // Case 1: PIN only provided
  if (!pin) {
    matched = employees.find(e => e.pin === identifierOrPin.trim() && e.status === 'active');
    if (!matched) {
      // Check if disabled
      const inactive = employees.find(e => e.pin === identifierOrPin.trim());
      if (inactive) {
        return { success: false, error: 'This employee account is currently deactivated.' };
      }
      return { success: false, error: 'Invalid PIN entered.' };
    }
  } else {
    // Case 2: Email/Username + PIN/Password
    const cleanId = identifierOrPin.trim().toLowerCase();
    matched = employees.find(
      e => (e.email.toLowerCase() === cleanId || e.name.toLowerCase() === cleanId) && 
           (e.pin === pin.trim() || e.password === pin.trim())
    );

    if (!matched) {
      return { success: false, error: 'Invalid username/email or PIN/password.' };
    }

    if (matched.status !== 'active') {
      return { success: false, error: 'This employee account is deactivated by the Administrator.' };
    }
  }

  // Device whitelisting check
  const deviceCheck = validateEmployeeDeviceAccess(matched, deviceId);
  if (!deviceCheck.allowed) {
    return { success: false, error: deviceCheck.reason };
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
export function isTabAllowed(user: EmployeeAccount, tab: AppWorkspaceView): boolean {
  if (user.role === 'admin') return true;
  return user.permissions.allowedTabs.includes(tab);
}

/**
 * Checks if an action is permitted for the employee
 */
export function isActionAllowed(user: EmployeeAccount, action: keyof EmployeePermissions): boolean {
  if (user.role === 'admin') return true;
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

