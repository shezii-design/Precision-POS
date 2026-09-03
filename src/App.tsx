import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { 
  AuthState, 
  Brand, 
  Customer,
  CustomerLedgerEntry,
  CustomerReturn,
  DeviceInfo, 
  DimensionUnit, 
  GlobalPricingSettings, 
  LocationItem, 
  Product, 
  ProductType, 
  Sale,
  StockLog, 
  SupabaseConfig,
  Vendor,
  Purchase,
  VendorLedgerEntry,
  VendorReturn,
  Quotation,
  PurchaseOrder,
  PurchaseOrderItem,
  PurchaseOrderStatus,
  Demand,
  DemandStatus,
  Expense,
  EmployeeAccount
} from './types';
import { 
  getNextInternalId, 
  getStoredBrands, 
  getStoredCustomers,
  getStoredCustomerLedger,
  getStoredCustomerReturns,
  getStoredLocations, 
  getStoredPricingSettings, 
  getStoredProducts, 
  getStoredSales,
  getStoredSupabaseConfig, 
  getStoredTypes, 
  getStoredVendors,
  getStoredPurchases,
  getStoredVendorLedgerEntries,
  getStoredVendorReturns,
  getStoredQuotations,
  getStoredPurchaseOrders,
  getStoredDemands,
  getStoredStockLogs,
  getStoredExpenses,
  saveStoredExpenses,
  saveExpense,
  deleteExpense,
  recordSaleAndUpdateInventory,
  updateSaleAndUpdateAll,
  recordPurchaseAndUpdateInventory,
  updatePurchaseAndUpdateAll,
  deletePurchaseAndUpdateAll,
  recordCashEntryAndUpdateAll,
  updateCashEntryAndUpdateAll,
  deleteCashEntryAndUpdateAll,
  recordCustomerReturnAndUpdateInventory,
  deleteCustomerReturnAndUpdateAll,
  recordVendorReturnAndUpdateInventory,
  deleteVendorReturnAndUpdateAll,
  recordQuotation,
  updateQuotation,
  deleteQuotation,
  renewQuotationValidity,
  recordPurchaseOrder,
  updatePurchaseOrder,
  processPOCargoReceivingAndUpdateAll,
  deletePurchaseOrderAndUpdateAll,
  saveDemand,
  deleteDemand,
  updateDemandStatus,
  linkProductsToVendor,
  saveStockLog, 
  saveStoredBrands, 
  saveStoredCustomers,
  saveStoredCustomerLedger,
  saveStoredCustomerReturns,
  saveStoredSales,
  saveStoredLocations, 
  saveStoredPricingSettings, 
  saveStoredProducts, 
  saveStoredSupabaseConfig, 
  saveStoredTypes,
  saveStoredVendors,
  saveStoredPurchases,
  saveStoredVendorLedgerEntries,
  saveStoredVendorReturns,
  saveStoredQuotations,
  saveStoredPurchaseOrders,
  saveStoredDemands,
  saveStoredStockLogs
} from './services/storage';
import { 
  getStoredAuthState, 
  saveAuthState, 
  getStoredEmployees, 
  saveStoredEmployees, 
  getStoredActiveEmployeeId, 
  saveStoredActiveEmployeeId, 
  initializeDefaultEmployees,
  isTabAllowed,
  isActionAllowed
} from './services/auth';
import { detectDeviceInfo, getStoredRegisteredDevices } from './services/device';
import { filterAndSortProducts, normalizeSearchTerm } from './services/search';
import { ParsedDimensionQuery } from './services/dimensions';
import { formatPKR, formatPKRShort, generateProductSellingPrices, getDefaultRetailPrice } from './services/pricing';
import { exportProductsToCSV, exportProductsToExcel } from './services/excel';
import { getSupabaseClient, syncAllModulesToSupabase, fetchAllFromSupabase } from './services/supabase';

// Components
import { Navbar } from './components/Navbar';
import { DimensionSearchBar } from './components/DimensionSearchBar';
import { ProductCard } from './components/ProductCard';
import { ProductTable } from './components/ProductTable';
import { ProductFormModal } from './components/ProductFormModal';
import { PricingFormulaModal } from './components/PricingFormulaModal';
import { BulkImportModal } from './components/BulkImportModal';
import { CategoriesAndBrandsModal } from './components/CategoriesAndBrandsModal';
import { StockAdjustModal } from './components/StockAdjustModal';
import { LabelPrintModal } from './components/LabelPrintModal';
import { SupabaseConfigModal } from './components/SupabaseConfigModal';
import { AuthModal } from './components/AuthModal';
import { FactoryResetModal } from './components/FactoryResetModal';
import { DashboardPage } from './components/DashboardPage';
import { IncomeStatementPage } from './components/IncomeStatementPage';
import { SalesPage } from './components/SalesPage';
import { CustomersPage } from './components/CustomersPage';
import { PurchasesPage } from './components/PurchasesPage';
import { PurchaseInvoiceModal } from './components/PurchaseInvoiceModal';
import { NewSaleModal, InitialSaleItemPreset } from './components/NewSaleModal';
import { InvoiceModal } from './components/InvoiceModal';
import { VendorsPage } from './components/VendorsPage';
import { VendorDetailsPage } from './components/VendorDetailsPage';
import { VendorFormModal } from './components/VendorFormModal';
import { CashEntryModal } from './components/CashEntryModal';
import { PurchaseFormModal } from './components/PurchaseFormModal';
import { ConfigureLinkedProductsModal } from './components/ConfigureLinkedProductsModal';
import { ReturnsPage } from './components/ReturnsPage';
import { CustomerReturnModal } from './components/CustomerReturnModal';
import { VendorReturnModal } from './components/VendorReturnModal';
import { ReturnVoucherModal } from './components/ReturnVoucherModal';
import { ProductHistoryModal } from './components/ProductHistoryModal';
import { QuotationsPage } from './components/QuotationsPage';
import { QuotationFormModal } from './components/QuotationFormModal';
import { QuotationViewModal } from './components/QuotationViewModal';
import { PurchaseOrdersPage } from './components/PurchaseOrdersPage';
import { PurchaseOrderFormModal } from './components/PurchaseOrderFormModal';
import { PurchaseOrderReceiveModal } from './components/PurchaseOrderReceiveModal';
import { PurchaseOrderViewModal } from './components/PurchaseOrderViewModal';
import { DemandsPage } from './components/DemandsPage';
import { DemandFormModal } from './components/DemandFormModal';
import { InventoryAuditLog } from './components/InventoryAuditLog';
import { LowStockNotificationBanner } from './components/LowStockNotificationBanner';
import { StaffManagementModal } from './components/StaffManagementModal';
import { SwitchUserModal } from './components/SwitchUserModal';
import { AppWorkspaceView } from './components/Navbar';

import { 
  Search, 
  Filter, 
  LayoutGrid, 
  Table as TableIcon, 
  Box, 
  AlertTriangle, 
  Plus, 
  Layers, 
  MapPin, 
  ArrowUpDown, 
  CheckCircle2, 
  RefreshCw, 
  SlidersHorizontal,
  X,
  Tag,
  DollarSign,
  Keyboard,
  Ruler,
  Receipt,
  ShoppingCart,
  Building2
} from 'lucide-react';
import { useOnlineStatus } from './hooks/useOnlineStatus';


export default function App() {
  const isOnline = useOnlineStatus();
  // Global Data State
  const [products, setProducts] = useState<Product[]>(() => getStoredProducts());
  const [brands, setBrands] = useState<Brand[]>(() => getStoredBrands());
  const [types, setTypes] = useState<ProductType[]>(() => getStoredTypes());
  const [locations, setLocations] = useState<LocationItem[]>(() => getStoredLocations());
  const [pricingSettings, setPricingSettings] = useState<GlobalPricingSettings>(() => getStoredPricingSettings());
  const [supabaseConfig, setSupabaseConfig] = useState<SupabaseConfig>(() => getStoredSupabaseConfig());
  const [authState, setAuthState] = useState<AuthState>(() => {
    const stored = getStoredAuthState();
    let shouldLock = true;
    
    // Check if within 24 hours
    if (stored.lastUnlockedAt && stored.rememberSession !== false) {
      const lastUnlockTime = new Date(stored.lastUnlockedAt).getTime();
      const ONE_DAY_MS = 24 * 60 * 60 * 1000;
      if (Date.now() - lastUnlockTime < ONE_DAY_MS) {
        shouldLock = false; // still valid for today
      }
    }
    
    return { ...stored, isLocked: shouldLock };
  });
  const [deviceInfo] = useState<DeviceInfo>(() => detectDeviceInfo());

  // Staff & RBAC Permissions State
  const [employees, setEmployees] = useState<EmployeeAccount[]>(() => {
    initializeDefaultEmployees();
    return getStoredEmployees();
  });
  const [activeEmployeeId, setActiveEmployeeId] = useState<string>(() => getStoredActiveEmployeeId());
  const [showStaffModal, setShowStaffModal] = useState<boolean>(false);
  const [showWipeDataModal, setShowWipeDataModal] = useState<boolean>(false);
  const [showSwitchUserModal, setShowSwitchUserModal] = useState<boolean>(false);

  // Active current operator / employee account
  const currentEmployee = useMemo(() => {
    return employees.find(e => e.id === activeEmployeeId) || employees[0];
  }, [employees, activeEmployeeId]);

  // Sales & Customer Data State
  const [currentView, setCurrentView] = useState<AppWorkspaceView>('inventory');
  const [sales, setSales] = useState<Sale[]>(() => getStoredSales());
  const [customers, setCustomers] = useState<Customer[]>(() => getStoredCustomers());
  const [customerLedger, setCustomerLedger] = useState<CustomerLedgerEntry[]>(() => getStoredCustomerLedger());
  const [showNewSaleModal, setShowNewSaleModal] = useState<boolean>(false);
  const [editingSaleForModal, setEditingSaleForModal] = useState<Sale | null>(null);
  const [initialSaleCustomerId, setInitialSaleCustomerId] = useState<string | undefined>(undefined);
  const [initialSaleCustomerName, setInitialSaleCustomerName] = useState<string | undefined>(undefined);
  const [initialSaleCustomerPhone, setInitialSaleCustomerPhone] = useState<string | undefined>(undefined);
  const [initialSaleNotes, setInitialSaleNotes] = useState<string | undefined>(undefined);
  const [initialSalePresets, setInitialSalePresets] = useState<InitialSaleItemPreset[] | undefined>(undefined);
  const [activeDemandIdForSale, setActiveDemandIdForSale] = useState<string | null>(null);
  const [showInvoiceModal, setShowInvoiceModal] = useState<boolean>(false);
  const [activeSaleForInvoice, setActiveSaleForInvoice] = useState<Sale | null>(null);

  // Customer Demands & Backorders State
  const [demands, setDemands] = useState<Demand[]>(() => getStoredDemands());
  const [showDemandFormModal, setShowDemandFormModal] = useState<boolean>(false);
  const [editingDemand, setEditingDemand] = useState<Demand | null>(null);

  // Vendor & Purchase Data State
  const [vendors, setVendors] = useState<Vendor[]>(() => getStoredVendors());
  const [purchases, setPurchases] = useState<Purchase[]>(() => getStoredPurchases());
  const [ledgerEntries, setLedgerEntries] = useState<VendorLedgerEntry[]>(() => getStoredVendorLedgerEntries());
  const [selectedVendorForDetails, setSelectedVendorForDetails] = useState<Vendor | null>(null);
  const [showPurchaseInvoiceModal, setShowPurchaseInvoiceModal] = useState<boolean>(false);
  const [activePurchaseForInvoice, setActivePurchaseForInvoice] = useState<Purchase | null>(null);

  // Returns & Debit/Credit Notes State
  const [customerReturns, setCustomerReturns] = useState<CustomerReturn[]>(() => getStoredCustomerReturns());
  const [vendorReturns, setVendorReturns] = useState<VendorReturn[]>(() => getStoredVendorReturns());
  const [showCustomerReturnModal, setShowCustomerReturnModal] = useState<boolean>(false);
  const [editingCustomerReturn, setEditingCustomerReturn] = useState<CustomerReturn | null>(null);
  const [initialSaleForReturn, setInitialSaleForReturn] = useState<Sale | null>(null);
  const [showVendorReturnModal, setShowVendorReturnModal] = useState<boolean>(false);
  const [editingVendorReturn, setEditingVendorReturn] = useState<VendorReturn | null>(null);
  const [showReturnVoucherModal, setShowReturnVoucherModal] = useState<boolean>(false);
  const [voucherReturnDoc, setVoucherReturnDoc] = useState<CustomerReturn | VendorReturn | null>(null);
  const [voucherReturnType, setVoucherReturnType] = useState<'customer' | 'vendor'>('customer');

  // Quotations & Estimates State (7-Day Validity, No Stock Deducted)
  const [quotations, setQuotations] = useState<Quotation[]>(() => getStoredQuotations());
  const [showQuotationFormModal, setShowQuotationFormModal] = useState<boolean>(false);
  const [editingQuotation, setEditingQuotation] = useState<Quotation | null>(null);
  const [showQuotationViewModal, setShowQuotationViewModal] = useState<boolean>(false);
  const [viewingQuotation, setViewingQuotation] = useState<Quotation | null>(null);

  // Inventory Audit Logs State
  const [stockLogs, setStockLogs] = useState<StockLog[]>(() => getStoredStockLogs());

  // Operating Overhead Expenses State (for P&L and Income Statement)
  const [expenses, setExpenses] = useState<Expense[]>(() => getStoredExpenses());

  // Purchase Orders & Flexible Cargo Receiving State
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>(() => getStoredPurchaseOrders());
  const [showPOFormModal, setShowPOFormModal] = useState<boolean>(false);
  const [editingPOForModal, setEditingPOForModal] = useState<PurchaseOrder | null>(null);
  const [poModalVendorId, setPoModalVendorId] = useState<string | undefined>(undefined);
  const [showPOReceiveModal, setShowPOReceiveModal] = useState<boolean>(false);
  const [activePOForReceive, setActivePOForReceive] = useState<PurchaseOrder | null>(null);
  const [showPOViewModal, setShowPOViewModal] = useState<boolean>(false);
  const [viewingPO, setViewingPO] = useState<PurchaseOrder | null>(null);

  // Vendor Modals State
  const [showVendorFormModal, setShowVendorFormModal] = useState<boolean>(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const [showCashModal, setShowCashModal] = useState<boolean>(false);
  const [cashModalVendorId, setCashModalVendorId] = useState<string | undefined>(undefined);
  const [editingLedgerEntry, setEditingLedgerEntry] = useState<VendorLedgerEntry | null>(null);
  const [showPurchaseModal, setShowPurchaseModal] = useState<boolean>(false);
  const [purchaseModalVendorId, setPurchaseModalVendorId] = useState<string | undefined>(undefined);
  const [editingPurchase, setEditingPurchase] = useState<Purchase | null>(null);
  const [showConfigureLinksModal, setShowConfigureLinksModal] = useState<boolean>(false);
  const [vendorForLinking, setVendorForLinking] = useState<Vendor | null>(null);

  // Search & Filter State
  const [primarySearch, setPrimarySearch] = useState<string>('');
  const [dimensionQuery, setDimensionQuery] = useState<ParsedDimensionQuery | null>(null);
  const [dimensionSearchUnit, setDimensionSearchUnit] = useState<DimensionUnit>('inch');
  const [brandFilter, setBrandFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [locationFilter, setLocationFilter] = useState<string>('all');
  const [cabinFilter, setCabinFilter] = useState<string>('all');
  const [stockStatusFilter, setStockStatusFilter] = useState<'all' | 'in_stock' | 'low_stock' | 'out_of_stock'>('all');
  const [sortBy, setSortBy] = useState<'recent' | 'name_asc' | 'id_asc' | 'price_low' | 'price_high' | 'stock_low' | 'stock_high'>('recent');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState<boolean>(false);

  // Keyboard shortcut refs & toast
  const primarySearchInputRef = useRef<HTMLInputElement | null>(null);
  const dimensionSearchInputRef = useRef<HTMLInputElement | null>(null);
  const inventorySectionRef = useRef<HTMLDivElement | null>(null);
  const [shortcutToast, setShortcutToast] = useState<{ title: string; shortcut: string } | null>(null);
  const toastTimeoutRef = useRef<any>(null);

  // Modals Visibility State
  const [showProductModal, setShowProductModal] = useState<boolean>(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [showPricingModal, setShowPricingModal] = useState<boolean>(false);
  const [showImportModal, setShowImportModal] = useState<boolean>(false);
  const [showCategoriesModal, setShowCategoriesModal] = useState<boolean>(false);
  const [showStockModal, setShowStockModal] = useState<boolean>(false);
  const [productForStock, setProductForStock] = useState<Product | null>(null);
  const [showLabelModal, setShowLabelModal] = useState<boolean>(false);
  const [productForLabel, setProductForLabel] = useState<Product | null>(null);
  const [showProductHistoryModal, setShowProductHistoryModal] = useState<boolean>(false);
  const [productForHistory, setProductForHistory] = useState<Product | null>(null);
  const [showSupabaseModal, setShowSupabaseModal] = useState<boolean>(false);
  const [showSecurityModal, setShowSecurityModal] = useState<boolean>(false);

  // In-App Low Stock Login Notification Banner State (shown if > 5 low stock products)
  const [showLowStockBanner, setShowLowStockBanner] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem('kfh_dismissed_low_stock_banner') !== 'true';
    } catch {
      return true;
    }
  });

  const showToast = (title: string, shortcut: string) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setShortcutToast({ title, shortcut });
    toastTimeoutRef.current = setTimeout(() => {
      setShortcutToast(null);
    }, 1800);
  };

  const handleGoToInventory = () => {
    setCurrentView('inventory');
    setSelectedVendorForDetails(null);
    setShowProductModal(false);
    setShowPricingModal(false);
    setShowImportModal(false);
    setShowCategoriesModal(false);
    setShowStockModal(false);
    setShowLabelModal(false);
    setShowSupabaseModal(false);
    setShowSecurityModal(false);

    if (inventorySectionRef.current) {
      inventorySectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    showToast('Inventory Tab', 'Ctrl + I');
  };

  const handleViewLowStockInventory = () => {
    setCurrentView('inventory');
    setStockStatusFilter('low_stock');
    showToast('Low Stock Filter Applied', `${lowStockCount} items`);
    setTimeout(() => {
      if (inventorySectionRef.current) {
        inventorySectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  };

  const handleDismissLowStockBanner = () => {
    setShowLowStockBanner(false);
    try {
      sessionStorage.setItem('kfh_dismissed_low_stock_banner', 'true');
    } catch {}
  };

  const handleGoToSales = () => {
    setCurrentView('sales');
    setSelectedVendorForDetails(null);
    setShowProductModal(false);
    setShowPricingModal(false);
    setShowImportModal(false);
    setShowCategoriesModal(false);
    setShowStockModal(false);
    setShowLabelModal(false);
    setShowSupabaseModal(false);
    setShowSecurityModal(false);
    showToast('Sales & Invoices Page', 'Ctrl + K');
  };

  const handleGoToPurchases = () => {
    setSelectedVendorForDetails(null);
    setCurrentView('purchases');
    setShowProductModal(false);
    setShowPricingModal(false);
    setShowImportModal(false);
    setShowCategoriesModal(false);
    setShowStockModal(false);
    setShowLabelModal(false);
    setShowSupabaseModal(false);
    setShowSecurityModal(false);
    showToast('Purchases & Procurement', 'Ctrl + P');
  };

  const handleGoToVendors = () => {
    setSelectedVendorForDetails(null);
    setCurrentView('vendors');
    setShowProductModal(false);
    setShowPricingModal(false);
    setShowImportModal(false);
    setShowCategoriesModal(false);
    setShowStockModal(false);
    setShowLabelModal(false);
    setShowSupabaseModal(false);
    setShowSecurityModal(false);
    showToast('Vendors & Suppliers', 'Ctrl + V');
  };

  const handleGoToCustomers = () => {
    setSelectedVendorForDetails(null);
    setCurrentView('customers');
    setShowProductModal(false);
    setShowPricingModal(false);
    setShowImportModal(false);
    setShowCategoriesModal(false);
    setShowStockModal(false);
    setShowLabelModal(false);
    setShowSupabaseModal(false);
    setShowSecurityModal(false);
    showToast('Customers & Companies', 'Ctrl + U');
  };

  const handleGoToReturns = () => {
    setSelectedVendorForDetails(null);
    setCurrentView('returns');
    setShowProductModal(false);
    setShowPricingModal(false);
    setShowImportModal(false);
    setShowCategoriesModal(false);
    setShowStockModal(false);
    setShowLabelModal(false);
    setShowSupabaseModal(false);
    setShowSecurityModal(false);
    showToast('Returns & Debit/Credit Notes', 'Ctrl + R');
  };

  const handleGoToQuotations = () => {
    setSelectedVendorForDetails(null);
    setCurrentView('quotations');
    setShowProductModal(false);
    setShowPricingModal(false);
    setShowImportModal(false);
    setShowCategoriesModal(false);
    setShowStockModal(false);
    setShowLabelModal(false);
    setShowSupabaseModal(false);
    setShowSecurityModal(false);
    showToast('Quotations & Estimates', 'Ctrl + Q');
  };

  const handleGoToAuditLogs = () => {
    setSelectedVendorForDetails(null);
    setStockLogs(getStoredStockLogs());
    setCurrentView('inventory_audit');
    setShowProductModal(false);
    setShowPricingModal(false);
    setShowImportModal(false);
    setShowCategoriesModal(false);
    setShowStockModal(false);
    setShowLabelModal(false);
    setShowSupabaseModal(false);
    setShowSecurityModal(false);
    showToast('Inventory Audit Trail', 'Ctrl + A');
  };

  const handleGoToDashboard = () => {
    setSelectedVendorForDetails(null);
    setCurrentView('dashboard');
    setShowProductModal(false);
    setShowPricingModal(false);
    setShowImportModal(false);
    setShowCategoriesModal(false);
    setShowStockModal(false);
    setShowLabelModal(false);
    setShowSupabaseModal(false);
    setShowSecurityModal(false);
    showToast('Executive Dashboard', 'Ctrl + B');
  };

  const handleGoToIncomeStatement = () => {
    setSelectedVendorForDetails(null);
    setCurrentView('income_statement');
    setShowProductModal(false);
    setShowPricingModal(false);
    setShowImportModal(false);
    setShowCategoriesModal(false);
    setShowStockModal(false);
    setShowLabelModal(false);
    setShowSupabaseModal(false);
    setShowSecurityModal(false);
    showToast('Income Statement (P&L)', 'Ctrl + M');
  };

  const handleSaveExpense = (expenseData: Partial<Expense>) => {
    if (!isOnline) { showToast('Offline Mode (Read-Only)', 'Cannot perform write/edit actions while offline.', ); return; }
    const res = saveExpense(expenseData, expenses);
    setExpenses(res.updatedExpenses);
    showToast(`Expense Saved: PKR ${res.savedExpense.amount.toLocaleString()}`, res.savedExpense.title);
  };

  const handleDeleteExpense = (expenseId: string) => {
    if (!isOnline) { showToast('Offline Mode (Read-Only)', 'Cannot perform write/edit actions while offline.', ); return; }
    const expense = expenses.find(e => e.id === expenseId);
    if (!expense) return;
    if (!window.confirm(`Delete expense record "${expense.title}" for PKR ${expense.amount.toLocaleString()}?`)) return;
    const res = deleteExpense(expenseId, expenses);
    setExpenses(res.updatedExpenses);
    showToast('Expense Deleted', expense.title);
  };

  const handleOpenCreateQuotation = () => {
    if (!isOnline) { showToast('Offline Mode (Read-Only)', 'Cannot perform write/edit actions while offline.', ); return; }
    setEditingQuotation(null);
    setShowQuotationFormModal(true);
    showToast('New Quotation (7-Day Validity)', 'F6');
  };

  const handleViewQuotation = (quotation: Quotation) => {
    setViewingQuotation(quotation);
    setShowQuotationViewModal(true);
  };

  const handleEditQuotation = (quotation: Quotation) => {
    if (!isOnline) { showToast('Offline Mode (Read-Only)', 'Cannot perform write/edit actions while offline.', ); return; }
    setEditingQuotation(quotation);
    setShowQuotationFormModal(true);
  };

  const handleSaveQuotation = (quotationData: Quotation) => {
    if (!isOnline) { showToast('Offline Mode (Read-Only)', 'Cannot perform write/edit actions while offline.', ); return; }
    if (editingQuotation) {
      const updated = updateQuotation(quotationData, quotations);
      setQuotations(updated);
      showToast(`Quotation ${quotationData.quotationNumber} Updated`, 'Validity: 7 Days');
    } else {
      const updated = recordQuotation(quotationData, quotations);
      setQuotations(updated);
      showToast(`Quotation ${quotationData.quotationNumber} Saved`, 'Valid for 7 Days');
    }
    setShowQuotationFormModal(false);
    setEditingQuotation(null);
  };

  const handleDeleteQuotation = (quotationId: string) => {
    if (!isOnline) { showToast('Offline Mode (Read-Only)', 'Cannot perform write/edit actions while offline.', ); return; }
    const updated = deleteQuotation(quotationId, quotations);
    setQuotations(updated);
    showToast('Quotation Deleted', 'Removed from list');
  };

  const handleRenewQuotationValidity = (quotationId: string, days: number = 7) => {
    const updated = renewQuotationValidity(quotationId, days, quotations);
    setQuotations(updated);
    if (viewingQuotation && viewingQuotation.id === quotationId) {
      setViewingQuotation(updated.find(q => q.id === quotationId) || null);
    }
    showToast('Quotation Renewed', `Extended for ${days} days`);
  };

  // Purchase Order Handlers
  const handleGoToPurchaseOrders = () => {
    setSelectedVendorForDetails(null);
    setCurrentView('purchase_orders');
    setShowProductModal(false);
    setShowPricingModal(false);
    setShowImportModal(false);
    setShowCategoriesModal(false);
    setShowStockModal(false);
    setShowLabelModal(false);
    setShowSupabaseModal(false);
    setShowSecurityModal(false);
    showToast('Purchase Orders & Cargo', 'Ctrl + O');
  };

  const handleOpenCreatePO = (vendorId?: string) => {
    if (!isOnline) { showToast('Offline Mode (Read-Only)', 'Cannot perform write/edit actions while offline.', ); return; }
    const validVendorId = typeof vendorId === 'string' ? vendorId : undefined;
    setPoModalVendorId(validVendorId);
    setEditingPOForModal(null);
    setShowPOFormModal(true);
    showToast('Create Purchase Order', 'Draft PO');
  };

  const handleOpenEditPO = (po: PurchaseOrder) => {
    if (!isOnline) { showToast('Offline Mode (Read-Only)', 'Cannot perform write/edit actions while offline.', ); return; }
    setPoModalVendorId(po.vendorId);
    setEditingPOForModal(po);
    setShowPOFormModal(true);
    showToast(`Edit PO ${po.poNumber}`, 'Purchase Order Editor');
  };

  const handleOpenReceiveCargo = (po: PurchaseOrder) => {
    if (!isOnline) { showToast('Offline Mode (Read-Only)', 'Cannot perform write/edit actions while offline.', ); return; }
    setActivePOForReceive(po);
    setShowPOReceiveModal(true);
    showToast(`Receive Cargo for ${po.poNumber}`, 'Cargo & Cost Allocation');
  };

  const handleViewPO = (po: PurchaseOrder) => {
    setViewingPO(po);
    setShowPOViewModal(true);
  };

  const handleSavePO = (poData: PurchaseOrder) => {
    if (!isOnline) { showToast('Offline Mode (Read-Only)', 'Cannot perform write/edit actions while offline.', ); return; }
    if (editingPOForModal) {
      const updated = updatePurchaseOrder(poData, purchaseOrders);
      setPurchaseOrders(updated);
      showToast(`PO ${poData.poNumber} Updated`, `${poData.items.length} items`);
    } else {
      const updated = recordPurchaseOrder(poData, purchaseOrders);
      setPurchaseOrders(updated);
      showToast(`PO ${poData.poNumber} Created`, `${poData.items.length} items`);
    }
    setShowPOFormModal(false);
    setEditingPOForModal(null);
  };

  const handleProcessPOCargoReceiving = (poData: PurchaseOrder, isPendingBill: boolean) => {
    if (!isOnline) { showToast('Offline Mode (Read-Only)', 'Cannot perform write/edit actions while offline.', ); return; }
    const res = processPOCargoReceivingAndUpdateAll(
      poData,
      purchaseOrders,
      products,
      vendors,
      ledgerEntries,
      isPendingBill,
      purchases
    );

    setProducts(res.updatedProducts);
    setPurchaseOrders(res.updatedPOs);
    setVendors(res.updatedVendors);
    setLedgerEntries(res.updatedLedgerEntries);
    setPurchases(res.updatedPurchases);

    setShowPOReceiveModal(false);
    setActivePOForReceive(null);

    // Open printable GRN / PO View modal
    const updatedPO = res.updatedPOs.find(p => p.id === poData.id) || poData;
    setViewingPO(updatedPO);
    setShowPOViewModal(true);

    if (isPendingBill) {
      showToast(`Cargo Received (Cost Pending)`, `Stock added for ${poData.poNumber} • Recorded in Vendor Ledger on ${poData.receivingDate || 'today'} with ₨ 0 balance`);
    } else {
      showToast(`Cargo Received & Finalized`, `Stock & Landed Cost posted to Vendor Ledger on ${poData.receivingDate || 'today'} for ${poData.poNumber}`);
    }
  };

  const handleDeletePO = (poId: string) => {
    if (!isOnline) { showToast('Offline Mode (Read-Only)', 'Cannot perform write/edit actions while offline.', ); return; }
    const po = purchaseOrders.find(p => p.id === poId);
    if (!po) return;
    if (!window.confirm(`Are you sure you want to delete Purchase Order "${po.poNumber}"?`)) return;

    const res = deletePurchaseOrderAndUpdateAll(
      poId,
      purchaseOrders,
      products,
      vendors,
      ledgerEntries,
      true,
      purchases
    );

    setProducts(res.updatedProducts);
    setPurchaseOrders(res.updatedPOs);
    setVendors(res.updatedVendors);
    setLedgerEntries(res.updatedLedgerEntries);
    setPurchases(res.updatedPurchases);

    showToast('Purchase Order Deleted', po.poNumber);
  };

  // Customer Demands & Backorders Handlers
  const handleGoToDemands = () => {
    setSelectedVendorForDetails(null);
    setCurrentView('demands');
    setShowProductModal(false);
    setShowPricingModal(false);
    setShowImportModal(false);
    setShowCategoriesModal(false);
    setShowStockModal(false);
    setShowLabelModal(false);
    setShowSupabaseModal(false);
    setShowSecurityModal(false);
    showToast('Customer Demands & Backorders', 'Ctrl + D');
  };

  const handleOpenCreateDemand = () => {
    if (!isOnline) { showToast('Offline Mode (Read-Only)', 'Cannot perform write/edit actions while offline.', ); return; }
    setEditingDemand(null);
    setShowDemandFormModal(true);
    showToast('New Demand Request', 'Demand Entry');
  };

  const handleOpenEditDemand = (demand: Demand) => {
    if (!isOnline) { showToast('Offline Mode (Read-Only)', 'Cannot perform write/edit actions while offline.', ); return; }
    setEditingDemand(demand);
    setShowDemandFormModal(true);
  };

  const handleSaveDemand = (demandData: Demand) => {
    if (!isOnline) { showToast('Offline Mode (Read-Only)', 'Cannot perform write/edit actions while offline.', ); return; }
    const res = saveDemand(demandData, demands);
    setDemands(res.updatedDemands);
    setShowDemandFormModal(false);
    setEditingDemand(null);
    showToast('Demand Saved', demandData.customerName);
  };

  const handleDeleteDemand = (demandId: string) => {
    if (!isOnline) { showToast('Offline Mode (Read-Only)', 'Cannot perform write/edit actions while offline.', ); return; }
    const demand = demands.find(d => d.id === demandId);
    if (demand && !window.confirm(`Are you sure you want to delete demand for "${demand.customerName} - ${demand.itemName}"?`)) {
      return;
    }
    const res = deleteDemand(demandId, demands);
    setDemands(res.updatedDemands);
    showToast('Demand Deleted', 'Removed from list');
  };

  const handleUpdateDemandStatus = (demandId: string, status: DemandStatus) => {
    if (!isOnline) { showToast('Offline Mode (Read-Only)', 'Cannot perform write/edit actions while offline.', ); return; }
    const res = updateDemandStatus(demandId, status, undefined, demands);
    setDemands(res.updatedDemands);
    showToast(`Demand Marked ${status.toUpperCase()}`, 'Status Updated');
  };

  const handleFulfillDemand = (demand: Demand) => {
    // 1. Check if product exists in inventory by name or productId
    const matchedProd = products.find(p => 
      (demand.productId && p.id === demand.productId) ||
      p.name.toLowerCase() === demand.itemName.toLowerCase()
    );

    const defaultRetail = matchedProd ? getDefaultRetailPrice(matchedProd) : undefined;
    const unitPrice = demand.targetPrice && demand.targetPrice > 0 ? demand.targetPrice : defaultRetail;

    const presetItem: InitialSaleItemPreset = {
      productId: matchedProd?.id || demand.productId,
      internalId: matchedProd?.internalId,
      productName: demand.itemName,
      brandName: matchedProd?.brandName,
      typeName: matchedProd?.typeName,
      unit: demand.unit || matchedProd?.unit || 'Pcs',
      quantity: demand.quantity || 1,
      unitPrice: unitPrice,
      customerItemNumber: demand.itemDetails ? `Details: ${demand.itemDetails}` : undefined,
      notes: demand.notes ? `Demand notes: ${demand.notes}` : undefined
    };

    setActiveDemandIdForSale(demand.id);
    setEditingSaleForModal(null);
    setInitialSaleCustomerId(demand.customerId);
    setInitialSaleCustomerName(demand.customerName);
    setInitialSaleCustomerPhone(demand.customerPhone);
    setInitialSaleNotes(
      [
        demand.location ? `Delivery location: ${demand.location}` : '',
        demand.itemDetails ? `Item specs: ${demand.itemDetails}` : '',
        demand.notes ? `Demand note: ${demand.notes}` : '',
        `Fulfilling Demand #${demand.id.slice(-6)}`
      ].filter(Boolean).join(' | ')
    );
    setInitialSalePresets([presetItem]);
    setShowNewSaleModal(true);
    showToast(`Fulfilling Demand for ${demand.customerName}`, 'Creating Sale Invoice');
  };

  const handleConvertToSaleFromQuotation = (quotation: Quotation) => {
    const presets: InitialSaleItemPreset[] = quotation.items.map(it => ({
      productId: it.productId,
      quantity: it.quantity,
      unitPrice: it.unitPrice,
      discountPercent: it.discountPercent,
      productName: it.productName,
      internalId: it.internalId,
      notes: it.notes
    }));

    handleOpenNewSale(quotation.customerId, presets);
    showToast(`Converting Quotation ${quotation.quotationNumber}`, 'Creating Sale Invoice (Stock will deduct on sale save)');
  };

  const handleOpenNewSale = (customerId?: string, presetItems?: InitialSaleItemPreset[]) => {
    if (!isOnline) { showToast('Offline Mode (Read-Only)', 'Cannot perform write/edit actions while offline.', ); return; }
    setEditingSaleForModal(null);
    setActiveDemandIdForSale(null);
    setInitialSaleCustomerPhone(undefined);
    setInitialSaleNotes(undefined);
    const validCustId = typeof customerId === 'string' ? customerId : undefined;
    if (validCustId) {
      const foundCust = customers.find(c => c.id === validCustId);
      setInitialSaleCustomerId(validCustId);
      setInitialSaleCustomerName(foundCust ? foundCust.name : undefined);
      setInitialSaleCustomerPhone(foundCust ? foundCust.phone : undefined);
    } else {
      setInitialSaleCustomerId(undefined);
      setInitialSaleCustomerName(undefined);
    }
    const validPresets = Array.isArray(presetItems) && presetItems.length > 0 ? presetItems : undefined;
    setInitialSalePresets(validPresets);
    setShowNewSaleModal(true);
    showToast('Make a Sale', 'F5');
  };

  const handleEditSale = (sale: Sale) => {
    if (!isOnline) { showToast('Offline Mode (Read-Only)', 'Cannot perform write/edit actions while offline.', ); return; }
    setActiveDemandIdForSale(null);
    setEditingSaleForModal(sale);
    setShowNewSaleModal(true);
    showToast(`Edit Sale ${sale.id}`, 'Sale Editor');
  };

  const handleCompleteSale = (newSale: Sale, originalSale?: Sale | null) => {
    if (!isOnline) { showToast('Offline Mode (Read-Only)', 'Cannot perform write/edit actions while offline.', ); return; }
    if (originalSale) {
      const res = updateSaleAndUpdateAll(newSale, originalSale, products, sales, customers, vendors, ledgerEntries);
      setProducts(res.updatedProducts);
      setSales(res.updatedSales);
      setCustomers(res.updatedCustomers);
      setVendors(res.updatedVendors);
      setLedgerEntries(res.updatedLedgerEntries);
      setShowNewSaleModal(false);
      setEditingSaleForModal(null);
      setActiveSaleForInvoice(newSale);
      setShowInvoiceModal(true);
      showToast(`Sale ${newSale.id} Updated`, formatPKR(newSale.totalAmount));
    } else {
      const res = recordSaleAndUpdateInventory(newSale, products, sales, customers);
      setProducts(res.updatedProducts);
      setSales(res.updatedSales);
      setCustomers(res.updatedCustomers);

      // If this sale fulfilled an active demand, update demand status to fulfilled and link sale ID
      if (activeDemandIdForSale) {
        const res = updateDemandStatus(
          activeDemandIdForSale, 
          'fulfilled', 
          { fulfilledSaleId: newSale.id, fulfilledAt: new Date().toISOString() }, 
          demands
        );
        setDemands(res.updatedDemands);
        setActiveDemandIdForSale(null);
      }

      setShowNewSaleModal(false);
      setEditingSaleForModal(null);
      setActiveSaleForInvoice(newSale);
      setShowInvoiceModal(true);
      showToast(`Invoice ${newSale.id} Generated`, formatPKR(newSale.totalAmount));
    }
  };

  const handleViewInvoice = (sale: Sale) => {
    setActiveSaleForInvoice(sale);
    setShowInvoiceModal(true);
  };

  // Vendor Action Handlers
  const handleSelectVendor = (vendor: Vendor) => {
    setSelectedVendorForDetails(vendor);
  };

  const handleBackFromVendorDetails = () => {
    setSelectedVendorForDetails(null);
  };

  const handleOpenAddVendorModal = () => {
    if (!isOnline) { showToast('Offline Mode (Read-Only)', 'Cannot perform write/edit actions while offline.', ); return; }
    setEditingVendor(null);
    setShowVendorFormModal(true);
  };

  const handleOpenEditVendorModal = (vendor: Vendor) => {
    if (!isOnline) { showToast('Offline Mode (Read-Only)', 'Cannot perform write/edit actions while offline.', ); return; }
    setEditingVendor(vendor);
    setShowVendorFormModal(true);
  };

  const handleSaveVendor = (savedVendor: Vendor) => {
    if (!isOnline) { showToast('Offline Mode (Read-Only)', 'Cannot perform write/edit actions while offline.', ); return; }
    const exists = vendors.some(v => v.id === savedVendor.id);
    let updated: Vendor[];
    if (exists) {
      updated = vendors.map(v => v.id === savedVendor.id ? savedVendor : v);
      showToast(`Vendor ${savedVendor.businessName} Updated`, 'Saved');
    } else {
      updated = [savedVendor, ...vendors];
      showToast(`Vendor ${savedVendor.businessName} Registered`, 'Added');
    }
    setVendors(updated);
    saveStoredVendors(updated);

    if (selectedVendorForDetails && selectedVendorForDetails.id === savedVendor.id) {
      setSelectedVendorForDetails(savedVendor);
    }
    setShowVendorFormModal(false);
    setEditingVendor(null);
  };

  const handleDeleteVendor = (vendorId: string) => {
    if (!isOnline) { showToast('Offline Mode (Read-Only)', 'Cannot perform write/edit actions while offline.', ); return; }
    const vendor = vendors.find(v => v.id === vendorId);
    if (!vendor) return;
    if (!window.confirm(`Are you sure you want to delete vendor "${vendor.businessName}"? This will also remove their purchases and ledger history.`)) {
      return;
    }
    const updatedVendors = vendors.filter(v => v.id !== vendorId);
    const updatedPurchases = purchases.filter(p => p.vendorId !== vendorId);
    const updatedLedger = ledgerEntries.filter(e => e.vendorId !== vendorId);

    setVendors(updatedVendors);
    setPurchases(updatedPurchases);
    setLedgerEntries(updatedLedger);

    saveStoredVendors(updatedVendors);
    saveStoredPurchases(updatedPurchases);
    saveStoredVendorLedgerEntries(updatedLedger);

    if (selectedVendorForDetails?.id === vendorId) {
      setSelectedVendorForDetails(null);
    }
    showToast(`Vendor Deleted`, vendor.businessName);
  };

  // Cash / Payment Entry Handlers
  const handleOpenCashModal = (vendorId?: string, editingEntry?: VendorLedgerEntry | null) => {
    if (!isOnline) { showToast('Offline Mode (Read-Only)', 'Cannot perform write/edit actions while offline.', ); return; }
    const validVendorId = typeof vendorId === 'string' ? vendorId : undefined;
    setCashModalVendorId(validVendorId);
    setEditingLedgerEntry(editingEntry && typeof editingEntry === 'object' && 'amount' in editingEntry ? editingEntry : null);
    setShowCashModal(true);
  };

  const handleSaveCashEntry = (entryData: Omit<VendorLedgerEntry, 'id' | 'createdAt'>, entryId?: string) => {
    if (!isOnline) { showToast('Offline Mode (Read-Only)', 'Cannot perform write/edit actions while offline.', ); return; }
    if (entryId) {
      const res = updateCashEntryAndUpdateAll(entryId, entryData, ledgerEntries, vendors);
      setLedgerEntries(res.updatedLedgerEntries);
      setVendors(res.updatedVendors);
      showToast('Payment Entry Updated', `${entryData.type === 'cash_sent' ? 'Cash Sent' : 'Payment Received'}: ${formatPKR(Number(entryData.amount))}`);
    } else {
      const res = recordCashEntryAndUpdateAll(entryData, ledgerEntries, vendors);
      setLedgerEntries(res.updatedLedgerEntries);
      setVendors(res.updatedVendors);
      showToast('Payment Entry Recorded', `${entryData.type === 'cash_sent' ? 'Cash Sent' : 'Payment Received'}: ${formatPKR(Number(entryData.amount))}`);
    }
    setShowCashModal(false);
    setEditingLedgerEntry(null);
  };

  const handleDeleteLedgerEntry = (entryId: string) => {
    if (!isOnline) { showToast('Offline Mode (Read-Only)', 'Cannot perform write/edit actions while offline.', ); return; }
    if (!window.confirm('Are you sure you want to delete this payment record?')) return;
    const res = deleteCashEntryAndUpdateAll(entryId, ledgerEntries, vendors);
    setLedgerEntries(res.updatedLedgerEntries);
    setVendors(res.updatedVendors);
    showToast('Payment Record Deleted', 'Ledger Adjusted');
  };

  // Purchase Handlers (Atomic updates across inventory, purchases, vendors, ledger)
  const handleOpenPurchaseModal = (vendorId?: string, editingPurch?: Purchase | null) => {
    if (!isOnline) { showToast('Offline Mode (Read-Only)', 'Cannot perform write/edit actions while offline.', ); return; }
    const validVendorId = typeof vendorId === 'string' ? vendorId : undefined;
    setPurchaseModalVendorId(validVendorId);
    setEditingPurchase(editingPurch && typeof editingPurch === 'object' && 'totalAmount' in editingPurch ? editingPurch : null);
    setShowPurchaseModal(true);
  };

  const handleSavePurchase = (purchase: Purchase, originalPurchase?: Purchase | null) => {
    if (!isOnline) { showToast('Offline Mode (Read-Only)', 'Cannot perform write/edit actions while offline.', ); return; }
    if (originalPurchase) {
      const res = updatePurchaseAndUpdateAll(purchase, originalPurchase, products, purchases, vendors, ledgerEntries);
      setProducts(res.updatedProducts);
      setPurchases(res.updatedPurchases);
      setVendors(res.updatedVendors);
      setLedgerEntries(res.updatedLedgerEntries);
      showToast(`Purchase ${purchase.billNumber || purchase.id} Updated`, formatPKR(purchase.totalAmount));
    } else {
      const res = recordPurchaseAndUpdateInventory(purchase, products, purchases, vendors, ledgerEntries);
      setProducts(res.updatedProducts);
      setPurchases(res.updatedPurchases);
      setVendors(res.updatedVendors);
      setLedgerEntries(res.updatedLedgerEntries);
      showToast(`Purchase ${purchase.billNumber || purchase.id} Recorded`, `Stock & Ledger updated: ${formatPKR(purchase.totalAmount)}`);
    }
    setShowPurchaseModal(false);
    setEditingPurchase(null);
  };

  const handleDeletePurchase = (purchaseId: string) => {
    if (!isOnline) { showToast('Offline Mode (Read-Only)', 'Cannot perform write/edit actions while offline.', ); return; }
    if (!window.confirm('Are you sure you want to delete this purchase bill? Stock items will be subtracted back and ledger reversed.')) {
      return;
    }
    const res = deletePurchaseAndUpdateAll(purchaseId, products, purchases, vendors, ledgerEntries);
    setProducts(res.updatedProducts);
    setPurchases(res.updatedPurchases);
    setVendors(res.updatedVendors);
    setLedgerEntries(res.updatedLedgerEntries);
    showToast('Purchase Deleted', 'Stock & Ledger rolled back');
  };

  // Linked Products Configuration Handlers
  const handleOpenConfigureLinksModal = (vendor: Vendor) => {
    if (!isOnline) { showToast('Offline Mode (Read-Only)', 'Cannot perform write/edit actions while offline.', ); return; }
    setVendorForLinking(vendor);
    setShowConfigureLinksModal(true);
  };

  const handleSaveLinkedProducts = (vendorId: string, linkedProductIds: string[]) => {
    if (!isOnline) { showToast('Offline Mode (Read-Only)', 'Cannot perform write/edit actions while offline.', ); return; }
    const res = linkProductsToVendor(vendorId, linkedProductIds, vendors, products);
    setVendors(res.updatedVendors);
    setProducts(res.updatedProducts);
    if (selectedVendorForDetails && selectedVendorForDetails.id === vendorId) {
      setSelectedVendorForDetails(res.updatedVendors.find(v => v.id === vendorId) || null);
    }
    setShowConfigureLinksModal(false);
    setVendorForLinking(null);
    showToast('Products Linked to Vendor', `${linkedProductIds.length} items configured`);
  };

  // Customer & Vendor Returns Handlers
  const handleOpenCustomerReturnModal = (docOrSale?: CustomerReturn | Sale) => {
    if (!isOnline) { showToast('Offline Mode (Read-Only)', 'Cannot perform write/edit actions while offline.', ); return; }
    if (docOrSale && 'returnNumber' in docOrSale) {
      setEditingCustomerReturn(docOrSale as CustomerReturn);
      setInitialSaleForReturn(null);
    } else if (docOrSale && ('invoiceNumber' in docOrSale || 'paymentType' in docOrSale || 'customerId' in docOrSale)) {
      setEditingCustomerReturn(null);
      setInitialSaleForReturn(docOrSale as Sale);
    } else {
      setEditingCustomerReturn(null);
      setInitialSaleForReturn(null);
    }
    setShowCustomerReturnModal(true);
  };

  const handleOpenVendorReturnModal = (returnDoc?: VendorReturn) => {
    if (!isOnline) { showToast('Offline Mode (Read-Only)', 'Cannot perform write/edit actions while offline.', ); return; }
    setEditingVendorReturn(returnDoc || null);
    setShowVendorReturnModal(true);
  };

  const handleSaveCustomerReturn = (returnDoc: CustomerReturn) => {
    if (!isOnline) { showToast('Offline Mode (Read-Only)', 'Cannot perform write/edit actions while offline.', ); return; }
    if (editingCustomerReturn) {
      const rolledBack = deleteCustomerReturnAndUpdateAll(
        editingCustomerReturn.id,
        products,
        customerReturns,
        customers,
        customerLedger,
        sales
      );
      const recorded = recordCustomerReturnAndUpdateInventory(
        returnDoc,
        rolledBack.updatedProducts,
        rolledBack.updatedReturns,
        rolledBack.updatedCustomers,
        rolledBack.updatedLedger,
        rolledBack.updatedSales
      );
      setProducts(recorded.updatedProducts);
      setCustomerReturns(recorded.updatedReturns);
      setCustomers(recorded.updatedCustomers);
      setCustomerLedger(recorded.updatedLedger);
      setSales(recorded.updatedSales);
      showToast(`Customer Return ${returnDoc.returnNumber} Updated`, `Credit Note: Rs. ${returnDoc.totalRefundAmount.toLocaleString()}`);
    } else {
      const res = recordCustomerReturnAndUpdateInventory(
        returnDoc,
        products,
        customerReturns,
        customers,
        customerLedger,
        sales
      );
      setProducts(res.updatedProducts);
      setCustomerReturns(res.updatedReturns);
      setCustomers(res.updatedCustomers);
      setCustomerLedger(res.updatedLedger);
      setSales(res.updatedSales);
      showToast(`Customer Return ${returnDoc.returnNumber} Recorded`, `Credit Note: Rs. ${returnDoc.totalRefundAmount.toLocaleString()}`);
    }

    setShowCustomerReturnModal(false);
    setEditingCustomerReturn(null);
    setVoucherReturnDoc(returnDoc);
    setVoucherReturnType('customer');
    setShowReturnVoucherModal(true);
  };

  const handleDeleteCustomerReturn = (returnId: string) => {
    if (!isOnline) { showToast('Offline Mode (Read-Only)', 'Cannot perform write/edit actions while offline.', ); return; }
    const res = deleteCustomerReturnAndUpdateAll(
      returnId,
      products,
      customerReturns,
      customers,
      customerLedger,
      sales
    );
    setProducts(res.updatedProducts);
    setCustomerReturns(res.updatedReturns);
    setCustomers(res.updatedCustomers);
    setCustomerLedger(res.updatedLedger);
    setSales(res.updatedSales);
    showToast('Customer Return Deleted', 'Inventory & Ledger Restored');
  };

  const handleSaveVendorReturn = (returnDoc: VendorReturn) => {
    if (!isOnline) { showToast('Offline Mode (Read-Only)', 'Cannot perform write/edit actions while offline.', ); return; }
    if (editingVendorReturn) {
      const rolledBack = deleteVendorReturnAndUpdateAll(
        editingVendorReturn.id,
        products,
        vendorReturns,
        vendors,
        ledgerEntries,
        purchases
      );
      const recorded = recordVendorReturnAndUpdateInventory(
        returnDoc,
        rolledBack.updatedProducts,
        rolledBack.updatedReturns,
        rolledBack.updatedVendors,
        rolledBack.updatedLedger,
        rolledBack.updatedPurchases
      );
      setProducts(recorded.updatedProducts);
      setVendorReturns(recorded.updatedReturns);
      setVendors(recorded.updatedVendors);
      setLedgerEntries(recorded.updatedLedger);
      setPurchases(recorded.updatedPurchases);
      showToast(`Vendor Return ${returnDoc.returnNumber} Updated`, `Debit Note: Rs. ${returnDoc.totalAmount.toLocaleString()}`);
    } else {
      const res = recordVendorReturnAndUpdateInventory(
        returnDoc,
        products,
        vendorReturns,
        vendors,
        ledgerEntries,
        purchases
      );
      setProducts(res.updatedProducts);
      setVendorReturns(res.updatedReturns);
      setVendors(res.updatedVendors);
      setLedgerEntries(res.updatedLedger);
      setPurchases(res.updatedPurchases);
      showToast(`Vendor Return ${returnDoc.returnNumber} Recorded`, `Debit Note: Rs. ${returnDoc.totalAmount.toLocaleString()}`);
    }

    setShowVendorReturnModal(false);
    setEditingVendorReturn(null);
    setVoucherReturnDoc(returnDoc);
    setVoucherReturnType('vendor');
    setShowReturnVoucherModal(true);
  };

  const handleDeleteVendorReturn = (returnId: string) => {
    if (!isOnline) { showToast('Offline Mode (Read-Only)', 'Cannot perform write/edit actions while offline.', ); return; }
    const res = deleteVendorReturnAndUpdateAll(
      returnId,
      products,
      vendorReturns,
      vendors,
      ledgerEntries,
      purchases
    );
    setProducts(res.updatedProducts);
    setVendorReturns(res.updatedReturns);
    setVendors(res.updatedVendors);
    setLedgerEntries(res.updatedLedger);
    setPurchases(res.updatedPurchases);
    showToast('Vendor Return Deleted', 'Inventory & Ledger Restored');
  };

  const handleViewReturnVoucher = (returnDoc: CustomerReturn | VendorReturn, type: 'customer' | 'vendor') => {
    setVoucherReturnDoc(returnDoc);
    setVoucherReturnType(type);
    setShowReturnVoucherModal(true);
  };

  // Global Keyboard Shortcuts (Windows / PC / Mac)
  // Ctrl + K -> Open Sales & Invoicing Page
  // Ctrl + P -> Go to Purchases Page
  // Ctrl + R -> Go to Returns & Credit/Debit Notes Page
  // Ctrl + I -> Go to Inventory Tab / Section
  // Ctrl + U -> Go to Customers & Companies Tab
  // Ctrl + V -> Go to Vendors & Suppliers Tab
  // F5 -> Open POS Make a Sale modal from anywhere
  // Ctrl + F -> Focus Main Search
  // Ctrl + E -> Focus Size / Dimension Search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 1. F5 Global Shortcut: Open Sales System from anywhere
      if (e.key === 'F5') {
        e.preventDefault();
        handleOpenNewSale();
        return;
      }

      // 2. F6 Global Shortcut: Create New Quotation
      if (e.key === 'F6') {
        e.preventDefault();
        handleOpenCreateQuotation();
        return;
      }

      // Support Windows/PC Ctrl and macOS Command
      const isCtrl = e.ctrlKey || e.metaKey;
      if (!isCtrl) return;

      const key = e.key.toLowerCase();

      if (key === 'k') {
        e.preventDefault();
        handleGoToSales();
      } else if (key === 'b') {
        e.preventDefault();
        handleGoToDashboard();
      } else if (key === 'm') {
        e.preventDefault();
        handleGoToIncomeStatement();
      } else if (key === 'a') {
        e.preventDefault();
        handleGoToAuditLogs();
      } else if (key === 'q') {
        e.preventDefault();
        handleGoToQuotations();
      } else if (key === 'd') {
        e.preventDefault();
        handleGoToDemands();
      } else if (key === 'p') {
        e.preventDefault();
        handleGoToPurchases();
      } else if (key === 'o') {
        e.preventDefault();
        handleGoToPurchaseOrders();
      } else if (key === 'r') {
        e.preventDefault();
        handleGoToReturns();
      } else if (key === 'u') {
        e.preventDefault();
        handleGoToCustomers();
      } else if (key === 'v') {
        e.preventDefault();
        handleGoToVendors();
      } else if (key === 'i') {
        e.preventDefault();
        handleGoToInventory();
      } else if (key === 'f') {
        e.preventDefault();
        if (currentView !== 'inventory') {
          setCurrentView('inventory');
        }
        setTimeout(() => {
          if (primarySearchInputRef.current) {
            primarySearchInputRef.current.focus();
            primarySearchInputRef.current.select();
            primarySearchInputRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 50);
        showToast('Primary Search', 'Ctrl + F');
      } else if (key === 'e') {
        e.preventDefault();
        if (currentView !== 'inventory') {
          setCurrentView('inventory');
        }
        setTimeout(() => {
          if (dimensionSearchInputRef.current) {
            dimensionSearchInputRef.current.focus();
            dimensionSearchInputRef.current.select();
            dimensionSearchInputRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 50);
        showToast('Size Search', 'Ctrl + E');
      }
    };

    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => {
      window.removeEventListener('keydown', handleKeyDown, { capture: true });
    };
  }, [currentView, customers]);

  // Synchronize state changes to localStorage
  useEffect(() => {
    saveStoredProducts(products);
  }, [products]);

  useEffect(() => {
    saveStoredCustomers(customers);
  }, [customers]);

  useEffect(() => {
    saveStoredSales(sales);
  }, [sales]);

  useEffect(() => {
    saveStoredCustomerLedger(customerLedger);
  }, [customerLedger]);

  useEffect(() => {
    saveStoredCustomerReturns(customerReturns);
  }, [customerReturns]);

  useEffect(() => {
    saveStoredPurchases(purchases);
  }, [purchases]);

  useEffect(() => {
    saveStoredVendors(vendors);
  }, [vendors]);

  useEffect(() => {
    saveStoredVendorLedgerEntries(ledgerEntries);
  }, [ledgerEntries]);

  useEffect(() => {
    saveStoredVendorReturns(vendorReturns);
  }, [vendorReturns]);

  useEffect(() => {
    saveStoredQuotations(quotations);
  }, [quotations]);

  useEffect(() => {
    saveStoredPurchaseOrders(purchaseOrders);
  }, [purchaseOrders]);

  useEffect(() => {
    saveStoredDemands(demands);
  }, [demands]);

  useEffect(() => {
    saveStoredExpenses(expenses);
  }, [expenses]);

  useEffect(() => {
    saveStoredBrands(brands);
  }, [brands]);

  useEffect(() => {
    saveStoredTypes(types);
  }, [types]);

  useEffect(() => {
    saveStoredLocations(locations);
  }, [locations]);

  useEffect(() => {
    saveStoredPricingSettings(pricingSettings);
  }, [pricingSettings]);

  useEffect(() => {
    saveStoredSupabaseConfig(supabaseConfig);
  }, [supabaseConfig]);

  useEffect(() => {
    saveAuthState(authState);
  }, [authState]);

  useEffect(() => {
    saveStoredEmployees(employees);
  }, [employees]);

  useEffect(() => {
    saveStoredActiveEmployeeId(activeEmployeeId);
  }, [activeEmployeeId]);

  // Tab Permission Enforcement: If switching to restricted user, ensure they are on an allowed tab
  useEffect(() => {
    if (currentEmployee && currentEmployee.role !== 'admin') {
      if (!isTabAllowed(currentEmployee, currentView)) {
        const allowedFallback = (currentEmployee.permissions.allowedTabs[0] || 'sales') as AppWorkspaceView;
        setCurrentView(allowedFallback);
      }
    }
  }, [currentEmployee, currentView]);


  const handleImportFullBackup = (data: any) => {
    if (data.products && Array.isArray(data.products)) {
      saveStoredProducts(data.products);
      setProducts(data.products);
    }
    if (data.brands && Array.isArray(data.brands)) {
      saveStoredBrands(data.brands);
      setBrands(data.brands);
    }
    if (data.types && Array.isArray(data.types)) {
      saveStoredTypes(data.types);
      setTypes(data.types);
    }
    if (data.locations && Array.isArray(data.locations)) {
      saveStoredLocations(data.locations);
      setLocations(data.locations);
    }
    if (data.customers && Array.isArray(data.customers)) {
      saveStoredCustomers(data.customers);
      setCustomers(data.customers);
    }
    if (data.customerLedger && Array.isArray(data.customerLedger)) {
      saveStoredCustomerLedger(data.customerLedger);
      setCustomerLedger(data.customerLedger);
    }
    if (data.sales && Array.isArray(data.sales)) {
      saveStoredSales(data.sales);
      setSales(data.sales);
    }
    if (data.customerReturns && Array.isArray(data.customerReturns)) {
      saveStoredCustomerReturns(data.customerReturns);
      setCustomerReturns(data.customerReturns);
    }
    if (data.vendors && Array.isArray(data.vendors)) {
      saveStoredVendors(data.vendors);
      setVendors(data.vendors);
    }
    if (data.vendorLedger && Array.isArray(data.vendorLedger)) {
      saveStoredVendorLedgerEntries(data.vendorLedger);
      setLedgerEntries(data.vendorLedger);
    }
    if (data.vendorReturns && Array.isArray(data.vendorReturns)) {
      saveStoredVendorReturns(data.vendorReturns);
      setVendorReturns(data.vendorReturns);
    }
    if (data.purchases && Array.isArray(data.purchases)) {
      saveStoredPurchases(data.purchases);
      setPurchases(data.purchases);
    }
    if (data.purchaseOrders && Array.isArray(data.purchaseOrders)) {
      saveStoredPurchaseOrders(data.purchaseOrders);
      setPurchaseOrders(data.purchaseOrders);
    }
    if (data.quotations && Array.isArray(data.quotations)) {
      saveStoredQuotations(data.quotations);
      setQuotations(data.quotations);
    }
    if (data.demands && Array.isArray(data.demands)) {
      saveStoredDemands(data.demands);
      setDemands(data.demands);
    }
    if (data.expenses && Array.isArray(data.expenses)) {
      saveStoredExpenses(data.expenses);
      setExpenses(data.expenses);
    }
    if (data.employees && Array.isArray(data.employees)) {
      saveStoredEmployees(data.employees);
      setEmployees(data.employees);
    }
    if (data.stockLogs && Array.isArray(data.stockLogs)) {
      saveStoredStockLogs(data.stockLogs);
      setStockLogs(data.stockLogs);
    }
    if (data.pricingSettings) {
      saveStoredPricingSettings(data.pricingSettings);
      setPricingSettings(data.pricingSettings);
    }
  };

  const hasInitialPulled = useRef(false);

  // Initial pull from cloud on mount
  useEffect(() => {
    if (!hasInitialPulled.current && supabaseConfig.enabled && supabaseConfig.url && supabaseConfig.anonKey) {
      hasInitialPulled.current = true;
      const client = getSupabaseClient(supabaseConfig);
      if (client) {
        fetchAllFromSupabase(client).then(res => {
          if (res.success && res.data) {
            handleImportFullBackup(res.data);
          }
        });
      }
    }
  }, [supabaseConfig.enabled, supabaseConfig.url, supabaseConfig.anonKey]);

  // Background cloud sync with debounce if Supabase is enabled
  const prevSyncState = useRef<any>({});

  useEffect(() => {
    if (!supabaseConfig.enabled || !supabaseConfig.url || !supabaseConfig.anonKey) {
      return;
    }

    const currentDevices = getStoredRegisteredDevices();

    const currentBundle: any = {
      products, brands, types, locations, customers, customerLedger, sales,
      customerReturns, vendors, vendorLedger: ledgerEntries, vendorReturns, purchases, purchaseOrders,
      quotations, demands, expenses, employees, registeredDevices: currentDevices, stockLogs, pricingSettings
    };

    const changedBundle: any = {};
    let hasChanges = false;

    for (const key in currentBundle) {
      if (key === 'registeredDevices') {
        if (JSON.stringify(currentBundle[key]) !== JSON.stringify(prevSyncState.current[key])) {
          changedBundle[key] = currentBundle[key];
          hasChanges = true;
        }
      } else {
        if (currentBundle[key] !== prevSyncState.current[key]) {
          changedBundle[key] = currentBundle[key];
          hasChanges = true;
        }
      }
    }

    if (!hasChanges) {
      return;
    }

    const timer = setTimeout(() => {
      const client = getSupabaseClient(supabaseConfig);
      if (client) {
        syncAllModulesToSupabase(client, changedBundle).then((res) => {
          if (res.success) {
            for (const key in changedBundle) {
              prevSyncState.current[key] = changedBundle[key];
            }
            setSupabaseConfig(prev => ({
              ...prev,
              lastSyncedAt: new Date().toISOString(),
              syncStatus: 'connected',
            }));
          }
        });
      }
    }, 5000);

    return () => clearTimeout(timer);
  }, [
    products, brands, types, locations, customers, customerLedger, sales,
    customerReturns, vendors, ledgerEntries, vendorReturns, purchases, purchaseOrders,
    quotations, demands, expenses, employees, stockLogs, pricingSettings,
    supabaseConfig.enabled, supabaseConfig.url, supabaseConfig.anonKey
  ]);

  // Filtered and Sorted Products
  
  const filteredProducts = useMemo(() => {
    return filterAndSortProducts(products, {
      primarySearch,
      dimensionQuery,
      brandFilter,
      typeFilter,
      locationFilter,
      cabinFilter,
      stockStatus: stockStatusFilter,
      sortBy,
    });
  }, [products, primarySearch, dimensionQuery, brandFilter, typeFilter, locationFilter, cabinFilter, stockStatusFilter, sortBy]);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 24;

  const paginatedProducts = useMemo(() => {
    return filteredProducts.slice(0, currentPage * itemsPerPage);
  }, [filteredProducts, currentPage]);

  const hasMoreProducts = paginatedProducts.length < filteredProducts.length;

  // Reset pagination when search/filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [primarySearch, dimensionQuery, brandFilter, typeFilter, locationFilter, cabinFilter, stockStatusFilter, sortBy]);


  // Statistics calculation
  const totalValuation = useMemo(() => {
    return products.reduce((acc, p) => acc + (p.costPrice || 0) * (p.stockQuantity || 0), 0);
  }, [products]);

  const totalStockUnits = useMemo(() => {
    return products.reduce((acc, p) => acc + (p.stockQuantity || 0), 0);
  }, [products]);

  const lowStockCount = useMemo(() => {
    return products.filter(p => {
      const stock = typeof p.stockQuantity === 'number' && !isNaN(p.stockQuantity) ? p.stockQuantity : 0;
      const minAlert = typeof p.minStockAlert === 'number' && !isNaN(p.minStockAlert) ? p.minStockAlert : 5;
      return stock <= minAlert;
    }).length;
  }, [products]);

  // Handlers for Product Management
  const handleOpenAddProduct = useCallback(() => {
    if (!isOnline) { showToast('Offline Mode (Read-Only)', 'Cannot perform write/edit actions while offline.', ); return; }
    setEditingProduct(null);
    setShowProductModal(true);
  }, [isOnline]);

  const handleEditProduct = useCallback((prod: Product) => {
    if (!isOnline) { showToast('Offline Mode (Read-Only)', 'Cannot perform write/edit actions while offline.', ); return; }
    setEditingProduct(prod);
    setShowProductModal(true);
  }, [isOnline]);

  const handleSaveProduct = (data: Partial<Product>) => {
    if (!isOnline) { showToast('Offline Mode (Read-Only)', 'Cannot perform write/edit actions while offline.', ); return; }
    if (editingProduct) {
      // Update existing
      const updated = products.map(p => {
        if (p.id === editingProduct.id) {
          return {
            ...p,
            ...data,
            updatedAt: new Date().toISOString(),
          } as Product;
        }
        return p;
      });
      setProducts(updated);
    } else {
      // Create new
      const newProduct: Product = {
        id: `prod-${Date.now()}`,
        internalId: data.internalId || getNextInternalId(products),
        name: data.name || 'New Item',
        image: data.image,
        typeId: data.typeId || types[0]?.id || 't-1',
        typeName: data.typeName || types[0]?.name || 'General Part',
        brandId: data.brandId || brands[0]?.id || 'b-1',
        brandName: data.brandName || brands[0]?.name || 'Standard',
        locationId: data.locationId || locations[0]?.id || 'loc-1',
        locationName: data.locationName || locations[0]?.name || 'Main Shop',
        cabinNumber: data.cabinNumber || 'C-01',
        stockQuantity: data.stockQuantity || 0,
        minStockAlert: data.minStockAlert || 5,
        unit: data.unit || 'Pcs',
        costPrice: data.costPrice || 0,
        sellingPrices: data.sellingPrices || generateProductSellingPrices(data.costPrice || 0, pricingSettings),
        dimensions: data.dimensions,
        dimensionLabels: data.dimensionLabels,
        machineNames: data.machineNames,
        crossReferences: data.crossReferences,
        notes: data.notes,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setProducts([newProduct, ...products]);
    }
  };

  const handleDeleteProduct = useCallback((id: string) => {
    if (!isOnline) { showToast('Offline Mode (Read-Only)', 'Cannot perform write/edit actions while offline.', ); return; }
    if (window.confirm('Are you sure you want to delete this product from inventory?')) {
      setProducts(prev => prev.filter(p => p.id !== id));
    }
  }, [isOnline]);

  const handleDuplicateProduct = useCallback((prod: Product) => {
    setProducts(prev => {
      const nextId = getNextInternalId(prev);
      const duplicated: Product = {
        ...prod,
        id: `prod-${Date.now()}`,
        internalId: nextId,
        name: `${prod.name} (Copy)`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      return [duplicated, ...prev];
    });
  }, []);

  const handleQuickUpdateCost = useCallback((productId: string, newCost: number) => {
    setProducts(prev => prev.map(p => {
      if (p.id === productId) {
        const nextPrices = generateProductSellingPrices(newCost, pricingSettings, p.sellingPrices);
        return {
          ...p,
          costPrice: newCost,
          sellingPrices: nextPrices,
          updatedAt: new Date().toISOString(),
        };
      }
      return p;
    }));
  }, [pricingSettings]);

  // Stock Adjustment Handler
  const handleOpenStockAdjust = useCallback((prod: Product) => {
    if (!isOnline) { showToast('Offline Mode (Read-Only)', 'Cannot perform write/edit actions while offline.', ); return; }
    setProductForStock(prod);
    setShowStockModal(true);
  }, [isOnline]);

  const handleSaveStock = (productId: string, newStock: number, log: StockLog) => {
    if (!isOnline) { showToast('Offline Mode (Read-Only)', 'Cannot perform write/edit actions while offline.', ); return; }
    saveStockLog(log);
    setStockLogs(getStoredStockLogs());
    const updated = products.map(p => {
      if (p.id === productId) {
        return {
          ...p,
          stockQuantity: newStock,
          updatedAt: new Date().toISOString(),
        };
      }
      return p;
    });
    setProducts(updated);
  };

  // Label Printing Handler
  const handleOpenLabelPrint = useCallback((prod: Product) => {
    setProductForLabel(prod);
    setShowLabelModal(true);
  }, []);

  // Product History Handler
  const handleOpenProductHistory = useCallback((prod: Product) => {
    setProductForHistory(prod);
    setShowProductHistoryModal(true);
  }, []);

  // Pricing Formulas Save & Recalculate
  const handleSavePricingSettings = (newSettings: GlobalPricingSettings, recalculateAll: boolean) => {
    if (!isOnline) { showToast('Offline Mode (Read-Only)', 'Cannot perform write/edit actions while offline.', ); return; }
    setPricingSettings(newSettings);
    if (recalculateAll) {
      const updated = products.map(p => ({
        ...p,
        sellingPrices: generateProductSellingPrices(p.costPrice, newSettings),
        updatedAt: new Date().toISOString(),
      }));
      setProducts(updated);
    }
  };

  // Bulk Import Handler
  const handleImportSuccess = (importedProducts: Product[], mode: 'append' | 'overwrite', newBrands?: Brand[], newTypes?: ProductType[], newLocations?: LocationItem[]) => {
    if (newBrands) setBrands(newBrands);
    if (newTypes) setTypes(newTypes);
    if (newLocations) setLocations(newLocations);
    
    if (mode === 'append') {
      setProducts([...importedProducts, ...products]);
    } else {
      // Overwrite matching internal IDs or append new
      const existingMap = new Map(products.map(p => [p.internalId.toLowerCase(), p]));
      importedProducts.forEach(imp => {
        existingMap.set(imp.internalId.toLowerCase(), imp);
      });
      setProducts(Array.from(existingMap.values()));
    }
  };

  // Inline Category Helpers
  const handleAddNewBrand = (name: string): Brand => {
    const newB: Brand = { id: `b-${Date.now()}`, name };
    setBrands(prev => [...prev, newB]);
    return newB;
  };

  const handleAddNewType = (name: string): ProductType => {
    const newT: ProductType = { id: `t-${Date.now()}`, name };
    setTypes(prev => [...prev, newT]);
    return newT;
  };

  const handleAddNewLocation = (name: string, cabin: string): LocationItem => {
    const newL: LocationItem = { id: `loc-${Date.now()}`, name, cabins: [cabin || 'C-01'] };
    setLocations(prev => [...prev, newL]);
    return newL;
  };

  // Active Cabins for Location Filter
  const activeLocationObj = locations.find(l => l.id === locationFilter || l.name === locationFilter);
  const availableCabins = activeLocationObj ? activeLocationObj.cabins : [];

  const nextInternalId = getNextInternalId(products);

  const handleExportFullBackup = () => {
    const backupData = {
      products, brands, types, locations, customers, customerLedger, sales,
      customerReturns, vendors, vendorLedger: ledgerEntries, vendorReturns, purchases, purchaseOrders,
      quotations, demands, expenses, employees, registeredDevices: getStoredRegisteredDevices(), stockLogs, pricingSettings
    };
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupData, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "inventory_full_backup_" + new Date().toISOString() + ".json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
    showToast('Backup Exported', 'JSON File Saved');
  };

  const handleWipeData = (downloadBackup: boolean) => {
    if (downloadBackup) {
      handleExportFullBackup();
    }
    
    setProducts([]);
    setBrands([]);
    setTypes([]);
    setLocations([]);
    setSales([]);
    setCustomers([]);
    setCustomerLedger([]);
    setCustomerReturns([]);
    setVendors([]);
    setLedgerEntries([]);
    setVendorReturns([]);
    setPurchases([]);
    setPurchaseOrders([]);
    setQuotations([]);
    setDemands([]);
    setExpenses([]);
    setStockLogs([]);
    
    setShowWipeDataModal(false);
    showToast('Factory Reset', 'All Data Erased');
  };

  

  return (
    <div className="min-h-screen bg-slate-100/70 flex flex-col font-sans text-slate-900 selection:bg-red-500 selection:text-white">
      {/* Top Main Navbar */}
      <Navbar
        onOpenAddProduct={handleOpenAddProduct}
        onOpenNewSale={() => handleOpenNewSale()}
        onOpenPricingFormulas={() => setShowPricingModal(true)}
        onOpenSupabaseConfig={() => setShowSupabaseModal(true)}
        onOpenCategories={() => setShowCategoriesModal(true)}
        onOpenBulkImport={() => setShowImportModal(true)}
        onExportExcel={() => exportProductsToExcel(filteredProducts)}
        onExportCSV={() => exportProductsToCSV(filteredProducts)}
        onLockApp={() => {
          setAuthState(prev => ({ ...prev, isLocked: true }));
          try {
            sessionStorage.removeItem('kfh_dismissed_low_stock_banner');
          } catch {}
        }}
        onOpenSecuritySettings={() => setShowSecurityModal(true)}
        onOpenWipeData={() => setShowWipeDataModal(true)}
        onOpenStaffManagement={() => setShowStaffModal(true)}
        onOpenSwitchUser={() => setShowSwitchUserModal(true)}
        currentEmployee={currentEmployee}
        onGoToInventory={handleGoToInventory}
        currentView={currentView}
        onChangeView={setCurrentView}
        supabaseConfig={supabaseConfig}
        authState={authState}
        deviceInfo={deviceInfo}
        pricingSettings={pricingSettings}
        totalProductsCount={products.length}
        totalSalesCount={sales.length}
        totalPurchasesCount={purchases.length}
        totalPurchaseOrdersCount={purchaseOrders.length}
        pendingPurchaseOrdersCount={purchaseOrders.filter(p => p.status === 'pending_bill').length}
        totalVendorsCount={vendors.length}
        totalCustomersCount={customers.length}
        totalReturnsCount={customerReturns.length + vendorReturns.length}
        totalQuotationsCount={quotations.length}
        totalDemandsCount={demands.length}
        pendingDemandsCount={demands.filter(d => d.status === 'pending').length}
        totalAuditLogsCount={stockLogs.length}
        lowStockCount={lowStockCount}
        showLowStockBanner={showLowStockBanner}
        onToggleLowStockBanner={() => setShowLowStockBanner(prev => !prev)}
      />

      {/* Main Content Dashboard */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-4 sm:space-y-6">
        {/* In-App Visual Notification Banner (Alerts upon login when products with low stock) */}
        {showLowStockBanner && lowStockCount > 0 && (
          <LowStockNotificationBanner
            products={products}
            onViewLowStockInventory={handleViewLowStockInventory}
            onOpenPurchaseOrders={() => {
              setCurrentView('purchase_orders');
              showToast('Purchase Orders & Cargo', 'Ctrl + O');
            }}
            onDismiss={handleDismissLowStockBanner}
          />
        )}

        {currentView === 'dashboard' ? (
          <DashboardPage
            products={products}
            sales={sales}
            purchases={purchases}
            purchaseOrders={purchaseOrders}
            customers={customers}
            vendors={vendors}
            customerReturns={customerReturns}
            vendorReturns={vendorReturns}
            demands={demands}
            customerLedger={customerLedger}
            vendorLedger={ledgerEntries}
            expenses={expenses}
            onOpenNewSale={() => handleOpenNewSale()}
            onOpenNewPurchase={(vendorId) => handleOpenPurchaseModal(vendorId)}
            onOpenCreatePO={() => handleOpenCreatePO()}
            onOpenCreateDemand={handleOpenCreateDemand}
            onOpenAddProduct={handleOpenAddProduct}
            onGoToView={(view) => setCurrentView(view)}
            onViewInvoice={handleViewInvoice}
            onViewPurchase={(purchase) => {
              setActivePurchaseForInvoice(purchase);
              setShowPurchaseInvoiceModal(true);
            }}
            onViewCustomerReturn={(ret) => handleViewReturnVoucher(ret, 'customer')}
            onViewVendorReturn={(ret) => handleViewReturnVoucher(ret, 'vendor')}
            onSelectCustomer={() => {
              setCurrentView('customers');
            }}
          />
        ) : currentView === 'income_statement' ? (
          <IncomeStatementPage
            sales={sales}
            purchases={purchases}
            customerReturns={customerReturns}
            vendorReturns={vendorReturns}
            products={products}
            expenses={expenses}
            onSaveExpense={handleSaveExpense}
            onDeleteExpense={handleDeleteExpense}
            onGoToView={(view) => setCurrentView(view)}
            onViewInvoice={handleViewInvoice}
            onViewPurchase={(purchase) => {
              setActivePurchaseForInvoice(purchase);
              setShowPurchaseInvoiceModal(true);
            }}
          />
        ) : currentView === 'sales' ? (
          <SalesPage
            sales={sales}
            products={products}
            customers={customers}
            customerReturns={customerReturns}
            onOpenNewSale={() => handleOpenNewSale()}
            onViewInvoice={handleViewInvoice}
            onEditSale={handleEditSale}
            onOpenCustomerReturn={(sale) => handleOpenCustomerReturnModal(sale)}
          />
        ) : currentView === 'inventory_audit' ? (
          <InventoryAuditLog
            logs={stockLogs}
            products={products}
            onRefresh={() => setStockLogs(getStoredStockLogs())}
            onOpenAdjustModal={(product) => handleOpenStockAdjust(product)}
          />
        ) : currentView === 'demands' ? (
          <DemandsPage
            demands={demands}
            products={products}
            customers={customers}
            sales={sales}
            onOpenAddDemand={handleOpenCreateDemand}
            onEditDemand={handleOpenEditDemand}
            onFulfillWithSale={handleFulfillDemand}
            onDeleteDemand={handleDeleteDemand}
            onUpdateDemandStatus={handleUpdateDemandStatus}
            onViewInvoice={(sale) => {
              setActiveSaleForInvoice(sale);
              setShowInvoiceModal(true);
            }}
          />
        ) : currentView === 'purchases' ? (
          <PurchasesPage
            purchases={purchases}
            vendors={vendors}
            products={products}
            onOpenNewPurchase={(vendorId) => handleOpenPurchaseModal(vendorId)}
            onViewPurchase={(purchase) => {
              setActivePurchaseForInvoice(purchase);
              setShowPurchaseInvoiceModal(true);
            }}
            onEditPurchase={(purchase) => {
              handleOpenPurchaseModal(purchase.vendorId, purchase);
            }}
            onDeletePurchase={handleDeletePurchase}
            onGoToPurchaseOrders={() => {
              setCurrentView('purchase_orders');
              showToast('Purchase Orders & Cargo', 'Ctrl + O');
            }}
            onSelectVendor={(v) => {
              setSelectedVendorForDetails(v);
              setCurrentView('vendors');
            }}
          />
        ) : currentView === 'purchase_orders' ? (
          <PurchaseOrdersPage
            purchaseOrders={purchaseOrders}
            vendors={vendors}
            products={products}
            purchases={purchases}
            onOpenCreatePO={handleOpenCreatePO}
            onOpenEditPO={handleOpenEditPO}
            onOpenReceiveCargo={handleOpenReceiveCargo}
            onViewPO={handleViewPO}
            onDeletePO={handleDeletePO}
            onSelectVendor={(v) => {
              setSelectedVendorForDetails(v);
              setCurrentView('vendors');
            }}
          />
        ) : currentView === 'returns' ? (
          <ReturnsPage
            customerReturns={customerReturns}
            vendorReturns={vendorReturns}
            products={products}
            customers={customers}
            vendors={vendors}
            sales={sales}
            purchases={purchases}
            onOpenCustomerReturnModal={handleOpenCustomerReturnModal}
            onOpenVendorReturnModal={handleOpenVendorReturnModal}
            onViewVoucher={handleViewReturnVoucher}
            onDeleteCustomerReturn={handleDeleteCustomerReturn}
            onDeleteVendorReturn={handleDeleteVendorReturn}
          />
        ) : currentView === 'quotations' ? (
          <QuotationsPage
            quotations={quotations}
            products={products}
            customers={customers}
            onOpenCreateQuotation={handleOpenCreateQuotation}
            onViewQuotation={handleViewQuotation}
            onEditQuotation={handleEditQuotation}
            onDeleteQuotation={handleDeleteQuotation}
            onConvertToSale={handleConvertToSaleFromQuotation}
            onRenewValidity={handleRenewQuotationValidity}
          />
        ) : currentView === 'customers' ? (
          <CustomersPage
            customers={customers}
            products={products}
            sales={sales}
            customerLedger={customerLedger}
            onOpenNewSale={(cId, items) => handleOpenNewSale(cId, items)}
            onUpdateCustomers={setCustomers}
            onUpdateLedger={setCustomerLedger}
            onUpdateProducts={setProducts}
            onViewInvoice={handleViewInvoice}
            onEditSale={handleEditSale}
          />
        ) : currentView === 'vendors' ? (
          selectedVendorForDetails ? (
            <VendorDetailsPage
              vendor={selectedVendorForDetails}
              vendors={vendors}
              purchases={purchases}
              sales={sales}
              ledgerEntries={ledgerEntries}
              products={products}
              purchaseOrders={purchaseOrders}
              onBack={handleBackFromVendorDetails}
              onOpenCashModal={handleOpenCashModal}
              onOpenPurchaseModal={handleOpenPurchaseModal}
              onOpenCreatePO={handleOpenCreatePO}
              onOpenReceivePO={handleOpenReceiveCargo}
              onViewPO={handleViewPO}
              onOpenConfigureLinksModal={handleOpenConfigureLinksModal}
              onOpenEditVendorModal={handleOpenEditVendorModal}
              onEditSale={handleEditSale}
              onDeleteLedgerEntry={handleDeleteLedgerEntry}
              onDeletePurchase={handleDeletePurchase}
              onViewInvoice={handleViewInvoice}
              onViewPurchase={(purchase) => {
                setActivePurchaseForInvoice(purchase);
                setShowPurchaseInvoiceModal(true);
              }}
            />
          ) : (
            <VendorsPage
              vendors={vendors}
              purchases={purchases}
              sales={sales}
              ledgerEntries={ledgerEntries}
              products={products}
              onSelectVendor={handleSelectVendor}
              onOpenAddVendorModal={handleOpenAddVendorModal}
              onOpenEditVendorModal={handleOpenEditVendorModal}
              onOpenCashModal={handleOpenCashModal}
              onOpenConfigureLinksModal={handleOpenConfigureLinksModal}
              onDeleteVendor={handleDeleteVendor}
            />
          )
        ) : (
          <>
            {/* KPI Stats Bar */}
            <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3.5">
              {/* Stat 1: Total Valuation in PKR */}
              <div className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between min-w-0">
                <div className="min-w-0">
                  <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider block truncate">
                    Total Valuation
                  </span>
                  <span className="text-lg sm:text-2xl font-black text-slate-900 tracking-tight block truncate">
                    {formatPKRShort(totalValuation)}
                  </span>
                  <span className="text-[9px] sm:text-[10px] text-slate-400 font-mono block truncate">
                    {formatPKR(totalValuation)}
                  </span>
                </div>
                <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-red-50 text-red-600 flex items-center justify-center font-bold text-base sm:text-lg border border-red-100 shrink-0 ml-1">
                  ₨
                </div>
              </div>

              {/* Stat 2: Total Items */}
              <div 
                onClick={handleGoToInventory}
                className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between cursor-pointer hover:border-red-300 transition-colors group min-w-0"
                title="Click to view Inventory (Ctrl + I)"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider block truncate">
                      Inventory
                    </span>
                    <kbd className="hidden sm:inline-flex text-[9px] font-mono font-bold bg-slate-100 text-slate-500 px-1 py-0.2 rounded border border-slate-200">
                      Ctrl+I
                    </kbd>
                  </div>
                  <span className="text-lg sm:text-2xl font-black text-slate-900 tracking-tight group-hover:text-red-600 transition-colors block truncate">
                    {products.length} Items
                  </span>
                  <span className="text-[9px] sm:text-[10px] text-slate-500 font-medium block truncate">
                    {totalStockUnits.toLocaleString('en-PK')} Units
                  </span>
                </div>
                <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center border border-slate-200 shrink-0 group-hover:bg-red-50 group-hover:text-red-600 group-hover:border-red-200 transition-colors ml-1">
                  <Box className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
              </div>


          {/* Stat 3: Low Stock Alerts */}
          <div
            onClick={() => setStockStatusFilter(stockStatusFilter === 'low_stock' ? 'all' : 'low_stock')}
            className={`p-3 sm:p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between shadow-2xs min-w-0 ${
              lowStockCount > 0
                ? 'bg-amber-50/70 border-amber-200 hover:bg-amber-50 text-amber-950'
                : 'bg-white border-slate-200 hover:border-slate-300'
            }`}
            title="Click to filter low stock items"
          >
            <div className="min-w-0">
              <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider block truncate">
                Low Stock
              </span>
              <span className="text-lg sm:text-2xl font-black text-amber-700 tracking-tight block truncate">
                {lowStockCount} Parts
              </span>
              <span className="text-[9px] sm:text-[10px] text-amber-800 font-semibold block truncate">
                {stockStatusFilter === 'low_stock' ? 'Filter Active' : 'Needs Reorder'}
              </span>
            </div>
            <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center border border-amber-200 shrink-0 ml-1">
              <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>

          {/* Stat 4: Brands & Storage Cabins */}
          <div className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between min-w-0">
            <div className="min-w-0">
              <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider block truncate">
                Brands & Locs
              </span>
              <span className="text-lg sm:text-2xl font-black text-slate-900 tracking-tight block truncate">
                {brands.length} Brands
              </span>
              <span className="text-[9px] sm:text-[10px] text-slate-500 font-medium block truncate">
                {locations.length} Locations
              </span>
            </div>
            <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-red-50 text-red-600 flex items-center justify-center border border-red-100 shrink-0 ml-1">
              <MapPin className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>
        </section>

        {/* SEARCH & FILTERS CONTAINER */}
        <section className="bg-white rounded-3xl p-3.5 sm:p-5 border border-slate-200 shadow-xs space-y-3 sm:space-y-4">
          {/* PRIMARY SEARCH BAR (Ctrl + F) */}
          <div className="relative group">
            <div className="absolute left-3.5 sm:left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-red-600 transition-colors pointer-events-none">
              <Search className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <input
              ref={primarySearchInputRef}
              type="text"
              value={primarySearch}
              onChange={(e) => setPrimarySearch(e.target.value)}
              placeholder="Search Part Name, ID, Machine (CAT, Komatsu), Size, Thread..."
              className="w-full pl-10 sm:pl-12 pr-20 sm:pr-28 py-2.5 sm:py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm font-bold text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-red-500/20 focus:border-red-600 transition-all shadow-2xs"
            />
            <div className="absolute right-2.5 sm:right-3.5 top-1/2 -translate-y-1/2 flex items-center gap-1 sm:gap-1.5">
              {primarySearch && (
                <button
                  type="button"
                  onClick={() => setPrimarySearch('')}
                  className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100"
                  title="Clear search"
                >
                  <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>
              )}
              <kbd 
                className="hidden sm:inline-flex items-center px-2 py-0.5 text-[10px] font-mono font-bold bg-slate-200/80 text-slate-600 border border-slate-300 rounded-md shadow-2xs select-none"
                title="Keyboard shortcut: Ctrl + F"
              >
                Ctrl+F
              </kbd>
            </div>
          </div>

          {/* SECONDARY SIZE SEARCH BAR (Ctrl + E) */}
          <DimensionSearchBar
            inputRef={dimensionSearchInputRef}
            onDimensionQueryChange={setDimensionQuery}
            currentUnit={dimensionSearchUnit}
            onUnitChange={setDimensionSearchUnit}
          />

          {/* Quick Shortcuts Bar */}
          <div className="hidden sm:flex flex-wrap items-center justify-between gap-2 px-3 py-1.5 bg-slate-50/80 border border-slate-200/70 rounded-xl text-[11px] text-slate-600">
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1 font-bold text-slate-500">
                <Keyboard className="w-3.5 h-3.5 text-red-600" /> Shortcuts:
              </span>
              <button
                type="button"
                onClick={() => {
                  primarySearchInputRef.current?.focus();
                  primarySearchInputRef.current?.select();
                  showToast('Primary Search', 'Ctrl + F');
                }}
                className="inline-flex items-center gap-1 px-2 py-0.5 bg-white hover:bg-red-50 text-slate-700 hover:text-red-700 rounded-md border border-slate-200 transition-colors font-medium cursor-pointer"
              >
                <kbd className="font-mono font-bold text-red-700">Ctrl+F</kbd> Search Parts
              </button>
              <button
                type="button"
                onClick={() => {
                  dimensionSearchInputRef.current?.focus();
                  dimensionSearchInputRef.current?.select();
                  showToast('Size Search', 'Ctrl + E');
                }}
                className="inline-flex items-center gap-1 px-2 py-0.5 bg-white hover:bg-red-50 text-slate-700 hover:text-red-700 rounded-md border border-slate-200 transition-colors font-medium cursor-pointer"
              >
                <kbd className="font-mono font-bold text-red-700">Ctrl+E</kbd> Search Sizes
              </button>
              <button
                type="button"
                onClick={handleGoToInventory}
                className="inline-flex items-center gap-1 px-2 py-0.5 bg-white hover:bg-red-50 text-slate-700 hover:text-red-700 rounded-md border border-slate-200 transition-colors font-medium cursor-pointer"
              >
                <kbd className="font-mono font-bold text-red-700">Ctrl+I</kbd> Inventory Tab
              </button>
            </div>
            <span className="text-[10px] text-slate-400 font-mono hidden md:inline">
              Windows/PC: Ctrl+Key • Mac: ⌘+Key
            </span>
          </div>

          {/* Quick Filters Row */}
          <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center justify-between gap-2.5 sm:gap-3 pt-2 border-t border-slate-100">
            {/* Filter Dropdowns */}
            <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2">
              {/* Brand Filter */}
              <select
                value={brandFilter}
                onChange={(e) => setBrandFilter(e.target.value)}
                className="w-full sm:w-auto px-2.5 sm:px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 focus:outline-hidden focus:border-red-500"
              >
                <option value="all">All Brands ({brands.length})</option>
                {brands.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>

              {/* Type Filter */}
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="w-full sm:w-auto px-2.5 sm:px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 focus:outline-hidden focus:border-red-500"
              >
                <option value="all">All Types ({types.length})</option>
                {types.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>

              {/* Location Filter */}
              <select
                value={locationFilter}
                onChange={(e) => {
                  setLocationFilter(e.target.value);
                  setCabinFilter('all');
                }}
                className="w-full sm:w-auto px-2.5 sm:px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 focus:outline-hidden focus:border-red-500"
              >
                <option value="all">All Locations ({locations.length})</option>
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>{loc.name}</option>
                ))}
              </select>

              {/* Cabin Filter (if location selected) */}
              {availableCabins.length > 0 && (
                <select
                  value={cabinFilter}
                  onChange={(e) => setCabinFilter(e.target.value)}
                  className="w-full sm:w-auto px-2.5 sm:px-3 py-1.5 bg-red-50 border border-red-200 rounded-xl text-xs font-mono font-bold text-red-900 focus:outline-hidden"
                >
                  <option value="all">All Cabins</option>
                  {availableCabins.map((cab) => (
                    <option key={cab} value={cab}>Cabin: {cab}</option>
                  ))}
                </select>
              )}
            </div>

            {/* Stock Health Quick Filter Chips */}
            <div className="flex items-center justify-between sm:justify-start gap-1 bg-slate-100 p-0.5 rounded-xl border border-slate-200 text-xs font-bold overflow-x-auto">
              <button
                type="button"
                onClick={() => setStockStatusFilter('all')}
                className={`flex-1 sm:flex-initial px-2 sm:px-2.5 py-1 rounded-lg transition-all text-center ${
                  stockStatusFilter === 'all' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500'
                }`}
              >
                All ({products.length})
              </button>
              <button
                type="button"
                onClick={() => setStockStatusFilter('in_stock')}
                className={`flex-1 sm:flex-initial px-2 sm:px-2.5 py-1 rounded-lg transition-all text-center ${
                  stockStatusFilter === 'in_stock' ? 'bg-emerald-600 text-white shadow-2xs' : 'text-slate-500'
                }`}
              >
                In Stock
              </button>
              <button
                type="button"
                onClick={() => setStockStatusFilter('low_stock')}
                className={`flex-1 sm:flex-initial px-2 sm:px-2.5 py-1 rounded-lg transition-all text-center ${
                  stockStatusFilter === 'low_stock' ? 'bg-amber-600 text-white shadow-2xs' : 'text-slate-500'
                }`}
              >
                Low ({lowStockCount})
              </button>
              <button
                type="button"
                onClick={() => setStockStatusFilter('out_of_stock')}
                className={`flex-1 sm:flex-initial px-2 sm:px-2.5 py-1 rounded-lg transition-all text-center ${
                  stockStatusFilter === 'out_of_stock' ? 'bg-rose-600 text-white shadow-2xs' : 'text-slate-500'
                }`}
              >
                Out
              </button>
            </div>

            {/* Sort By & View Mode Toggle */}
            <div className="flex items-center justify-between sm:justify-end gap-2 pt-1 sm:pt-0">
              <div className="flex items-center gap-1 text-xs font-bold text-slate-600 flex-1 sm:flex-initial">
                <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="w-full sm:w-auto px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800"
                >
                  <option value="recent">Recently Added</option>
                  <option value="name_asc">Name (A to Z)</option>
                  <option value="id_asc">ID (KFH-2501)</option>
                  <option value="price_low">Cost: Low to High</option>
                  <option value="price_high">Cost: High to Low</option>
                  <option value="stock_low">Stock: Low to High</option>
                  <option value="stock_high">Stock: High to Low</option>
                </select>
              </div>

              {/* Grid / Table View toggle */}
              <div className="flex bg-slate-100 p-0.5 rounded-xl border border-slate-200 shrink-0">
                <button
                  type="button"
                  onClick={() => setViewMode('grid')}
                  className={`p-1.5 rounded-lg transition-all ${
                    viewMode === 'grid' ? 'bg-white text-red-600 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                  }`}
                  title="Card Grid View"
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('table')}
                  className={`p-1.5 rounded-lg transition-all ${
                    viewMode === 'table' ? 'bg-white text-red-600 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                  }`}
                  title="Compact Table View"
                >
                  <TableIcon className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* INVENTORY SECTION CONTAINER (Ctrl + I Target) */}
        <section id="inventory-section" ref={inventorySectionRef} className="scroll-mt-24 space-y-4">
          {/* RESULTS HEADER & INVENTORY TAB BADGE */}
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-bold text-slate-500 px-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-red-100/90 text-red-800 rounded-lg text-xs font-black border border-red-200">
                <Box className="w-3.5 h-3.5 text-red-600" />
                Inventory List
              </span>
              <kbd 
                className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono font-bold bg-slate-200 text-slate-600 border border-slate-300 rounded shadow-2xs"
                title="Keyboard shortcut: Ctrl + I"
              >
                Ctrl+I
              </kbd>
              <span>
                Showing <strong className="text-slate-900">{filteredProducts.length}</strong> of{' '}
                <strong className="text-slate-900">{products.length}</strong> products
                {(primarySearch || dimensionQuery || brandFilter !== 'all' || typeFilter !== 'all' || stockStatusFilter !== 'all') && (
                  <span className="text-red-600 ml-1.5 font-semibold">(Filtered)</span>
                )}
              </span>
            </div>

            {(primarySearch || dimensionQuery || brandFilter !== 'all' || typeFilter !== 'all' || locationFilter !== 'all' || stockStatusFilter !== 'all') && (
              <button
                type="button"
                onClick={() => {
                  setPrimarySearch('');
                  setDimensionQuery(null);
                  setBrandFilter('all');
                  setTypeFilter('all');
                  setLocationFilter('all');
                  setCabinFilter('all');
                  setStockStatusFilter('all');
                }}
                className="text-xs font-bold text-red-600 hover:text-red-700 underline"
              >
                Reset All Filters
              </button>
            )}
          </div>

          {/* PRODUCT LISTING (GRID OR TABLE) */}
          {filteredProducts.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-xs space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-red-50 text-red-600 mx-auto flex items-center justify-center border border-red-100">
                <Box className="w-8 h-8" />
              </div>
              <div className="max-w-md mx-auto">
                <h3 className="text-lg font-bold text-slate-900">No matching products found</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Try searching for a different part number, clearing your dimension size query, or adding a new product.
                </p>
              </div>
              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setPrimarySearch('');
                    setDimensionQuery(null);
                    setBrandFilter('all');
                    setTypeFilter('all');
                    setStockStatusFilter('all');
                  }}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors"
                >
                  Clear Search & Filters
                </button>
                <button
                  type="button"
                  onClick={handleOpenAddProduct}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl shadow transition-colors flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" /> Add Product ({nextInternalId})
                </button>
              </div>
            </div>
                    ) : viewMode === 'grid' ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {paginatedProducts.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    pricingSettings={pricingSettings}
                    onEdit={handleEditProduct}
                    onDelete={handleDeleteProduct}
                    onDuplicate={handleDuplicateProduct}
                    onPrintLabel={handleOpenLabelPrint}
                    onAdjustStock={handleOpenStockAdjust}
                    onQuickUpdateCost={handleQuickUpdateCost}
                    onViewHistory={handleOpenProductHistory}
                  />
                ))}
              </div>
              
              {hasMoreProducts && (
                <div className="flex justify-center mt-6 mb-4">
                  <button
                    type="button"
                    onClick={() => setCurrentPage(p => p + 1)}
                    className="px-6 py-2.5 bg-white border border-slate-200 hover:border-red-300 hover:bg-red-50 text-slate-700 hover:text-red-700 font-bold rounded-xl shadow-sm transition-all"
                  >
                    Load More ({filteredProducts.length - paginatedProducts.length} remaining)
                  </button>
                </div>
              )}
            </>
          ) : (
            <>
              <ProductTable
                products={paginatedProducts}
                pricingSettings={pricingSettings}
                onEdit={handleEditProduct}
                onDelete={handleDeleteProduct}
                onDuplicate={handleDuplicateProduct}
                onPrintLabel={handleOpenLabelPrint}
                onAdjustStock={handleOpenStockAdjust}
                onQuickUpdateCost={handleQuickUpdateCost}
                onViewHistory={handleOpenProductHistory}
              />
              
              {hasMoreProducts && (
                <div className="flex justify-center mt-6 mb-4">
                  <button
                    type="button"
                    onClick={() => setCurrentPage(p => p + 1)}
                    className="px-6 py-2.5 bg-white border border-slate-200 hover:border-red-300 hover:bg-red-50 text-slate-700 hover:text-red-700 font-bold rounded-xl shadow-sm transition-all"
                  >
                    Load More ({filteredProducts.length - paginatedProducts.length} remaining)
                  </button>
                </div>
              )}
            </>
          )}

          
        </section>
        </>
        )}
      </main>

      {/* FOOTER */}
      <footer className="bg-white border-t border-slate-200 py-4 mt-auto text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-800">KFH Inventory & Sales Management</span>
            <span>•</span>
            <span>Pakistan PKR Edition (₨)</span>
            <span>•</span>
            <span className="font-mono text-red-600 font-bold">ID Base: KFH-2501</span>
          </div>

          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              <CheckCircle2 className="w-3 h-3" /> Offline Ready
            </span>
            <span>Device: {deviceInfo.os}</span>
          </div>
        </div>
      </footer>

      {/* ALL MODALS */}

      {/* 1. Add / Edit Product Modal */}
      <ProductFormModal
        isOpen={showProductModal}
        onClose={() => setShowProductModal(false)}
        productToEdit={editingProduct}
        onSave={handleSaveProduct}
        nextInternalId={nextInternalId}
        brands={brands}
        types={types}
        locations={locations}
        pricingSettings={pricingSettings}
        onAddNewBrand={handleAddNewBrand}
        onAddNewType={handleAddNewType}
        onAddNewLocation={handleAddNewLocation}
      />

      {/* 2. Global PKR Pricing Formulas Modal */}
      <PricingFormulaModal
        isOpen={showPricingModal}
        onClose={() => setShowPricingModal(false)}
        settings={pricingSettings}
        onSave={handleSavePricingSettings}
      />

      {/* 3. Bulk Import Modal (Excel & CSV) */}
      <BulkImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        existingProducts={products}
        brands={brands}
        types={types}
        locations={locations}
        pricingSettings={pricingSettings}
        onImportSuccess={handleImportSuccess}
      />

      {/* 4. Categories, Brands & Cabins Modal */}
      <CategoriesAndBrandsModal
        isOpen={showCategoriesModal}
        onClose={() => setShowCategoriesModal(false)}
        brands={brands}
        types={types}
        locations={locations}
        onUpdateBrands={setBrands}
        onUpdateTypes={setTypes}
        onUpdateLocations={setLocations}
      />

      {/* 5. Stock Adjust Modal */}
      <StockAdjustModal
        isOpen={showStockModal}
        onClose={() => setShowStockModal(false)}
        product={productForStock}
        onSaveStock={handleSaveStock}
      />

      {/* 6. Label Printing Modal */}
      <LabelPrintModal
        isOpen={showLabelModal}
        onClose={() => setShowLabelModal(false)}
        product={productForLabel}
      />

      {/* 7. Supabase Cloud Sync Modal */}
      <SupabaseConfigModal
        isOpen={showSupabaseModal}
        onClose={() => setShowSupabaseModal(false)}
        config={supabaseConfig}
        onSaveConfig={setSupabaseConfig}
        products={products}
        onImportBackup={setProducts}
        brands={brands}
        types={types}
        locations={locations}
        customers={customers}
        customerLedger={customerLedger}
        sales={sales}
        customerReturns={customerReturns}
        vendors={vendors}
        vendorLedger={ledgerEntries}
        vendorReturns={vendorReturns}
        purchases={purchases}
        purchaseOrders={purchaseOrders}
        quotations={quotations}
        demands={demands}
        expenses={expenses}
        employees={employees}
        registeredDevices={getStoredRegisteredDevices()}
        stockLogs={stockLogs}
        pricingSettings={pricingSettings}
        onImportFullBackup={handleImportFullBackup}
      />

      {/* 8. Auth & Lock Screen Modal */}

      <FactoryResetModal
        isOpen={showWipeDataModal}
        onClose={() => setShowWipeDataModal(false)}
        onConfirmWipe={handleWipeData}
      />
      <AuthModal
        isOpen={authState.isLocked || showSecurityModal}
        isLockScreenMode={authState.isLocked}
        onClose={() => setShowSecurityModal(false)}
        authState={authState}
        onAuthSuccess={() => {
          setAuthState(prev => ({ ...prev, isLocked: false, lastUnlockedAt: new Date().toISOString() }));
          setShowSecurityModal(false);
          try {
            sessionStorage.removeItem('kfh_dismissed_low_stock_banner');
          } catch {}
          setShowLowStockBanner(true);
        }}
        deviceInfo={deviceInfo}
        onUpdateAuthState={setAuthState}
      />

      {/* 9. POS / New Sale Modal (F5 shortcut triggerable from anywhere) */}
      <NewSaleModal
        isOpen={showNewSaleModal}
        onClose={() => {
          setShowNewSaleModal(false);
          setEditingSaleForModal(null);
          setInitialSaleCustomerId(undefined);
          setInitialSaleCustomerName(undefined);
          setInitialSaleCustomerPhone(undefined);
          setInitialSaleNotes(undefined);
          setInitialSalePresets(undefined);
          setActiveDemandIdForSale(null);
        }}
        products={products}
        customers={customers}
        sales={sales}
        locations={locations}
        pricingSettings={pricingSettings}
        editingSale={editingSaleForModal}
        initialCustomerId={initialSaleCustomerId}
        initialCustomerName={initialSaleCustomerName}
        initialCustomerPhone={initialSaleCustomerPhone}
        initialNotes={initialSaleNotes}
        initialItems={initialSalePresets}
        onCompleteSale={handleCompleteSale}
      />

      {/* 10. Invoice Modal (View & Print) */}
      <InvoiceModal
        isOpen={showInvoiceModal}
        onClose={() => setShowInvoiceModal(false)}
        sale={activeSaleForInvoice}
      />

      {/* 11. Vendor Create / Edit Modal */}
      <VendorFormModal
        isOpen={showVendorFormModal}
        onClose={() => {
          setShowVendorFormModal(false);
          setEditingVendor(null);
        }}
        editingVendor={editingVendor}
        onSaveVendor={handleSaveVendor}
      />

      {/* 12. Cash / Payment Ledger Entry Modal */}
      <CashEntryModal
        isOpen={showCashModal}
        onClose={() => {
          setShowCashModal(false);
          setEditingLedgerEntry(null);
          setCashModalVendorId(undefined);
        }}
        vendors={vendors}
        selectedVendorId={cashModalVendorId}
        editingEntry={editingLedgerEntry}
        onSaveEntry={handleSaveCashEntry}
      />

      {/* 13. Purchase Bill Modal */}
      <PurchaseFormModal
        isOpen={showPurchaseModal}
        onClose={() => {
          setShowPurchaseModal(false);
          setEditingPurchase(null);
          setPurchaseModalVendorId(undefined);
        }}
        vendors={vendors}
        selectedVendorId={purchaseModalVendorId}
        products={products}
        editingPurchase={editingPurchase}
        onSavePurchase={handleSavePurchase}
      />

      {/* 13b. Purchase Invoice / Bill View & Print Modal */}
      <PurchaseInvoiceModal
        isOpen={showPurchaseInvoiceModal}
        onClose={() => {
          setShowPurchaseInvoiceModal(false);
          setActivePurchaseForInvoice(null);
        }}
        purchase={activePurchaseForInvoice}
        vendor={vendors.find(v => v.id === activePurchaseForInvoice?.vendorId)}
        vendorReturns={vendorReturns}
      />

      {/* 14. Configure Linked Products to Vendor Modal */}
      {vendorForLinking && (
        <ConfigureLinkedProductsModal
          isOpen={showConfigureLinksModal}
          onClose={() => {
            setShowConfigureLinksModal(false);
            setVendorForLinking(null);
          }}
          vendor={vendorForLinking}
          allProducts={products}
          onSaveLinks={handleSaveLinkedProducts}
        />
      )}

      {/* 15. Customer Return Modal */}
      <CustomerReturnModal
        isOpen={showCustomerReturnModal}
        onClose={() => {
          setShowCustomerReturnModal(false);
          setEditingCustomerReturn(null);
          setInitialSaleForReturn(null);
        }}
        customers={customers}
        products={products}
        sales={sales}
        customerReturns={customerReturns}
        customerLedger={customerLedger}
        existingReturn={editingCustomerReturn}
        initialSale={initialSaleForReturn}
        onSaveReturn={handleSaveCustomerReturn}
      />

      {/* 16. Vendor Return Modal */}
      <VendorReturnModal
        isOpen={showVendorReturnModal}
        onClose={() => {
          setShowVendorReturnModal(false);
          setEditingVendorReturn(null);
        }}
        vendors={vendors}
        products={products}
        purchases={purchases}
        vendorReturns={vendorReturns}
        vendorLedger={ledgerEntries}
        existingReturn={editingVendorReturn}
        onSaveReturn={handleSaveVendorReturn}
      />

      {/* 17. Return Voucher / Credit/Debit Note Preview & Print Modal */}
      <ReturnVoucherModal
        isOpen={showReturnVoucherModal}
        onClose={() => {
          setShowReturnVoucherModal(false);
          setVoucherReturnDoc(null);
        }}
        returnDoc={voucherReturnDoc}
        type={voucherReturnType}
        customer={customers.find(c => c.id === (voucherReturnDoc as CustomerReturn)?.customerId)}
        vendor={vendors.find(v => v.id === (voucherReturnDoc as VendorReturn)?.vendorId)}
      />

      {/* 18. Product History Modal (Purchases, Sales, Returns Ledger) */}
      <ProductHistoryModal
        isOpen={showProductHistoryModal}
        onClose={() => {
          setShowProductHistoryModal(false);
          setProductForHistory(null);
        }}
        product={productForHistory}
        purchases={purchases}
        sales={sales}
        customerReturns={customerReturns}
        vendorReturns={vendorReturns}
        pricingSettings={pricingSettings}
        onViewSaleInvoice={(sale) => {
          setActiveSaleForInvoice(sale);
          setShowInvoiceModal(true);
        }}
        onViewPurchaseInvoice={(purchase) => {
          setActivePurchaseForInvoice(purchase);
          setShowPurchaseInvoiceModal(true);
        }}
      />

      {/* 19. Quotation Form Modal (7-Day Validity, No Stock Deducted) */}
      <QuotationFormModal
        isOpen={showQuotationFormModal}
        onClose={() => {
          setShowQuotationFormModal(false);
          setEditingQuotation(null);
        }}
        onSaveQuotation={handleSaveQuotation}
        editingQuotation={editingQuotation}
        products={products}
        customers={customers}
        pricingSettings={pricingSettings}
        quotationsList={quotations}
      />

      {/* 20. Quotation View Modal (Detailed Printable Estimate) */}
      <QuotationViewModal
        isOpen={showQuotationViewModal}
        onClose={() => {
          setShowQuotationViewModal(false);
          setViewingQuotation(null);
        }}
        quotation={viewingQuotation}
        onEdit={handleEditQuotation}
        onDelete={handleDeleteQuotation}
        onConvertToSale={handleConvertToSaleFromQuotation}
        onRenewValidity={handleRenewQuotationValidity}
      />

      {/* 21. Purchase Order Form Modal (Draft & Issued POs) */}
      <PurchaseOrderFormModal
        isOpen={showPOFormModal}
        onClose={() => {
          setShowPOFormModal(false);
          setEditingPOForModal(null);
          setPoModalVendorId(undefined);
        }}
        onSavePO={handleSavePO}
        editingPO={editingPOForModal}
        vendors={vendors}
        products={products}
        initialVendorId={poModalVendorId}
        purchaseOrdersList={purchaseOrders}
      />

      {/* 22. Purchase Order Cargo Receiving & Freight Allocation Modal */}
      <PurchaseOrderReceiveModal
        isOpen={showPOReceiveModal}
        onClose={() => {
          setShowPOReceiveModal(false);
          setActivePOForReceive(null);
        }}
        purchaseOrder={activePOForReceive}
        products={products}
        vendors={vendors}
        onProcessReceiving={handleProcessPOCargoReceiving}
      />

      {/* 23. Purchase Order / Goods Received Note View & Print Modal */}
      <PurchaseOrderViewModal
        isOpen={showPOViewModal}
        onClose={() => {
          setShowPOViewModal(false);
          setViewingPO(null);
        }}
        purchaseOrder={viewingPO}
        vendors={vendors}
        onEdit={handleOpenEditPO}
        onReceive={handleOpenReceiveCargo}
        onDelete={handleDeletePO}
      />

      {/* 24. Customer Demand / Backorder Request Form Modal */}
      <DemandFormModal
        isOpen={showDemandFormModal}
        onClose={() => {
          setShowDemandFormModal(false);
          setEditingDemand(null);
        }}
        onSave={(demandPayload) => handleSaveDemand(demandPayload as Demand)}
        existingDemand={editingDemand}
        products={products}
        customers={customers}
      />

      {/* 25. Staff Management & Granular RBAC Permissions Modal */}
      <StaffManagementModal
        isOpen={showStaffModal}
        onClose={() => setShowStaffModal(false)}
        employees={employees}
        onUpdateEmployees={(updated) => {
          setEmployees(updated);
          saveStoredEmployees(updated);
        }}
        activeDeviceId={deviceInfo.deviceId}
        currentDeviceId={deviceInfo.deviceId}
        currentUserId={activeEmployeeId}
        deviceInfo={deviceInfo}
      />

      {/* 26. Switch User / Operator Modal */}
      <SwitchUserModal
        isOpen={showSwitchUserModal}
        onClose={() => setShowSwitchUserModal(false)}
        employees={employees}
        activeEmployeeId={activeEmployeeId}
        currentUserId={activeEmployeeId}
        currentDeviceId={deviceInfo.deviceId}
        deviceInfo={deviceInfo}
        onOpenStaffManagement={() => {
          setShowSwitchUserModal(false);
          setShowStaffModal(true);
        }}
        onSelectEmployee={(emp) => {
          setActiveEmployeeId(emp.id);
          saveStoredActiveEmployeeId(emp.id);
          showToast(`Active Operator: ${emp.name}`, `${emp.designation} (${emp.role.toUpperCase()})`);
        }}
      />

      {/* Keyboard Shortcut HUD Toast Notification */}
      {shortcutToast && (
        <div className="fixed bottom-6 right-6 z-50 pointer-events-none transition-all duration-300 animate-in fade-in slide-in-from-bottom-3">
          <div className="flex items-center gap-2.5 px-4 py-2.5 bg-slate-900/95 text-white rounded-2xl shadow-xl border border-slate-700/80 backdrop-blur-xs">
            <div className="w-6 h-6 rounded-lg bg-red-600/30 text-red-400 flex items-center justify-center font-bold text-xs border border-red-500/30">
              <Keyboard className="w-3.5 h-3.5" />
            </div>
            <div className="text-xs font-semibold">
              <span className="text-slate-300 font-normal">Shortcut activated: </span>
              <span className="text-white font-bold">{shortcutToast.title}</span>
            </div>
            <kbd className="px-2 py-0.5 text-[10px] font-mono font-bold bg-slate-800 text-red-400 border border-slate-600 rounded-md">
              {shortcutToast.shortcut}
            </kbd>
          </div>
        </div>
      )}

    </div>
  );
}
