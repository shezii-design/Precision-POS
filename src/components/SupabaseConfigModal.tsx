import React, { useState, useEffect } from 'react';
import { 
  Brand,
  Customer, 
  CustomerLedgerEntry, 
  CustomerReturn,
  Demand, 
  EmployeeAccount, 
  Expense, 
  GlobalPricingSettings,
  LocationItem, 
  Product, 
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
import { 
  getSupabaseClient, 
  getEnvSupabaseConfig,
  testSupabaseConnection,
  DetailedConnectionResult,
  syncProductsToSupabase, 
  fetchProductsFromSupabase,
  syncCustomersToSupabase,
  fetchCustomersFromSupabase,
  syncSalesToSupabase,
  syncCustomerReturnsToSupabase,
  syncVendorsAndPurchasesToSupabase,
  syncVendorLedgerToSupabase,
  syncVendorReturnsToSupabase,
  syncQuotationsToSupabase,
  syncDemandsToSupabase,
  syncExpensesToSupabase,
  syncStaffAndDevicesToSupabase,
  syncStockLogsToSupabase,
  syncPricingSettingsToSupabase,
  syncAllModulesToSupabase,
  fetchAllFromSupabase,
  SCHEMA_FULL_DATABASE,
  SCHEMA_PRODUCTS_ONLY,
  SCHEMA_CUSTOMERS_LEDGER,
  SCHEMA_VENDORS_PURCHASING,
  SCHEMA_QUOTATIONS_DEMANDS,
  SCHEMA_EXPENSES_STAFF,
  resetSupabaseClient
} from '../services/supabase';
import { 
  Cloud, 
  Database, 
  Copy, 
  Check, 
  RefreshCw, 
  Download, 
  Upload, 
  AlertCircle, 
  CheckCircle2, 
  X, 
  TableProperties, 
  ArrowDownToLine, 
  ArrowUpToLine, 
  Info, 
  ShieldCheck, 
  FileCode2, 
  Server, 
  ExternalLink, 
  Key, 
  Activity, 
  Layers, 
  Users, 
  Briefcase, 
  FileText, 
  DollarSign, 
  Shield, 
  HelpCircle,
  Sparkles,
  ChevronRight,
  AlertTriangle,
  ShoppingCart,
  RotateCcw,
  Receipt,
  Sliders,
  History
} from 'lucide-react';

interface SupabaseConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: SupabaseConfig;
  onSaveConfig: (config: SupabaseConfig) => void;
  products: Product[];
  onImportBackup: (products: Product[]) => void;
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
  onImportFullBackup?: (data: any) => void;
}

export const SupabaseConfigModal: React.FC<SupabaseConfigModalProps> = ({
  isOpen,
  onClose,
  config,
  onSaveConfig,
  products,
  onImportBackup,
  brands = [],
  types = [],
  locations = [],
  customers = [],
  customerLedger = [],
  sales = [],
  customerReturns = [],
  vendors = [],
  vendorLedger = [],
  vendorReturns = [],
  purchases = [],
  purchaseOrders = [],
  quotations = [],
  demands = [],
  expenses = [],
  employees = [],
  registeredDevices = [],
  stockLogs = [],
  pricingSettings,
  onImportFullBackup,
}) => {
  const envConfig = getEnvSupabaseConfig();
  const isCloudConfigured = envConfig.isConfigured || Boolean(config.url && config.anonKey);

  // Manual Credentials Input State
  const [manualUrl, setManualUrl] = useState<string>(() => config.url || envConfig.url || '');
  const [manualKey, setManualKey] = useState<string>(() => config.anonKey || envConfig.anonKey || '');
  const [showManualForm, setShowManualForm] = useState<boolean>(!envConfig.isConfigured);

  // Health and Testing state
  const [isTesting, setIsTesting] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<DetailedConnectionResult | null>(null);

  // Sync state
  const [isSyncingAll, setIsSyncingAll] = useState<boolean>(false);
  const [isPullingAll, setIsPullingAll] = useState<boolean>(false);
  const [syncModuleStatus, setSyncModuleStatus] = useState<Record<string, 'idle' | 'syncing' | 'success' | 'error'>>({});
  const [syncFeedback, setSyncFeedback] = useState<{ success: boolean; message: string } | null>(null);

  // UI Navigation
  const [activeTab, setActiveTab] = useState<'connection' | 'sync' | 'schema' | 'guide' | 'columns'>('connection');
  const [selectedSchemaTab, setSelectedSchemaTab] = useState<'full' | 'products' | 'customers' | 'vendors' | 'quotations' | 'expenses'>('full');
  const [copiedSql, setCopiedSql] = useState<boolean>(false);

  // On initial open, run a quiet connection test if credentials exist
  useEffect(() => {
    if (isOpen && (envConfig.isConfigured || (config.url && config.anonKey)) && !testResult) {
      handleTestConnection(manualUrl || envConfig.url, manualKey || envConfig.anonKey);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleTestConnection = async (urlToTest?: string, keyToTest?: string) => {
    setIsTesting(true);
    setTestResult(null);
    setSyncFeedback(null);

    const targetUrl = urlToTest || manualUrl || envConfig.url || config.url;
    const targetKey = keyToTest || manualKey || envConfig.anonKey || config.anonKey;

    if (!targetUrl || !targetKey) {
      setIsTesting(false);
      setSyncFeedback({ success: false, message: 'Please provide both Supabase URL and Anon Key.' });
      return;
    }

    const res = await testSupabaseConnection(targetUrl, targetKey);
    setIsTesting(false);
    setTestResult(res);

    if (res.success) {
      const updatedConfig: SupabaseConfig = {
        ...config,
        url: targetUrl,
        anonKey: targetKey,
        enabled: true,
        syncStatus: 'connected',
        lastSyncedAt: config.lastSyncedAt || new Date().toISOString(),
      };
      onSaveConfig(updatedConfig);
      const totalRecords = res.tables ? res.tables.reduce((sum, t) => sum + (t.rowCount || 0), 0) : 0;
      setSyncFeedback({ success: true, message: `Connected to Supabase! Latency: ${res.latencyMs}ms (${totalRecords} records found)` });
    } else {
      setSyncFeedback({ success: false, message: `Connection failed: ${res.message}` });
    }
  };

  const handleSaveManualCredentials = () => {
    if (!manualUrl.trim() || !manualKey.trim()) {
      setSyncFeedback({ success: false, message: 'Please enter both Supabase Project URL and Anon Key.' });
      return;
    }
    const cleanUrl = manualUrl.trim();
    const cleanKey = manualKey.trim();
    const newConfig: SupabaseConfig = {
      ...config,
      url: cleanUrl,
      anonKey: cleanKey,
      enabled: true,
      syncStatus: 'connected',
      lastSyncedAt: new Date().toISOString(),
    };
    onSaveConfig(newConfig);
    resetSupabaseClient();
    handleTestConnection(cleanUrl, cleanKey);
  };

  const handlePushAllToCloud = async () => {
    const client = getSupabaseClient(config);
    if (!client) {
      setSyncFeedback({ success: false, message: 'Supabase client could not be initialized. Please configure credentials.' });
      return;
    }

    setIsSyncingAll(true);
    setSyncFeedback(null);

    const bundle = {
      products,
      brands,
      types,
      locations,
      customers,
      customerLedger,
      sales,
      customerReturns,
      vendors,
      vendorLedger,
      vendorReturns,
      purchases,
      purchaseOrders,
      quotations,
      demands,
      expenses,
      employees,
      registeredDevices,
      stockLogs,
      pricingSettings,
    };

    const res = await syncAllModulesToSupabase(client, bundle);
    setIsSyncingAll(false);

    if (res.success) {
      setSyncFeedback({ success: true, message: res.message });
      onSaveConfig({
        ...config,
        url: config.url || envConfig.url,
        anonKey: config.anonKey || envConfig.anonKey,
        enabled: true,
        lastSyncedAt: new Date().toISOString(),
        syncStatus: 'connected',
      });
      // Re-run connection test to refresh table row counts
      handleTestConnection(config.url || envConfig.url, config.anonKey || envConfig.anonKey);
    } else {
      setSyncFeedback({ 
        success: false, 
        message: `Sync encountered issues: ${res.errors.join(' | ') || res.message}` 
      });
    }
  };

  const handlePullAllFromCloud = async () => {
    const client = getSupabaseClient(config);
    if (!client) {
      setSyncFeedback({ success: false, message: 'Supabase client could not be initialized. Please configure credentials.' });
      return;
    }

    setIsPullingAll(true);
    setSyncFeedback(null);

    const res = await fetchAllFromSupabase(client);
    setIsPullingAll(false);

    if (res.success && res.data) {
      if (onImportFullBackup) {
        onImportFullBackup(res.data);
      } else if (onImportBackup && res.data.products) {
        onImportBackup(res.data.products);
      }
      setSyncFeedback({ 
        success: true, 
        message: `Successfully loaded all ERP data from Supabase! (${res.data.products?.length || 0} products, ${res.data.sales?.length || 0} sales, ${res.data.customers?.length || 0} customers, ${res.data.purchases?.length || 0} purchases)` 
      });
      handleTestConnection(config.url || envConfig.url, config.anonKey || envConfig.anonKey);
    } else {
      setSyncFeedback({ success: false, message: `Download failed: ${res.error}` });
    }
  };

  const handleSyncModule = async (module: string) => {
    const client = getSupabaseClient(config);
    if (!client) {
      setSyncFeedback({ success: false, message: 'Please configure Supabase credentials first.' });
      return;
    }

    setSyncModuleStatus(prev => ({ ...prev, [module]: 'syncing' }));

    try {
      if (module === 'products') {
        const res = await syncProductsToSupabase(client, products);
        if (res.success) {
          setSyncFeedback({ success: true, message: `Synced ${res.count} products to Supabase!` });
          setSyncModuleStatus(prev => ({ ...prev, [module]: 'success' }));
        } else {
          setSyncFeedback({ success: false, message: res.error || 'Failed to sync products' });
          setSyncModuleStatus(prev => ({ ...prev, [module]: 'error' }));
        }
      } else if (module === 'sales') {
        const res = await syncSalesToSupabase(client, sales);
        if (res.success) {
          setSyncFeedback({ success: true, message: `Synced ${res.count} sales & invoices to Supabase!` });
          setSyncModuleStatus(prev => ({ ...prev, [module]: 'success' }));
        } else {
          setSyncFeedback({ success: false, message: res.error || 'Failed to sync sales' });
          setSyncModuleStatus(prev => ({ ...prev, [module]: 'error' }));
        }
      } else if (module === 'customers') {
        const res = await syncCustomersToSupabase(client, customers, customerLedger);
        if (res.success) {
          setSyncFeedback({ success: true, message: `Synced ${res.customerCount} customers & ${res.ledgerCount} ledger entries!` });
          setSyncModuleStatus(prev => ({ ...prev, [module]: 'success' }));
        } else {
          setSyncFeedback({ success: false, message: res.error || 'Failed to sync customers' });
          setSyncModuleStatus(prev => ({ ...prev, [module]: 'error' }));
        }
      } else if (module === 'customerReturns') {
        const res = await syncCustomerReturnsToSupabase(client, customerReturns);
        if (res.success) {
          setSyncFeedback({ success: true, message: `Synced ${res.count} customer returns to Supabase!` });
          setSyncModuleStatus(prev => ({ ...prev, [module]: 'success' }));
        } else {
          setSyncFeedback({ success: false, message: res.error || 'Failed to sync customer returns' });
          setSyncModuleStatus(prev => ({ ...prev, [module]: 'error' }));
        }
      } else if (module === 'vendors') {
        const res = await syncVendorsAndPurchasesToSupabase(client, vendors, purchases, purchaseOrders);
        if (res.success) {
          setSyncFeedback({ success: true, message: `Synced ${res.vendorCount} vendors, ${res.purchaseCount} bills & ${res.poCount} POs!` });
          setSyncModuleStatus(prev => ({ ...prev, [module]: 'success' }));
        } else {
          setSyncFeedback({ success: false, message: res.error || 'Failed to sync vendors' });
          setSyncModuleStatus(prev => ({ ...prev, [module]: 'error' }));
        }
      } else if (module === 'vendorLedger') {
        const res = await syncVendorLedgerToSupabase(client, vendorLedger);
        if (res.success) {
          setSyncFeedback({ success: true, message: `Synced ${res.count} vendor ledger entries!` });
          setSyncModuleStatus(prev => ({ ...prev, [module]: 'success' }));
        } else {
          setSyncFeedback({ success: false, message: res.error || 'Failed to sync vendor ledger' });
          setSyncModuleStatus(prev => ({ ...prev, [module]: 'error' }));
        }
      } else if (module === 'vendorReturns') {
        const res = await syncVendorReturnsToSupabase(client, vendorReturns);
        if (res.success) {
          setSyncFeedback({ success: true, message: `Synced ${res.count} vendor returns & debit notes!` });
          setSyncModuleStatus(prev => ({ ...prev, [module]: 'success' }));
        } else {
          setSyncFeedback({ success: false, message: res.error || 'Failed to sync vendor returns' });
          setSyncModuleStatus(prev => ({ ...prev, [module]: 'error' }));
        }
      } else if (module === 'quotations') {
        const res = await syncQuotationsToSupabase(client, quotations);
        if (res.success) {
          setSyncFeedback({ success: true, message: `Synced ${res.count} quotations!` });
          setSyncModuleStatus(prev => ({ ...prev, [module]: 'success' }));
        } else {
          setSyncFeedback({ success: false, message: res.error || 'Failed to sync quotations' });
          setSyncModuleStatus(prev => ({ ...prev, [module]: 'error' }));
        }
      } else if (module === 'demands') {
        const res = await syncDemandsToSupabase(client, demands);
        if (res.success) {
          setSyncFeedback({ success: true, message: `Synced ${res.count} customer demands!` });
          setSyncModuleStatus(prev => ({ ...prev, [module]: 'success' }));
        } else {
          setSyncFeedback({ success: false, message: res.error || 'Failed to sync demands' });
          setSyncModuleStatus(prev => ({ ...prev, [module]: 'error' }));
        }
      } else if (module === 'expenses') {
        const res = await syncExpensesToSupabase(client, expenses);
        if (res.success) {
          setSyncFeedback({ success: true, message: `Synced ${res.count} expense records!` });
          setSyncModuleStatus(prev => ({ ...prev, [module]: 'success' }));
        } else {
          setSyncFeedback({ success: false, message: res.error || 'Failed to sync expenses' });
          setSyncModuleStatus(prev => ({ ...prev, [module]: 'error' }));
        }
      } else if (module === 'stockLogs') {
        const res = await syncStockLogsToSupabase(client, stockLogs);
        if (res.success) {
          setSyncFeedback({ success: true, message: `Synced ${res.count} stock audit logs!` });
          setSyncModuleStatus(prev => ({ ...prev, [module]: 'success' }));
        } else {
          setSyncFeedback({ success: false, message: res.error || 'Failed to sync stock logs' });
          setSyncModuleStatus(prev => ({ ...prev, [module]: 'error' }));
        }
      } else if (module === 'staff') {
        const res = await syncStaffAndDevicesToSupabase(client, employees, registeredDevices);
        if (res.success) {
          setSyncFeedback({ success: true, message: `Synced ${res.employeeCount} staff accounts & ${res.deviceCount} workstations!` });
          setSyncModuleStatus(prev => ({ ...prev, [module]: 'success' }));
        } else {
          setSyncFeedback({ success: false, message: res.error || 'Failed to sync staff' });
          setSyncModuleStatus(prev => ({ ...prev, [module]: 'error' }));
        }
      }
      handleTestConnection(config.url || envConfig.url, config.anonKey || envConfig.anonKey);
    } catch (err: any) {
      setSyncFeedback({ success: false, message: err.message || 'Sync error' });
      setSyncModuleStatus(prev => ({ ...prev, [module]: 'error' }));
    }
  };

  const handlePullProducts = async () => {
    const client = getSupabaseClient(config);
    if (!client) {
      setSyncFeedback({ success: false, message: 'Please configure Supabase credentials first.' });
      return;
    }

    setSyncFeedback(null);
    const res = await fetchProductsFromSupabase(client);
    if (res.success) {
      onImportBackup(res.products);
      setSyncFeedback({ success: true, message: `Downloaded and restored ${res.products.length} products from Supabase!` });
    } else {
      setSyncFeedback({ success: false, message: `Download failed: ${res.error}` });
    }
  };

  const getCurrentSql = () => {
    switch (selectedSchemaTab) {
      case 'products':
        return SCHEMA_PRODUCTS_ONLY;
      case 'customers':
        return SCHEMA_CUSTOMERS_LEDGER;
      case 'vendors':
        return SCHEMA_VENDORS_PURCHASING;
      case 'quotations':
        return SCHEMA_QUOTATIONS_DEMANDS;
      case 'expenses':
        return SCHEMA_EXPENSES_STAFF;
      case 'full':
      default:
        return SCHEMA_FULL_DATABASE;
    }
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(getCurrentSql());
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2500);
  };

  const handleExportFullJson = () => {
    const fullBackup = {
      exportDate: new Date().toISOString(),
      app: 'Precision Inventory & ERP',
      products,
      brands,
      types,
      locations,
      customers,
      customerLedger,
      sales,
      customerReturns,
      vendors,
      vendorLedger,
      vendorReturns,
      purchases,
      purchaseOrders,
      quotations,
      demands,
      expenses,
      employees,
      registeredDevices,
      stockLogs,
      pricingSettings,
    };

    const blob = new Blob([JSON.stringify(fullBackup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Precision_ERP_FullBackup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportJsonFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (Array.isArray(parsed)) {
          onImportBackup(parsed);
          setSyncFeedback({ success: true, message: `Restored ${parsed.length} products from backup file!` });
        } else if (parsed.products && Array.isArray(parsed.products)) {
          onImportBackup(parsed.products);
          setSyncFeedback({ success: true, message: `Restored ${parsed.products.length} products from structured backup file!` });
        }
      } catch {
        setSyncFeedback({ success: false, message: 'Invalid JSON backup file format.' });
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl border border-red-100 w-full max-w-4xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-2 sm:my-6 flex flex-col max-h-[92vh]">
        
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-red-600 via-red-700 to-slate-900 px-5 sm:px-6 py-4 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-inner shrink-0">
              <Database className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-white tracking-tight truncate">
                  Supabase Cloud Connection & Sync
                </h2>
                {testResult?.success && (
                  <span className="text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Online ({testResult.latencyMs || 25}ms)
                  </span>
                )}
              </div>
              <p className="text-xs text-red-100/90 truncate">
                Relational PostgreSQL database & Supabase Auth synchronization
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-white/80 hover:text-white p-2 rounded-xl hover:bg-white/10 transition-colors shrink-0 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-4 sm:px-6 pt-2 gap-1 overflow-x-auto whitespace-nowrap shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('connection')}
            className={`px-3.5 py-2.5 text-xs font-bold rounded-t-xl transition-all border-t border-x shrink-0 flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'connection'
                ? 'bg-white text-red-600 border-slate-200 border-b-white -mb-px shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 border-transparent'
            }`}
          >
            <Server className="w-3.5 h-3.5" />
            <span>Connection & Health</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('sync')}
            className={`px-3.5 py-2.5 text-xs font-bold rounded-t-xl transition-all border-t border-x shrink-0 flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'sync'
                ? 'bg-white text-red-600 border-slate-200 border-b-white -mb-px shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 border-transparent'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Cloud Sync Hub</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('schema')}
            className={`px-3.5 py-2.5 text-xs font-bold rounded-t-xl transition-all border-t border-x shrink-0 flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'schema'
                ? 'bg-white text-red-600 border-slate-200 border-b-white -mb-px shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 border-transparent'
            }`}
          >
            <FileCode2 className="w-3.5 h-3.5" />
            <span>SQL Schema Scripts</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('guide')}
            className={`px-3.5 py-2.5 text-xs font-bold rounded-t-xl transition-all border-t border-x shrink-0 flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'guide'
                ? 'bg-white text-red-600 border-slate-200 border-b-white -mb-px shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 border-transparent'
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Setup Guide</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('columns')}
            className={`px-3.5 py-2.5 text-xs font-bold rounded-t-xl transition-all border-t border-x shrink-0 flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'columns'
                ? 'bg-white text-red-600 border-slate-200 border-b-white -mb-px shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 border-transparent'
            }`}
          >
            <TableProperties className="w-3.5 h-3.5" />
            <span>Column Dictionary</span>
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
          
          {/* Notification Feedback Banners */}
          {testResult && (
            <div
              className={`p-3.5 rounded-2xl text-xs font-semibold flex items-start gap-2.5 border ${
                testResult.success
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-red-50 text-red-800 border-red-200'
              }`}
            >
              {testResult.success ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
              )}
              <div className="flex-1">
                <span>{testResult.message}</span>
                {testResult.projectHost && (
                  <div className="text-[11px] text-emerald-700 font-mono mt-0.5">
                    Endpoint: {testResult.projectHost}
                  </div>
                )}
              </div>
            </div>
          )}

          {syncFeedback && (
            <div
              className={`p-3.5 rounded-2xl text-xs font-semibold flex items-center gap-2.5 border ${
                syncFeedback.success
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-red-50 text-red-800 border-red-200'
              }`}
            >
              {syncFeedback.success ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              )}
              <span>{syncFeedback.message}</span>
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 1: CONNECTION & DATABASE HEALTH                       */}
          {/* ========================================================= */}
          {activeTab === 'connection' && (
            <div className="space-y-4">
              
              {/* Credentials & Setup Card */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
                  <div>
                    <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                      <Key className="w-4 h-4 text-red-600" />
                      <span>Supabase Cloud Credentials</span>
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Enter your project URL and public Anon Key from your Supabase dashboard (or configure via <code className="font-mono text-slate-700 bg-slate-200/80 px-1 py-0.5 rounded">src/config.ts</code>).
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {isCloudConfigured ? (
                      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-100 border border-emerald-300 px-3 py-1 rounded-xl shrink-0">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span>Connected / Configured</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-700 bg-amber-100 border border-amber-300 px-3 py-1 rounded-xl shrink-0">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>Action Required</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Direct Credentials Input Form */}
                <div className="space-y-3 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                        Supabase Project URL
                      </label>
                      <input
                        type="text"
                        value={manualUrl}
                        onChange={(e) => setManualUrl(e.target.value)}
                        placeholder="https://xyzcompany.supabase.co"
                        className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-hidden bg-slate-50 focus:bg-white transition-colors"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                        Supabase Public Anon Key
                      </label>
                      <input
                        type="password"
                        value={manualKey}
                        onChange={(e) => setManualKey(e.target.value)}
                        placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                        className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-hidden bg-slate-50 focus:bg-white transition-colors"
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2 border-t border-slate-100">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        id="btn-save-manual-supabase"
                        onClick={handleSaveManualCredentials}
                        className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
                      >
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>Save & Test Connection</span>
                      </button>

                      <button
                        type="button"
                        id="btn-test-supabase-connection"
                        onClick={() => handleTestConnection()}
                        disabled={isTesting}
                        className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl transition-colors disabled:opacity-50 flex items-center gap-1.5 cursor-pointer border border-slate-200"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
                        <span>{isTesting ? 'Testing Latency...' : 'Test Connection'}</span>
                      </button>
                    </div>

                    <a
                      href="https://supabase.com/dashboard"
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs font-bold text-slate-600 hover:text-slate-900 flex items-center gap-1 hover:underline"
                    >
                      <span>Open Supabase Dashboard</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              </div>

              {/* Database Table Health Inspector */}
              <div className="border border-slate-200 rounded-2xl p-4 bg-white space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-emerald-600" />
                    <span className="text-xs font-black text-slate-900 uppercase tracking-wider">
                      Database Tables Health & Status
                    </span>
                  </div>
                  {testResult && (
                    <span className="text-[11px] font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg">
                      {testResult.readyTableCount} / {testResult.totalTableCount} Tables Active
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                  {(testResult?.tables || [
                    { tableName: 'inventory_products', label: 'Inventory Products', exists: false, rowCount: products.length, status: 'ready' },
                    { tableName: 'sales', label: 'Sales & POS Invoices', exists: false, rowCount: sales.length, status: 'ready' },
                    { tableName: 'customer_returns', label: 'Customer Returns & Credits', exists: false, rowCount: customerReturns.length, status: 'ready' },
                    { tableName: 'customers', label: 'Customers Directory', exists: false, rowCount: customers.length, status: 'ready' },
                    { tableName: 'customer_ledger', label: 'Customer Ledger Entries', exists: false, rowCount: customerLedger.length, status: 'ready' },
                    { tableName: 'vendors', label: 'Vendors & Suppliers', exists: false, rowCount: vendors.length, status: 'ready' },
                    { tableName: 'vendor_ledger', label: 'Vendor Ledgers', exists: false, rowCount: vendorLedger.length, status: 'ready' },
                    { tableName: 'vendor_returns', label: 'Vendor Returns & Debits', exists: false, rowCount: vendorReturns.length, status: 'ready' },
                    { tableName: 'purchases', label: 'Purchase Bills', exists: false, rowCount: purchases.length, status: 'ready' },
                    { tableName: 'purchase_orders', label: 'Purchase Orders', exists: false, rowCount: purchaseOrders.length, status: 'ready' },
                    { tableName: 'quotations', label: 'Quotations & Estimates', exists: false, rowCount: quotations.length, status: 'ready' },
                    { tableName: 'demands', label: 'Customer Demands', exists: false, rowCount: demands.length, status: 'ready' },
                    { tableName: 'expenses', label: 'Expenses Records', exists: false, rowCount: expenses.length, status: 'ready' },
                    { tableName: 'stock_logs', label: 'Stock Movement Logs', exists: false, rowCount: stockLogs.length, status: 'ready' },
                    { tableName: 'employee_accounts', label: 'Staff Accounts', exists: false, rowCount: employees.length, status: 'ready' },
                    { tableName: 'registered_devices', label: 'Registered Terminals', exists: false, rowCount: registeredDevices.length, status: 'ready' },
                  ]).map((t) => (
                    <div 
                      key={t.tableName}
                      className={`p-2.5 rounded-xl border text-xs flex items-center justify-between gap-2 ${
                        t.status === 'ready'
                          ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                          : t.status === 'missing'
                          ? 'bg-amber-50/70 border-amber-200 text-amber-950'
                          : 'bg-slate-50 border-slate-200 text-slate-700'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="font-bold truncate text-[11px]">{t.label}</div>
                        <div className="font-mono text-[10px] text-slate-500 truncate">{t.tableName}</div>
                      </div>

                      <div className="text-right shrink-0">
                        {t.status === 'ready' ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-md">
                            <Check className="w-3 h-3" />
                            {t.rowCount > 0 ? `${t.rowCount} rows` : 'Active'}
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setActiveTab('schema')}
                            className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-100/80 hover:bg-amber-200 px-2 py-0.5 rounded-md cursor-pointer transition-colors"
                          >
                            <AlertTriangle className="w-3 h-3" />
                            Run SQL
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Quick SQL Schema Action Card */}
              <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-slate-700 shadow-md">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <FileCode2 className="w-4 h-4 text-emerald-400" />
                    <h4 className="text-xs font-black uppercase tracking-wider text-white">
                      Where is the Database SQL Code?
                    </h4>
                  </div>
                  <p className="text-xs text-slate-300">
                    The complete PostgreSQL DDL schema with all 20 tables, relational columns (dimensions, prices, sales, ledgers), indexes, and RLS policies is ready to copy or view.
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0 flex-wrap">
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(SCHEMA_FULL_DATABASE);
                      setCopiedSql(true);
                      setTimeout(() => setCopiedSql(false), 2500);
                    }}
                    className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  >
                    {copiedSql ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedSql ? 'Master SQL Copied!' : 'Copy Master SQL'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('schema')}
                    className="px-3.5 py-2 bg-white/15 hover:bg-white/25 text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer border border-white/20"
                  >
                    <FileCode2 className="w-3.5 h-3.5" />
                    <span>View SQL Scripts</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 2: CLOUD SYNCHRONIZATION HUB                          */}
          {/* ========================================================= */}
          {activeTab === 'sync' && (
            <div className="space-y-4">
              
              {/* Full Sync Banner */}
              <div className="bg-gradient-to-br from-slate-900 to-red-950 text-white rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-red-900/40 shadow-md">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-red-600 text-[10px] font-bold uppercase tracking-wider">
                      Master Sync
                    </span>
                    <h3 className="text-sm font-bold text-white">Full Multi-Table Cloud Synchronization</h3>
                  </div>
                  <p className="text-xs text-slate-300">
                    Push all ERP records (products, sales, ledgers, bills, returns, staff) to Supabase or pull everything down to restore your local database.
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0 flex-wrap">
                  <button
                    type="button"
                    id="btn-full-push-supabase"
                    onClick={handlePushAllToCloud}
                    disabled={isSyncingAll || !isCloudConfigured}
                    className="px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl transition-colors disabled:opacity-50 flex items-center gap-2 shadow-md cursor-pointer"
                  >
                    <ArrowUpToLine className={`w-4 h-4 ${isSyncingAll ? 'animate-spin' : ''}`} />
                    <span>{isSyncingAll ? 'Pushing All Tables...' : 'Push All to Cloud'}</span>
                  </button>

                  <button
                    type="button"
                    id="btn-full-pull-supabase"
                    onClick={handlePullAllFromCloud}
                    disabled={isPullingAll || !isCloudConfigured}
                    className="px-4 py-2.5 bg-white hover:bg-slate-100 text-slate-900 text-xs font-bold rounded-xl transition-colors disabled:opacity-50 flex items-center gap-2 shadow-md cursor-pointer"
                  >
                    <ArrowDownToLine className={`w-4 h-4 ${isPullingAll ? 'animate-spin' : ''}`} />
                    <span>{isPullingAll ? 'Restoring All...' : 'Pull All from Cloud'}</span>
                  </button>
                </div>
              </div>

              {/* Modular Sync Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                
                {/* 1. Products */}
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-red-100 text-red-600 flex items-center justify-center font-bold text-xs">
                        <Database className="w-4 h-4" />
                      </div>
                      <span className="font-bold text-xs text-slate-900">Products</span>
                    </div>
                    <span className="font-mono text-xs font-bold text-slate-600">{products.length} items</span>
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Dimensions (H, OD, ID, Thread), Prices & Tiers
                  </div>
                  <div className="flex items-center gap-1.5 pt-1">
                    <button
                      type="button"
                      onClick={() => handleSyncModule('products')}
                      disabled={!isCloudConfigured}
                      className="flex-1 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-800 text-[11px] font-bold rounded-lg transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1"
                    >
                      <ArrowUpToLine className="w-3 h-3 text-red-600" />
                      <span>Push</span>
                    </button>
                    <button
                      type="button"
                      onClick={handlePullProducts}
                      disabled={!isCloudConfigured}
                      className="flex-1 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-800 text-[11px] font-bold rounded-lg transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1"
                    >
                      <ArrowDownToLine className="w-3 h-3 text-slate-700" />
                      <span>Pull</span>
                    </button>
                  </div>
                </div>

                {/* 2. Sales & POS Invoices */}
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold text-xs">
                        <ShoppingCart className="w-4 h-4" />
                      </div>
                      <span className="font-bold text-xs text-slate-900">Sales & Invoices</span>
                    </div>
                    <span className="font-mono text-xs font-bold text-slate-600">{sales.length} orders</span>
                  </div>
                  <div className="text-[11px] text-slate-500">
                    POS receipts, itemized line items, totals
                  </div>
                  <div className="flex items-center gap-1.5 pt-1">
                    <button
                      type="button"
                      onClick={() => handleSyncModule('sales')}
                      disabled={!isCloudConfigured}
                      className="w-full py-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-800 text-[11px] font-bold rounded-lg transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1"
                    >
                      <ArrowUpToLine className="w-3 h-3 text-emerald-600" />
                      <span>Push Sales & Invoices</span>
                    </button>
                  </div>
                </div>

                {/* 3. Customers & Ledgers */}
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs">
                        <Users className="w-4 h-4" />
                      </div>
                      <span className="font-bold text-xs text-slate-900">Customers</span>
                    </div>
                    <span className="font-mono text-xs font-bold text-slate-600">{customers.length} ({customerLedger.length} rows)</span>
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Customer profiles, machines, debit/credit ledger
                  </div>
                  <div className="flex items-center gap-1.5 pt-1">
                    <button
                      type="button"
                      onClick={() => handleSyncModule('customers')}
                      disabled={!isCloudConfigured}
                      className="w-full py-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-800 text-[11px] font-bold rounded-lg transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1"
                    >
                      <ArrowUpToLine className="w-3 h-3 text-blue-600" />
                      <span>Push Customers & Ledgers</span>
                    </button>
                  </div>
                </div>

                {/* 4. Customer Returns */}
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center font-bold text-xs">
                        <RotateCcw className="w-4 h-4" />
                      </div>
                      <span className="font-bold text-xs text-slate-900">Customer Returns</span>
                    </div>
                    <span className="font-mono text-xs font-bold text-slate-600">{customerReturns.length} returns</span>
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Return entries, refund credit notes, stock re-entry
                  </div>
                  <div className="flex items-center gap-1.5 pt-1">
                    <button
                      type="button"
                      onClick={() => handleSyncModule('customerReturns')}
                      disabled={!isCloudConfigured}
                      className="w-full py-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-800 text-[11px] font-bold rounded-lg transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1"
                    >
                      <ArrowUpToLine className="w-3 h-3 text-rose-600" />
                      <span>Push Returns</span>
                    </button>
                  </div>
                </div>

                {/* 5. Vendors & Purchases */}
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center font-bold text-xs">
                        <Briefcase className="w-4 h-4" />
                      </div>
                      <span className="font-bold text-xs text-slate-900">Vendors & POs</span>
                    </div>
                    <span className="font-mono text-xs font-bold text-slate-600">{vendors.length} ({purchases.length} bills)</span>
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Vendor balances, purchase bills & PO orders
                  </div>
                  <div className="flex items-center gap-1.5 pt-1">
                    <button
                      type="button"
                      onClick={() => handleSyncModule('vendors')}
                      disabled={!isCloudConfigured}
                      className="w-full py-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-800 text-[11px] font-bold rounded-lg transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1"
                    >
                      <ArrowUpToLine className="w-3 h-3 text-purple-600" />
                      <span>Push Vendors & Purchases</span>
                    </button>
                  </div>
                </div>

                {/* 6. Vendor Ledger */}
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-xs">
                        <Receipt className="w-4 h-4" />
                      </div>
                      <span className="font-bold text-xs text-slate-900">Vendor Ledger</span>
                    </div>
                    <span className="font-mono text-xs font-bold text-slate-600">{vendorLedger.length} entries</span>
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Supplier debit/credit transactions & running balances
                  </div>
                  <div className="flex items-center gap-1.5 pt-1">
                    <button
                      type="button"
                      onClick={() => handleSyncModule('vendorLedger')}
                      disabled={!isCloudConfigured}
                      className="w-full py-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-800 text-[11px] font-bold rounded-lg transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1"
                    >
                      <ArrowUpToLine className="w-3 h-3 text-indigo-600" />
                      <span>Push Vendor Ledger</span>
                    </button>
                  </div>
                </div>

                {/* 7. Quotations */}
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center font-bold text-xs">
                        <FileText className="w-4 h-4" />
                      </div>
                      <span className="font-bold text-xs text-slate-900">Quotations</span>
                    </div>
                    <span className="font-mono text-xs font-bold text-slate-600">{quotations.length} estimates</span>
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Customer price quotes (7-day validity)
                  </div>
                  <div className="flex items-center gap-1.5 pt-1">
                    <button
                      type="button"
                      onClick={() => handleSyncModule('quotations')}
                      disabled={!isCloudConfigured}
                      className="w-full py-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-800 text-[11px] font-bold rounded-lg transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1"
                    >
                      <ArrowUpToLine className="w-3 h-3 text-amber-600" />
                      <span>Push Quotations</span>
                    </button>
                  </div>
                </div>

                {/* 8. Expenses */}
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-teal-100 text-teal-600 flex items-center justify-center font-bold text-xs">
                        <DollarSign className="w-4 h-4" />
                      </div>
                      <span className="font-bold text-xs text-slate-900">Expenses</span>
                    </div>
                    <span className="font-mono text-xs font-bold text-slate-600">{expenses.length} records</span>
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Shop overheads, utilities, receipts
                  </div>
                  <div className="flex items-center gap-1.5 pt-1">
                    <button
                      type="button"
                      onClick={() => handleSyncModule('expenses')}
                      disabled={!isCloudConfigured}
                      className="w-full py-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-800 text-[11px] font-bold rounded-lg transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1"
                    >
                      <ArrowUpToLine className="w-3 h-3 text-teal-600" />
                      <span>Push Expenses</span>
                    </button>
                  </div>
                </div>

                {/* 9. Stock Audit Logs */}
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-cyan-100 text-cyan-700 flex items-center justify-center font-bold text-xs">
                        <History className="w-4 h-4" />
                      </div>
                      <span className="font-bold text-xs text-slate-900">Stock Logs</span>
                    </div>
                    <span className="font-mono text-xs font-bold text-slate-600">{stockLogs.length} logs</span>
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Physical stock audit trails & adjustments
                  </div>
                  <div className="flex items-center gap-1.5 pt-1">
                    <button
                      type="button"
                      onClick={() => handleSyncModule('stockLogs')}
                      disabled={!isCloudConfigured}
                      className="w-full py-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-800 text-[11px] font-bold rounded-lg transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1"
                    >
                      <ArrowUpToLine className="w-3 h-3 text-cyan-700" />
                      <span>Push Stock Logs</span>
                    </button>
                  </div>
                </div>

                {/* 10. Staff & Hardware */}
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-slate-200 text-slate-800 flex items-center justify-center font-bold text-xs">
                        <Shield className="w-4 h-4" />
                      </div>
                      <span className="font-bold text-xs text-slate-900">Staff & Devices</span>
                    </div>
                    <span className="font-mono text-xs font-bold text-slate-600">{employees.length} staff</span>
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Staff credentials, roles & authorized PCs
                  </div>
                  <div className="flex items-center gap-1.5 pt-1">
                    <button
                      type="button"
                      onClick={() => handleSyncModule('staff')}
                      disabled={!isCloudConfigured}
                      className="w-full py-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-800 text-[11px] font-bold rounded-lg transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1"
                    >
                      <ArrowUpToLine className="w-3 h-3 text-slate-700" />
                      <span>Push Staff & Terminals</span>
                    </button>
                  </div>
                </div>

              </div>

              {/* Local Offline JSON Backup Section */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className="text-xs font-bold text-slate-800 block">Offline Local JSON Backup</span>
                  <span className="text-[11px] text-slate-500">Export or import a complete standalone backup file of all system records</span>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={handleExportFullJson}
                    className="px-3.5 py-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  >
                    <Download className="w-3.5 h-3.5 text-slate-600" />
                    <span>Download JSON Backup</span>
                  </button>

                  <label className="px-3.5 py-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs">
                    <Upload className="w-3.5 h-3.5 text-slate-600" />
                    <span>Restore File</span>
                    <input type="file" accept=".json" onChange={handleImportJsonFile} className="hidden" />
                  </label>
                </div>
              </div>

            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 3: SQL SCHEMA SCRIPTS                                 */}
          {/* ========================================================= */}
          {activeTab === 'schema' && (
            <div className="space-y-3">
              
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5">
                {/* Script Selector Sub-tabs */}
                <div className="flex items-center gap-1.5 overflow-x-auto bg-slate-100 p-1 rounded-xl scrollbar-thin">
                  <button
                    type="button"
                    onClick={() => setSelectedSchemaTab('full')}
                    className={`px-3 py-1 text-[11px] font-bold rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                      selectedSchemaTab === 'full' ? 'bg-white text-red-600 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    All 15 Tables (Master)
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedSchemaTab('products')}
                    className={`px-3 py-1 text-[11px] font-bold rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                      selectedSchemaTab === 'products' ? 'bg-white text-red-600 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Products & Inventory
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedSchemaTab('customers')}
                    className={`px-3 py-1 text-[11px] font-bold rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                      selectedSchemaTab === 'customers' ? 'bg-white text-red-600 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Customers & Ledger
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedSchemaTab('vendors')}
                    className={`px-3 py-1 text-[11px] font-bold rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                      selectedSchemaTab === 'vendors' ? 'bg-white text-red-600 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Vendors & Purchasing
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedSchemaTab('quotations')}
                    className={`px-3 py-1 text-[11px] font-bold rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                      selectedSchemaTab === 'quotations' ? 'bg-white text-red-600 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Quotations & Demands
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedSchemaTab('expenses')}
                    className={`px-3 py-1 text-[11px] font-bold rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                      selectedSchemaTab === 'expenses' ? 'bg-white text-red-600 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Expenses & Staff
                  </button>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[11px] font-mono text-slate-500 hidden sm:inline">
                    {getCurrentSql().split('\n').length} lines
                  </span>
                  <button
                    type="button"
                    id="btn-copy-supabase-sql"
                    onClick={handleCopySql}
                    className="text-xs text-white bg-red-600 hover:bg-red-700 font-bold flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-xl transition-colors cursor-pointer shrink-0 shadow-2xs"
                  >
                    {copiedSql ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedSql ? 'Copied to Clipboard!' : 'Copy SQL Script'}</span>
                  </button>
                </div>
              </div>

              {/* Code display block */}
              <div className="relative">
                <div className="absolute top-2 right-3 z-10 flex items-center gap-1.5 bg-slate-900/80 backdrop-blur-xs px-2.5 py-1 rounded-lg border border-slate-700/60 text-[10px] text-emerald-400 font-mono">
                  <span>PostgreSQL DDL & RLS</span>
                </div>
                <pre className="p-4 bg-slate-950 text-emerald-400 rounded-2xl text-[11px] font-mono overflow-x-auto max-h-80 leading-relaxed border border-slate-800 shadow-inner">
                  {getCurrentSql()}
                </pre>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-slate-600 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <span>
                  Paste this script into <strong>Supabase Dashboard &gt; SQL Editor &gt; New query</strong> and click <strong>Run</strong>.
                </span>
                <a
                  href="https://supabase.com/dashboard/project/_/sql"
                  target="_blank"
                  rel="noreferrer"
                  className="font-bold text-red-600 hover:text-red-700 flex items-center gap-1 shrink-0"
                >
                  <span>Open Supabase SQL Editor</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>

            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 4: STEP-BY-STEP SETUP GUIDE                           */}
          {/* ========================================================= */}
          {activeTab === 'guide' && (
            <div className="space-y-4">
              <div className="bg-red-50/60 border border-red-200 rounded-2xl p-4 text-xs text-red-950 space-y-1">
                <div className="font-bold text-sm text-red-800 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-red-600" />
                  <span>How to connect your free Supabase database in 4 steps</span>
                </div>
                <p className="text-red-900/90 leading-relaxed text-xs">
                  Supabase provides an enterprise-grade cloud PostgreSQL database with automated backups, real-time sync, and user authentication.
                </p>
              </div>

              <div className="space-y-3 text-xs">
                
                {/* Step 1 */}
                <div className="p-4 bg-white border border-slate-200 rounded-2xl flex items-start gap-3.5">
                  <div className="w-7 h-7 rounded-xl bg-red-600 text-white font-black flex items-center justify-center text-xs shrink-0 mt-0.5">
                    1
                  </div>
                  <div className="space-y-1 flex-1">
                    <h4 className="font-bold text-slate-900">Create a New Project on Supabase</h4>
                    <p className="text-slate-600">
                      Sign in to <a href="https://supabase.com" target="_blank" rel="noreferrer" className="text-red-600 underline font-semibold">supabase.com</a>, click <strong>New Project</strong>, select a database password, and choose your preferred cloud region.
                    </p>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="p-4 bg-white border border-slate-200 rounded-2xl flex items-start gap-3.5">
                  <div className="w-7 h-7 rounded-xl bg-red-600 text-white font-black flex items-center justify-center text-xs shrink-0 mt-0.5">
                    2
                  </div>
                  <div className="space-y-1 flex-1">
                    <h4 className="font-bold text-slate-900">Copy Project URL & Anon Public API Key</h4>
                    <p className="text-slate-600">
                      In your Supabase project dashboard, navigate to <strong>Project Settings &gt; API</strong>. Copy the <strong>Project URL</strong> and the <strong>anon public API key</strong>.
                    </p>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="p-4 bg-white border border-slate-200 rounded-2xl flex items-start gap-3.5">
                  <div className="w-7 h-7 rounded-xl bg-red-600 text-white font-black flex items-center justify-center text-xs shrink-0 mt-0.5">
                    3
                  </div>
                  <div className="space-y-1 flex-1">
                    <h4 className="font-bold text-slate-900">Run the SQL Setup Script</h4>
                    <p className="text-slate-600">
                      Go to the <strong>SQL Schema Scripts</strong> tab in this modal, copy the script, then go to <strong>Supabase Dashboard &gt; SQL Editor</strong>, paste it, and click <strong>Run</strong>.
                    </p>
                  </div>
                </div>

                {/* Step 4 */}
                <div className="p-4 bg-white border border-slate-200 rounded-2xl flex items-start gap-3.5">
                  <div className="w-7 h-7 rounded-xl bg-red-600 text-white font-black flex items-center justify-center text-xs shrink-0 mt-0.5">
                    4
                  </div>
                  <div className="space-y-1 flex-1">
                    <h4 className="font-bold text-slate-900">Sync & Go Live!</h4>
                    <p className="text-slate-600">
                      Click <strong>Sync All to Cloud</strong> in the Cloud Sync Hub. All your local products, price tiers, customer ledgers, and vendor bills are now permanently backed up and synced in PostgreSQL!
                    </p>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 5: CELL-BY-CELL COLUMN MAP                            */}
          {/* ========================================================= */}
          {activeTab === 'columns' && (
            <div className="space-y-3">
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3.5 text-xs text-amber-900 flex items-start gap-2.5">
                <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="block font-bold">Relational Cell-by-Cell Architecture</strong>
                  Every single dimension, unit conversion, price tier, and category is saved into dedicated atomic SQL columns (no opaque JSON blobs for inventory queries).
                </div>
              </div>

              <div className="border border-slate-200 rounded-2xl overflow-x-auto text-xs max-h-80 overflow-y-auto">
                <table className="w-full text-left min-w-[500px]">
                  <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 sticky top-0">
                    <tr>
                      <th className="px-3 py-2">Column Name</th>
                      <th className="px-3 py-2">SQL Type</th>
                      <th className="px-3 py-2">Sample Value / Meaning</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono text-[11px] text-slate-800">
                    <tr className="bg-white">
                      <td className="px-3 py-1.5 font-bold text-red-700">internal_id</td>
                      <td className="px-3 py-1.5 text-slate-500">TEXT</td>
                      <td className="px-3 py-1.5 font-sans text-slate-600">Unique internal code (e.g. KFH-2501)</td>
                    </tr>
                    <tr className="bg-slate-50/50">
                      <td className="px-3 py-1.5 font-bold text-red-700">name</td>
                      <td className="px-3 py-1.5 text-slate-500">TEXT</td>
                      <td className="px-3 py-1.5 font-sans text-slate-600">Part Number / Model (e.g. sfc-5706)</td>
                    </tr>
                    <tr className="bg-white">
                      <td className="px-3 py-1.5 font-bold text-blue-700">height_inch</td>
                      <td className="px-3 py-1.5 text-slate-500">NUMERIC</td>
                      <td className="px-3 py-1.5 font-sans text-slate-600">Height in Inches (e.g. 7.850)</td>
                    </tr>
                    <tr className="bg-slate-50/50">
                      <td className="px-3 py-1.5 font-bold text-blue-700">height_mm</td>
                      <td className="px-3 py-1.5 text-slate-500">NUMERIC</td>
                      <td className="px-3 py-1.5 font-sans text-slate-600">Height in Millimeters (e.g. 199.390)</td>
                    </tr>
                    <tr className="bg-white">
                      <td className="px-3 py-1.5 font-bold text-blue-700">outer_dia_inch</td>
                      <td className="px-3 py-1.5 text-slate-500">NUMERIC</td>
                      <td className="px-3 py-1.5 font-sans text-slate-600">Outer Diameter (OD / Length) in Inches</td>
                    </tr>
                    <tr className="bg-slate-50/50">
                      <td className="px-3 py-1.5 font-bold text-blue-700">inner_dia_inch</td>
                      <td className="px-3 py-1.5 text-slate-500">NUMERIC</td>
                      <td className="px-3 py-1.5 font-sans text-slate-600">Inner Diameter (ID / Width) in Inches</td>
                    </tr>
                    <tr className="bg-white">
                      <td className="px-3 py-1.5 font-bold text-purple-700">thread</td>
                      <td className="px-3 py-1.5 text-slate-500">TEXT</td>
                      <td className="px-3 py-1.5 font-sans text-slate-600">Thread pitch specification (e.g. 1"-16 UNF)</td>
                    </tr>
                    <tr className="bg-slate-50/50">
                      <td className="px-3 py-1.5 font-bold text-emerald-700">cost_price</td>
                      <td className="px-3 py-1.5 text-slate-500">NUMERIC</td>
                      <td className="px-3 py-1.5 font-sans text-slate-600">Cost Buying Price in PKR</td>
                    </tr>
                    <tr className="bg-white">
                      <td className="px-3 py-1.5 font-bold text-emerald-700">wholesale_price</td>
                      <td className="px-3 py-1.5 text-slate-500">NUMERIC</td>
                      <td className="px-3 py-1.5 font-sans text-slate-600">Tier 1 Selling Price (Wholesale) in PKR</td>
                    </tr>
                    <tr className="bg-slate-50/50">
                      <td className="px-3 py-1.5 font-bold text-emerald-700">retail_price</td>
                      <td className="px-3 py-1.5 text-slate-500">NUMERIC</td>
                      <td className="px-3 py-1.5 font-sans text-slate-600">Tier 2 Selling Price (Retail) in PKR</td>
                    </tr>
                    <tr className="bg-white">
                      <td className="px-3 py-1.5 font-bold text-slate-900">stock_quantity</td>
                      <td className="px-3 py-1.5 text-slate-500">NUMERIC</td>
                      <td className="px-3 py-1.5 font-sans text-slate-600">Current available on-hand stock</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="px-5 sm:px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-500 font-medium truncate flex items-center gap-2">
            <span>{products.length} Products</span>
            <span>•</span>
            <span>{customers.length} Customers</span>
            <span>•</span>
            <span>{vendors.length} Vendors</span>
          </div>
          
          <button
            type="button"
            id="btn-close-supabase-modal"
            onClick={onClose}
            className="px-5 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-black rounded-xl shadow-md transition-colors cursor-pointer shrink-0"
          >
            Done
          </button>
        </div>

      </div>
    </div>
  );
};
