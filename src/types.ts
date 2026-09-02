export type DimensionUnit = 'inch' | 'mm';

export type QuantityUnit = 'Pcs' | 'Kg' | 'Litre' | 'Box' | 'Set' | 'Meter' | 'Dozen' | 'Roll' | 'Carton';

export interface DimensionLabelConfig {
  heightName: 'H' | 'Height';
  outerDiaName: 'OD' | 'Length';
  innerDiaName: 'ID' | 'Width';
}

export interface ProductDimensions {
  // Stored canonically in INCHES
  height?: number;
  outerDia?: number;
  innerDia?: number;
  // What unit the user entered this in
  inputUnit: DimensionUnit;
  // Thread: e.g. 1"-16, M20x1.5, 3/4-16 UNF (Excluded from conversion)
  thread?: string;
  // Gasket dimensions (stored in INCHES)
  gasket_OD?: number;
  gasket_ID?: number;
}

export interface PricingTierConfig {
  id: string;
  name: string; // e.g. "Wholesale", "Retail", "Sell@20%"
  markupPercent: number; // e.g. 10 (for 10%), 25 (for 25%)
  isDefault?: boolean;
}

export interface ProductSellingPrice {
  tierId: string;
  tierName: string;
  price: number; // in PKR
  markupPercent: number;
  isOverridden?: boolean;
}

export interface CostBatch {
  id: string; // e.g. "batch-1725000000"
  purchaseId?: string; // Links to Purchase.id (or "initial" for opening stock)
  billNumber?: string; // e.g. "SF-9842"
  vendorId?: string;
  vendorName?: string;
  date: string; // ISO date string
  quantity: number; // Original quantity bought
  remainingQuantity: number; // Remaining stock in this batch
  unitCost: number; // Buying price in PKR
  notes?: string;
}

export interface Product {
  id: string;
  internalId: string; // starts from KFH-2501
  name: string; // e.g. "sfc-5706"
  image?: string; // base64 or URL
  typeId: string;
  typeName: string;
  brandId: string;
  brandName: string;
  locationId: string;
  locationName: string;
  cabinNumber: string; // e.g. "C-12"
  stockQuantity: number;
  minStockAlert: number;
  unit: QuantityUnit;
  costPrice: number; // in PKR (current active/latest cost price)
  lastPurchasePrice?: number; // Last bought price in PKR
  lastPurchaseDate?: string; // Last purchase ISO date
  sellingPrices: ProductSellingPrice[];
  costBatches?: CostBatch[]; // FIFO Stock Batches with respective historical purchase costs
  dimensions?: ProductDimensions;
  dimensionLabels?: DimensionLabelConfig;
  machineNames?: string; // Multiline compatible machine list
  crossReferences?: string; // Multiline cross references
  vendorId?: string; // Linked primary supplier/vendor
  vendorName?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Brand {
  id: string;
  name: string;
  itemCount?: number;
}

export interface ProductType {
  id: string;
  name: string;
  itemCount?: number;
}

export interface LocationItem {
  id: string;
  name: string;
  cabins: string[];
}

export type DeviceOS = 'Android' | 'iOS' | 'Windows' | 'Mac' | 'Linux' | 'Other';
export type DeviceType = 'Mobile' | 'Tablet' | 'Desktop';

export interface DeviceInfo {
  deviceId: string; // Unique persistent hardware/browser fingerprint (e.g. KFH-WIN-8492)
  deviceName: string; // e.g. "Counter 1 - Windows PC (Chrome)"
  os: DeviceOS;
  deviceType: DeviceType;
  browser: string;
  userAgent: string;
  supportsBiometrics: boolean;
  isRegistered?: boolean;
}

export interface RegisteredDevice {
  id: string; // Unique ID, e.g. "DEV-WIN-8492"
  name: string; // Friendly name, e.g. "Counter 1 POS Windows"
  os: DeviceOS;
  deviceType: DeviceType;
  browser: string;
  userAgent: string;
  registeredAt: string;
  lastSeenAt: string;
  isTrusted: boolean;
  notes?: string;
}

export type UserRole = 
  | 'admin' 
  | 'cashier' 
  | 'procurement' 
  | 'stockkeeper' 
  | 'accountant' 
  | 'editor' 
  | 'viewer' 
  | 'custom';

export interface EmployeePermissions {
  // 1. Navigation & Tab Visibility
  allowedTabs: AppWorkspaceView[];

  // 2. Editor vs Viewer General Mode
  isEditor: boolean; // If false, user is strictly a Viewer across allowed tabs

  // 3. Sales Invoicing Privileges
  canCreateSales: boolean;
  canEditSales: boolean;
  canDeleteSales: boolean;
  canApplySaleDiscount: boolean;
  canViewCostPrices: boolean; // If false, purchase rates/cost prices are masked as •••
  canViewProfitMargins: boolean; // If false, gross/net margins and P&L are hidden

  // 4. Purchasing & Vendor Privileges
  canCreatePurchases: boolean;
  canEditPurchases: boolean;
  canDeletePurchases: boolean;
  canCreatePurchaseOrders: boolean;
  canReceivePurchaseOrders: boolean;
  canManageVendors: boolean;
  canRecordVendorPayments: boolean;

  // 5. Inventory & Catalog Privileges
  canAddProducts: boolean;
  canEditProducts: boolean;
  canDeleteProducts: boolean;
  canAdjustStock: boolean;
  canPrintLabels: boolean;
  canImportExport: boolean;

  // 6. Customers, Demands & Ledgers
  canManageCustomers: boolean;
  canRecordCustomerPayments: boolean;
  canProcessReturns: boolean;
  canManageQuotations: boolean;
  canManageDemands: boolean;

  // 7. System & Financial Administration
  canViewIncomeStatement: boolean;
  canManageExpenses: boolean;
  canManageSettings: boolean; // Supabase, Pricing formula, Staff accounts
}

export interface EmployeeAccount {
  id: string;
  name: string; // Full name e.g. "Muhammad Bilal"
  email: string; // Email or username e.g. "cashier1" or "bilal@khanfilters.pk"
  phone?: string;
  pin: string; // 4-6 digit quick PIN
  password?: string;
  role: UserRole;
  designation: string; // e.g. "Front Counter Cashier", "Store Incharge"
  status: 'active' | 'inactive';
  permissions: EmployeePermissions;
  
  // Windows / Device ID Restriction
  restrictToDevices: boolean; // If true, can only sign in on allowedDeviceIds
  allowedDeviceIds?: string[]; // Array of registered device IDs e.g. ["DEV-WIN-8492"]
  
  avatarColor?: string; // 'red' | 'blue' | 'amber' | 'emerald' | 'purple' | 'slate'
  createdAt: string;
  lastLoginAt?: string;
  lastLoginDeviceId?: string;
  notes?: string;
}

export interface AuthState {
  isLocked: boolean;
  isConfigured: boolean;
  authMethod: 'pin' | 'password' | 'biometric' | 'none';
  email?: string;
  pin?: string;
  password?: string;
  biometricCredentialId?: string;
  biometricsEnabled: boolean;
  rememberSession: boolean;
  lastUnlockedAt?: string;
  currentUserId?: string; // ID of active logged-in employee or 'admin-master'
}

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  enabled: boolean;
  syncStatus: 'disconnected' | 'connecting' | 'connected' | 'error' | 'syncing';
  lastSyncedAt?: string;
  errorMessage?: string;
}

export interface GlobalPricingSettings {
  activeTierCount: number; // 2 to 5
  tiers: PricingTierConfig[];
  roundToNearest: number; // 0, 1, 5, 10, 50, 100 PKR
}

export type AppWorkspaceView = 
  | 'dashboard'
  | 'inventory' 
  | 'sales' 
  | 'purchases' 
  | 'purchase_orders' 
  | 'income_statement'
  | 'vendors' 
  | 'customers' 
  | 'returns' 
  | 'quotations' 
  | 'demands' 
  | 'audit_logs'
  | 'inventory_audit';

export type StockMovementType = 
  | 'sale' 
  | 'purchase' 
  | 'po_receive' 
  | 'customer_return' 
  | 'vendor_return' 
  | 'manual_adjustment' 
  | 'initial_count' 
  | 'damage' 
  | 'delete_rollback'
  | 'other';

export interface StockLog {
  id: string;
  productId: string;
  productName: string;
  internalId: string;
  brandName?: string;
  typeName?: string;
  unit?: QuantityUnit;
  change: number; // Positive for inflow, negative for outflow, 0 for neutral adjustments
  previousStock: number;
  newStock: number;
  reason: 'Received Stock' | 'Sale' | 'Adjustment' | 'Damage / Return' | 'Initial Count' | 'Purchase' | string;
  movementType?: StockMovementType;
  referenceId?: string; // ID of the linked document (e.g. sale ID, purchase ID, return ID, PO ID)
  referenceNumber?: string; // Human readable bill #, invoice #, PO #, credit/debit note #
  entityName?: string; // Customer name, Vendor name, Auditor name
  unitRate?: number; // Cost or selling price in PKR associated with this movement
  totalMovementValue?: number; // change * unitRate in PKR
  locationName?: string;
  cabinNumber?: string;
  timestamp: string; // ISO date string
  notes?: string;
}

export type CustomerType = 'customer' | 'company';

export interface MachineDemandItem {
  id: string;
  productId?: string; // If selected from inventory
  internalId?: string; // e.g. "KFH-2501"
  productName: string; // Filter / Part name e.g. "sfc-5706"
  brandName?: string;
  typeName?: string;
  unit?: QuantityUnit;
  customerItemNumber?: string; // Customer's internal item / part code e.g. "DWG-9912", "AM-FLT-201"
  quantity: number; // Demand quantity per service cycle
  unitPrice: number; // Selling price in PKR
  notes?: string;
}

export interface CompanyMachine {
  id: string; // e.g. "mach-1"
  machineName: string; // e.g. "CAT 320D Hydraulic Excavator"
  operatorName?: string; // e.g. "Ustad Tariq Mahmood"
  location?: string; // e.g. "Site A - Quarry Plant"
  purchaseFrequency?: string; // e.g. "Every Month", "Every 40 Days", "Every 15 Days", "Bi-Monthly", "Quarterly", "Custom"
  lastPurchasedDate?: string; // ISO date of last service/purchase
  items: MachineDemandItem[];
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Customer {
  id: string;
  type?: CustomerType; // 'customer' (individual/trade) or 'company' (corporate/industrial B2B)
  name: string; // Customer or Company Business Name
  contactPerson?: string; // Contact person / manager name
  phone?: string;
  secondaryPhone?: string;
  email?: string;
  city?: string;
  address?: string;
  ntn?: string; // National Tax Number
  strn?: string; // Sales Tax Registration Number
  openingBalance?: number; // Initial balance customer owes us in PKR
  notes?: string;
  totalPurchases?: number;
  machines?: CompanyMachine[]; // List of company's machines & demand items
  createdAt: string;
  updatedAt?: string;
}

export type CustomerLedgerEntryType = 'opening_balance' | 'sale' | 'payment_received' | 'cash_refund' | 'adjustment';

export interface CustomerLedgerEntry {
  id: string; // e.g. "CLE-1001"
  customerId: string;
  customerName?: string;
  date: string; // ISO date string
  type: CustomerLedgerEntryType;
  entryCode: string; // e.g. "Cash Recv", "INV-1001", "Bank", "Cheque"
  billNumber?: string; // Invoice # or receipt #
  referenceId?: string; // Links to Sale.id if from a sale
  description: string;
  debit: number; // Increases customer receivable (Sales Invoice, Opening Balance, Refund)
  credit: number; // Decreases customer receivable (Payment Received)
  amount: number; // in PKR
  paymentMethod?: 'Cash' | 'Bank Transfer' | 'Cheque' | 'Online / Raast' | 'Other';
  receiptNumber?: string;
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface ComputedCustomerLedgerRow {
  id: string;
  sourceType: 'opening_balance' | 'sale' | 'payment_received' | 'cash_refund' | 'adjustment';
  date: string;
  entryCode: string;
  billNumber?: string;
  referenceId?: string;
  description: string;
  debit: number; // Increases receivable (Sale, Opening Balance)
  credit: number; // Decreases receivable (Payment received)
  runningBalance: number; // Net balance customer owes us
  paymentMethod?: string;
  rawObject?: CustomerLedgerEntry | Sale | any;
}

export interface CustomerFilterOptions {
  searchQuery: string;
  typeFilter?: 'all' | 'customer' | 'company';
  cityFilter?: string;
  balanceFilter?: 'all' | 'they_owe' | 'advance' | 'settled';
  sortBy?: 'name_asc' | 'name_desc' | 'balance_desc' | 'balance_asc' | 'recent' | 'sales_desc';
}

export interface BatchUsage {
  batchId: string;
  quantity: number;
  unitCost: number;
  billNumber?: string;
  vendorName?: string;
  date?: string;
}

export interface SaleReturnSummary {
  returnId: string;
  returnNumber: string;
  creditNoteNumber?: string;
  date: string;
  totalRefundAmount: number;
  refundMethod: CustomerRefundMethod;
  itemsCount: number;
}

export interface SaleItem {
  id: string;
  productId: string;
  internalId: string; // e.g. "KFH-2501"
  productName: string; // e.g. "sfc-5706"
  brandName?: string;
  typeName?: string;
  locationId?: string;
  locationName?: string;
  cabinNumber?: string;
  unit: QuantityUnit;
  quantity: number; // Original billed quantity
  returnedQuantity?: number; // Total units returned against this line item
  netQuantity?: number; // Remaining active units (quantity - returnedQuantity)
  unitPrice: number; // in PKR (selling price during sale)
  costPrice?: number; // in PKR (reference cost price at sale time)
  fifoCost?: number; // in PKR (weighted FIFO cost per unit for this exact sale)
  cogs?: number; // total Cost of Goods Sold for this item (quantity * fifoCost)
  batchesUsed?: BatchUsage[]; // Breakdown of FIFO batches deducted for this line item
  totalPrice: number; // Original line total (quantity * unitPrice)
  netTotalPrice?: number; // Active line total (netQuantity * unitPrice)
  crossReferences?: string; // editable cross reference, saved back to product
  machineNames?: string; // editable machine name, saved back to product
  showDetailsOnInvoice?: boolean; // whether to show cross reference & machine on invoice
  selectedTierId?: string; // e.g. 'tier-wholesale', 'tier-retail', 'custom', etc.
  selectedTierName?: string; // e.g. 'Wholesale', 'Retail', 'Custom Rate'
  priceSource?: 'customer_history' | 'inventory_retail' | 'tier_selected' | 'custom_entered';
}

export type PaymentType = 'cash' | 'credit' | 'partial';

export type InvoiceNamingPreference = 'product_name' | 'internal_id' | 'both';

export interface Sale {
  id: string; // e.g. "INV-1001" or "SALE-2501"
  date: string; // ISO date string
  customerId?: string;
  customerName: string; // e.g. "Walk-in Customer" or customer name
  customerPhone?: string;
  vendorId?: string; // Linked vendor if sale was made to a vendor
  vendorName?: string; // Name of linked vendor
  isVendorSale?: boolean;
  items: SaleItem[];
  subtotal: number; // in PKR
  discountType: 'amount' | 'percentage';
  discountValue: number; // e.g. 500 (PKR) or 10 (%)
  discountAmount: number; // in PKR
  totalAmount: number; // in PKR (Original invoice total)
  totalCost?: number; // in PKR (Sum of FIFO COGS for all items in this sale)
  totalProfit?: number; // in PKR (totalAmount - totalCost)
  amountReceived: number; // in PKR
  paymentType: PaymentType; // 'cash' (full), 'partial' (semi-paid), or 'credit' (unpaid)
  paymentStatus?: 'paid' | 'partial' | 'credit';
  balanceDue: number; // totalAmount - amountReceived (if > 0)
  changeGiven: number; // amountReceived - totalAmount (if > 0)
  invoiceNamingPreference: InvoiceNamingPreference;
  notes?: string;
  hasReturns?: boolean; // True if one or more returns exist against this invoice
  totalReturnedAmount?: number; // Total PKR value returned/credited
  netAmount?: number; // Adjusted invoice total (totalAmount - totalReturnedAmount)
  netBalanceDue?: number; // Adjusted remaining balance due if credit/partial
  returnedItemsCount?: number; // Total units returned across all items
  returnsList?: SaleReturnSummary[]; // Summary list of linked returns/credit notes
  createdAt: string;
  updatedAt?: string;
}

export interface ComputedLedgerRow {
  id: string;
  sourceType: 'opening_balance' | 'cash_sent' | 'cash_received' | 'purchase' | 'sale' | 'adjustment';
  date: string;
  entryCode: string; // e.g. "Cash", "SF-9842", "INV-1001"
  billNumber?: string;
  referenceId?: string;
  description: string;
  debit: number; // Reduces balance we owe (Cash Sent, Sale to Vendor)
  credit: number; // Increases balance we owe (Purchases, Cash Received)
  runningBalance: number; // Balance we owe after this transaction
  rawObject?: VendorLedgerEntry | Purchase | Sale | any;
}

export interface SaleFilterOptions {
  searchQuery: string; // searches by ID, date, customer name, phone
  startDate?: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD
  minAmount?: number;
  maxAmount?: number;
  paymentType?: 'all' | 'cash' | 'credit' | 'partial';
  sortBy?: 'date_desc' | 'date_asc' | 'id_desc' | 'id_asc' | 'amount_desc' | 'amount_asc';
  vendorId?: string;
}

// ----------------------------------------------------
// VENDOR, PURCHASE & LEDGER DATA TYPES
// ----------------------------------------------------

export interface Vendor {
  id: string; // e.g. "vend-1"
  businessName: string; // e.g. "Indus Filter Importers & Co."
  contactPerson: string; // e.g. "Tariq Mahmood"
  phone: string; // e.g. "0300-5551234"
  secondaryPhone?: string;
  email?: string;
  address?: string;
  city?: string;
  openingBalance: number; // Initial balance we owe to vendor (in PKR)
  linkedProductIds: string[]; // IDs of products sourced / linked to this vendor
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}

export type LedgerEntryType = 'cash_sent' | 'cash_received' | 'purchase' | 'sale' | 'opening_balance' | 'adjustment';

export interface VendorLedgerEntry {
  id: string; // e.g. "CSH-1001", "PUR-2001", "INV-1001"
  vendorId: string;
  vendorName?: string;
  date: string; // ISO date string
  type: LedgerEntryType;
  entryCode: string; // e.g. "Cash", "Cash Send", "Cash Recv", "Bill #...", "INV-1001"
  billNumber?: string; // Purchase bill # or Sales Invoice #
  referenceId?: string; // Links to Sale.id or Purchase.id if applicable
  description: string; // Remarks / details e.g. "Cash sent via courier", "Invoice INV-1001"
  debit: number; // Reduces balance we owe (Cash Sent / Paid to Vendor, or Sale to Vendor)
  credit: number; // Increases balance we owe (Purchases from Vendor, Cash Received, Opening Balance)
  amount: number; // Transaction amount in PKR
  paymentMethod?: 'Cash' | 'Bank Transfer' | 'Cheque' | 'Online / Raast' | 'Other';
  receiptNumber?: string;
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface PurchaseReturnSummary {
  returnId: string;
  returnNumber: string;
  debitNoteNumber?: string;
  date: string;
  totalAmount: number;
  settlementMethod: VendorReturnSettlement;
  itemsCount: number;
}

export interface PurchaseItem {
  id: string;
  productId: string;
  internalId: string;
  productName: string;
  brandName?: string;
  typeName?: string;
  unit: QuantityUnit;
  quantity: number; // Original purchased quantity
  returnedQuantity?: number; // Quantity returned to vendor
  netQuantity?: number; // Active remaining quantity (quantity - returnedQuantity)
  unitPrice: number; // Cost / buying price in PKR
  totalPrice: number; // Original line total (quantity * unitPrice)
  netTotalPrice?: number; // Active line total (netQuantity * unitPrice)
  previousCostPrice?: number; // Cost price in inventory before this purchase
}

export interface Purchase {
  id: string; // e.g. "PUR-2001"
  billNumber: string; // Vendor's invoice/bill number e.g. "SF-9921"
  vendorId: string;
  vendorName: string;
  date: string; // ISO date string
  items: PurchaseItem[];
  subtotal: number;
  discountAmount?: number;
  totalAmount: number; // in PKR (Original bill total)
  amountPaid: number; // in PKR
  balanceDue: number; // totalAmount - amountPaid
  paymentStatus: 'paid' | 'partial' | 'unpaid';
  updatePricesInInventory?: boolean; // Whether to update product's active costPrice and recalculate selling prices
  notes?: string;
  poId?: string; // Links to PurchaseOrder.id if generated from PO
  poNumber?: string; // Purchase Order reference number e.g. "PO-1002"
  biltyNumber?: string; // Goods carrier bilty / consignment tracking number
  transporterName?: string; // Goods transporter / cargo company name
  cargoCost?: number; // Total allocated cargo/freight cost in PKR
  cargoCostPerUnit?: number; // Allocated freight per unit
  hasReturns?: boolean; // True if one or more vendor returns exist against this bill
  totalReturnedAmount?: number; // Total PKR value returned/debited
  netAmount?: number; // Adjusted bill total (totalAmount - totalReturnedAmount)
  netBalanceDue?: number; // Adjusted balance due we owe vendor
  returnedItemsCount?: number; // Total units returned to supplier
  returnsList?: PurchaseReturnSummary[]; // Summary list of linked vendor debit returns
  createdAt: string;
  updatedAt?: string;
}

export interface PurchaseFilterOptions {
  searchQuery: string; // searches by bill #, vendor name, product name, internal ID
  vendorId?: string;
  startDate?: string;
  endDate?: string;
  paymentStatus?: 'all' | 'paid' | 'partial' | 'unpaid';
  sortBy?: 'date_desc' | 'date_asc' | 'amount_desc' | 'amount_asc' | 'bill_desc';
}

export interface ProductPurchaseHistoryItem {
  purchaseId: string;
  billNumber: string;
  vendorId: string;
  vendorName: string;
  date: string;
  quantity: number;
  unitPrice: number; // Rate at which it was bought (PKR)
  totalPrice: number;
  batchRemaining?: number; // Remaining stock currently in this batch
  batchStatus?: 'active' | 'depleted';
}

export interface VendorFilterOptions {
  searchQuery: string; // Searches across business name, contact person, phone, address, linked items
  cityFilter?: string;
  balanceFilter?: 'all' | 'we_owe' | 'they_owe' | 'settled';
  sortBy?: 'name_asc' | 'name_desc' | 'balance_desc' | 'balance_asc' | 'recent';
}

// ----------------------------------------------------------------------------
// RETURNS & DEBIT/CREDIT NOTE MODELS
// ----------------------------------------------------------------------------

export type CustomerReturnReason = 
  | 'Defective / Quality Issue'
  | 'Wrong Filter / Item Supplied'
  | 'Customer Changed Mind'
  | 'Excess Quantity Ordered'
  | 'Damaged in Transit'
  | 'Machine Specifications Changed'
  | 'Other';

export type ItemReturnCondition = 'restock' | 'damaged' | 'scrap';

export type CustomerRefundMethod = 'khata_credit' | 'cash_refund' | 'bank_refund' | 'exchange';

export interface CustomerReturnItem {
  id: string;
  productId: string;
  internalId: string;
  productName: string;
  brandName?: string;
  typeName?: string;
  unit: QuantityUnit;
  quantity: number;
  returnRate: number; // Unit price credited/refunded in PKR
  totalAmount: number; // quantity * returnRate in PKR
  condition: ItemReturnCondition; // 'restock' (adds back to sellable stock) vs 'damaged'/'scrap'
  reason: CustomerReturnReason;
  notes?: string;
}

export interface CustomerReturn {
  id: string; // e.g. "CRTN-1001"
  returnNumber: string; // e.g. "CR-2026-001"
  creditNoteNumber?: string; // e.g. "CN-1001"
  saleId?: string; // Optional linked original Sale Invoice # e.g. "INV-1001"
  customerId?: string; // Optional linked Customer ID
  customerName: string; // Customer / Company name
  customerPhone?: string;
  date: string; // ISO date string
  items: CustomerReturnItem[];
  subtotal: number; // PKR
  deductionOrRestockFee?: number; // PKR (e.g. handling or restock charge)
  totalRefundAmount: number; // subtotal - deductionOrRestockFee
  refundMethod: CustomerRefundMethod; // 'khata_credit' | 'cash_refund' | 'bank_refund' | 'exchange'
  refundStatus: 'completed' | 'pending' | 'partially_refunded';
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}

export type VendorReturnReason = 
  | 'Defective / Manufacturing Fault'
  | 'Wrong Item / Spec Mismatch'
  | 'Damaged During Delivery'
  | 'Excess / Unordered Stock'
  | 'Expired / Old Manufacturing Date'
  | 'Warranty Claim / Replacement Request'
  | 'Price Dispute'
  | 'Other';

export type VendorReturnSettlement = 'debit_note' | 'cash_refund' | 'bank_refund' | 'replacement_pending';

export interface VendorReturnItem {
  id: string;
  productId: string;
  internalId: string;
  productName: string;
  brandName?: string;
  typeName?: string;
  unit: QuantityUnit;
  quantity: number;
  unitCost: number; // Purchase price returned in PKR
  totalAmount: number; // quantity * unitCost in PKR
  reason: VendorReturnReason;
  notes?: string;
}

export interface VendorReturn {
  id: string; // e.g. "VRTN-2001"
  returnNumber: string; // e.g. "VR-2026-001"
  debitNoteNumber?: string; // e.g. "DN-501"
  purchaseId?: string; // Optional linked Purchase Bill # e.g. "PUR-2001" / "SF-9842"
  vendorId: string;
  vendorName: string;
  date: string; // ISO date string
  items: VendorReturnItem[];
  subtotal: number;
  totalAmount: number; // Total return value in PKR
  settlementMethod: VendorReturnSettlement; // 'debit_note' | 'cash_refund' | 'bank_refund' | 'replacement_pending'
  settlementStatus: 'completed' | 'pending' | 'replacement_received';
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface ReturnFilterOptions {
  searchQuery: string;
  returnType: 'all' | 'customer' | 'vendor';
  startDate?: string;
  endDate?: string;
  refundMethod?: string;
  condition?: string;
  reason?: string;
  sortBy?: 'date_desc' | 'date_asc' | 'amount_desc' | 'amount_asc';
}

// ----------------------------------------------------------------------------
// QUOTATIONS & ESTIMATES DATA TYPES (Stock not deducted, 7-day validity)
// ----------------------------------------------------------------------------

export type QuotationStatus = 'active' | 'expired' | 'converted' | 'rejected';

export interface QuotationItem {
  id: string;
  productId?: string;
  internalId: string; // e.g. "KFH-2501" or custom
  productName: string; // e.g. "sfc-5706"
  brandName?: string;
  typeName?: string;
  locationName?: string;
  cabinNumber?: string;
  unit: QuantityUnit;
  quantity: number;
  unitPrice: number; // in PKR
  discountPercent?: number;
  totalPrice: number; // in PKR: (quantity * unitPrice) - discount
  notes?: string;
  crossReferences?: string;
  machineNames?: string;
}

export interface Quotation {
  id: string; // e.g. "QUO-1001"
  quotationNumber: string; // e.g. "QT-1001" or "QT-2026-001"
  date: string; // ISO date string when quotation was issued (e.g. "2026-08-30")
  validUntil: string; // ISO date string when quotation expires (default: date + 7 days)
  validityDays: number; // default 7 days
  customerId?: string; // Optional linked customer or company
  customerType?: CustomerType; // 'customer' (individual/trade) or 'company' (B2B)
  customerName: string; // Customer / Company name
  contactPerson?: string; // Contact Person / Manager
  customerPhone?: string;
  customerEmail?: string;
  customerAddress?: string;
  customerCity?: string;
  customerNtn?: string;
  customerStrn?: string;
  items: QuotationItem[];
  subtotal: number; // in PKR
  discountType: 'amount' | 'percentage';
  discountValue: number; // e.g. 500 (PKR) or 5 (%)
  discountAmount: number; // in PKR
  taxPercent?: number; // Optional GST / Sales Tax %
  taxAmount?: number; // in PKR
  totalAmount: number; // in PKR (subtotal - discountAmount + taxAmount)
  status: QuotationStatus; // 'active' | 'expired' | 'converted' | 'rejected'
  termsAndConditions?: string;
  notes?: string;
  convertedSaleId?: string; // Links to Sale.id when converted into an official sale invoice
  convertedAt?: string; // ISO date string when converted
  createdAt: string;
  updatedAt?: string;
}

export interface QuotationFilterOptions {
  searchQuery: string;
  status?: 'all' | 'active' | 'expired' | 'converted' | 'rejected';
  customerType?: 'all' | 'customer' | 'company';
  startDate?: string;
  endDate?: string;
  sortBy?: 'date_desc' | 'date_asc' | 'validity_asc' | 'amount_desc' | 'amount_asc';
}

// ----------------------------------------------------------------------------
// PURCHASE ORDERS & CARGO RECEIVING DATA TYPES (Landed Costs & Delayed Billing)
// ----------------------------------------------------------------------------

export type PurchaseOrderStatus = 
  | 'draft'               // Order drafted but not sent
  | 'ordered'             // Order sent to vendor / in transit (No stock added yet)
  | 'pending_bill'        // Cargo physically received & stock added into inventory, but bill / item unit costs are unknown/pending
  | 'completed'           // Cargo received & bill costs finalized with cargo distribution; vendor ledger posted & inventory costs updated
  | 'cancelled';          // Cancelled order

export interface PurchaseOrderItem {
  id: string;
  productId: string;
  internalId: string; // e.g. "KFH-2501"
  productName: string; // e.g. "sfc-5706"
  brandName?: string;
  typeName?: string;
  unit: QuantityUnit;
  orderedQuantity: number; // Initially ordered quantity (e.g. 2 pcs)
  receivedQuantity: number; // Actual physical cargo quantity received (e.g. 4 pcs)
  estimatedUnitPrice?: number; // Estimated unit rate when ordering (PKR)
  actualUnitPrice?: number; // Confirmed purchase unit rate from bill (PKR)
  allocatedCargoCost?: number; // Proportional cargo freight per unit (PKR), e.g. totalCargoCost / totalUnits
  landedUnitCost?: number; // actualUnitPrice + allocatedCargoCost (PKR)
  totalLineCost?: number; // receivedQuantity * landedUnitCost (PKR)
  isExtraItem?: boolean; // True if item arrived in cargo but wasn't in original PO
  previousCostPrice?: number; // Cost price in inventory before this receiving
  notes?: string;
}

export interface PurchaseOrder {
  id: string; // e.g. "PO-1001"
  poNumber: string; // e.g. "PO-1001" or "PO-2026-001"
  vendorId: string;
  vendorName: string;
  vendorPhone?: string;
  vendorAddress?: string;
  orderDate: string; // ISO date string (when PO was created/placed)
  expectedDeliveryDate?: string;
  receivingDate?: string; // ISO date string when cargo physically arrived
  costsFinalizedDate?: string; // ISO date string when bill & unit costs were confirmed
  status: PurchaseOrderStatus;
  items: PurchaseOrderItem[];
  totalOrderedQty: number;
  totalReceivedQty: number;
  cargoCost: number; // Cargo / Freight / Transport expense in PKR (e.g. 1000)
  cargoCostPerUnit: number; // Distributed cargo freight per piece (e.g. 1000 / 20 = 50)
  subtotalBaseCost: number; // Sum of receivedQuantity * actualUnitPrice
  totalLandedCost: number; // subtotalBaseCost + cargoCost (in PKR)
  billNumber?: string; // Vendor's invoice/bill number e.g. "SF-9921"
  biltyNumber?: string; // Cargo carrier tracking / bilty number e.g. "BLT-78923"
  transporterName?: string; // e.g. "Al-Makkah Goods Transport", "Faisal Movers Cargo"
  amountPaid?: number; // PKR paid on spot
  paymentStatus?: 'paid' | 'partial' | 'unpaid';
  isStockReceived: boolean; // True once cargo items have been physically incremented in inventory stock
  isBilled: boolean; // True once unit costs & vendor ledger balance have been confirmed
  isPendingBill?: boolean; // Convenience flag when status is 'pending_bill'
  vendorLedgerEntryId?: string; // ID of posted vendor ledger entry
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface PurchaseOrderFilterOptions {
  searchQuery: string;
  status?: 'all' | 'draft' | 'ordered' | 'pending_bill' | 'completed' | 'cancelled';
  vendorId?: string;
  startDate?: string;
  endDate?: string;
  sortBy?: 'date_desc' | 'date_asc' | 'amount_desc' | 'amount_asc' | 'po_desc';
}

// ----------------------------------------------------
// Customer Demand & Backorder Records
// ----------------------------------------------------

export type DemandStatus = 'pending' | 'fulfilled' | 'unfulfillable' | 'cancelled';

export interface Demand {
  id: string; // e.g. "DMD-1001"
  demandNumber: string; // e.g. "DMD-1001"
  customerName: string; // Person Name
  customerPhone?: string; // Contact phone number
  location?: string; // Location / City / Address of person
  customerId?: string; // Optional reference to stored Customer
  
  itemName: string; // Item Name requested
  productId?: string; // Optional reference to stored Product
  itemDetails?: string; // Details like size (H, OD, ID), thread, dimensions, specs, OEM #
  notes?: string; // Note on item / client preferences / special requests
  
  quantity: number; // Requested quantity (default 1)
  unit: QuantityUnit; // 'Pcs' | 'Kg' | 'Litre' etc.
  targetPrice?: number; // Estimated / Promised selling price in PKR
  
  requiredDate?: string; // Date by which person wants the item / fulfillment deadline (YYYY-MM-DD)
  status: DemandStatus; // 'pending' | 'fulfilled' | 'unfulfillable' | 'cancelled'
  
  unfulfillableReason?: string; // Reason if marked unfulfillable
  cancellationReason?: string; // Reason if marked cancelled
  
  fulfilledSaleId?: string; // Linked Sale Invoice ID when fulfilled (e.g. "INV-1025")
  fulfilledAt?: string; // ISO date string when marked fulfilled
  
  createdAt: string; // ISO date string
  updatedAt?: string; // ISO date string
}

export interface DemandFilterOptions {
  searchQuery: string;
  statusFilter: 'all' | DemandStatus;
  dateFilter: 'all' | 'overdue' | 'due_today' | 'upcoming_7d' | 'future';
  sortBy: 'required_date_asc' | 'required_date_desc' | 'created_desc' | 'created_asc' | 'customer_asc' | 'item_asc' | 'status';
}

// ----------------------------------------------------------------------------
// OPERATING EXPENSES & FINANCIAL STATEMENT DATA TYPES
// ----------------------------------------------------------------------------

export type ExpenseCategory = 
  | 'Shop Rent'
  | 'Electricity & Utilities'
  | 'Staff Wages & Salaries'
  | 'Cargo & Freight Outward'
  | 'Packaging & Tape'
  | 'Tea, Refreshments & Mess'
  | 'Shop Maintenance & Repairs'
  | 'Printing & Office Supplies'
  | 'Vehicle / Delivery Fuel'
  | 'Marketing & Advertising'
  | 'Taxes, Duties & Legal'
  | 'Bank & Raast Charges'
  | 'Miscellaneous';

export interface Expense {
  id: string; // e.g. "EXP-1001"
  expenseNumber: string; // e.g. "EXP-1001"
  title: string;
  category: ExpenseCategory;
  amount: number; // in PKR
  date: string; // ISO date string or YYYY-MM-DD
  paymentMethod: 'Cash' | 'Bank Transfer' | 'Cheque' | 'Online / Raast' | 'Other';
  paidTo?: string; // Beneficiary / Payee name
  receiptNumber?: string;
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface ExpenseFilterOptions {
  searchQuery: string;
  category?: 'all' | ExpenseCategory;
  startDate?: string;
  endDate?: string;
  paymentMethod?: string;
  sortBy?: 'date_desc' | 'date_asc' | 'amount_desc' | 'amount_asc';
}

export type IncomeStatementPeriod = 
  | 'today'
  | 'yesterday'
  | 'this_week'
  | 'this_month'
  | 'last_month'
  | 'this_quarter'
  | 'this_year'
  | 'last_year'
  | 'all_time'
  | 'custom';

export interface IncomeStatementLineBreakdown {
  label: string;
  amount: number;
  description?: string;
  count?: number;
  percentageOfRevenue?: number;
  isDeduction?: boolean;
}

export interface IncomeStatementData {
  periodLabel: string;
  startDate: string;
  endDate: string;
  
  // 1. REVENUE (SALES)
  grossSales: number;
  salesCount: number;
  salesReturns: number;
  salesReturnsCount: number;
  salesDiscounts: number;
  netSales: number;
  
  // 2. COST OF GOODS SOLD (COGS)
  fifoCOGS: number;
  cargoFreightPurchases: number;
  damagedInventoryScrap: number;
  vendorReturnsRebate: number;
  totalCOGS: number;
  
  // 3. GROSS PROFIT
  grossProfit: number;
  grossProfitMargin: number; // Percentage e.g. 24.5%
  
  // 4. OPERATING EXPENSES (OPEX)
  operatingExpenses: number;
  expensesCount: number;
  expensesByCategory: { [category: string]: number };
  
  // 5. OPERATING INCOME (EBIT)
  operatingIncome: number;
  operatingMargin: number; // Percentage
  
  // 6. OTHER INCOME / ADJUSTMENTS
  restockFeesCollected: number;
  otherIncomeTotal: number;
  
  // 7. NET PROFIT / NET INCOME (BOTTOM LINE)
  netIncome: number;
  netProfitMargin: number; // Percentage
  
  // Additional Business Health Reference Metrics
  totalPurchasesSpend: number;
  endingInventoryValuationCost: number;
  endingInventoryValuationRetail: number;
  customerReceivablesOutstanding: number;
  vendorPayablesOutstanding: number;
}





