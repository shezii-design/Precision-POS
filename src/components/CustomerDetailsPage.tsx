import { useOnlineStatus } from '../hooks/useOnlineStatus';
import React, { useState, useMemo } from 'react';
import { 
  Customer, 
  CompanyMachine, 
  MachineDemandItem, 
  Product, 
  Sale, 
  CustomerLedgerEntry, 
  ComputedCustomerLedgerRow 
} from '../types';
import { 
  formatPKR 
} from '../services/pricing';
import { 
  computeCustomerLedgerRows, 
  calculateCustomerNetBalance, 
  saveCompanyMachineAndSyncInventory, 
  deleteCompanyMachine, 
  recordCustomerPaymentAndUpdateAll, 
  updateCustomerPaymentAndUpdateAll, 
  deleteCustomerPaymentAndUpdateAll, 
  saveCustomer 
} from '../services/storage';
import { CustomerPaymentModal } from './CustomerPaymentModal';
import { CompanyMachineModal } from './CompanyMachineModal';
import { CustomerFormModal } from './CustomerFormModal';
import { CustomerLedgerPrintModal } from './CustomerLedgerPrintModal';
import { InitialSaleItemPreset } from './NewSaleModal';
import { downloadCustomerLedgerPDF } from '../services/pdfReportGenerator';
import { 
  ArrowLeft, 
  Building2, 
  User, 
  Phone, 
  Mail, 
  MapPin, 
  FileText, 
  Printer, 
  Download,
  Plus, 
  ShoppingCart, 
  Wrench, 
  Receipt, 
  Wallet, 
  Edit, 
  Trash2, 
  CheckSquare, 
  Square, 
  Clock, 
  Package, 
  Hash, 
  Calendar, 
  CheckCircle2, 
  AlertCircle, 
  Share2, 
  MessageCircle, 
  Layers, 
  Sparkles,
  Search,
  Eye,
  X
} from 'lucide-react';

interface CustomerDetailsPageProps {
  customer: Customer;
  onBack: () => void;
  products: Product[];
  sales: Sale[];
  customerLedger: CustomerLedgerEntry[];
  allCustomers: Customer[];
  onOpenNewSaleForCustomer: (customerId: string, presetItems?: InitialSaleItemPreset[]) => void;
  onUpdateCustomers: (customers: Customer[]) => void;
  onUpdateLedger: (ledger: CustomerLedgerEntry[]) => void;
  onUpdateProducts: (products: Product[]) => void;
  onViewInvoice?: (sale: Sale) => void;
  onEditSale?: (sale: Sale) => void;
}

export const CustomerDetailsPage: React.FC<CustomerDetailsPageProps> = ({
  customer,
  onBack,
  products = [],
  sales = [],
  customerLedger = [],
  allCustomers = [],
  onOpenNewSaleForCustomer,
  onUpdateCustomers,
  onUpdateLedger,
  onUpdateProducts,
  onViewInvoice,
  onEditSale,
}) => {
  const isCompany = customer.type === 'company';
  const [activeTab, setActiveTab] = useState<'ledger' | 'demand' | 'invoices'>(
    isCompany ? 'demand' : 'ledger'
  );

  // Modals state
  const [showPaymentModal, setShowPaymentModal] = useState<boolean>(false);
  const [editingPaymentEntry, setEditingPaymentEntry] = useState<CustomerLedgerEntry | null>(null);
  const [showMachineModal, setShowMachineModal] = useState<boolean>(false);
  const [editingMachine, setEditingMachine] = useState<CompanyMachine | null>(null);
  const [showEditCustomerModal, setShowEditCustomerModal] = useState<boolean>(false);
  const [showPrintModal, setShowPrintModal] = useState<boolean>(false);

  // Demand tab multi-selection state (Selected Machine IDs)
  const [selectedMachineIds, setSelectedMachineIds] = useState<string[]>([]);
  const [machineSearchTerm, setMachineSearchTerm] = useState<string>('');
  const [ledgerSortOrder, setLedgerSortOrder] = useState<'statement' | 'recent'>('statement');
  const [ledgerSearch, setLedgerSearch] = useState<string>('');

  // Current customer object from state
  const currentCustomer = allCustomers.find(c => c.id === customer.id) || customer;

  // Calculate Net Balance
  const netBalance = useMemo(() => {
    return calculateCustomerNetBalance(
      currentCustomer.id,
      currentCustomer.openingBalance || 0,
      sales,
      customerLedger
    );
  }, [currentCustomer, sales, customerLedger]);

  // Compute full ledger rows (Chronological: invoice before payment)
  const ledgerRows = useMemo(() => {
    return computeCustomerLedgerRows(currentCustomer, sales, customerLedger);
  }, [currentCustomer, sales, customerLedger]);

  // Display rows according to chosen sort order and search filter
  const displayLedgerRows = useMemo(() => {
    let list = ledgerSortOrder === 'statement' ? ledgerRows : [...ledgerRows].reverse();
    if (!ledgerSearch.trim()) return list;
    const q = ledgerSearch.toLowerCase().trim();
    return list.filter(row => {
      const dateStr = new Date(row.date).toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' }).toLowerCase();
      const codeStr = (row.entryCode || row.billNumber || '').toLowerCase();
      const descStr = (row.description || '').toLowerCase();
      const methodStr = (row.paymentMethod || '').toLowerCase();
      const typeStr = (row.sourceType || '').toLowerCase();
      const debitStr = row.debit ? String(row.debit) : '';
      const creditStr = row.credit ? String(row.credit) : '';
      const balanceStr = String(Math.abs(row.runningBalance));

      return (
        codeStr.includes(q) ||
        descStr.includes(q) ||
        methodStr.includes(q) ||
        typeStr.includes(q) ||
        dateStr.includes(q) ||
        debitStr.includes(q) ||
        creditStr.includes(q) ||
        balanceStr.includes(q)
      );
    });
  }, [ledgerRows, ledgerSortOrder, ledgerSearch]);

  // Invoices for this customer
  const customerSales = useMemo(() => {
    return sales.filter(s => s.customerId === currentCustomer.id || (s.customerName && s.customerName.toLowerCase() === currentCustomer.name.toLowerCase()));
  }, [sales, currentCustomer]);

  // Machines list
  const machines = currentCustomer.machines || [];

  const filteredMachines = useMemo(() => {
    if (!machineSearchTerm.trim()) return machines;
    const q = machineSearchTerm.toLowerCase().trim();
    return machines.filter(m => 
      m.machineName.toLowerCase().includes(q) ||
      (m.operatorName && m.operatorName.toLowerCase().includes(q)) ||
      (m.location && m.location.toLowerCase().includes(q)) ||
      (m.items && m.items.some(i => i.productName.toLowerCase().includes(q) || (i.customerItemNumber && i.customerItemNumber.toLowerCase().includes(q))))
    );
  }, [machines, machineSearchTerm]);

  // Selection helpers for Demand Tab
  const isAllMachinesSelected = machines.length > 0 && selectedMachineIds.length === machines.length;

  const handleToggleSelectAllMachines = () => {
    if (isAllMachinesSelected) {
      setSelectedMachineIds([]);
    } else {
      setSelectedMachineIds(machines.map(m => m.id));
    }
  };

  const handleToggleSelectMachine = (machineId: string) => {
    if (selectedMachineIds.includes(machineId)) {
      setSelectedMachineIds(selectedMachineIds.filter(id => id !== machineId));
    } else {
      setSelectedMachineIds([...selectedMachineIds, machineId]);
    }
  };

  // Convert selected machines into sale draft items
  const selectedItemsToRecord = useMemo(() => {
    const selected = machines.filter(m => selectedMachineIds.includes(m.id));
    const itemsList: InitialSaleItemPreset[] = [];

    selected.forEach(m => {
      (m.items || []).forEach(it => {
        itemsList.push({
          productId: it.productId,
          internalId: it.internalId,
          productName: it.productName,
          brandName: it.brandName,
          typeName: it.typeName,
          unit: it.unit,
          customerItemNumber: it.customerItemNumber,
          machineNames: m.machineName,
          quantity: it.quantity,
          unitPrice: it.unitPrice,
          notes: it.notes,
        });
      });
    });

    return itemsList;
  }, [machines, selectedMachineIds]);

  const totalSelectedDemandAmount = selectedItemsToRecord.reduce(
    (sum, it) => sum + (it.quantity || 1) * (it.unitPrice || 0), 
    0
  );

  const handleRecordSaleForSelected = () => {
    if (selectedItemsToRecord.length === 0) return;
    onOpenNewSaleForCustomer(currentCustomer.id, selectedItemsToRecord);
  };

  const handleQuickRecordSaleForSingleMachine = (machine: CompanyMachine) => {
    const itemsList: InitialSaleItemPreset[] = machine.items.map(it => ({
      productId: it.productId,
      internalId: it.internalId,
      productName: it.productName,
      brandName: it.brandName,
      typeName: it.typeName,
      unit: it.unit,
      customerItemNumber: it.customerItemNumber,
      machineNames: machine.machineName,
      quantity: it.quantity,
      unitPrice: it.unitPrice,
      notes: it.notes,
    }));
    onOpenNewSaleForCustomer(currentCustomer.id, itemsList);
  };

  // Handle Save Machine (with automatic inventory cross-ref and machine sync)
  const handleSaveMachine = (machine: CompanyMachine) => {
    if (!isOnline) { alert('Offline Mode (Read-Only)\nCannot perform write/edit actions while offline.'); return; }
    const result = saveCompanyMachineAndSyncInventory(
      currentCustomer.id,
      machine,
      allCustomers,
      products
    );
    onUpdateCustomers(result.updatedCustomers);
    onUpdateProducts(result.updatedProducts);
  };

  const handleDeleteMachine = (machineId: string) => {
    if (!isOnline) { alert('Offline Mode (Read-Only)\nCannot perform write/edit actions while offline.'); return; }
    if (window.confirm('Are you sure you want to delete this machine?')) {
      const updated = deleteCompanyMachine(currentCustomer.id, machineId, allCustomers);
      onUpdateCustomers(updated);
      setSelectedMachineIds(selectedMachineIds.filter(id => id !== machineId));
    }
  };

  // Handle Customer Payment
  const handleSavePayment = (
    entryData: Omit<CustomerLedgerEntry, 'id' | 'createdAt'>,
    entryId?: string
  ) => {
    if (!isOnline) { alert('Offline Mode (Read-Only)\nCannot perform write/edit actions while offline.'); return; }
    if (entryId) {
      const result = updateCustomerPaymentAndUpdateAll(entryId, entryData, customerLedger, allCustomers);
      onUpdateLedger(result.updatedLedgerEntries);
      onUpdateCustomers(result.updatedCustomers);
    } else {
      const result = recordCustomerPaymentAndUpdateAll(entryData, customerLedger, allCustomers);
      onUpdateLedger(result.updatedLedgerEntries);
      onUpdateCustomers(result.updatedCustomers);
    }
  };

  const handleDeletePaymentEntry = (entryId: string) => {
    if (!isOnline) { alert('Offline Mode (Read-Only)\nCannot perform write/edit actions while offline.'); return; }
    if (window.confirm('Are you sure you want to remove this ledger entry?')) {
      const result = deleteCustomerPaymentAndUpdateAll(entryId, customerLedger, allCustomers);
      onUpdateLedger(result.updatedLedgerEntries);
      onUpdateCustomers(result.updatedCustomers);
    }
  };

  // Handle Save Customer Profile
  const handleSaveCustomerProfile = (customerData: Partial<Customer>) => {
    if (!isOnline) { alert('Offline Mode (Read-Only)\nCannot perform write/edit actions while offline.'); return; }
    const updated = saveCustomer({ ...customerData, id: currentCustomer.id }, allCustomers);
    onUpdateCustomers(updated);
  };

  // Handle double-clicking a ledger row to see full details / edit (matching vendor ledger behavior)
  const handleDoubleClickLedgerRow = (row: ComputedCustomerLedgerRow) => {
    if (row.sourceType === 'sale') {
      const sale = (row.rawObject && 'items' in row.rawObject)
        ? (row.rawObject as Sale)
        : sales.find(s => s.id === row.id || s.id === row.referenceId || s.id === row.billNumber || s.id === row.id.replace('sale-inv-', ''));
      if (sale && onViewInvoice) {
        onViewInvoice(sale);
      } else if (sale && onEditSale) {
        onEditSale(sale);
      }
    } else if (row.sourceType === 'payment_received' || row.sourceType === 'cash_refund' || row.sourceType === 'adjustment') {
      // Check if it is a standalone Customer Ledger Payment Entry (CLE-...)
      const isDirectCLE = row.rawObject && 'id' in row.rawObject && String(row.rawObject.id).startsWith('CLE-');
      const directEntry = isDirectCLE
        ? (row.rawObject as CustomerLedgerEntry)
        : customerLedger.find(e => e.id === row.id || e.id === row.referenceId);

      if (directEntry) {
        setEditingPaymentEntry(directEntry);
        setShowPaymentModal(true);
      } else if (row.id.startsWith('sale-pay') || (row.rawObject && 'items' in row.rawObject)) {
        // Payment recorded directly on a sale bill -> open invoice
        const sale = (row.rawObject && 'items' in row.rawObject)
          ? (row.rawObject as Sale)
          : sales.find(s => s.id === row.referenceId || s.id === row.billNumber || s.id === row.id.replace('sale-pay-', ''));
        if (sale && onViewInvoice) {
          onViewInvoice(sale);
        } else if (sale && onEditSale) {
          onEditSale(sale);
        }
      }
    } else if (row.sourceType === 'opening_balance') {
      setShowEditCustomerModal(true);
    }
  };

  return (
    <div id="customer-details-page" className="space-y-6 animate-in fade-in duration-200">
      
      {/* Top Breadcrumb & Quick Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-3xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="w-10 h-10 rounded-2xl bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 flex items-center justify-center transition-all cursor-pointer shadow-2xs"
            title="Back to Customers List"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-black uppercase tracking-wider ${
                isCompany ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
              }`}>
                {isCompany ? <Building2 className="w-3.5 h-3.5" /> : <User className="w-3.5 h-3.5" />}
                {isCompany ? 'Corporate Company' : 'Individual Customer'}
              </span>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                {currentCustomer.name}
              </h1>
            </div>
            <p className="text-xs text-slate-500 font-semibold mt-0.5 flex items-center gap-3 flex-wrap">
              {currentCustomer.contactPerson && (
                <span>👤 Contact: <strong>{currentCustomer.contactPerson}</strong></span>
              )}
              {currentCustomer.city && (
                <span>📍 {currentCustomer.city}</span>
              )}
              {currentCustomer.ntn && (
                <span>🏛 NTN: <strong className="font-mono">{currentCustomer.ntn}</strong></span>
              )}
            </p>
          </div>
        </div>

        {/* Header Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => { setEditingPaymentEntry(null); setShowPaymentModal(true); }}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl text-xs font-black shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Wallet className="w-4 h-4" />
            <span>Receive Payment</span>
          </button>

          <button
            type="button"
            onClick={() => onOpenNewSaleForCustomer(currentCustomer.id)}
            className="px-3.5 py-2 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white rounded-xl text-xs font-black shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <ShoppingCart className="w-4 h-4" />
            <span>Record Sale (POS)</span>
          </button>

          <button
            type="button"
            id="btn-customer-top-download-pdf"
            onClick={() => downloadCustomerLedgerPDF(currentCustomer, ledgerRows, netBalance, 'Complete Ledger Statement')}
            className="p-2 sm:px-3 sm:py-2 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
            title="Download complete transaction statement report as PDF"
          >
            <Download className="w-4 h-4 text-red-600" />
            <span className="hidden md:inline">Download PDF</span>
          </button>

          <button
            type="button"
            onClick={() => setShowPrintModal(true)}
            className="p-2 sm:px-3 sm:py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
            title="Print Account Statement"
          >
            <Printer className="w-4 h-4 text-slate-600" />
            <span className="hidden md:inline">Print Statement</span>
          </button>

          <button
            type="button"
            onClick={() => setShowEditCustomerModal(true)}
            className="p-2 sm:px-3 sm:py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
            title="Edit Customer Details"
          >
            <Edit className="w-4 h-4 text-slate-600" />
            <span className="hidden md:inline">Edit</span>
          </button>
        </div>
      </div>

      {/* Profile Overview & Net Balance KPI Banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* Contact & Address Card */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-3">
          <div className="text-xs font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Phone className="w-3.5 h-3.5 text-slate-500" />
            Contact & Communication
          </div>

          <div className="space-y-2 text-xs">
            {currentCustomer.phone ? (
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Primary Phone:</span>
                <div className="flex items-center gap-1.5">
                  <a 
                    href={`tel:${currentCustomer.phone}`}
                    className="font-bold text-slate-900 hover:text-red-600 hover:underline"
                  >
                    {currentCustomer.phone}
                  </a>
                  <a
                    href={`https://wa.me/${currentCustomer.phone.replace(/[^0-9]/g, '')}`}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1 rounded-md bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                    title="Chat on WhatsApp"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            ) : (
              <span className="text-slate-400 italic">No phone recorded</span>
            )}

            {currentCustomer.secondaryPhone && (
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Landline / Tel:</span>
                <span className="font-semibold text-slate-800">{currentCustomer.secondaryPhone}</span>
              </div>
            )}

            {currentCustomer.email && (
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Email:</span>
                <a href={`mailto:${currentCustomer.email}`} className="font-semibold text-slate-800 hover:underline truncate max-w-[160px]">
                  {currentCustomer.email}
                </a>
              </div>
            )}

            {currentCustomer.address && (
              <div className="pt-1 text-slate-600 border-t border-slate-100 text-[11px]">
                <span className="text-slate-400 font-semibold block mb-0.5">Location Address:</span>
                {currentCustomer.address}
              </div>
            )}
          </div>
        </div>

        {/* Business Sales Summary Card */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-3">
          <div className="text-xs font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Receipt className="w-3.5 h-3.5 text-slate-500" />
            Purchases & Orders Summary
          </div>

          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Invoices Created</span>
              <div className="text-xl font-black text-slate-900 mt-0.5">
                {customerSales.length}
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Total Sales Value</span>
              <div className="text-base font-black text-slate-900 mt-0.5 truncate">
                {formatPKR(customerSales.reduce((s, x) => s + (x.totalAmount || 0), 0))}
              </div>
            </div>
          </div>

          {isCompany && (
            <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100">
              <span className="text-slate-500 font-semibold">Registered Machines:</span>
              <span className="font-bold text-red-700 bg-red-50 px-2 py-0.5 rounded-md">
                {machines.length} Machines
              </span>
            </div>
          )}
        </div>

        {/* Net Outstanding Balance Banner */}
        <div className={`p-5 rounded-3xl border shadow-xs flex flex-col justify-between ${
          netBalance > 0 
            ? 'bg-rose-50/70 border-rose-200 text-rose-950' 
            : (netBalance < 0 ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950' : 'bg-slate-50 border-slate-200 text-slate-900')
        }`}>
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider opacity-70">
                Net Outstanding Balance
              </span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                netBalance > 0 
                  ? 'bg-rose-600 text-white' 
                  : (netBalance < 0 ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-700')
              }`}>
                {netBalance > 0 ? 'Customer Owes Us' : (netBalance < 0 ? 'Customer Advance' : 'Settled')}
              </span>
            </div>

            <div className="text-2xl sm:text-3xl font-black mt-2 tracking-tight">
              {formatPKR(Math.abs(netBalance))}
            </div>

            <p className="text-[11px] font-medium opacity-80 mt-1">
              {netBalance > 0 
                ? 'Receivable amount due from customer on credit accounts.'
                : (netBalance < 0 ? 'Excess payment received in advance balance.' : 'All accounts and invoices are completely settled.')}
            </p>
          </div>

          <div className="pt-3 border-t border-black/5 flex items-center justify-between text-xs font-bold">
            <span className="opacity-70">Opening Bal: {formatPKR(currentCustomer.openingBalance || 0)}</span>
            <button
              type="button"
              onClick={() => { setEditingPaymentEntry(null); setShowPaymentModal(true); }}
              className="text-emerald-700 hover:text-emerald-800 hover:underline cursor-pointer"
            >
              + Quick Payment
            </button>
          </div>
        </div>
      </div>

      {/* Main Tab Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 flex-wrap">
        {isCompany ? (
          <>
            {/* Tab 1: Demand Tab for Companies */}
            <button
              type="button"
              onClick={() => setActiveTab('demand')}
              className={`px-4 py-2.5 rounded-2xl text-xs font-black transition-colors flex items-center gap-2 cursor-pointer select-none ${
                activeTab === 'demand'
                  ? 'bg-red-600 text-white shadow-xs'
                  : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <Wrench className="w-4 h-4 shrink-0" />
              <span>Demand Tab (Machines & Parts Planner)</span>
              <span className={`px-2 py-0.2 rounded-full text-[10px] font-black ${
                activeTab === 'demand' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'
              }`}>
                {machines.length}
              </span>
            </button>

            {/* Tab 2: Ledger for Companies */}
            <button
              type="button"
              onClick={() => setActiveTab('ledger')}
              className={`px-4 py-2.5 rounded-2xl text-xs font-black transition-colors flex items-center gap-2 cursor-pointer select-none ${
                activeTab === 'ledger'
                  ? 'bg-red-600 text-white shadow-xs'
                  : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <FileText className="w-4 h-4 shrink-0" />
              <span>Ledger / Khata Statement</span>
            </button>

            {/* Tab 3: Invoices for Companies */}
            <button
              type="button"
              onClick={() => setActiveTab('invoices')}
              className={`px-4 py-2.5 rounded-2xl text-xs font-black transition-colors flex items-center gap-2 cursor-pointer select-none ${
                activeTab === 'invoices'
                  ? 'bg-red-600 text-white shadow-xs'
                  : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <Receipt className="w-4 h-4 shrink-0" />
              <span>Sales Invoices History</span>
              <span className={`px-2 py-0.2 rounded-full text-[10px] font-black ${
                activeTab === 'invoices' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'
              }`}>
                {customerSales.length}
              </span>
            </button>
          </>
        ) : (
          <>
            {/* Tab 1: Ledger for Individual Customers */}
            <button
              type="button"
              onClick={() => setActiveTab('ledger')}
              className={`px-4 py-2.5 rounded-2xl text-xs font-black transition-colors flex items-center gap-2 cursor-pointer select-none ${
                activeTab === 'ledger'
                  ? 'bg-red-600 text-white shadow-xs'
                  : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <FileText className="w-4 h-4 shrink-0" />
              <span>Ledger / Khata Statement</span>
            </button>

            {/* Tab 2: Invoices for Individual Customers */}
            <button
              type="button"
              onClick={() => setActiveTab('invoices')}
              className={`px-4 py-2.5 rounded-2xl text-xs font-black transition-colors flex items-center gap-2 cursor-pointer select-none ${
                activeTab === 'invoices'
                  ? 'bg-red-600 text-white shadow-xs'
                  : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <Receipt className="w-4 h-4 shrink-0" />
              <span>Sales Invoices History</span>
              <span className={`px-2 py-0.2 rounded-full text-[10px] font-black ${
                activeTab === 'invoices' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'
              }`}>
                {customerSales.length}
              </span>
            </button>
          </>
        )}
      </div>

      {/* ==================================================== */}
      {/* TAB 1 CONTENT: DEMAND TAB (For Companies)            */}
      {/* ==================================================== */}
      {activeTab === 'demand' && isCompany && (
        <div className="space-y-5 animate-in fade-in duration-150">
          
          {/* Demand Toolbar & Multi-Select Action Banner */}
          <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-wrap">
              {/* Select All Checkbox */}
              {machines.length > 0 && (
                <button
                  type="button"
                  onClick={handleToggleSelectAllMachines}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-black text-slate-700 flex items-center gap-2 transition-colors cursor-pointer"
                >
                  {isAllMachinesSelected ? (
                    <CheckSquare className="w-4 h-4 text-red-600" />
                  ) : (
                    <Square className="w-4 h-4 text-slate-400" />
                  )}
                  <span>{isAllMachinesSelected ? 'Deselect All' : 'Select All Machines'}</span>
                </button>
              )}

              {/* Machine Search Filter */}
              <div className="relative min-w-[220px]">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search machines or parts..."
                  value={machineSearchTerm}
                  onChange={(e) => setMachineSearchTerm(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 outline-hidden focus:border-red-500"
                />
              </div>

              {selectedMachineIds.length > 0 && (
                <div className="px-3 py-1 bg-red-50 text-red-800 rounded-xl text-xs font-bold border border-red-200">
                  <strong>{selectedMachineIds.length}</strong> machine{selectedMachineIds.length === 1 ? '' : 's'} selected ({selectedItemsToRecord.length} items • {formatPKR(totalSelectedDemandAmount)})
                </div>
              )}
            </div>

            {/* Primary Action Buttons */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleRecordSaleForSelected}
                disabled={selectedMachineIds.length === 0}
                className={`px-4 py-2.5 rounded-2xl text-xs font-black transition-all flex items-center gap-2 shadow-sm ${
                  selectedMachineIds.length > 0
                    ? 'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white cursor-pointer'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                }`}
                title="Open POS with items and prices auto-loaded from selected machines"
              >
                <ShoppingCart className="w-4 h-4" />
                <span>Record Sale for Selected Machines ({selectedMachineIds.length})</span>
              </button>

              <button
                type="button"
                onClick={() => { setEditingMachine(null); setShowMachineModal(true); }}
                className="px-4 py-2.5 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white rounded-2xl text-xs font-black transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>+ Add Machine</span>
              </button>
            </div>
          </div>

          {/* Machine Cards List */}
          {filteredMachines.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 shadow-xs space-y-3">
              <Wrench className="w-12 h-12 text-slate-300 mx-auto" />
              <h3 className="text-base font-bold text-slate-800">No Machines Configured Yet</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Add excavators, bulldozers, trucks or power generators for this company. Select products from inventory to define demand quantities and custom selling prices.
              </p>
              <button
                type="button"
                onClick={() => { setEditingMachine(null); setShowMachineModal(true); }}
                className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-black rounded-2xl shadow-sm transition-all inline-flex items-center gap-2 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add First Machine</span>
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredMachines.map((machine) => {
                const isSelected = selectedMachineIds.includes(machine.id);
                const machineTotal = machine.items.reduce((s, i) => s + (i.quantity || 1) * (i.unitPrice || 0), 0);

                return (
                  <div
                    key={machine.id}
                    className={`bg-white rounded-3xl border transition-all shadow-xs overflow-hidden ${
                      isSelected ? 'border-red-500 ring-2 ring-red-500/20' : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    {/* Machine Header Bar */}
                    <div className="p-4 sm:p-5 bg-slate-50/80 border-b border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-start gap-3">
                        {/* Selection Checkbox */}
                        <button
                          type="button"
                          onClick={() => handleToggleSelectMachine(machine.id)}
                          className="mt-0.5 p-1 text-slate-600 hover:text-red-600 transition-colors cursor-pointer"
                          title={isSelected ? 'Deselect machine' : 'Select machine for sale'}
                        >
                          {isSelected ? (
                            <CheckSquare className="w-5 h-5 text-red-600" />
                          ) : (
                            <Square className="w-5 h-5 text-slate-400" />
                          )}
                        </button>

                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-base font-black text-slate-900">
                              {machine.machineName}
                            </h3>
                            {machine.purchaseFrequency && (
                              <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 text-[10px] font-black flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {machine.purchaseFrequency}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-3 text-xs text-slate-500 font-semibold mt-1 flex-wrap">
                            {machine.operatorName && (
                              <span>👤 Operator: <strong className="text-slate-800">{machine.operatorName}</strong></span>
                            )}
                            {machine.location && (
                              <span>📍 Location: <strong className="text-slate-800">{machine.location}</strong></span>
                            )}
                            {machine.notes && (
                              <span className="italic text-slate-400">"{machine.notes}"</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Machine Actions */}
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleQuickRecordSaleForSingleMachine(machine)}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer"
                          title="Record sale for only this machine"
                        >
                          <ShoppingCart className="w-3.5 h-3.5" />
                          <span>Record Sale ({machine.items.length} items)</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => { setEditingMachine(machine); setShowMachineModal(true); }}
                          className="p-2 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl text-slate-700 transition-colors cursor-pointer"
                          title="Edit Machine & Parts"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteMachine(machine.id)}
                          className="p-2 bg-white hover:bg-rose-50 border border-slate-200 hover:border-rose-200 text-slate-400 hover:text-rose-600 rounded-xl transition-colors cursor-pointer"
                          title="Delete Machine"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Machine Demand Items Table */}
                    <div className="p-4 sm:p-5">
                      {machine.items.length === 0 ? (
                        <div className="p-4 text-center text-xs text-slate-400 italic">
                          No demand items attached to this machine. Click Edit to add filters from inventory.
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full min-w-[700px] text-left text-xs border-collapse">
                            <thead>
                              <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase text-[10px]">
                                <th className="py-2 px-3">Item / Filter Code</th>
                                <th className="py-2 px-3">Brand & Category</th>
                                <th className="py-2 px-3">Customer's Part #</th>
                                <th className="py-2 px-3 text-center">Cycle Qty</th>
                                <th className="py-2 px-3 text-right">Selling Price</th>
                                <th className="py-2 px-3 text-right">Line Total</th>
                                <th className="py-2 px-3 text-center">Stock Status</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {machine.items.map((it) => {
                                const matchedProd = products.find(p => p.id === it.productId || (it.internalId && p.internalId === it.internalId));
                                const currentStock = matchedProd?.stockQuantity ?? 0;
                                const isLowStock = currentStock < it.quantity;

                                return (
                                  <tr key={it.id} className="hover:bg-slate-50/80">
                                    <td className="py-2.5 px-3">
                                      <div className="font-black text-slate-900">
                                        {it.productName}
                                      </div>
                                      {it.internalId && (
                                        <span className="font-mono text-[10px] text-slate-500 font-bold">
                                          {it.internalId}
                                        </span>
                                      )}
                                    </td>

                                    <td className="py-2.5 px-3 text-slate-600">
                                      <span className="font-bold text-slate-800">{it.brandName || '—'}</span>
                                      {it.typeName && <span className="text-[10px] text-slate-400 block">{it.typeName}</span>}
                                    </td>

                                    <td className="py-2.5 px-3">
                                      {it.customerItemNumber ? (
                                        <span className="px-2 py-0.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-md font-mono text-[11px] font-bold">
                                          {it.customerItemNumber}
                                        </span>
                                      ) : (
                                        <span className="text-slate-400 italic text-[11px]">Not assigned</span>
                                      )}
                                    </td>

                                    <td className="py-2.5 px-3 text-center font-black text-slate-900">
                                      {it.quantity} <span className="text-[10px] text-slate-400 font-normal">{it.unit || 'Pcs'}</span>
                                    </td>

                                    <td className="py-2.5 px-3 text-right font-black text-slate-900 font-mono">
                                      {formatPKR(it.unitPrice)}
                                    </td>

                                    <td className="py-2.5 px-3 text-right font-black text-red-700 font-mono">
                                      {formatPKR(it.quantity * it.unitPrice)}
                                    </td>

                                    <td className="py-2.5 px-3 text-center">
                                      {matchedProd ? (
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                          isLowStock
                                            ? 'bg-amber-100 text-amber-800'
                                            : 'bg-emerald-100 text-emerald-800'
                                        }`}>
                                          {currentStock} in stock {isLowStock ? '⚠️' : '✓'}
                                        </span>
                                      ) : (
                                        <span className="text-[10px] text-slate-400 font-bold">Custom Part</span>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                            <tfoot>
                              <tr className="border-t-2 border-slate-200 font-black text-slate-900">
                                <td colSpan={3} className="py-2 px-3 text-xs uppercase text-slate-500">
                                  Machine Service Demand Total:
                                </td>
                                <td className="py-2 px-3 text-center">
                                  {machine.items.reduce((s, i) => s + i.quantity, 0)} parts
                                </td>
                                <td colSpan={2} className="py-2 px-3 text-right text-sm text-red-700 font-mono">
                                  {formatPKR(machineTotal)}
                                </td>
                                <td></td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ==================================================== */}
      {/* TAB 2 CONTENT: LEDGER & KHATA STATEMENT             */}
      {/* ==================================================== */}
      {activeTab === 'ledger' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          
          {/* Ledger Summary & Filter Bar */}
          <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-slate-900">
                  Customer Khata & Debit / Credit Transactions
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded-md font-bold bg-blue-50 text-blue-800 border border-blue-200">
                  {ledgerRows.length} Entries
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Complete record of sales invoices, cash payments, bank deposits and running balance.
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Search Bar for Ledger */}
              <div className="relative min-w-[200px] sm:min-w-[240px]">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={ledgerSearch}
                  onChange={(e) => setLedgerSearch(e.target.value)}
                  placeholder="Search invoice, code, remarks..."
                  className="w-full pl-8 pr-7 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-hidden focus:border-blue-500 focus:bg-white"
                />
                {ledgerSearch && (
                  <button
                    type="button"
                    onClick={() => setLedgerSearch('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* Statement View Toggle */}
              <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setLedgerSortOrder('statement')}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    ledgerSortOrder === 'statement'
                      ? 'bg-white text-slate-900 shadow-xs font-black'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                  title="Standard Accounting Statement Order: Oldest to newest, sales invoice entry comes strictly before payment receipt"
                >
                  Statement Order
                </button>
                <button
                  type="button"
                  onClick={() => setLedgerSortOrder('recent')}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    ledgerSortOrder === 'recent'
                      ? 'bg-white text-slate-900 shadow-xs font-black'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                  title="Recent First: Newest entries at top"
                >
                  Recent First
                </button>
              </div>

              <button
                type="button"
                id="btn-customer-ledger-download-pdf"
                onClick={() => downloadCustomerLedgerPDF(currentCustomer, ledgerRows, netBalance, 'Complete Ledger Statement')}
                className="px-3.5 py-2 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200/80 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                title="Download formatted customer transaction statement as PDF"
              >
                <Download className="w-4 h-4 text-red-600" />
                <span>Download PDF</span>
              </button>

              <button
                type="button"
                onClick={() => setShowPrintModal(true)}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Print Ledger</span>
              </button>

              <button
                type="button"
                onClick={() => { setEditingPaymentEntry(null); setShowPaymentModal(true); }}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Record Payment (Cash In)</span>
              </button>
            </div>
          </div>

          {/* Interactive Tip Banner */}
          <div className="p-3 bg-blue-50/70 border border-blue-200/60 rounded-2xl px-4 flex flex-wrap items-center justify-between text-xs text-blue-900 gap-2">
            <span className="flex items-center gap-1.5">
              <span>💡</span>
              <span><strong>Tip:</strong> Double click on any row below to view or edit the full transaction details (invoice breakdown, payment receipt, or customer balance).</span>
            </span>
            <span className="font-semibold text-slate-600">
              Showing: <strong className="text-slate-900">{displayLedgerRows.length}</strong> of <strong className="text-slate-900">{ledgerRows.length}</strong> entries
            </span>
          </div>

          {/* Ledger Table */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-900 text-white font-black">
                    <th className="py-3 px-4 w-28">Date</th>
                    <th className="py-3 px-4 w-32">Type / Code</th>
                    <th className="py-3 px-4">Description / Particulars</th>
                    <th className="py-3 px-4 text-right w-32">Debit (+Receivable)</th>
                    <th className="py-3 px-4 text-right w-32">Credit (-Paid)</th>
                    <th className="py-3 px-4 text-right w-36">Running Balance</th>
                    <th className="py-3 px-3 text-center w-20">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 font-medium">
                  {displayLedgerRows.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400 font-bold">
                        {ledgerSearch ? 'No ledger entries match your search.' : 'No ledger entries or transactions recorded yet.'}
                      </td>
                    </tr>
                  ) : (
                    displayLedgerRows.map((row) => (
                      <tr 
                        key={row.id} 
                        id={`customer-ledger-row-${row.id}`}
                        onDoubleClick={() => handleDoubleClickLedgerRow(row)}
                        className="hover:bg-blue-50/70 cursor-pointer transition-colors group select-none"
                        title="Double-click to view or edit details"
                      >
                        <td className="py-3 px-4 text-slate-600 text-[11px]">
                          {new Date(row.date).toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </td>

                        <td className="py-3 px-4">
                          <span className={`inline-block px-2 py-0.5 rounded-md font-mono text-[11px] font-bold ${
                            row.sourceType === 'sale' 
                              ? 'bg-blue-50 text-blue-800 border border-blue-200' 
                              : (row.sourceType === 'payment_received' 
                                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
                                  : 'bg-slate-100 text-slate-700')
                          }`}>
                            {row.entryCode || row.billNumber || '—'}
                          </span>
                        </td>

                        <td className="py-3 px-4 text-slate-800">
                          <div>{row.description}</div>
                          {row.paymentMethod && (
                            <span className="text-[10px] text-slate-500 font-semibold">
                              Method: {row.paymentMethod}
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                          {row.debit > 0 ? formatPKR(row.debit) : '—'}
                        </td>

                        <td className="py-3 px-4 text-right font-mono font-bold text-emerald-700">
                          {row.credit > 0 ? formatPKR(row.credit) : '—'}
                        </td>

                        <td className={`py-3 px-4 text-right font-mono font-black ${
                          row.runningBalance > 0 ? 'text-red-700' : (row.runningBalance < 0 ? 'text-emerald-700' : 'text-slate-600')
                        }`}>
                          {formatPKR(Math.abs(row.runningBalance))} {row.runningBalance > 0 ? 'Dr' : (row.runningBalance < 0 ? 'Cr' : '')}
                        </td>

                        <td className="py-3 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                          {row.rawObject && (row.sourceType === 'payment_received' || row.sourceType === 'cash_refund' || row.sourceType === 'adjustment') && row.rawObject.id?.startsWith('CLE-') ? (
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingPaymentEntry(row.rawObject);
                                  setShowPaymentModal(true);
                                }}
                                className="p-1 text-slate-400 hover:text-blue-700 hover:bg-blue-50 rounded-md transition-colors cursor-pointer"
                                title="Edit payment entry"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeletePaymentEntry(row.rawObject.id)}
                                className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                                title="Delete entry"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (row.sourceType === 'sale' || row.id.startsWith('sale-pay-')) ? (
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleDoubleClickLedgerRow(row)}
                                className="p-1 text-slate-500 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors cursor-pointer"
                                title="View & Print Invoice"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : row.sourceType === 'opening_balance' ? (
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                onClick={() => setShowEditCustomerModal(true)}
                                className="p-1 text-slate-400 hover:text-blue-700 hover:bg-blue-50 rounded-md transition-colors cursor-pointer"
                                title="Edit Customer Profile & Opening Balance"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* TAB 3 CONTENT: INVOICES HISTORY                      */}
      {/* ==================================================== */}
      {activeTab === 'invoices' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <h3 className="text-base font-black text-slate-900">
                Invoices History for {currentCustomer.name}
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                All sales recorded for this customer.
              </p>
            </div>

            <button
              type="button"
              onClick={() => onOpenNewSaleForCustomer(currentCustomer.id)}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-black transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Create New Invoice</span>
            </button>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-900 text-white font-black">
                    <th className="py-3 px-4">Invoice #</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Items Summary</th>
                    <th className="py-3 px-4 text-right">Total Amount</th>
                    <th className="py-3 px-4 text-right">Paid</th>
                    <th className="py-3 px-4 text-center">Payment Status</th>
                    <th className="py-3 px-4 text-center w-28">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 font-medium">
                  {customerSales.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400 font-bold">
                        No sales invoices recorded for this customer yet.
                      </td>
                    </tr>
                  ) : (
                    customerSales.map((s) => (
                      <tr 
                        key={s.id} 
                        className="hover:bg-slate-50 cursor-pointer"
                        onDoubleClick={() => onViewInvoice?.(s)}
                        title="Double-click to view / print invoice"
                      >
                        <td className="py-3 px-4 font-mono font-black text-slate-900">
                          {s.id}
                        </td>
                        <td className="py-3 px-4 text-slate-600">
                          {new Date(s.date || s.createdAt).toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </td>
                        <td className="py-3 px-4 text-slate-700">
                          {s.items.length} item{s.items.length === 1 ? '' : 's'} ({s.items.map(i => i.productName).slice(0, 2).join(', ')}{s.items.length > 2 ? '...' : ''})
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-black text-slate-900">
                          {formatPKR(s.totalAmount)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-emerald-700">
                          {formatPKR(s.amountReceived || 0)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {s.amountReceived >= s.totalAmount && s.totalAmount > 0 ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-100 text-emerald-800 border border-emerald-200">
                              Paid (Cash)
                            </span>
                          ) : s.amountReceived > 0 && s.amountReceived < s.totalAmount ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-100 text-amber-800 border border-amber-200" title={`Paid: ₨ ${s.amountReceived.toLocaleString()}, Due: ₨ ${(s.balanceDue || (s.totalAmount - s.amountReceived)).toLocaleString()}`}>
                              Semi-Paid (Due: {formatPKR(s.balanceDue || (s.totalAmount - s.amountReceived))})
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-rose-100 text-rose-800 border border-rose-200">
                              Credit (Unpaid)
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                          {onViewInvoice && (
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                onClick={() => onViewInvoice(s)}
                                className="p-1.5 bg-slate-100 hover:bg-red-50 text-slate-700 hover:text-red-700 rounded-lg transition-colors cursor-pointer"
                                title="View & Print Invoice"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => onViewInvoice(s)}
                                className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors cursor-pointer"
                                title="Print Invoice"
                              >
                                <Printer className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      {showPaymentModal && (
        <CustomerPaymentModal
          isOpen={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          customers={allCustomers}
          preselectedCustomer={currentCustomer}
          editingEntry={editingPaymentEntry}
          onSavePayment={handleSavePayment}
        />
      )}

      {showMachineModal && (
        <CompanyMachineModal
          isOpen={showMachineModal}
          onClose={() => setShowMachineModal(false)}
          company={currentCustomer}
          editingMachine={editingMachine}
          products={products}
          onSaveMachine={handleSaveMachine}
        />
      )}

      {showEditCustomerModal && (
        <CustomerFormModal
          isOpen={showEditCustomerModal}
          onClose={() => setShowEditCustomerModal(false)}
          customer={currentCustomer}
          defaultType={currentCustomer.type || 'customer'}
          onSaveCustomer={handleSaveCustomerProfile}
        />
      )}

      {showPrintModal && (
        <CustomerLedgerPrintModal
          isOpen={showPrintModal}
          onClose={() => setShowPrintModal(false)}
          customer={currentCustomer}
          ledgerRows={ledgerRows}
          currentBalance={netBalance}
        />
      )}
    </div>
  );
};
