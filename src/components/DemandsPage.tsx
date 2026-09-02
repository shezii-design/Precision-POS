import React, { useState, useMemo } from 'react';
import { Customer, Demand, DemandFilterOptions, DemandStatus, Product, Sale } from '../types';
import { 
  FileText, 
  Plus, 
  Search, 
  Filter, 
  Calendar, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  Ban, 
  Trash2, 
  Edit3, 
  ShoppingCart, 
  User, 
  Phone, 
  MapPin, 
  Layers, 
  ArrowRight, 
  Printer, 
  Sparkles, 
  Tag, 
  ExternalLink, 
  ChevronDown, 
  Check, 
  RotateCcw,
  PackageSearch,
  MessageSquare,
  AlertCircle,
  X
} from 'lucide-react';
import { formatPKR } from '../services/pricing';

interface DemandsPageProps {
  demands: Demand[];
  customers: Customer[];
  products: Product[];
  sales: Sale[];
  onOpenAddDemand: () => void;
  onEditDemand: (demand: Demand) => void;
  onDeleteDemand: (demandId: string) => void;
  onUpdateDemandStatus: (
    demandId: string, 
    status: DemandStatus, 
    extra?: { unfulfillableReason?: string; cancellationReason?: string; fulfilledSaleId?: string; fulfilledAt?: string }
  ) => void;
  onFulfillWithSale: (demand: Demand) => void;
  onViewInvoice?: (sale: Sale) => void;
}

export const DemandsPage: React.FC<DemandsPageProps> = ({
  demands = [],
  customers = [],
  products = [],
  sales = [],
  onOpenAddDemand,
  onEditDemand,
  onDeleteDemand,
  onUpdateDemandStatus,
  onFulfillWithSale,
  onViewInvoice,
}) => {
  // Filter and Search State
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | DemandStatus>('all');
  const [dateFilter, setDateFilter] = useState<'all' | 'overdue' | 'due_today' | 'upcoming_7d' | 'future'>('all');
  const [sortBy, setSortBy] = useState<DemandFilterOptions['sortBy']>('required_date_asc');

  // Modals / Dialogs State
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [unfulfillablePromptDemand, setUnfulfillablePromptDemand] = useState<Demand | null>(null);
  const [unfulfillableReasonInput, setUnfulfillableReasonInput] = useState<string>('');
  const [printableDemand, setPrintableDemand] = useState<Demand | null>(null);

  // Helper date calculations
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const todayDate = useMemo(() => new Date(todayStr).getTime(), [todayStr]);

  // Statistics calculation
  const stats = useMemo(() => {
    let pending = 0;
    let dueTodayOrOverdue = 0;
    let fulfilled = 0;
    let unfulfillable = 0;
    let cancelled = 0;

    demands.forEach(d => {
      if (d.status === 'pending') {
        pending++;
        if (d.requiredDate) {
          const reqTime = new Date(d.requiredDate).getTime();
          if (reqTime <= todayDate) {
            dueTodayOrOverdue++;
          }
        }
      } else if (d.status === 'fulfilled') {
        fulfilled++;
      } else if (d.status === 'unfulfillable') {
        unfulfillable++;
      } else if (d.status === 'cancelled') {
        cancelled++;
      }
    });

    return {
      total: demands.length,
      pending,
      dueTodayOrOverdue,
      fulfilled,
      unfulfillable,
      cancelled
    };
  }, [demands, todayDate]);

  // Filter and sort demands
  const filteredDemands = useMemo(() => {
    let list = [...demands];

    // Status Filter
    if (statusFilter !== 'all') {
      list = list.filter(d => d.status === statusFilter);
    }

    // Date Filter
    if (dateFilter !== 'all') {
      list = list.filter(d => {
        if (!d.requiredDate) return false;
        const reqTime = new Date(d.requiredDate).getTime();
        const diffDays = Math.round((reqTime - todayDate) / (24 * 60 * 60 * 1000));

        if (dateFilter === 'overdue') {
          return d.status === 'pending' && diffDays < 0;
        }
        if (dateFilter === 'due_today') {
          return diffDays === 0;
        }
        if (dateFilter === 'upcoming_7d') {
          return diffDays >= 0 && diffDays <= 7;
        }
        if (dateFilter === 'future') {
          return diffDays > 7;
        }
        return true;
      });
    }

    // Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(d => 
        (d.demandNumber && d.demandNumber.toLowerCase().includes(q)) ||
        (d.customerName && d.customerName.toLowerCase().includes(q)) ||
        (d.customerPhone && d.customerPhone.includes(q)) ||
        (d.location && d.location.toLowerCase().includes(q)) ||
        (d.itemName && d.itemName.toLowerCase().includes(q)) ||
        (d.itemDetails && d.itemDetails.toLowerCase().includes(q)) ||
        (d.notes && d.notes.toLowerCase().includes(q)) ||
        (d.unfulfillableReason && d.unfulfillableReason.toLowerCase().includes(q))
      );
    }

    // Sorting
    list.sort((a, b) => {
      if (sortBy === 'required_date_asc') {
        if (!a.requiredDate) return 1;
        if (!b.requiredDate) return -1;
        return a.requiredDate.localeCompare(b.requiredDate);
      }
      if (sortBy === 'required_date_desc') {
        if (!a.requiredDate) return 1;
        if (!b.requiredDate) return -1;
        return b.requiredDate.localeCompare(a.requiredDate);
      }
      if (sortBy === 'created_desc') {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      if (sortBy === 'created_asc') {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }
      if (sortBy === 'customer_asc') {
        return a.customerName.localeCompare(b.customerName);
      }
      if (sortBy === 'item_asc') {
        return a.itemName.localeCompare(b.itemName);
      }
      if (sortBy === 'status') {
        const orderMap: Record<DemandStatus, number> = {
          pending: 1,
          fulfilled: 2,
          unfulfillable: 3,
          cancelled: 4
        };
        return orderMap[a.status] - orderMap[b.status];
      }
      return 0;
    });

    return list;
  }, [demands, statusFilter, dateFilter, searchQuery, sortBy, todayDate]);

  // Date Urgency Helper
  const getDateUrgencyInfo = (demand: Demand) => {
    if (!demand.requiredDate) {
      return { label: 'No Deadline', colorClass: 'bg-slate-100 text-slate-600 border-slate-200' };
    }

    const reqTime = new Date(demand.requiredDate).getTime();
    const diffDays = Math.round((reqTime - todayDate) / (24 * 60 * 60 * 1000));

    if (demand.status === 'fulfilled') {
      return { 
        label: `Fulfilled on ${demand.fulfilledAt ? demand.fulfilledAt.split('T')[0] : demand.requiredDate}`, 
        colorClass: 'bg-emerald-50 text-emerald-800 border-emerald-200 font-bold' 
      };
    }

    if (demand.status === 'unfulfillable') {
      return { label: 'Unfulfillable', colorClass: 'bg-rose-50 text-rose-800 border-rose-200' };
    }

    if (demand.status === 'cancelled') {
      return { label: 'Cancelled', colorClass: 'bg-slate-100 text-slate-600 border-slate-200' };
    }

    // Pending status checks
    if (diffDays < 0) {
      const absDays = Math.abs(diffDays);
      return { 
        label: `🚨 Overdue by ${absDays} day${absDays > 1 ? 's' : ''}`, 
        colorClass: 'bg-rose-100 text-rose-900 border-rose-300 font-black animate-pulse' 
      };
    }
    if (diffDays === 0) {
      return { 
        label: '⏰ Due Today', 
        colorClass: 'bg-amber-100 text-amber-950 border-amber-300 font-black' 
      };
    }
    if (diffDays === 1) {
      return { 
        label: '⏳ Due Tomorrow', 
        colorClass: 'bg-amber-50 text-amber-800 border-amber-200 font-bold' 
      };
    }
    if (diffDays <= 7) {
      return { 
        label: `In ${diffDays} days (${demand.requiredDate})`, 
        colorClass: 'bg-blue-50 text-blue-800 border-blue-200 font-bold' 
      };
    }
    return { 
      label: demand.requiredDate, 
      colorClass: 'bg-slate-100 text-slate-700 border-slate-200 font-medium' 
    };
  };

  const handleOpenUnfulfillablePrompt = (demand: Demand) => {
    setUnfulfillablePromptDemand(demand);
    setUnfulfillableReasonInput(demand.unfulfillableReason || 'Item discontinued / unavailable in wholesale market');
  };

  const handleConfirmUnfulfillable = () => {
    if (unfulfillablePromptDemand) {
      onUpdateDemandStatus(unfulfillablePromptDemand.id, 'unfulfillable', {
        unfulfillableReason: unfulfillableReasonInput.trim() || 'Item unavailable in market'
      });
      setUnfulfillablePromptDemand(null);
    }
  };

  const handlePrintSlip = (demand: Demand) => {
    setPrintableDemand(demand);
  };

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 py-6 space-y-6 animate-in fade-in">
      {/* Top Banner & Header */}
      <div className="bg-gradient-to-r from-red-900 via-red-800 to-rose-900 rounded-3xl p-5 sm:p-7 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 opacity-10 flex items-center pr-8 pointer-events-none">
          <PackageSearch className="w-64 h-64 text-white" />
        </div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-1.5 max-w-2xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 border border-white/20 text-xs font-black uppercase tracking-wider text-red-100">
              <PackageSearch className="w-3.5 h-3.5 text-amber-300" />
              Customer Demands & Procurement Backorders
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Customer Demand Manager
            </h1>
            <p className="text-xs sm:text-sm text-red-100 font-medium leading-relaxed">
              Log special customer item requests, size specifications, contact location, and promised fulfillment deadlines. Convert to sales with 1-click or track unfulfillable orders.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              id="demands-log-new-btn"
              onClick={onOpenAddDemand}
              className="px-4.5 py-3 bg-white hover:bg-slate-100 active:bg-slate-200 text-red-700 text-xs sm:text-sm font-black rounded-2xl shadow-lg transition-all flex items-center gap-2 cursor-pointer group hover:scale-[1.02]"
            >
              <Plus className="w-4 h-4 sm:w-5 sm:h-5 stroke-[3] text-red-600 group-hover:rotate-90 transition-transform duration-200" />
              <span>Log New Demand</span>
            </button>
          </div>
        </div>
      </div>

      {/* Metrics & Overview Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {/* Total */}
        <div 
          onClick={() => { setStatusFilter('all'); setDateFilter('all'); }}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            statusFilter === 'all' && dateFilter === 'all'
              ? 'bg-white border-red-500 ring-2 ring-red-500/20 shadow-md'
              : 'bg-white hover:bg-slate-50 border-slate-200/80 shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">Total Demands</span>
            <FileText className="w-4 h-4 text-slate-400" />
          </div>
          <div className="mt-2 text-2xl font-black text-slate-900">{stats.total}</div>
          <span className="text-[10px] text-slate-500 font-medium">All recorded requests</span>
        </div>

        {/* Pending */}
        <div 
          onClick={() => { setStatusFilter('pending'); setDateFilter('all'); }}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            statusFilter === 'pending' && dateFilter === 'all'
              ? 'bg-amber-50/90 border-amber-500 ring-2 ring-amber-500/20 shadow-md'
              : 'bg-white hover:bg-amber-50/40 border-slate-200/80 shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase tracking-wider text-amber-700">Pending</span>
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
          </div>
          <div className="mt-2 text-2xl font-black text-amber-900">{stats.pending}</div>
          <span className="text-[10px] text-amber-700 font-bold">Needs procurement</span>
        </div>

        {/* Overdue / Due Today */}
        <div 
          onClick={() => { setStatusFilter('pending'); setDateFilter('due_today'); }}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            dateFilter === 'due_today' || dateFilter === 'overdue'
              ? 'bg-rose-50 border-rose-500 ring-2 ring-rose-500/20 shadow-md'
              : 'bg-white hover:bg-rose-50/40 border-slate-200/80 shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase tracking-wider text-rose-700">Due Today / Overdue</span>
            <AlertTriangle className="w-4 h-4 text-rose-600" />
          </div>
          <div className="mt-2 text-2xl font-black text-rose-900">{stats.dueTodayOrOverdue}</div>
          <span className="text-[10px] text-rose-700 font-bold">Urgent deadlines</span>
        </div>

        {/* Fulfilled */}
        <div 
          onClick={() => { setStatusFilter('fulfilled'); setDateFilter('all'); }}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            statusFilter === 'fulfilled'
              ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-500/20 shadow-md'
              : 'bg-white hover:bg-emerald-50/40 border-slate-200/80 shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase tracking-wider text-emerald-700">Fulfilled</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2 text-2xl font-black text-emerald-900">{stats.fulfilled}</div>
          <span className="text-[10px] text-emerald-700 font-bold">Converted to Sales</span>
        </div>

        {/* Unfulfillable / Cancelled */}
        <div 
          onClick={() => { setStatusFilter('unfulfillable'); setDateFilter('all'); }}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            statusFilter === 'unfulfillable'
              ? 'bg-slate-100 border-slate-500 ring-2 ring-slate-500/20 shadow-md'
              : 'bg-white hover:bg-slate-100/60 border-slate-200/80 shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-600">Unfulfillable</span>
            <XCircle className="w-4 h-4 text-rose-500" />
          </div>
          <div className="mt-2 text-2xl font-black text-slate-800">{stats.unfulfillable}</div>
          <span className="text-[10px] text-slate-500 font-medium">Out of market</span>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3.5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Search by customer name, phone, city, item name, size details, or DMD #..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:bg-white transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Sort Dropdown */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500 whitespace-nowrap">Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-red-500 cursor-pointer"
            >
              <option value="required_date_asc">Due Date: Soonest First</option>
              <option value="required_date_desc">Due Date: Latest First</option>
              <option value="created_desc">Date Logged: Newest First</option>
              <option value="created_asc">Date Logged: Oldest First</option>
              <option value="customer_asc">Customer Name (A-Z)</option>
              <option value="item_asc">Item Name (A-Z)</option>
              <option value="status">Status Order</option>
            </select>
          </div>
        </div>

        {/* Filter Pills (Status & Due Date) */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
          {/* Status Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-colors cursor-pointer shrink-0 ${
                statusFilter === 'all'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
              }`}
            >
              All Statuses ({demands.length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('pending')}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-colors cursor-pointer shrink-0 flex items-center gap-1.5 ${
                statusFilter === 'pending'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              Pending ({stats.pending})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('fulfilled')}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-colors cursor-pointer shrink-0 flex items-center gap-1.5 ${
                statusFilter === 'fulfilled'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200'
              }`}
            >
              <CheckCircle2 className="w-3 h-3" />
              Fulfilled ({stats.fulfilled})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('unfulfillable')}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-colors cursor-pointer shrink-0 flex items-center gap-1.5 ${
                statusFilter === 'unfulfillable'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-rose-50 hover:bg-rose-100 text-rose-900 border border-rose-200'
              }`}
            >
              <XCircle className="w-3 h-3" />
              Unfulfillable ({stats.unfulfillable})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('cancelled')}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-colors cursor-pointer shrink-0 flex items-center gap-1.5 ${
                statusFilter === 'cancelled'
                  ? 'bg-slate-700 text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              <Ban className="w-3 h-3" />
              Cancelled ({stats.cancelled})
            </button>
          </div>

          {/* Date Filter Pills */}
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
            <span className="text-[11px] font-bold text-slate-400 mr-1">Timeline:</span>
            <button
              type="button"
              onClick={() => setDateFilter('all')}
              className={`px-2.5 py-0.5 rounded-lg text-[11px] font-bold cursor-pointer ${
                dateFilter === 'all' ? 'bg-red-100 text-red-800' : 'text-slate-500 hover:bg-slate-100'
              }`}
            >
              All Dates
            </button>
            <button
              type="button"
              onClick={() => setDateFilter('overdue')}
              className={`px-2.5 py-0.5 rounded-lg text-[11px] font-bold cursor-pointer ${
                dateFilter === 'overdue' ? 'bg-rose-100 text-rose-800' : 'text-slate-500 hover:bg-slate-100'
              }`}
            >
              Overdue
            </button>
            <button
              type="button"
              onClick={() => setDateFilter('due_today')}
              className={`px-2.5 py-0.5 rounded-lg text-[11px] font-bold cursor-pointer ${
                dateFilter === 'due_today' ? 'bg-amber-100 text-amber-800' : 'text-slate-500 hover:bg-slate-100'
              }`}
            >
              Due Today
            </button>
            <button
              type="button"
              onClick={() => setDateFilter('upcoming_7d')}
              className={`px-2.5 py-0.5 rounded-lg text-[11px] font-bold cursor-pointer ${
                dateFilter === 'upcoming_7d' ? 'bg-blue-100 text-blue-800' : 'text-slate-500 hover:bg-slate-100'
              }`}
            >
              Next 7 Days
            </button>
          </div>
        </div>
      </div>

      {/* Demands List */}
      {filteredDemands.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center space-y-4 shadow-sm">
          <div className="w-16 h-16 rounded-3xl bg-red-50 text-red-600 flex items-center justify-center mx-auto shadow-inner">
            <PackageSearch className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-black text-slate-800">No Customer Demands Found</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              {searchQuery || statusFilter !== 'all' || dateFilter !== 'all'
                ? 'No demand matches your current search or filter criteria. Try resetting filters.'
                : 'No customer demand requests logged yet. Click "+ Log New Demand" to record a customer order.'}
            </p>
          </div>
          {(searchQuery || statusFilter !== 'all' || dateFilter !== 'all') ? (
            <button
              type="button"
              onClick={() => { setSearchQuery(''); setStatusFilter('all'); setDateFilter('all'); }}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
            >
              Reset Filters
            </button>
          ) : (
            <button
              type="button"
              onClick={onOpenAddDemand}
              className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-black rounded-xl shadow-md transition-colors cursor-pointer inline-flex items-center gap-2"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              Log First Demand
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3.5">
          {filteredDemands.map(demand => {
            const urgency = getDateUrgencyInfo(demand);
            const isPending = demand.status === 'pending';
            const isFulfilled = demand.status === 'fulfilled';
            const isUnfulfillable = demand.status === 'unfulfillable';
            const isCancelled = demand.status === 'cancelled';

            // Find linked sale if fulfilled
            const linkedSale = isFulfilled && demand.fulfilledSaleId 
              ? sales.find(s => s.id === demand.fulfilledSaleId || s.id === `INV-${demand.fulfilledSaleId}`)
              : null;

            return (
              <div
                key={demand.id}
                className={`bg-white rounded-2xl border transition-all p-4 sm:p-5 shadow-2xs hover:shadow-md ${
                  isPending && urgency.label.includes('Overdue')
                    ? 'border-rose-300 ring-1 ring-rose-400/30'
                    : isPending
                      ? 'border-slate-200 hover:border-amber-300'
                      : isFulfilled
                        ? 'border-emerald-200 bg-emerald-50/20'
                        : isUnfulfillable
                          ? 'border-rose-200 bg-rose-50/20'
                          : 'border-slate-200 bg-slate-50/40'
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                  {/* Left Column: Demand Details */}
                  <div className="space-y-3 flex-1 min-w-0">
                    {/* Header Row: Demand #, Status, Urgency Date */}
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2.5 py-1 bg-slate-900 text-white text-xs font-black rounded-lg shadow-2xs tracking-wider">
                        {demand.demandNumber}
                      </span>

                      {/* Status Badge */}
                      {isPending && (
                        <span className="px-2.5 py-1 bg-amber-100 text-amber-900 border border-amber-300 rounded-lg text-xs font-black flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                          Pending Procurement
                        </span>
                      )}
                      {isFulfilled && (
                        <span className="px-2.5 py-1 bg-emerald-100 text-emerald-900 border border-emerald-300 rounded-lg text-xs font-black flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          Fulfilled
                        </span>
                      )}
                      {isUnfulfillable && (
                        <span className="px-2.5 py-1 bg-rose-100 text-rose-900 border border-rose-300 rounded-lg text-xs font-black flex items-center gap-1.5">
                          <XCircle className="w-3.5 h-3.5 text-rose-600" />
                          Unfulfillable
                        </span>
                      )}
                      {isCancelled && (
                        <span className="px-2.5 py-1 bg-slate-200 text-slate-800 border border-slate-300 rounded-lg text-xs font-black flex items-center gap-1.5">
                          <Ban className="w-3.5 h-3.5 text-slate-600" />
                          Cancelled
                        </span>
                      )}

                      {/* Urgency Badge */}
                      <span className={`px-2.5 py-1 rounded-lg text-xs border flex items-center gap-1.5 ${urgency.colorClass}`}>
                        <Clock className="w-3.5 h-3.5 shrink-0" />
                        <span>{urgency.label}</span>
                      </span>

                      <span className="text-[11px] text-slate-400 font-medium ml-auto">
                        Logged: {new Date(demand.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </span>
                    </div>

                    {/* Customer Info Card */}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-700 bg-slate-50 px-3 py-2 rounded-xl border border-slate-100">
                      <div className="flex items-center gap-1.5 font-black text-slate-900">
                        <User className="w-3.5 h-3.5 text-red-600" />
                        <span>{demand.customerName}</span>
                      </div>

                      {demand.customerPhone && (
                        <div className="flex items-center gap-1 text-slate-600 font-semibold">
                          <Phone className="w-3 h-3 text-slate-400" />
                          <a 
                            href={`tel:${demand.customerPhone}`}
                            className="hover:text-red-700 hover:underline"
                          >
                            {demand.customerPhone}
                          </a>
                        </div>
                      )}

                      {demand.location && (
                        <div className="flex items-center gap-1 text-slate-600 font-medium">
                          <MapPin className="w-3 h-3 text-slate-400" />
                          <span>{demand.location}</span>
                        </div>
                      )}
                    </div>

                    {/* Requested Item Details & Specs */}
                    <div className="space-y-1.5">
                      <div className="flex items-baseline gap-2">
                        <h3 className="text-base font-black text-slate-950">
                          {demand.itemName}
                        </h3>
                        <span className="px-2 py-0.5 bg-red-50 text-red-700 font-black rounded-md text-xs border border-red-100">
                          Qty: {demand.quantity} {demand.unit}
                        </span>
                        {demand.targetPrice && demand.targetPrice > 0 && (
                          <span className="text-xs font-bold text-slate-600">
                            Target Rate: <span className="font-black text-red-600">{formatPKR(demand.targetPrice)}</span>
                          </span>
                        )}
                      </div>

                      {/* Technical Specs / Size / Dimensions */}
                      {demand.itemDetails && (
                        <div className="flex items-start gap-1.5 text-xs text-slate-700 bg-amber-50/60 p-2 rounded-xl border border-amber-200/60">
                          <Layers className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-bold text-amber-950">Size & Specifications: </span>
                            <span className="font-medium text-slate-800">{demand.itemDetails}</span>
                          </div>
                        </div>
                      )}

                      {/* Note on Item */}
                      {demand.notes && (
                        <div className="flex items-start gap-1.5 text-xs text-slate-600 bg-slate-50 p-2 rounded-xl border border-slate-200">
                          <MessageSquare className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-bold text-slate-700">Note: </span>
                            <span className="italic">{demand.notes}</span>
                          </div>
                        </div>
                      )}

                      {/* Reason if Unfulfillable or Cancelled */}
                      {isUnfulfillable && demand.unfulfillableReason && (
                        <div className="flex items-start gap-1.5 text-xs text-rose-900 bg-rose-50 p-2.5 rounded-xl border border-rose-200">
                          <XCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-black">Unfulfillable Reason: </span>
                            <span>{demand.unfulfillableReason}</span>
                          </div>
                        </div>
                      )}

                      {isCancelled && demand.cancellationReason && (
                        <div className="flex items-start gap-1.5 text-xs text-slate-800 bg-slate-100 p-2 rounded-xl border border-slate-200">
                          <Ban className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-bold">Cancellation Reason: </span>
                            <span>{demand.cancellationReason}</span>
                          </div>
                        </div>
                      )}

                      {/* Linked Fulfilled Sale */}
                      {isFulfilled && demand.fulfilledSaleId && (
                        <div className="flex items-center gap-2 text-xs text-emerald-800 bg-emerald-50 p-2 rounded-xl border border-emerald-200">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span>Fulfilled via Sale: <strong>{demand.fulfilledSaleId}</strong></span>
                          {linkedSale && onViewInvoice && (
                            <button
                              type="button"
                              onClick={() => onViewInvoice(linkedSale)}
                              className="ml-auto px-2 py-0.5 bg-white hover:bg-emerald-100 text-emerald-900 font-black rounded-lg border border-emerald-300 flex items-center gap-1 cursor-pointer transition-colors shadow-2xs text-[11px]"
                            >
                              <ExternalLink className="w-3 h-3" />
                              View Invoice
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right Column: Action Buttons */}
                  <div className="flex flex-col sm:flex-row lg:flex-col gap-2 shrink-0 justify-end lg:w-48 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100">
                    {/* Primary Action: Fulfill with Sale POS */}
                    {isPending && (
                      <button
                        type="button"
                        onClick={() => onFulfillWithSale(demand)}
                        className="w-full px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-black rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer group hover:scale-[1.02]"
                        title="Open Sale POS pre-filled with this customer and demand item"
                      >
                        <ShoppingCart className="w-4 h-4 stroke-[2.5] group-hover:animate-bounce" />
                        <span>Fulfill (Make Sale)</span>
                      </button>
                    )}

                    {/* Secondary Action: Mark Fulfilled Directly */}
                    {isPending && (
                      <button
                        type="button"
                        onClick={() => onUpdateDemandStatus(demand.id, 'fulfilled')}
                        className="w-full px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold rounded-xl border border-emerald-200 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                        title="Mark as Fulfilled without creating a new invoice"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Mark Fulfilled</span>
                      </button>
                    )}

                    {/* Mark Unfulfillable Action */}
                    {isPending && (
                      <button
                        type="button"
                        onClick={() => handleOpenUnfulfillablePrompt(demand)}
                        className="w-full px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-800 text-xs font-bold rounded-xl border border-rose-200 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                        title="Mark item as out of stock / unavailable"
                      >
                        <XCircle className="w-3.5 h-3.5 text-rose-600" />
                        <span>Mark Unfulfillable</span>
                      </button>
                    )}

                    {/* Reopen Action (If fulfilled/unfulfillable/cancelled) */}
                    {!isPending && (
                      <button
                        type="button"
                        onClick={() => onUpdateDemandStatus(demand.id, 'pending')}
                        className="w-full px-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-bold rounded-xl border border-amber-200 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                        title="Reset status back to pending procurement"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Reopen as Pending</span>
                      </button>
                    )}

                    {/* Edit & Print & Delete Bar */}
                    <div className="flex items-center gap-1.5 w-full">
                      <button
                        type="button"
                        onClick={() => onEditDemand(demand)}
                        className="flex-1 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-1 cursor-pointer"
                        title="Edit demand details"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Edit</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handlePrintSlip(demand)}
                        className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors cursor-pointer"
                        title="Print Demand Slip / Workshop Token"
                      >
                        <Printer className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => setDeleteConfirmId(demand.id)}
                        className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl transition-colors cursor-pointer"
                        title="Delete demand"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl border border-slate-200 text-center animate-in zoom-in-95">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="font-black text-base text-slate-900">Delete Customer Demand?</h3>
              <p className="text-xs text-slate-500">
                Are you sure you want to permanently delete this demand request? This action cannot be undone.
              </p>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmId(null)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteDemand(deleteConfirmId);
                  setDeleteConfirmId(null);
                }}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-black rounded-xl shadow-md transition-colors cursor-pointer"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Unfulfillable Reason Prompt Dialog */}
      {unfulfillablePromptDemand && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl border border-slate-200 animate-in zoom-in-95">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <XCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-black text-base text-slate-900">Mark as Unfulfillable</h3>
                <p className="text-xs text-slate-500">
                  {unfulfillablePromptDemand.itemName} for {unfulfillablePromptDemand.customerName}
                </p>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">
                Reason why item cannot be procured/fulfilled:
              </label>
              <textarea
                rows={3}
                value={unfulfillableReasonInput}
                onChange={(e) => setUnfulfillableReasonInput(e.target.value)}
                placeholder="e.g. Discontinued part, checked 4 vendor catalogs; out of stock nationwide."
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500 shadow-2xs resize-none"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setUnfulfillablePromptDemand(null)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmUnfulfillable}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-black rounded-xl shadow-md transition-colors cursor-pointer"
              >
                Confirm Unfulfillable
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Printable Demand Slip Modal */}
      {printableDemand && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-200 flex flex-col max-h-[90vh] animate-in zoom-in-95">
            {/* Header */}
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Printer className="w-5 h-5 text-red-500" />
                <h3 className="font-black text-sm text-white">Customer Demand Slip</h3>
              </div>
              <button
                type="button"
                onClick={() => setPrintableDemand(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Printable Content */}
            <div className="p-6 overflow-y-auto space-y-4 text-slate-900 font-sans" id="printable-demand-slip">
              {/* Slip Header */}
              <div className="text-center pb-4 border-b border-slate-200 space-y-1">
                <h2 className="text-lg font-black text-slate-950">PRECISION AUTO PARTS & FILTERS</h2>
                <p className="text-[11px] text-slate-500 font-semibold">CUSTOMER DEMAND / BACKORDER TICKET</p>
                <div className="inline-block px-3 py-1 bg-slate-100 rounded-lg text-xs font-mono font-black mt-1">
                  Ticket #{printableDemand.demandNumber}
                </div>
              </div>

              {/* Customer & Date Grid */}
              <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Customer Name</span>
                  <span className="font-black text-slate-900">{printableDemand.customerName}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Phone Number</span>
                  <span className="font-bold text-slate-800">{printableDemand.customerPhone || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Location / Address</span>
                  <span className="font-medium text-slate-800">{printableDemand.location || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Promised By / Due Date</span>
                  <span className="font-black text-red-600">{printableDemand.requiredDate || 'Open Timeline'}</span>
                </div>
              </div>

              {/* Item Specification Box */}
              <div className="border border-slate-200 rounded-2xl p-4 space-y-2 bg-white shadow-2xs">
                <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                  Item Details Requested
                </div>
                <div className="text-base font-black text-slate-950">
                  {printableDemand.itemName}
                </div>
                <div className="flex gap-4 text-xs font-bold text-slate-700">
                  <span>Quantity: <strong className="text-slate-900">{printableDemand.quantity} {printableDemand.unit}</strong></span>
                  {printableDemand.targetPrice && printableDemand.targetPrice > 0 && (
                    <span>Promised Rate: <strong className="text-red-600">{formatPKR(printableDemand.targetPrice)}</strong></span>
                  )}
                </div>
                {printableDemand.itemDetails && (
                  <div className="pt-2 border-t border-slate-100 text-xs text-slate-700">
                    <strong className="text-slate-900">Technical Specs:</strong> {printableDemand.itemDetails}
                  </div>
                )}
                {printableDemand.notes && (
                  <div className="text-xs text-slate-600 italic">
                    <strong>Note:</strong> "{printableDemand.notes}"
                  </div>
                )}
              </div>

              {/* Footer Stamp */}
              <div className="pt-3 border-t border-dashed border-slate-300 flex items-center justify-between text-[10px] text-slate-400">
                <span>Logged: {new Date(printableDemand.createdAt).toLocaleString()}</span>
                <span>Status: {printableDemand.status.toUpperCase()}</span>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="px-6 py-3.5 bg-slate-100 border-t border-slate-200 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setPrintableDemand(null)}
                className="px-4 py-2 bg-white hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl border border-slate-300 cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4.5 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-black rounded-xl shadow-md flex items-center gap-2 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Print Ticket</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
