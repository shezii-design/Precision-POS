import React, { useState, useMemo } from 'react';
import { 
  StockLog, 
  Product, 
  StockMovementType 
} from '../types';
import { 
  ClipboardList, 
  Search, 
  Filter, 
  Download, 
  FileSpreadsheet, 
  FileText, 
  Calendar, 
  ArrowUpRight, 
  ArrowDownRight, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  Layers, 
  Building2, 
  Tag, 
  Box, 
  MapPin, 
  ChevronRight, 
  ChevronDown, 
  History, 
  Clock, 
  SlidersHorizontal,
  X,
  TrendingUp,
  TrendingDown,
  Info,
  DollarSign,
  ArrowRight,
  ShieldCheck,
  RotateCcw
} from 'lucide-react';
import { exportAuditLogsToExcel, exportAuditLogsToCSV } from '../services/excel';

interface InventoryAuditLogProps {
  logs?: StockLog[];
  products?: Product[];
  onRefresh?: () => void;
  onOpenAdjustModal?: (product: Product) => void;
}

export const InventoryAuditLog: React.FC<InventoryAuditLogProps> = ({
  logs = [],
  products = [],
  onRefresh,
  onOpenAdjustModal,
}) => {
  const safeLogs = logs || [];
  const safeProducts = products || [];

  // Search and Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMovementType, setSelectedMovementType] = useState<string>('all');
  const [selectedDirection, setSelectedDirection] = useState<'all' | 'in' | 'out' | 'zero'>('all');
  const [selectedProductId, setSelectedProductId] = useState<string>('all');
  const [selectedLocation, setSelectedLocation] = useState<string>('all');
  const [dateRangePreset, setDateRangePreset] = useState<'all' | 'today' | 'yesterday' | 'last7' | 'last30' | 'this_month' | 'custom'>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  // Sort State
  const [sortField, setSortField] = useState<'timestamp' | 'productName' | 'change' | 'totalValue'>('timestamp');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);

  // Selected Log for detail drawer / modal
  const [selectedLog, setSelectedLog] = useState<StockLog | null>(null);
  const [timelineProductId, setTimelineProductId] = useState<string | null>(null);

  // Export dropdown state
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);

  // Unique locations from products and logs
  const availableLocations = useMemo(() => {
    const locSet = new Set<string>();
    safeProducts.forEach(p => {
      if (p?.locationName) locSet.add(p.locationName);
    });
    safeLogs.forEach(l => {
      if (l?.locationName) locSet.add(l.locationName);
    });
    return Array.from(locSet).filter(Boolean);
  }, [safeProducts, safeLogs]);

  // Filtered logs calculation
  const filteredLogs = useMemo(() => {
    return safeLogs.filter(log => {
      if (!log) return false;
      // 1. Text Search (Product name, Internal ID, Brand, Type, Reference #, Entity, Notes)
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchesName = log.productName?.toLowerCase().includes(query);
        const matchesInternalId = log.internalId?.toLowerCase().includes(query);
        const matchesBrand = log.brandName?.toLowerCase().includes(query);
        const matchesType = log.typeName?.toLowerCase().includes(query);
        const matchesRef = log.referenceNumber?.toLowerCase().includes(query) || log.referenceId?.toLowerCase().includes(query);
        const matchesEntity = log.entityName?.toLowerCase().includes(query);
        const matchesNotes = log.notes?.toLowerCase().includes(query);
        const matchesReason = log.reason?.toLowerCase().includes(query);

        if (!matchesName && !matchesInternalId && !matchesBrand && !matchesType && !matchesRef && !matchesEntity && !matchesNotes && !matchesReason) {
          return false;
        }
      }

      // 2. Movement Type Filter
      if (selectedMovementType !== 'all') {
        const logType = log.movementType || (
          log.reason === 'Sale' ? 'sale' :
          log.reason === 'Purchase' ? 'purchase' :
          log.reason === 'Received Stock' ? 'po_receive' :
          log.reason === 'Damage / Return' ? 'customer_return' :
          log.reason === 'Initial Count' ? 'initial_count' : 'manual_adjustment'
        );
        if (logType !== selectedMovementType) return false;
      }

      // 3. Direction Filter
      if (selectedDirection === 'in' && log.change <= 0) return false;
      if (selectedDirection === 'out' && log.change >= 0) return false;
      if (selectedDirection === 'zero' && log.change !== 0) return false;

      // 4. Product Filter
      if (selectedProductId !== 'all' && log.productId !== selectedProductId) {
        return false;
      }

      // 5. Location Filter
      if (selectedLocation !== 'all' && log.locationName !== selectedLocation) {
        return false;
      }

      // 6. Date Range Filter
      const logDate = new Date(log.timestamp);
      const now = new Date();
      if (dateRangePreset === 'today') {
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        if (logDate < startOfDay) return false;
      } else if (dateRangePreset === 'yesterday') {
        const startOfYesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
        const endOfYesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        if (logDate < startOfYesterday || logDate >= endOfYesterday) return false;
      } else if (dateRangePreset === 'last7') {
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        if (logDate < sevenDaysAgo) return false;
      } else if (dateRangePreset === 'last30') {
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        if (logDate < thirtyDaysAgo) return false;
      } else if (dateRangePreset === 'this_month') {
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        if (logDate < startOfMonth) return false;
      } else if (dateRangePreset === 'custom') {
        if (startDate) {
          const start = new Date(startDate);
          start.setHours(0, 0, 0, 0);
          if (logDate < start) return false;
        }
        if (endDate) {
          const end = new Date(endDate);
          end.setHours(23, 59, 59, 999);
          if (logDate > end) return false;
        }
      }

      return true;
    });
  }, [logs, searchTerm, selectedMovementType, selectedDirection, selectedProductId, selectedLocation, dateRangePreset, startDate, endDate]);

  // Sort filtered logs
  const sortedLogs = useMemo(() => {
    return [...filteredLogs].sort((a, b) => {
      let comparison = 0;
      if (sortField === 'timestamp') {
        comparison = new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
      } else if (sortField === 'productName') {
        comparison = (a.productName || '').localeCompare(b.productName || '');
      } else if (sortField === 'change') {
        comparison = a.change - b.change;
      } else if (sortField === 'totalValue') {
        comparison = (a.totalMovementValue || 0) - (b.totalMovementValue || 0);
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [filteredLogs, sortField, sortOrder]);

  // Aggregate Metrics for current filtered view
  const metrics = useMemo(() => {
    let totalInward = 0;
    let totalOutward = 0;
    let totalValue = 0;
    let salesCount = 0;
    let purchasesCount = 0;
    let returnsCount = 0;
    let adjustmentsCount = 0;

    sortedLogs.forEach(l => {
      if (l.change > 0) totalInward += l.change;
      if (l.change < 0) totalOutward += Math.abs(l.change);
      if (l.totalMovementValue) totalValue += l.totalMovementValue;

      const mType = l.movementType || l.reason;
      if (mType === 'sale' || mType === 'Sale') salesCount++;
      else if (mType === 'purchase' || mType === 'Purchase' || mType === 'po_receive' || mType === 'Received Stock') purchasesCount++;
      else if (mType === 'customer_return' || mType === 'vendor_return' || mType === 'Damage / Return') returnsCount++;
      else adjustmentsCount++;
    });

    return {
      totalMovements: sortedLogs.length,
      totalInward,
      totalOutward,
      netChange: totalInward - totalOutward,
      totalValue,
      salesCount,
      purchasesCount,
      returnsCount,
      adjustmentsCount,
    };
  }, [sortedLogs]);

  // Pagination slicing
  const totalPages = Math.max(1, Math.ceil(sortedLogs.length / itemsPerPage));
  const paginatedLogs = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return sortedLogs.slice(start, start + itemsPerPage);
  }, [sortedLogs, currentPage, itemsPerPage]);

  // Reset page when filters change
  const handleFilterChange = () => {
    setCurrentPage(1);
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    setSelectedMovementType('all');
    setSelectedDirection('all');
    setSelectedProductId('all');
    setSelectedLocation('all');
    setDateRangePreset('all');
    setStartDate('');
    setEndDate('');
    setCurrentPage(1);
  };

  const hasActiveFilters = searchTerm !== '' || 
    selectedMovementType !== 'all' || 
    selectedDirection !== 'all' || 
    selectedProductId !== 'all' || 
    selectedLocation !== 'all' || 
    dateRangePreset !== 'all' || 
    startDate !== '' || 
    endDate !== '';

  // Get movement type visual styling & human label
  const getMovementTypeMeta = (log: StockLog) => {
    const type = log.movementType || (
      log.reason === 'Sale' ? 'sale' :
      log.reason === 'Purchase' ? 'purchase' :
      log.reason === 'Received Stock' ? 'po_receive' :
      log.reason === 'Damage / Return' ? 'customer_return' :
      log.reason === 'Initial Count' ? 'initial_count' : 'manual_adjustment'
    );

    switch (type) {
      case 'sale':
        return {
          label: 'Customer Sale',
          bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          dot: 'bg-emerald-500',
          icon: ArrowDownRight,
          tag: 'SALE',
        };
      case 'purchase':
        return {
          label: 'Supplier Purchase',
          bg: 'bg-blue-50 text-blue-700 border-blue-200',
          dot: 'bg-blue-500',
          icon: ArrowUpRight,
          tag: 'PURCHASE',
        };
      case 'po_receive':
        return {
          label: 'PO Cargo Inward',
          bg: 'bg-indigo-50 text-indigo-700 border-indigo-200',
          dot: 'bg-indigo-500',
          icon: Box,
          tag: 'PO INWARD',
        };
      case 'customer_return':
        return {
          label: 'Customer Return',
          bg: 'bg-teal-50 text-teal-700 border-teal-200',
          dot: 'bg-teal-500',
          icon: RotateCcw,
          tag: 'CUST RETURN',
        };
      case 'vendor_return':
        return {
          label: 'Vendor Return',
          bg: 'bg-amber-50 text-amber-700 border-amber-200',
          dot: 'bg-amber-500',
          icon: ArrowDownRight,
          tag: 'VND RETURN',
        };
      case 'initial_count':
        return {
          label: 'Opening Balance',
          bg: 'bg-sky-50 text-sky-700 border-sky-200',
          dot: 'bg-sky-500',
          icon: Layers,
          tag: 'OPENING',
        };
      case 'delete_rollback':
        return {
          label: 'Deleted Rollback',
          bg: 'bg-rose-50 text-rose-700 border-rose-200',
          dot: 'bg-rose-500',
          icon: RotateCcw,
          tag: 'ROLLBACK',
        };
      case 'manual_adjustment':
      default:
        return {
          label: log.reason || 'Manual Adjustment',
          bg: 'bg-purple-50 text-purple-700 border-purple-200',
          dot: 'bg-purple-500',
          icon: SlidersHorizontal,
          tag: 'ADJUSTMENT',
        };
    }
  };

  // Product Timeline logs when inspecting a specific product
  const timelineLogs = useMemo(() => {
    if (!timelineProductId) return [];
    return safeLogs
      .filter(l => l && l.productId === timelineProductId)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }, [safeLogs, timelineProductId]);

  const timelineProduct = useMemo(() => {
    if (!timelineProductId) return null;
    return safeProducts.find(p => p.id === timelineProductId) || null;
  }, [safeProducts, timelineProductId]);

  return (
    <div id="inventory-audit-log-view" className="space-y-6 animate-in fade-in duration-200">
      {/* 1. Header & Quick Actions */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-red-50 border border-red-200 flex items-center justify-center text-red-600 shrink-0 shadow-xs">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  Inventory Audit Log
                </h1>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
                  {safeLogs.length} Total Records
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  Real-time Transparent Ledger
                </span>
              </div>
              <p className="text-sm text-slate-500 mt-1 max-w-2xl">
                Comprehensive, immutable record of every product movement across sales, purchases, cargo inward, customer/vendor returns, and manual physical audits with before/after stock snapshots.
              </p>
            </div>
          </div>

          {/* Export & Action Buttons */}
          <div className="flex items-center gap-2.5 shrink-0 self-start md:self-center">
            {onRefresh && (
              <button
                id="btn-refresh-audit-logs"
                onClick={onRefresh}
                title="Refresh logs from local storage"
                className="inline-flex items-center justify-center p-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            )}

            {/* Export Dropdown */}
            <div className="relative">
              <button
                id="btn-export-audit-menu"
                onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 text-white hover:bg-slate-800 text-sm font-semibold shadow-xs transition-colors"
              >
                <Download className="w-4 h-4" />
                <span>Export Audit Log</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {isExportMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-200 py-2 z-30 animate-in fade-in zoom-in-95 duration-100">
                  <div className="px-3 py-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Export Filtered ({sortedLogs.length} rows)
                  </div>
                  <button
                    id="btn-export-excel"
                    onClick={() => {
                      exportAuditLogsToExcel(sortedLogs);
                      setIsExportMenuOpen(false);
                    }}
                    className="w-full text-left px-3.5 py-2.5 text-sm text-slate-700 hover:bg-emerald-50 hover:text-emerald-800 flex items-center gap-2.5 transition-colors"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                    <div>
                      <div className="font-semibold">Microsoft Excel (.xlsx)</div>
                      <div className="text-[11px] text-slate-500">Includes formatted columns & formulas</div>
                    </div>
                  </button>
                  <button
                    id="btn-export-csv"
                    onClick={() => {
                      exportAuditLogsToCSV(sortedLogs);
                      setIsExportMenuOpen(false);
                    }}
                    className="w-full text-left px-3.5 py-2.5 text-sm text-slate-700 hover:bg-blue-50 hover:text-blue-800 flex items-center gap-2.5 transition-colors"
                  >
                    <FileText className="w-4 h-4 text-blue-600" />
                    <div>
                      <div className="font-semibold">CSV Spreadsheet (.csv)</div>
                      <div className="text-[11px] text-slate-500">Universal comma-separated format</div>
                    </div>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 2. Key Audit Metrics Ribbon */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 mt-6 pt-6 border-t border-slate-100">
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Total Audits</span>
            <span className="text-lg font-black text-slate-900 mt-0.5 block">{metrics.totalMovements}</span>
            <span className="text-[11px] text-slate-500">Matching filters</span>
          </div>

          <div className="p-3.5 bg-emerald-50/60 rounded-xl border border-emerald-100">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">Total Inward (+)</span>
              <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
            </div>
            <span className="text-lg font-black text-emerald-700 mt-0.5 block">+{metrics.totalInward.toLocaleString()}</span>
            <span className="text-[11px] text-emerald-600/80">Purchases & Returns</span>
          </div>

          <div className="p-3.5 bg-rose-50/60 rounded-xl border border-rose-100">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-rose-800 uppercase tracking-wider">Total Outward (-)</span>
              <TrendingDown className="w-3.5 h-3.5 text-rose-600" />
            </div>
            <span className="text-lg font-black text-rose-700 mt-0.5 block">-{metrics.totalOutward.toLocaleString()}</span>
            <span className="text-[11px] text-rose-600/80">Dispatched in Sales</span>
          </div>

          <div className="p-3.5 bg-blue-50/60 rounded-xl border border-blue-100">
            <span className="text-[11px] font-bold text-blue-800 uppercase tracking-wider block">Net Inventory Δ</span>
            <span className={`text-lg font-black mt-0.5 block ${metrics.netChange >= 0 ? 'text-blue-700' : 'text-rose-700'}`}>
              {metrics.netChange >= 0 ? `+${metrics.netChange.toLocaleString()}` : metrics.netChange.toLocaleString()}
            </span>
            <span className="text-[11px] text-blue-600/80">Physical delta balance</span>
          </div>

          <div className="p-3.5 bg-purple-50/60 rounded-xl border border-purple-100">
            <span className="text-[11px] font-bold text-purple-800 uppercase tracking-wider block">Movement Value</span>
            <span className="text-lg font-black text-purple-900 mt-0.5 block">₨ {Math.round(metrics.totalValue).toLocaleString()}</span>
            <span className="text-[11px] text-purple-700/80">Monetary throughput</span>
          </div>

          <div className="p-3.5 bg-amber-50/60 rounded-xl border border-amber-100">
            <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider block">Sales / Restocks</span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-base font-black text-slate-800">{metrics.salesCount}</span>
              <span className="text-xs text-slate-400 font-normal">/</span>
              <span className="text-base font-black text-emerald-700">{metrics.returnsCount}</span>
            </div>
            <span className="text-[11px] text-amber-700/80">{metrics.purchasesCount} Purchases • {metrics.adjustmentsCount} Audits</span>
          </div>
        </div>
      </div>

      {/* 3. Filtering Control Panel */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-500" />
            <span className="text-sm font-bold text-slate-800">Filter & Search Audit Trail</span>
          </div>

          {hasActiveFilters && (
            <button
              id="btn-clear-all-filters"
              onClick={handleResetFilters}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg transition-colors"
            >
              <X className="w-3.5 h-3.5" />
              <span>Clear Active Filters</span>
            </button>
          )}
        </div>

        {/* Search input & primary dropdowns */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3">
          {/* Text Search */}
          <div className="lg:col-span-4 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              id="input-audit-search"
              type="text"
              value={searchTerm}
              onChange={e => {
                setSearchTerm(e.target.value);
                handleFilterChange();
              }}
              placeholder="Search product, ID (KFH-2501), ref #, vendor/customer..."
              className="w-full pl-9 pr-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all text-slate-900"
            />
            {searchTerm && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  handleFilterChange();
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Movement Type Filter */}
          <div className="lg:col-span-3">
            <select
              id="select-movement-type"
              value={selectedMovementType}
              onChange={e => {
                setSelectedMovementType(e.target.value);
                handleFilterChange();
              }}
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-red-500/20 focus:border-red-500 text-slate-800 font-medium"
            >
              <option value="all">All Movement Types</option>
              <option value="sale">Customer Sales (Outflow)</option>
              <option value="purchase">Supplier Purchases (Inflow)</option>
              <option value="po_receive">PO Cargo Received (Inflow)</option>
              <option value="customer_return">Customer Returns (Restocked)</option>
              <option value="vendor_return">Vendor Returns (Sent Back)</option>
              <option value="manual_adjustment">Manual Audit Adjustments</option>
              <option value="initial_count">Initial Opening Balances</option>
              <option value="delete_rollback">Deleted Transaction Rollbacks</option>
            </select>
          </div>

          {/* Stock Direction Filter */}
          <div className="lg:col-span-2">
            <select
              id="select-stock-direction"
              value={selectedDirection}
              onChange={e => {
                setSelectedDirection(e.target.value as any);
                handleFilterChange();
              }}
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-red-500/20 focus:border-red-500 text-slate-800 font-medium"
            >
              <option value="all">All Directions</option>
              <option value="in">Inflow Only (+)</option>
              <option value="out">Outflow Only (-)</option>
              <option value="zero">Zero Delta (0)</option>
            </select>
          </div>

          {/* Date Range Preset */}
          <div className="lg:col-span-3">
            <select
              id="select-date-range-preset"
              value={dateRangePreset}
              onChange={e => {
                setDateRangePreset(e.target.value as any);
                handleFilterChange();
              }}
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-red-500/20 focus:border-red-500 text-slate-800 font-medium"
            >
              <option value="all">All Time History</option>
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="last7">Last 7 Days</option>
              <option value="last30">Last 30 Days</option>
              <option value="this_month">This Month</option>
              <option value="custom">Custom Date Range...</option>
            </select>
          </div>
        </div>

        {/* Secondary Filter Row: Specific Product, Location, Custom Date Picker */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 pt-2 border-t border-slate-100">
          {/* Specific Product Select */}
          <div className="lg:col-span-4">
            <select
              id="select-specific-product"
              value={selectedProductId}
              onChange={e => {
                setSelectedProductId(e.target.value);
                handleFilterChange();
              }}
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-red-500/20 focus:border-red-500 text-slate-800 font-medium"
            >
              <option value="all">All Products in Catalog ({products.length})</option>
              {products.map(p => (
                <option key={p.id} value={p.id}>
                  {p.internalId ? `[${p.internalId}] ` : ''}{p.name} ({p.brandName || 'Generic'})
                </option>
              ))}
            </select>
          </div>

          {/* Location Select */}
          <div className="lg:col-span-3">
            <select
              id="select-location"
              value={selectedLocation}
              onChange={e => {
                setSelectedLocation(e.target.value);
                handleFilterChange();
              }}
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-red-500/20 focus:border-red-500 text-slate-800 font-medium"
            >
              <option value="all">All Warehouses & Locations</option>
              {availableLocations.map(loc => (
                <option key={loc} value={loc}>
                  {loc}
                </option>
              ))}
            </select>
          </div>

          {/* Custom Date Inputs (only when 'custom' selected) */}
          {dateRangePreset === 'custom' && (
            <>
              <div className="lg:col-span-2">
                <input
                  id="input-audit-start-date"
                  type="date"
                  value={startDate}
                  onChange={e => {
                    setStartDate(e.target.value);
                    handleFilterChange();
                  }}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-red-500/20 focus:border-red-500 text-slate-800 font-medium"
                  placeholder="From Date"
                />
              </div>
              <div className="lg:col-span-3">
                <input
                  id="input-audit-end-date"
                  type="date"
                  value={endDate}
                  onChange={e => {
                    setEndDate(e.target.value);
                    handleFilterChange();
                  }}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-red-500/20 focus:border-red-500 text-slate-800 font-medium"
                  placeholder="To Date"
                />
              </div>
            </>
          )}
        </div>
      </div>

      {/* 4. Audit Trail Table & Historical Snapshots */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {/* Table Header & Quick Sorters */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between flex-wrap gap-3 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Showing {paginatedLogs.length} of {sortedLogs.length} Audit Entries
            </span>
            {hasActiveFilters && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                Filtered View Active
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 text-xs text-slate-500 font-medium">
              <span>Rows per page:</span>
              <select
                id="select-items-per-page"
                value={itemsPerPage}
                onChange={e => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-semibold text-slate-800"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>
        </div>

        {/* Main Ledger Table */}
        {paginatedLogs.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mx-auto mb-4">
              <ClipboardList className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-slate-800">No Audit Records Found</h3>
            <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">
              No inventory movements matched your active search queries and filters.
            </p>
            {hasActiveFilters && (
              <button
                onClick={handleResetFilters}
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Reset All Filters</span>
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[900px]">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider select-none">
                  <th className="py-3 px-4">
                    <button
                      onClick={() => {
                        if (sortField === 'timestamp') setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                        else {
                          setSortField('timestamp');
                          setSortOrder('desc');
                        }
                      }}
                      className="flex items-center gap-1.5 hover:text-slate-900"
                    >
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>Timestamp</span>
                    </button>
                  </th>
                  <th className="py-3 px-4">
                    <button
                      onClick={() => {
                        if (sortField === 'productName') setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                        else {
                          setSortField('productName');
                          setSortOrder('asc');
                        }
                      }}
                      className="flex items-center gap-1.5 hover:text-slate-900"
                    >
                      <Box className="w-3.5 h-3.5 text-slate-400" />
                      <span>Product & Details</span>
                    </button>
                  </th>
                  <th className="py-3 px-4">Movement Type & Event</th>
                  <th className="py-3 px-4">Reference & Entity</th>
                  <th className="py-3 px-4 text-center">
                    <button
                      onClick={() => {
                        if (sortField === 'change') setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                        else {
                          setSortField('change');
                          setSortOrder('desc');
                        }
                      }}
                      className="inline-flex items-center gap-1.5 hover:text-slate-900"
                    >
                      <span>Historical Stock Snapshot</span>
                    </button>
                  </th>
                  <th className="py-3 px-4 text-right">
                    <button
                      onClick={() => {
                        if (sortField === 'totalValue') setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                        else {
                          setSortField('totalValue');
                          setSortOrder('desc');
                        }
                      }}
                      className="inline-flex items-center gap-1.5 hover:text-slate-900 ml-auto"
                    >
                      <span>Value / Rate</span>
                    </button>
                  </th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                {paginatedLogs.map((log) => {
                  const meta = getMovementTypeMeta(log);
                  const MetaIcon = meta.icon;
                  const dateObj = new Date(log.timestamp);
                  const isValidDate = !isNaN(dateObj.getTime());
                  const formattedDate = isValidDate
                    ? dateObj.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                    : log.timestamp;
                  const formattedTime = isValidDate
                    ? dateObj.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: true })
                    : '';

                  const isPositive = log.change > 0;
                  const isNegative = log.change < 0;

                  return (
                    <tr 
                      key={log.id} 
                      className="hover:bg-slate-50/70 transition-colors group cursor-pointer"
                      onClick={() => setSelectedLog(log)}
                    >
                      {/* Timestamp Column */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="font-semibold text-slate-900 text-xs">{formattedDate}</div>
                        <div className="text-[11px] text-slate-500 font-mono flex items-center gap-1 mt-0.5">
                          <Clock className="w-3 h-3 text-slate-400" />
                          <span>{formattedTime}</span>
                        </div>
                      </td>

                      {/* Product Details Column */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-start gap-2.5">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              {log.internalId && (
                                <span className="px-2 py-0.5 rounded-md text-[11px] font-mono font-bold bg-slate-100 text-slate-700 border border-slate-200">
                                  {log.internalId}
                                </span>
                              )}
                              <span className="font-bold text-slate-900 text-sm truncate hover:text-red-600 transition-colors">
                                {log.productName}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-slate-500 mt-1 flex-wrap">
                              {log.brandName && (
                                <span className="font-semibold text-slate-700">{log.brandName}</span>
                              )}
                              {log.typeName && (
                                <>
                                  <span className="text-slate-300">•</span>
                                  <span>{log.typeName}</span>
                                </>
                              )}
                              {(log.locationName || log.cabinNumber) && (
                                <>
                                  <span className="text-slate-300">•</span>
                                  <span className="inline-flex items-center gap-1 text-[11px] text-slate-600 font-mono">
                                    <MapPin className="w-3 h-3 text-slate-400" />
                                    {log.locationName || 'Main Shop'}{log.cabinNumber ? ` (${log.cabinNumber})` : ''}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Movement Type & Badge */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex flex-col items-start gap-1">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border ${meta.bg}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`}></span>
                            {meta.label}
                          </span>
                          {log.reason && log.reason !== meta.label && (
                            <span className="text-[11px] text-slate-500 pl-1">
                              {log.reason}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Reference & Entity */}
                      <td className="py-3.5 px-4">
                        <div className="min-w-0">
                          {(log.referenceNumber || log.referenceId) ? (
                            <div className="font-mono text-xs font-bold text-slate-800 flex items-center gap-1.5">
                              <Tag className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span>{log.referenceNumber || log.referenceId}</span>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400 italic">No ref doc</span>
                          )}

                          {log.entityName && (
                            <div className="text-xs text-slate-600 truncate mt-0.5 flex items-center gap-1">
                              <Building2 className="w-3 h-3 text-slate-400 shrink-0" />
                              <span className="truncate">{log.entityName}</span>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Historical Stock Snapshot (Previous -> Delta -> New) */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center justify-center gap-2 font-mono">
                          {/* Previous Stock Snapshot */}
                          <div className="px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 text-center min-w-[50px]">
                            <span className="text-[10px] text-slate-400 block font-sans font-bold uppercase leading-none mb-0.5">Prev</span>
                            <span className="text-xs font-bold text-slate-700">{log.previousStock}</span>
                          </div>

                          {/* Delta Change Indicator */}
                          <div className={`flex items-center gap-0.5 px-2 py-1 rounded-lg text-xs font-black border ${
                            isPositive ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                            isNegative ? 'bg-rose-50 text-rose-700 border-rose-200' :
                            'bg-slate-100 text-slate-600 border-slate-200'
                          }`}>
                            {isPositive ? (
                              <>
                                <ArrowUpRight className="w-3.5 h-3.5" />
                                <span>+{log.change}</span>
                              </>
                            ) : isNegative ? (
                              <>
                                <ArrowDownRight className="w-3.5 h-3.5" />
                                <span>{log.change}</span>
                              </>
                            ) : (
                              <span>0</span>
                            )}
                          </div>

                          {/* Arrow */}
                          <ArrowRight className="w-3 h-3 text-slate-300 shrink-0" />

                          {/* New Stock Snapshot */}
                          <div className="px-2.5 py-1 rounded-lg bg-slate-900 text-white border border-slate-800 text-center min-w-[50px] shadow-xs">
                            <span className="text-[10px] text-slate-400 block font-sans font-bold uppercase leading-none mb-0.5">New</span>
                            <span className="text-xs font-black">{log.newStock}</span>
                          </div>
                        </div>

                        {/* Unit subtitle */}
                        <div className="text-center text-[10px] text-slate-400 font-sans mt-0.5">
                          {log.unit || 'Pcs'}
                        </div>
                      </td>

                      {/* Value / Unit Rate */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        {log.totalMovementValue !== undefined && log.totalMovementValue > 0 ? (
                          <>
                            <div className="font-bold text-slate-900 text-xs">
                              ₨ {Math.round(log.totalMovementValue).toLocaleString()}
                            </div>
                            {log.unitRate !== undefined && log.unitRate > 0 && (
                              <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                                @ ₨ {Math.round(log.unitRate).toLocaleString()}
                              </div>
                            )}
                          </>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>

                      {/* Action / View Timeline button */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            id={`btn-product-timeline-${log.productId}`}
                            onClick={() => setTimelineProductId(log.productId)}
                            title="Inspect complete historical timeline for this product"
                            className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-red-600 hover:border-red-200 hover:bg-red-50/50 transition-colors"
                          >
                            <History className="w-4 h-4" />
                          </button>

                          {onOpenAdjustModal && (
                            <button
                              id={`btn-adjust-from-audit-${log.productId}`}
                              onClick={() => {
                                const prod = products.find(p => p.id === log.productId);
                                if (prod) onOpenAdjustModal(prod);
                              }}
                              title="Perform immediate physical count adjustment"
                              className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                            >
                              <SlidersHorizontal className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* 5. Pagination Footer */}
        {sortedLogs.length > 0 && (
          <div className="px-5 py-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between flex-wrap gap-3">
            <div className="text-xs text-slate-500 font-medium">
              Showing <span className="font-bold text-slate-900">{(currentPage - 1) * itemsPerPage + 1}</span> to{' '}
              <span className="font-bold text-slate-900">{Math.min(currentPage * itemsPerPage, sortedLogs.length)}</span> of{' '}
              <span className="font-bold text-slate-900">{sortedLogs.length}</span> audit logs
            </div>

            <div className="flex items-center gap-1.5">
              <button
                id="btn-audit-prev-page"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:pointer-events-none transition-colors"
              >
                Previous
              </button>

              <div className="flex items-center gap-1 px-2">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum: number;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }

                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`w-8 h-8 rounded-lg text-xs font-bold transition-colors ${
                        currentPage === pageNum
                          ? 'bg-red-600 text-white shadow-xs'
                          : 'text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>

              <button
                id="btn-audit-next-page"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:pointer-events-none transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 6. Detail Drawer Modal (Single Log Inspection) */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="bg-slate-900 text-white px-5 sm:px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center font-bold text-white border border-white/20">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold">Audit Movement Details</h3>
                  <p className="text-xs text-slate-400 font-mono">ID: {selectedLog.id}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="text-slate-400 hover:text-white p-1.5 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-5 sm:p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              {/* Product Info Banner */}
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200">
                <div className="flex items-center gap-2">
                  {selectedLog.internalId && (
                    <span className="font-mono text-xs font-bold text-red-600 bg-red-50 border border-red-200 px-2.5 py-0.5 rounded-md">
                      {selectedLog.internalId}
                    </span>
                  )}
                  <span className="font-bold text-slate-900 text-base">{selectedLog.productName}</span>
                </div>
                <div className="text-xs text-slate-600 mt-1 flex items-center gap-2 flex-wrap">
                  {selectedLog.brandName && <span>Brand: <strong>{selectedLog.brandName}</strong></span>}
                  {selectedLog.typeName && <span>• Type: <strong>{selectedLog.typeName}</strong></span>}
                  {selectedLog.locationName && (
                    <span>• Bin: <strong>{selectedLog.locationName}{selectedLog.cabinNumber ? ` (${selectedLog.cabinNumber})` : ''}</strong></span>
                  )}
                </div>
              </div>

              {/* Stock Snapshot Transition Box */}
              <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-2xl p-4 shadow-md">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Historical Stock Balance Transition
                </div>
                <div className="flex items-center justify-between gap-3 font-mono">
                  <div>
                    <span className="text-[11px] text-slate-400 block">Previous Stock</span>
                    <span className="text-xl font-bold text-slate-200">{selectedLog.previousStock} {selectedLog.unit || 'Pcs'}</span>
                  </div>

                  <div className="text-center">
                    <span className="text-[11px] text-slate-400 block">Movement Delta</span>
                    <span className={`text-base font-black px-2.5 py-0.5 rounded-md inline-block ${
                      selectedLog.change > 0 ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30' :
                      selectedLog.change < 0 ? 'bg-rose-500/20 text-rose-300 border border-rose-400/30' :
                      'bg-slate-700 text-slate-300'
                    }`}>
                      {selectedLog.change > 0 ? `+${selectedLog.change}` : selectedLog.change}
                    </span>
                  </div>

                  <div className="text-right">
                    <span className="text-[11px] text-slate-400 block">New Balance Snapshot</span>
                    <span className="text-xl font-black text-white">{selectedLog.newStock} {selectedLog.unit || 'Pcs'}</span>
                  </div>
                </div>
              </div>

              {/* Metadata Details Grid */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-slate-400 font-bold uppercase tracking-wider block text-[10px]">Movement Event</span>
                  <span className="font-bold text-slate-800 mt-0.5 block">{selectedLog.reason}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-slate-400 font-bold uppercase tracking-wider block text-[10px]">Timestamp</span>
                  <span className="font-semibold text-slate-800 mt-0.5 block">
                    {new Date(selectedLog.timestamp).toLocaleString('en-GB')}
                  </span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-slate-400 font-bold uppercase tracking-wider block text-[10px]">Reference Document</span>
                  <span className="font-mono font-bold text-slate-800 mt-0.5 block">
                    {selectedLog.referenceNumber || selectedLog.referenceId || 'N/A'}
                  </span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-slate-400 font-bold uppercase tracking-wider block text-[10px]">Customer / Vendor</span>
                  <span className="font-semibold text-slate-800 mt-0.5 block truncate">
                    {selectedLog.entityName || 'General / System'}
                  </span>
                </div>
              </div>

              {/* Monetary Details if any */}
              {selectedLog.totalMovementValue !== undefined && selectedLog.totalMovementValue > 0 && (
                <div className="p-3.5 bg-purple-50/70 border border-purple-100 rounded-xl flex items-center justify-between text-xs">
                  <div>
                    <span className="text-purple-700 font-bold uppercase tracking-wider block text-[10px]">Movement Valuation</span>
                    <span className="text-slate-600">Unit rate: ₨ {Math.round(selectedLog.unitRate || 0).toLocaleString()}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-base font-black text-purple-900">
                      ₨ {Math.round(selectedLog.totalMovementValue).toLocaleString()}
                    </span>
                  </div>
                </div>
              )}

              {/* Notes / Details */}
              {selectedLog.notes && (
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Audit Notes & Transaction Context
                  </span>
                  <p className="text-xs text-slate-700 font-mono leading-relaxed whitespace-pre-wrap">
                    {selectedLog.notes}
                  </p>
                </div>
              )}

              {/* Footer action buttons */}
              <div className="flex items-center justify-between gap-3 pt-2">
                <button
                  onClick={() => {
                    setTimelineProductId(selectedLog.productId);
                    setSelectedLog(null);
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors"
                >
                  <History className="w-4 h-4 text-slate-500" />
                  <span>View Product Timeline</span>
                </button>

                <button
                  onClick={() => setSelectedLog(null)}
                  className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 7. Product History Timeline Drawer / Modal */}
      {timelineProductId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="bg-slate-900 text-white px-5 sm:px-6 py-4 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-600 flex items-center justify-center font-bold text-white border border-red-500">
                  <History className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold">
                    Product Lifecycle Timeline
                  </h3>
                  <p className="text-xs text-slate-400">
                    Chronological audit trajectory for {timelineProduct?.name || 'Product'} ({timelineLogs.length} events)
                  </p>
                </div>
              </div>
              <button
                onClick={() => setTimelineProductId(null)}
                className="text-slate-400 hover:text-white p-1.5 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Product Summary Bar */}
            {timelineProduct && (
              <div className="bg-slate-50 px-6 py-3 border-b border-slate-200 flex items-center justify-between flex-wrap gap-2 text-xs shrink-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-md">
                    {timelineProduct.internalId}
                  </span>
                  <span className="font-bold text-slate-900">{timelineProduct.name}</span>
                  <span className="text-slate-500">({timelineProduct.brandName} • {timelineProduct.typeName})</span>
                </div>
                <div className="flex items-center gap-3 font-mono">
                  <span className="text-slate-500">Current Stock:</span>
                  <span className="font-black text-slate-900 bg-white border border-slate-200 px-2.5 py-0.5 rounded-md">
                    {timelineProduct.stockQuantity} {timelineProduct.unit}
                  </span>
                </div>
              </div>
            )}

            {/* Timeline Stream */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              {timelineLogs.length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-sm">
                  No recorded historical movements for this product.
                </div>
              ) : (
                <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200">
                  {timelineLogs.map((log, idx) => {
                    const meta = getMovementTypeMeta(log);
                    const isPositive = log.change > 0;
                    const isNegative = log.change < 0;

                    return (
                      <div key={log.id} className="relative group">
                        {/* Timeline Node Dot */}
                        <div className={`absolute -left-6 top-1.5 w-5 h-5 rounded-full border-2 border-white shadow-xs flex items-center justify-center ${meta.dot}`}>
                        </div>

                        {/* Event Card */}
                        <div className="bg-slate-50 hover:bg-white hover:shadow-md border border-slate-200 rounded-2xl p-4 transition-all">
                          <div className="flex items-center justify-between flex-wrap gap-2">
                            <div className="flex items-center gap-2">
                              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-bold border ${meta.bg}`}>
                                {meta.label}
                              </span>
                              {log.referenceNumber && (
                                <span className="font-mono text-xs font-semibold text-slate-700 bg-white border border-slate-200 px-2 py-0.5 rounded-md">
                                  {log.referenceNumber}
                                </span>
                              )}
                            </div>

                            <span className="text-xs text-slate-500 font-mono">
                              {new Date(log.timestamp).toLocaleString('en-GB')}
                            </span>
                          </div>

                          {/* Snapshot values */}
                          <div className="mt-3 flex items-center justify-between gap-2 text-xs font-mono bg-white p-2.5 rounded-xl border border-slate-100">
                            <div>
                              <span className="text-slate-400 text-[10px] block font-sans">Previous</span>
                              <span className="font-bold text-slate-700">{log.previousStock}</span>
                            </div>

                            <div className="text-center">
                              <span className="text-slate-400 text-[10px] block font-sans">Delta</span>
                              <span className={`font-black ${isPositive ? 'text-emerald-600' : isNegative ? 'text-rose-600' : 'text-slate-600'}`}>
                                {isPositive ? `+${log.change}` : log.change}
                              </span>
                            </div>

                            <div className="text-right">
                              <span className="text-slate-400 text-[10px] block font-sans">Resulting Balance</span>
                              <span className="font-black text-slate-900">{log.newStock} {log.unit || 'Pcs'}</span>
                            </div>
                          </div>

                          {/* Notes */}
                          {log.notes && (
                            <p className="mt-2.5 text-xs text-slate-600 font-mono leading-relaxed">
                              {log.notes}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="bg-slate-50 px-6 py-3.5 border-t border-slate-200 flex items-center justify-end shrink-0">
              <button
                onClick={() => setTimelineProductId(null)}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors"
              >
                Close Timeline
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
