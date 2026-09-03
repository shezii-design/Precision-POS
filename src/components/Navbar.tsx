import React, { useState, useEffect, useMemo } from 'react';
import { PWAInstallButton } from './PWAInstallButton';
import { AuthState, DeviceInfo, EmployeeAccount, GlobalPricingSettings, SupabaseConfig } from '../types';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { isActionAllowed, isTabAllowed } from '../services/auth';
import { 
  Box, 
  Plus, 
  Download, 
  Upload, 
  Lock, 
  Layers, 
  FileSpreadsheet, 
  FileText,
  ChevronDown,
  ChevronRight,
  Receipt,
  CheckCircle2,
  X,
  Sparkles,
  Tag,
  ArrowRight,
  Shield,
  Trash2,
  ShoppingCart,
  Building2,
  Users,
  ShoppingBag,
  RotateCcw,
  Truck,
  PackageSearch,
  ClipboardList,
  AlertTriangle,
  Menu,
  SlidersHorizontal,
  Search,
  LayoutDashboard,
  TrendingUp,
  UserCheck,
  Laptop,
  Database,
  Cloud
} from 'lucide-react';

export type AppWorkspaceView = 
  | 'dashboard'
  | 'inventory' 
  | 'sales' 
  | 'purchases' 
  | 'purchase_orders' 
  | 'income_statement'
  | 'customers' 
  | 'vendors' 
  | 'returns' 
  | 'quotations' 
  | 'demands' 
  | 'inventory_audit';

interface NavbarProps {
  onOpenAddProduct: () => void;
  onOpenNewSale?: () => void;
  onOpenPricingFormulas: () => void;
  onOpenSupabaseConfig: () => void;
  onOpenCategories: () => void;
  onOpenBulkImport: () => void;
  onExportExcel: () => void;
  onExportCSV: () => void;
  onLockApp: () => void;
  onOpenSecuritySettings: () => void;
  onOpenWipeData: () => void;
  onOpenStaffManagement?: () => void;
  onOpenSwitchUser?: () => void;
  currentEmployee?: EmployeeAccount;
  onGoToInventory?: () => void;
  currentView?: AppWorkspaceView;
  onChangeView?: (view: AppWorkspaceView) => void;
  supabaseConfig: SupabaseConfig;
  authState: AuthState;
  deviceInfo: DeviceInfo;
  pricingSettings: GlobalPricingSettings;
  totalProductsCount: number;
  totalSalesCount?: number;
  totalPurchasesCount?: number;
  totalPurchaseOrdersCount?: number;
  pendingPurchaseOrdersCount?: number;
  totalVendorsCount?: number;
  totalCustomersCount?: number;
  totalReturnsCount?: number;
  totalQuotationsCount?: number;
  totalDemandsCount?: number;
  pendingDemandsCount?: number;
  totalAuditLogsCount?: number;
  lowStockCount?: number;
  showLowStockBanner?: boolean;
  onToggleLowStockBanner?: () => void;
}

interface WorkspaceTabDef {
  id: AppWorkspaceView;
  title: string;
  shortTitle: string;
  icon: React.ComponentType<{ className?: string }>;
  count?: number;
  pendingCount?: number;
  shortcut: string;
  description: string;
  themeColor: string;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenAddProduct,
  onOpenNewSale,
  onOpenPricingFormulas,
  onOpenSupabaseConfig,
  onOpenCategories,
  onOpenBulkImport,
  onExportExcel,
  onExportCSV,
  onLockApp,
  onOpenSecuritySettings,
  onOpenWipeData,
  onOpenStaffManagement,
  onOpenSwitchUser,
  currentEmployee,
  onGoToInventory,
  currentView = 'inventory',
  onChangeView,
  supabaseConfig,
  authState,
  deviceInfo,
  pricingSettings,
  totalProductsCount,
  totalSalesCount = 0,
  totalPurchasesCount = 0,
  totalPurchaseOrdersCount = 0,
  pendingPurchaseOrdersCount = 0,
  totalVendorsCount = 0,
  totalCustomersCount = 0,
  totalReturnsCount = 0,
  totalQuotationsCount = 0,
  totalDemandsCount = 0,
  pendingDemandsCount = 0,
  totalAuditLogsCount = 0,
  lowStockCount = 0,
  showLowStockBanner = false,
  onToggleLowStockBanner,
}) => {
  const [showAppMenu, setShowAppMenu] = useState<boolean>(false);
  const [showToolsMenu, setShowToolsMenu] = useState<boolean>(false);
  const [menuSearchQuery, setMenuSearchQuery] = useState<string>('');
  const isOnline = useOnlineStatus();

  // Close menus on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showAppMenu) setShowAppMenu(false);
        if (showToolsMenu) setShowToolsMenu(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showAppMenu, showToolsMenu]);

  // Tab definitions configuration
  const allWorkspaceTabs: WorkspaceTabDef[] = useMemo(() => [
    {
      id: 'dashboard',
      title: 'Executive Dashboard',
      shortTitle: 'Dashboard',
      icon: LayoutDashboard,
      shortcut: 'Ctrl + B',
      description: 'Executive business overview, sales vs purchases graphs, top products, receivables & financial health.',
      themeColor: 'red',
    },
    {
      id: 'inventory',
      title: 'Inventory & Stock',
      shortTitle: 'Inventory',
      icon: Box,
      count: totalProductsCount,
      shortcut: 'Ctrl + I',
      description: 'Product catalog, dimensional sizes, stock balances, cabin shelf locations & label printing.',
      themeColor: 'red',
    },
    {
      id: 'sales',
      title: 'Sales & Invoices',
      shortTitle: 'Sales',
      icon: Receipt,
      count: totalSalesCount,
      shortcut: 'Ctrl + S',
      description: 'POS cashier billing, customer invoices, cash/credit ledgers & printed thermal slips.',
      themeColor: 'red',
    },
    {
      id: 'purchases',
      title: 'Purchases & Bills',
      shortTitle: 'Purchases',
      icon: ShoppingBag,
      count: totalPurchasesCount,
      shortcut: 'Ctrl + P',
      description: 'Vendor purchasing bills, automatic inventory cost averaging & FIFO batch tracking.',
      themeColor: 'amber',
    },
    {
      id: 'purchase_orders',
      title: 'Purchase Orders & Cargo',
      shortTitle: 'POs',
      icon: Truck,
      count: totalPurchaseOrdersCount,
      pendingCount: pendingPurchaseOrdersCount,
      shortcut: 'Ctrl + O',
      description: 'Flexible cargo receiving, landed freight cost allocation & delayed billing workflows.',
      themeColor: 'amber',
    },
    {
      id: 'income_statement',
      title: 'Income Statement (P&L)',
      shortTitle: 'P&L',
      icon: TrendingUp,
      shortcut: 'Ctrl + M',
      description: 'Official multi-step Profit & Loss statement, gross profit, operating expenses, and net profit margins.',
      themeColor: 'emerald',
    },
    {
      id: 'customers',
      title: 'Customers & Ledgers',
      shortTitle: 'Customers',
      icon: Users,
      count: totalCustomersCount,
      shortcut: 'Ctrl + U',
      description: 'Customer & B2B accounts, fleet machinery, demand records & Khata statement ledgers.',
      themeColor: 'red',
    },
    {
      id: 'vendors',
      title: 'Vendors & Suppliers',
      shortTitle: 'Vendors',
      icon: Building2,
      count: totalVendorsCount,
      shortcut: 'Ctrl + V',
      description: 'Supplier directory, linked catalogue parts, purchases, cash transactions & supplier ledgers.',
      themeColor: 'red',
    },
    {
      id: 'returns',
      title: 'Returns & Credit Notes',
      shortTitle: 'Returns',
      icon: RotateCcw,
      count: totalReturnsCount,
      shortcut: 'Ctrl + R',
      description: 'Customer sales returns (inward), restock vs scrap, vendor purchase returns & debit notes.',
      themeColor: 'red',
    },
    {
      id: 'quotations',
      title: 'Quotations & Estimates',
      shortTitle: 'Quotes',
      icon: FileText,
      count: totalQuotationsCount,
      shortcut: 'Ctrl + Q',
      description: 'Customer & corporate price estimates with 7-day rate validity without deducting stock.',
      themeColor: 'amber',
    },
    {
      id: 'demands',
      title: 'Demands & Backorders',
      shortTitle: 'Demands',
      icon: PackageSearch,
      count: totalDemandsCount,
      pendingCount: pendingDemandsCount,
      shortcut: 'Ctrl + D',
      description: 'Custom part demands with sizing specs, promised dates & 1-click fulfillment conversion.',
      themeColor: 'red',
    },
    {
      id: 'inventory_audit',
      title: 'Inventory Audit Trail',
      shortTitle: 'Audit',
      icon: ClipboardList,
      count: totalAuditLogsCount,
      shortcut: 'Ctrl + L',
      description: 'Timestamped audit trail tracking every stock movement, sale, return & adjustment with balance snapshots.',
      themeColor: 'red',
    },
  ], [
    totalProductsCount,
    totalSalesCount,
    totalPurchasesCount,
    totalPurchaseOrdersCount,
    pendingPurchaseOrdersCount,
    totalCustomersCount,
    totalVendorsCount,
    totalReturnsCount,
    totalQuotationsCount,
    totalDemandsCount,
    pendingDemandsCount,
    totalAuditLogsCount,
  ]);

  // Filter tabs dynamically based on current user permissions
  const workspaceTabs = useMemo(() => {
    if (!currentEmployee || currentEmployee.role === 'admin') {
      return allWorkspaceTabs;
    }
    return allWorkspaceTabs.filter(tab => isTabAllowed(currentEmployee, tab.id));
  }, [allWorkspaceTabs, currentEmployee]);

  const handleSelectTab = (view: AppWorkspaceView) => {
    if (view === 'inventory') {
      if (onChangeView) {
        onChangeView('inventory');
      } else {
        onGoToInventory?.();
      }
    } else {
      onChangeView?.(view);
    }
    setShowAppMenu(false);
  };

  const currentTab = useMemo(() => {
    return workspaceTabs.find(t => t.id === currentView) || workspaceTabs[0] || allWorkspaceTabs[0];
  }, [workspaceTabs, allWorkspaceTabs, currentView]);

  // Filtered tabs for the expanded menu search
  const filteredWorkspaceTabs = useMemo(() => {
    if (!menuSearchQuery.trim()) return workspaceTabs;
    const q = menuSearchQuery.toLowerCase();
    return workspaceTabs.filter(t => 
      t.title.toLowerCase().includes(q) || 
      t.shortTitle.toLowerCase().includes(q) ||
      t.description.toLowerCase().includes(q) ||
      t.shortcut.toLowerCase().includes(q)
    );
  }, [workspaceTabs, menuSearchQuery]);

  // Permission flags for action controls
  const canMakeSales = isActionAllowed(currentEmployee, 'canCreateSales');
  const canAddProduct = isActionAllowed(currentEmployee, 'canAddProducts');
  const canManageSettings = isActionAllowed(currentEmployee, 'canManageSettings');
  const canImportExport = isActionAllowed(currentEmployee, 'canImportExport');
  const isSuperAdmin = !currentEmployee || currentEmployee.role === 'admin';

  return (
    <>
      <header className="bg-gradient-to-r from-red-700 via-red-600 to-red-700 text-white shadow-md sticky top-0 z-30 border-b border-red-800/40 select-none">
        {/* Tier 1: Main Brand & Action Header */}
        <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between w-full min-w-0 gap-2 sm:gap-0 py-2 sm:py-0 sm:h-14">
            
            {/* Top-Left: Brand & Single Menu Button */}
            <div className="flex items-center justify-between sm:justify-start gap-1.5 sm:gap-2 min-w-0 shrink-0 w-full sm:w-auto">
              {/* Brand Logo & Name */}
              <button
                type="button"
                id="navbar-brand-btn"
                onClick={() => {
                  if (workspaceTabs.some(t => t.id === 'inventory')) {
                    handleSelectTab('inventory');
                  } else if (workspaceTabs.length > 0) {
                    handleSelectTab(workspaceTabs[0].id);
                  }
                }}
                className="flex items-center gap-1.5 sm:gap-2 p-1 sm:px-2 py-1 rounded-xl hover:bg-white/10 transition-colors cursor-pointer select-none shrink-0 text-left group"
                title="Precision POS Auto Parts & ERP"
              >
                <div className="w-7.5 h-7.5 sm:w-8 sm:h-8 rounded-xl bg-white text-red-600 flex items-center justify-center font-black shadow-md border border-red-100 shrink-0">
                  <Box className="w-4 h-4" />
                </div>
                <div className="block leading-tight">
                  <div className="flex items-center gap-1">
                    <span className="text-xs sm:text-sm font-black tracking-tight text-white whitespace-nowrap">
                      Precision POS
                    </span>
                    <span className="px-1 py-0.2 bg-white/20 text-white text-[9px] font-bold rounded">
                      PKR
                    </span>
                  </div>
                  <span className="text-[10px] text-red-200 font-medium block whitespace-nowrap">
                    Auto Parts & ERP
                  </span>
                </div>
              </button>

              {/* Offline Badge */}
              {!isOnline && (
                <div className="flex items-center gap-1.5 px-1.5 sm:px-2 py-1 bg-amber-500 text-amber-950 rounded-xl text-[10px] sm:text-[11px] font-black shadow-inner shrink-0 border border-amber-400" title="Offline Mode: Read-Only Access (Writes Disabled)">
                  <span className="w-2 h-2 rounded-full bg-amber-950 animate-pulse shrink-0" />
                  <span className="hidden sm:inline">OFFLINE: Read-Only</span>
                  <span className="sm:hidden">OFFLINE</span>
                </div>
              )}

              {/* Single Dedicated Menu Button on Top Bar */}
              <button
                type="button"
                id="navbar-menu-btn"
                onClick={() => setShowAppMenu(true)}
                className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1.5 text-xs font-bold rounded-xl border transition-colors cursor-pointer select-none shrink-0 shadow-xs h-8 sm:h-8.5 ${
                  showAppMenu
                    ? 'bg-white text-red-700 border-white shadow-inner'
                    : 'bg-black/25 hover:bg-black/40 text-white border-white/20 hover:border-white/35'
                }`}
                title="Open Workspaces & POS Menu"
              >
                <Menu className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                <span className="text-xs font-bold tracking-wide">Menu</span>
                <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${showAppMenu ? 'rotate-180 text-red-700' : 'text-white/80'}`} />
              </button>

              {/* Active Workspace View Badge */}
              <div className="hidden 2xl:flex items-center gap-1.5 px-2.5 py-1 bg-black/25 text-red-100 text-xs font-bold rounded-xl border border-white/20 shrink-0 h-8.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                <span className="text-[11px] font-bold text-white">{currentTab?.title || 'Workspace'}</span>
              </div>
            </div>

            {/* Top-Right Action Buttons */}
            <div className="flex items-center justify-end gap-1 sm:gap-1.5 shrink-0 w-full sm:w-auto">
              <div className="flex items-center justify-end gap-1 sm:gap-1.5 flex-nowrap overflow-x-auto overflow-y-hidden shrink-0 flex-1 sm:flex-none pb-0.5 sm:pb-0 mask-fade-edges" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
              
              {/* PWA Install Button */}
              <PWAInstallButton />
              
              {/* Make Sale Quick Button (POS) - Checked via Permission */}
              {onOpenNewSale && canMakeSales && (
                <button
                  type="button"
                  id="navbar-make-sale-btn"
                  onClick={() => onOpenNewSale()}
                  className="px-2 sm:px-2.5 py-1.5 bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white text-xs font-bold rounded-xl border border-emerald-400/60 transition-colors flex items-center gap-1 shadow-xs cursor-pointer h-8 sm:h-8.5 shrink-0"
                  title="Make a Sale / Open POS (F5)"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[3] shrink-0" />
                  <span className="text-xs font-bold whitespace-nowrap">Sale</span>
                  <kbd className="hidden lg:inline-flex text-[9px] font-mono font-bold bg-black/25 text-white px-1.5 py-0.2 rounded border border-white/20">
                    F5
                  </kbd>
                </button>
              )}

              {/* + Add Product Button (Shown only in Inventory View if permitted) */}
              {currentView === 'inventory' && canAddProduct && (
                <button
                  type="button"
                  id="navbar-add-product-btn"
                  onClick={onOpenAddProduct}
                  className="px-2 sm:px-2.5 py-1.5 bg-white hover:bg-slate-100 text-red-700 text-xs font-bold rounded-xl border border-white shadow-xs transition-colors flex items-center gap-1 cursor-pointer h-8 sm:h-8.5 shrink-0"
                  title="Add New Inventory Product"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[3] shrink-0" />
                  <span className="text-xs font-bold whitespace-nowrap hidden md:inline">Add Product</span>
                  <span className="text-xs font-bold whitespace-nowrap md:hidden">Add</span>
                </button>
              )}

              {/* Low Stock Warning Pill Reminder */}
              {lowStockCount > 0 && onToggleLowStockBanner && (
                <button
                  type="button"
                  id="navbar-low-stock-badge-btn"
                  onClick={onToggleLowStockBanner}
                  className={`px-2 py-1.5 text-xs font-bold rounded-xl border transition-colors flex items-center gap-1 cursor-pointer h-8 sm:h-8.5 shadow-xs shrink-0 ${
                    showLowStockBanner
                      ? 'bg-amber-400 text-amber-950 border-amber-300 font-bold'
                      : 'bg-amber-500 hover:bg-amber-600 text-white border-amber-400 font-bold'
                  }`}
                  title={`${lowStockCount} products are low on stock.`}
                >
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-current" />
                  <span className="font-bold">{lowStockCount}</span>
                  <span className="hidden sm:inline font-bold">Low</span>
                </button>
              )}

              {/* Supabase Cloud / SQL Schema Quick Button */}
              <button
                type="button"
                id="navbar-supabase-sql-btn"
                onClick={onOpenSupabaseConfig}
                className={`px-2 sm:px-2.5 py-1.5 text-xs font-bold rounded-xl border transition-colors flex items-center gap-1 shadow-2xs cursor-pointer h-8 sm:h-8.5 shrink-0 ${
                  supabaseConfig.enabled && supabaseConfig.syncStatus === 'connected'
                    ? 'bg-emerald-600/90 hover:bg-emerald-600 text-white border-emerald-400/60'
                    : 'bg-white/15 hover:bg-white/25 text-white border-white/20'
                }`}
                title="Supabase Cloud Sync, PostgreSQL Tables & SQL Schema"
              >
                <Database className="w-3.5 h-3.5 text-white shrink-0" />
                <span className="hidden xl:inline text-xs font-bold whitespace-nowrap">SQL Cloud</span>
                {supabaseConfig.enabled && (
                  <span className="w-2 h-2 rounded-full bg-emerald-300 shrink-0" />
                )}
              </button>

              {/* PKR Formulas Quick Button (Desktop 2xl+) */}
              {canManageSettings && (
                <button
                  type="button"
                  id="navbar-pkr-formulas-btn"
                  onClick={onOpenPricingFormulas}
                  className="hidden 2xl:flex items-center gap-1 px-2.5 py-1.5 bg-white/15 hover:bg-white/25 active:bg-white/30 text-white text-xs font-bold rounded-xl border border-white/20 transition-colors shadow-2xs group cursor-pointer h-8.5 shrink-0"
                  title="Configure PKR markup formulas & selling tiers"
                >
                  <div className="w-4 h-4 rounded-md bg-white text-red-700 flex items-center justify-center font-bold text-[10px] shadow-2xs shrink-0">
                    ₨
                  </div>
                  <span className="text-xs font-bold whitespace-nowrap">Formulas</span>
                </button>
              )}

              </div>
              <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
              {/* Active Operator / Employee Badge & Quick Switch */}
              {currentEmployee && (
                <button
                  type="button"
                  id="navbar-active-operator-btn"
                  onClick={onOpenSwitchUser}
                  className="px-1.5 sm:px-2 py-1 bg-black/25 hover:bg-black/35 text-white rounded-xl border border-white/20 transition-colors flex items-center gap-1 cursor-pointer h-8 sm:h-8.5 shrink-0"
                  title={`Current Operator: ${currentEmployee.name} (${currentEmployee.designation}). Click to switch operator.`}
                >
                  <div className={`w-5 h-5 rounded-lg flex items-center justify-center font-bold text-[10px] text-white shadow-2xs shrink-0 ${
                    currentEmployee.role === 'admin' ? 'bg-red-600 border border-white/40' :
                    currentEmployee.role === 'cashier' ? 'bg-blue-600 border border-white/40' :
                    currentEmployee.role === 'procurement' ? 'bg-amber-600 border border-white/40' :
                    currentEmployee.role === 'stockkeeper' ? 'bg-emerald-600 border border-white/40' :
                    'bg-purple-600 border border-white/40'
                  }`}>
                    {currentEmployee.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="hidden xl:flex flex-col text-left leading-tight">
                    <span className="font-bold text-[11px] text-white max-w-[80px] truncate">{currentEmployee.name}</span>
                  </div>
                  <ChevronDown className="w-3 h-3 text-white/70 shrink-0" />
                </button>
              )}

              {/* Tools & More Dropdown Menu */}
              <div className="relative shrink-0">
                <button
                  type="button"
                  id="navbar-more-tools-btn"
                  onClick={() => setShowToolsMenu(!showToolsMenu)}
                  className={`px-2 sm:px-2.5 py-1.5 rounded-xl text-xs font-bold border transition-colors flex items-center gap-1 cursor-pointer h-8 sm:h-8.5 shrink-0 ${
                    showToolsMenu 
                      ? 'bg-white text-red-700 border-white shadow-xs' 
                      : 'bg-white/10 hover:bg-white/20 text-white border-white/20'
                  }`}
                  title="Tools, Staff Accounts & Security"
                >
                  <Layers className="w-3.5 h-3.5 shrink-0" />
                  <span className="hidden sm:inline text-xs font-bold">Tools</span>
                  <ChevronDown className={`w-3 h-3 text-current transition-transform duration-200 ${showToolsMenu ? 'rotate-180' : ''}`} />
                </button>

                {showToolsMenu && (
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-2xl border border-slate-200 p-1.5 z-40 text-slate-800 animate-in fade-in zoom-in-95">
                    
                    {/* User Profile Header in Menu */}
                    {currentEmployee && (
                      <div className="p-2.5 mb-1 bg-slate-50 rounded-xl border border-slate-100">
                        <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Current Operator</div>
                        <div className="text-xs font-bold text-slate-900 mt-0.5">{currentEmployee.name}</div>
                        <div className="text-[10px] text-slate-500">{currentEmployee.designation} • {currentEmployee.role.toUpperCase()}</div>
                      </div>
                    )}

                    {onOpenSwitchUser && (
                      <button
                        type="button"
                        id="menu-btn-switch-operator"
                        onClick={() => { setShowToolsMenu(false); onOpenSwitchUser(); }}
                        className="w-full px-3 py-2 text-left text-xs font-bold hover:bg-blue-50 text-blue-800 rounded-xl flex items-center gap-2.5 cursor-pointer"
                      >
                        <UserCheck className="w-4 h-4 text-blue-600 shrink-0" />
                        <span>Switch Operator / Cashier</span>
                      </button>
                    )}

                    {onOpenStaffManagement && isSuperAdmin && (
                      <button
                        type="button"
                        id="menu-btn-staff-rbac"
                        onClick={() => { setShowToolsMenu(false); onOpenStaffManagement(); }}
                        className="w-full px-3 py-2 text-left text-xs font-bold hover:bg-red-50 text-red-700 rounded-xl flex items-center gap-2.5 cursor-pointer"
                      >
                        <Users className="w-4 h-4 text-red-600 shrink-0" />
                        <span>Staff Accounts & Permissions</span>
                      </button>
                    )}

                    <div className="border-t border-slate-100 my-1" />

                    <div className="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-slate-400">
                      Cloud & Database
                    </div>
                    <button
                      type="button"
                      id="menu-btn-supabase-config"
                      onClick={() => { setShowToolsMenu(false); onOpenSupabaseConfig(); }}
                      className="w-full px-3 py-2 text-left text-xs font-bold hover:bg-red-50 text-slate-700 rounded-xl flex items-center justify-between gap-2.5 cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5">
                        <Database className="w-4 h-4 text-red-600 shrink-0" />
                        <span>Supabase & SQL Schema</span>
                      </div>
                      {supabaseConfig.enabled ? (
                        <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-md font-bold shrink-0">Connected</span>
                      ) : (
                        <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-md shrink-0">Setup</span>
                      )}
                    </button>

                    <div className="border-t border-slate-100 my-1" />

                    <div className="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-slate-400">
                      POS Management Tools
                    </div>
                    {canManageSettings && (
                      <button
                        type="button"
                        id="menu-btn-pkr-formulas"
                        onClick={() => { setShowToolsMenu(false); onOpenPricingFormulas(); }}
                        className="w-full px-3 py-2 text-left text-xs font-bold hover:bg-red-50 text-slate-700 rounded-xl flex items-center gap-2.5 cursor-pointer"
                      >
                        <div className="w-4 h-4 rounded-md bg-red-100 text-red-700 flex items-center justify-center font-bold text-[10px] shrink-0">
                          ₨
                        </div>
                        <span>PKR Markup & Selling Formulas</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => { setShowToolsMenu(false); onOpenCategories(); }}
                      className="w-full px-3 py-2 text-left text-xs font-bold hover:bg-red-50 text-slate-700 rounded-xl flex items-center gap-2.5 cursor-pointer"
                    >
                      <Layers className="w-4 h-4 text-red-600 shrink-0" />
                      <span>Categories & Cabins</span>
                    </button>
                    {canImportExport && (
                      <>
                        <button
                          type="button"
                          onClick={() => { setShowToolsMenu(false); onOpenBulkImport(); }}
                          className="w-full px-3 py-2 text-left text-xs font-bold hover:bg-red-50 text-slate-700 rounded-xl flex items-center gap-2.5 cursor-pointer"
                        >
                          <Upload className="w-4 h-4 text-red-600 shrink-0" />
                          <span>Bulk Import (Excel/CSV)</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => { setShowToolsMenu(false); onExportExcel(); }}
                          className="w-full px-3 py-2 text-left text-xs font-bold hover:bg-emerald-50 text-slate-700 rounded-xl flex items-center gap-2.5 cursor-pointer"
                        >
                          <FileSpreadsheet className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span>Export Inventory (.xlsx)</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => { setShowToolsMenu(false); onExportCSV(); }}
                          className="w-full px-3 py-2 text-left text-xs font-bold hover:bg-slate-50 text-slate-700 rounded-xl flex items-center gap-2.5 cursor-pointer"
                        >
                          <FileText className="w-4 h-4 text-slate-600 shrink-0" />
                          <span>Export Inventory (.csv)</span>
                        </button>
                      </>
                    )}
                    <div className="border-t border-slate-100 my-1" />
                    {canManageSettings && (
                      <button
                        type="button"
                        onClick={() => { setShowToolsMenu(false); onOpenSecuritySettings(); }}
                        className="w-full px-3 py-2 text-left text-xs font-bold hover:bg-slate-50 text-slate-700 rounded-xl flex items-center gap-2.5 cursor-pointer"
                      >
                        <Shield className="w-4 h-4 text-slate-600 shrink-0" />
                        <span>Security & PIN Config</span>
                      </button>
                    )}
                    {canManageSettings && (
                      <button
                        type="button"
                        onClick={() => { setShowToolsMenu(false); onOpenWipeData(); }}
                        className="w-full px-3 py-2 text-left text-xs font-bold hover:bg-red-50 text-red-700 rounded-xl flex items-center gap-2.5 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4 text-red-600 shrink-0" />
                        <span>Factory Reset / Wipe Data</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => { setShowToolsMenu(false); onLockApp(); }}
                      className="w-full px-3 py-2 text-left text-xs font-bold hover:bg-red-50 text-red-700 rounded-xl flex items-center gap-2.5 cursor-pointer"
                    >
                      <Lock className="w-4 h-4 text-red-600 shrink-0" />
                      <span>Lock Screen</span>
                    </button>
                  </div>
                )}
              </div>

              </div>
              {/* Direct Lock Button */}
              <button
                type="button"
                id="navbar-lock-app-btn"
                onClick={onLockApp}
                className="p-1.5 sm:p-2 bg-black/25 hover:bg-black/35 text-white text-xs font-bold rounded-xl border border-white/20 transition-colors flex items-center justify-center cursor-pointer h-8 sm:h-8.5 w-8 sm:w-8.5 shrink-0 shadow-2xs"
                title="Lock Screen"
              >
                <Lock className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Tier 2: Clean Grid-Based Icon Navigation Bar (Zero Slider, Fully Responsive & Non-Glitchy) */}
        <div className="bg-red-900/95 border-t border-red-950/40 px-2 sm:px-4 py-1.5 shadow-inner">
          <div className="max-w-7xl mx-auto">
            <nav 
              aria-label="Workspace Navigation"
              className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 xl:grid-cols-12 gap-1 sm:gap-1.5 w-full"
            >
              {workspaceTabs.map((tab) => {
                const IconComp = tab.icon;
                const isActive = currentView === tab.id;
                const hasPending = tab.pendingCount !== undefined && tab.pendingCount > 0;
                const countVal = tab.count ?? 0;

                return (
                  <button
                    key={tab.id}
                    type="button"
                    id={`nav-tab-${tab.id}`}
                    onClick={() => handleSelectTab(tab.id)}
                    className={`group relative w-full h-8 sm:h-8.5 px-1 sm:px-1.5 text-xs rounded-xl transition-colors duration-150 flex items-center justify-center gap-1 sm:gap-1.5 cursor-pointer whitespace-nowrap select-none border min-w-0 overflow-hidden font-bold focus:outline-none focus:ring-2 focus:ring-white/40 ${
                      isActive
                        ? 'bg-white text-red-900 border-white shadow-xs'
                        : 'bg-black/25 hover:bg-black/40 text-white/95 hover:text-white border-white/15 hover:border-white/30'
                    }`}
                    title={`${tab.title} (${tab.shortcut})\n${tab.description}`}
                  >
                    <IconComp className={`w-3.5 h-3.5 shrink-0 transition-colors ${isActive ? 'text-red-700' : 'text-red-200 group-hover:text-white'}`} />
                    
                    {/* Short Tab Label with min-w-0 and truncate to prevent text spillage */}
                    <span className={`text-[11px] sm:text-xs tracking-tight truncate min-w-0 shrink ${isActive ? 'text-red-900' : 'text-white/95'}`}>
                      {tab.shortTitle}
                    </span>

                    {/* Pending Action Notification Dot */}
                    {hasPending && (
                      <span 
                        className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0 ring-1 ring-amber-200 animate-pulse" 
                        title={`${tab.pendingCount} pending items`}
                      />
                    )}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>
      </header>

      {/* Expanded Modal Workspace Menu (When Clicked) */}
      {showAppMenu && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-200 mt-4 sm:mt-8">
            
            {/* Modal Header with Search & Quick Filter */}
            <div className="p-4 sm:p-5 bg-gradient-to-r from-red-700 to-red-800 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white text-red-600 flex items-center justify-center font-black shadow-md">
                  <Menu className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-black text-white">Precision POS Navigation Menu</h2>
                  <p className="text-xs text-red-200">
                    Logged in as: <strong className="text-white">{currentEmployee?.name || 'Administrator'}</strong> ({currentEmployee?.designation || 'Master Admin'})
                  </p>
                </div>
              </div>

              <button
                type="button"
                id="btn-close-app-menu"
                onClick={() => setShowAppMenu(false)}
                className="p-2 rounded-xl bg-black/20 hover:bg-black/30 text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Menu Search Bar */}
            <div className="p-3 sm:p-4 bg-slate-50 border-b border-slate-200 flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search modules or shortcuts..."
                  value={menuSearchQuery}
                  onChange={(e) => setMenuSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500"
                  autoFocus
                />
              </div>
            </div>

            {/* Grid of Allowed Tabs */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 bg-slate-50/50">
              {filteredWorkspaceTabs.map(tab => {
                const Icon = tab.icon;
                const isActive = currentView === tab.id;

                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => handleSelectTab(tab.id)}
                    className={`p-4 rounded-2xl border text-left transition-all flex flex-col justify-between cursor-pointer group ${
                      isActive 
                        ? 'bg-red-50 border-red-300 ring-2 ring-red-500/20 shadow-xs' 
                        : 'bg-white hover:bg-slate-50 border-slate-200 hover:border-slate-300 shadow-2xs'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                          isActive ? 'bg-red-600 text-white' : 'bg-slate-100 text-slate-700 group-hover:bg-red-100 group-hover:text-red-700'
                        }`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md">
                          {tab.shortcut}
                        </span>
                      </div>
                      <h3 className="text-xs font-black text-slate-900 mb-1">{tab.title}</h3>
                      <p className="text-[11px] text-slate-500 leading-snug">{tab.description}</p>
                    </div>

                    <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] font-bold text-red-600">
                      <span>Open Module</span>
                      <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Menu Footer */}
            <div className="p-3 bg-white border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
              <div className="flex items-center gap-2">
                <span className="text-[11px]">Authorized PC: {deviceInfo.deviceId}</span>
                <span className="text-slate-300">•</span>
                <button
                  type="button"
                  onClick={() => { setShowAppMenu(false); onOpenSupabaseConfig(); }}
                  className="text-[11px] font-bold text-red-600 hover:text-red-700 flex items-center gap-1 cursor-pointer"
                >
                  <Database className="w-3.5 h-3.5" />
                  <span>Supabase & SQL Schemas</span>
                </button>
              </div>
              <button
                type="button"
                onClick={() => setShowAppMenu(false)}
                className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors cursor-pointer"
              >
                Close Menu
              </button>
            </div>

          </div>
        </div>
      )}
    </>
  );
};
