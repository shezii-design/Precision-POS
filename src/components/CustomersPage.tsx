import { useOnlineStatus } from '../hooks/useOnlineStatus';
import React, { useState, useMemo } from 'react';
import { 
  Customer, 
  Product, 
  Sale, 
  CustomerLedgerEntry, 
  CustomerType, 
  CompanyMachine 
} from '../types';
import { formatPKR } from '../services/pricing';
import { 
  calculateCustomerNetBalance, 
  computeCustomerLedgerRows,
  saveCustomer, 
  deleteCustomer, 
  recordCustomerPaymentAndUpdateAll,
  saveCompanyMachineAndSyncInventory
} from '../services/storage';
import { downloadCustomerLedgerPDF } from '../services/pdfReportGenerator';
import { CustomerDetailsPage } from './CustomerDetailsPage';
import { CustomerFormModal } from './CustomerFormModal';
import { CustomerPaymentModal } from './CustomerPaymentModal';
import { InitialSaleItemPreset } from './NewSaleModal';
import { 
  Users, 
  Building2, 
  User, 
  Search, 
  Plus, 
  Phone, 
  MapPin, 
  Wallet, 
  ShoppingCart, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Wrench, 
  FileText, 
  Edit, 
  Trash2, 
  Sparkles, 
  Filter, 
  CheckCircle2, 
  Briefcase, 
  MessageCircle,
  Clock,
  Layers,
  Download
} from 'lucide-react';

interface CustomersPageProps {
  customers: Customer[];
  products: Product[];
  sales: Sale[];
  customerLedger: CustomerLedgerEntry[];
  onOpenNewSale: (customerId?: string, presetItems?: InitialSaleItemPreset[]) => void;
  onUpdateCustomers: (customers: Customer[]) => void;
  onUpdateLedger: (ledger: CustomerLedgerEntry[]) => void;
  onUpdateProducts: (products: Product[]) => void;
  onViewInvoice?: (sale: Sale) => void;
  onEditSale?: (sale: Sale) => void;
}

export const CustomersPage: React.FC<CustomersPageProps> = ({
  customers = [],
  products = [],
  sales = [],
  customerLedger = [],
  onOpenNewSale,
  onUpdateCustomers,
  onUpdateLedger,
  onUpdateProducts,
  onViewInvoice,
  onEditSale,
}) => {
  const safeCustomers = customers || [];
  const safeSales = sales || [];
  const safeCustomerLedger = customerLedger || [];
  // Navigation & View state
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'customers' | 'companies'>('customers');
  
  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [balanceFilter, setBalanceFilter] = useState<'all' | 'receivable' | 'credit' | 'zero'>('all');
  const [cityFilter, setCityFilter] = useState<string>('all');

  // Modal states
  const [showCustomerModal, setShowCustomerModal] = useState<boolean>(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [customerModalType, setCustomerModalType] = useState<CustomerType>('customer');
  
  const [showPaymentModal, setShowPaymentModal] = useState<boolean>(false);
  const [paymentPreselectedCustomer, setPaymentPreselectedCustomer] = useState<Customer | null>(null);

  // Extract unique cities
  const uniqueCities = useMemo(() => {
    const set = new Set<string>();
    safeCustomers.forEach(c => {
      if (c.city && c.city.trim()) set.add(c.city.trim());
    });
    return Array.from(set).sort();
  }, [safeCustomers]);

  // Compute Net Balance for each customer
  const customersWithBalance = useMemo(() => {
    return safeCustomers.map(cust => {
      const balance = calculateCustomerNetBalance(
        cust.id,
        cust.openingBalance || 0,
        safeSales,
        safeCustomerLedger
      );
      const custSales = safeSales.filter(s => s.customerId === cust.id || (s.customerName && s.customerName.toLowerCase() === cust.name.toLowerCase()));
      const machineCount = cust.machines?.length || 0;
      const totalDemandItems = cust.machines?.reduce((s, m) => s + (m.items?.length || 0), 0) || 0;

      return {
        ...cust,
        computedBalance: balance,
        salesCount: custSales.length,
        totalSalesValue: custSales.reduce((s, x) => s + (x.totalAmount || 0), 0),
        machineCount,
        totalDemandItems,
      };
    });
  }, [safeCustomers, safeSales, safeCustomerLedger]);

  // Overall KPI Metrics
  const kpis = useMemo(() => {
    let totalReceivables = 0;
    let totalCredits = 0;
    let companyCount = 0;
    let customerCount = 0;
    let totalMachines = 0;

    customersWithBalance.forEach(c => {
      if (c.computedBalance > 0) totalReceivables += c.computedBalance;
      if (c.computedBalance < 0) totalCredits += Math.abs(c.computedBalance);
      if (c.type === 'company') {
        companyCount++;
        totalMachines += c.machineCount;
      } else {
        customerCount++;
      }
    });

    return {
      totalReceivables,
      totalCredits,
      companyCount,
      customerCount,
      totalMachines,
      totalCount: customers.length,
    };
  }, [customersWithBalance, customers]);

  // Filtered List
  const filteredCustomers = useMemo(() => {
    let list = customersWithBalance;

    // Filter by Tab
    if (activeTab === 'customers') {
      list = list.filter(c => c.type !== 'company');
    } else if (activeTab === 'companies') {
      list = list.filter(c => c.type === 'company');
    }

    // Filter by Search
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      list = list.filter(c => 
        c.name.toLowerCase().includes(q) ||
        (c.contactPerson && c.contactPerson.toLowerCase().includes(q)) ||
        (c.phone && c.phone.includes(q)) ||
        (c.city && c.city.toLowerCase().includes(q)) ||
        (c.ntn && c.ntn.includes(q)) ||
        (c.machines && c.machines.some(m => 
          m.machineName.toLowerCase().includes(q) || 
          (m.operatorName && m.operatorName.toLowerCase().includes(q)) ||
          (m.items && m.items.some(i => i.productName.toLowerCase().includes(q) || (i.customerItemNumber && i.customerItemNumber.toLowerCase().includes(q))))
        ))
      );
    }

    // Filter by Balance
    if (balanceFilter === 'receivable') {
      list = list.filter(c => c.computedBalance > 0);
    } else if (balanceFilter === 'credit') {
      list = list.filter(c => c.computedBalance < 0);
    } else if (balanceFilter === 'zero') {
      list = list.filter(c => c.computedBalance === 0);
    }

    // Filter by City
    if (cityFilter !== 'all') {
      list = list.filter(c => c.city && c.city.trim().toLowerCase() === cityFilter.toLowerCase());
    }

    return list;
  }, [customersWithBalance, activeTab, searchTerm, balanceFilter, cityFilter]);

  // Save Customer Handler
  const handleSaveCustomer = (customerData: Partial<Customer>) => {
    if (!isOnline) { alert('Offline Mode (Read-Only)\nCannot perform write/edit actions while offline.'); return; }
    const updated = saveCustomer(customerData, customers);
    onUpdateCustomers(updated);
  };

  // Delete Customer Handler
  const handleDeleteCustomer = (customerId: string, e: React.MouseEvent) => {
    if (!isOnline) { alert('Offline Mode (Read-Only)\nCannot perform write/edit actions while offline.'); return; }
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this customer account?')) {
      const result = deleteCustomer(customerId, customers, sales, customerLedger);
      onUpdateCustomers(result.updatedCustomers);
      onUpdateLedger(result.updatedLedger);
      if (selectedCustomerId === customerId) {
        setSelectedCustomerId(null);
      }
    }
  };

  // Payment Handler
  const handleSavePayment = (
    entryData: Omit<CustomerLedgerEntry, 'id' | 'createdAt'>,
    entryId?: string
  ) => {
    if (!isOnline) { alert('Offline Mode (Read-Only)\nCannot perform write/edit actions while offline.'); return; }
    const result = recordCustomerPaymentAndUpdateAll(entryData, customerLedger, customers);
    onUpdateLedger(result.updatedLedgerEntries);
    onUpdateCustomers(result.updatedCustomers);
  };

  // If a single customer is selected, show the Customer Details / Demand / Ledger page
  if (selectedCustomerId) {
    const selectedCust = customers.find(c => c.id === selectedCustomerId);
    if (selectedCust) {
      return (
        <CustomerDetailsPage
          customer={selectedCust}
          onBack={() => setSelectedCustomerId(null)}
          products={products}
          sales={sales}
          customerLedger={customerLedger}
          allCustomers={customers}
          onOpenNewSaleForCustomer={(cId, items) => onOpenNewSale(cId, items)}
          onUpdateCustomers={onUpdateCustomers}
          onUpdateLedger={onUpdateLedger}
          onUpdateProducts={onUpdateProducts}
          onViewInvoice={onViewInvoice}
          onEditSale={onEditSale}
        />
      );
    }
  }

  return (
    <div id="customers-page" className="space-y-6">
      
      {/* Page Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-red-100 text-red-700 rounded-xl">
              <Users className="w-5 h-5" />
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Customers & Corporate Companies
            </h1>
          </div>
          <p className="text-xs text-slate-500 font-semibold mt-1">
            Manage customer accounts, Khata ledgers, fleet machines, and service demand tabs.
          </p>
        </div>

        {/* Quick Add Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => {
              setPaymentPreselectedCustomer(null);
              setShowPaymentModal(true);
            }}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-2xl text-xs font-black shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Wallet className="w-4 h-4" />
            <span>Receive Payment</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setEditingCustomer(null);
              setCustomerModalType('customer');
              setShowCustomerModal(true);
            }}
            className="px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 rounded-2xl text-xs font-black shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <User className="w-4 h-4 text-slate-500" />
            <span>+ Add Customer</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setEditingCustomer(null);
              setCustomerModalType('company');
              setShowCustomerModal(true);
            }}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white rounded-2xl text-xs font-black shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Building2 className="w-4 h-4" />
            <span>+ Add Company (Demand Tab)</span>
          </button>
        </div>
      </div>

      {/* KPI Metrics Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        
        {/* Total Receivables */}
        <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider">
            <span>Total Receivables</span>
            <span className="p-1 rounded-lg bg-rose-50 text-rose-600">
              <ArrowDownLeft className="w-4 h-4" />
            </span>
          </div>
          <div className="text-xl sm:text-2xl font-black text-rose-600 mt-1 truncate">
            {formatPKR(kpis.totalReceivables)}
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5 font-medium">
            Outstanding balance due from customers
          </p>
        </div>

        {/* Total Corporate Companies */}
        <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider">
            <span>Corporate Clients</span>
            <span className="p-1 rounded-lg bg-red-50 text-red-600">
              <Building2 className="w-4 h-4" />
            </span>
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
            {kpis.companyCount} <span className="text-xs text-slate-400 font-bold">Companies</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5 font-medium">
            With fleet machines & demand tabs
          </p>
        </div>

        {/* Total Demand Machines Configured */}
        <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider">
            <span>Fleet Machines</span>
            <span className="p-1 rounded-lg bg-amber-50 text-amber-600">
              <Wrench className="w-4 h-4" />
            </span>
          </div>
          <div className="text-xl sm:text-2xl font-black text-amber-600 mt-1">
            {kpis.totalMachines} <span className="text-xs text-slate-400 font-bold">Machines</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5 font-medium">
            Excavators, loaders, generators registered
          </p>
        </div>

        {/* Regular Customers */}
        <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider">
            <span>Individual Customers</span>
            <span className="p-1 rounded-lg bg-blue-50 text-blue-600">
              <User className="w-4 h-4" />
            </span>
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
            {kpis.customerCount} <span className="text-xs text-slate-400 font-bold">Accounts</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5 font-medium">
            Trade workshops & counter accounts
          </p>
        </div>
      </div>

      {/* Search & Filter Controls */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200 shadow-xs space-y-4">
        
        {/* Search Input */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by customer/company name, contact person, phone, city, machine model or customer item number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-red-500 focus:bg-white rounded-2xl text-xs font-bold text-slate-900 outline-hidden transition-all placeholder:text-slate-400"
          />
        </div>

        {/* Tab Switcher & Quick Dropdown Filters */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-1">
          
          {/* Main Category Tabs: Customers, Companies, All */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-2xl flex-wrap">
            <button
              type="button"
              onClick={() => setActiveTab('customers')}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-colors flex items-center gap-1.5 cursor-pointer select-none ${
                activeTab === 'customers'
                  ? 'bg-white text-red-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <User className="w-3.5 h-3.5 shrink-0" />
              <span>Customers</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                activeTab === 'customers' ? 'bg-red-50 text-red-700' : 'bg-slate-200 text-slate-600'
              }`}>
                {kpis.customerCount}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('companies')}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-colors flex items-center gap-1.5 cursor-pointer select-none ${
                activeTab === 'companies'
                  ? 'bg-white text-red-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Building2 className="w-3.5 h-3.5 shrink-0" />
              <span>Companies (Demand Tab)</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                activeTab === 'companies' ? 'bg-red-50 text-red-700' : 'bg-slate-200 text-slate-600'
              }`}>
                {kpis.companyCount}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('all')}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-colors flex items-center gap-1.5 cursor-pointer select-none ${
                activeTab === 'all'
                  ? 'bg-white text-red-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5 shrink-0" />
              <span>All Accounts</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                activeTab === 'all' ? 'bg-red-50 text-red-700' : 'bg-slate-200 text-slate-600'
              }`}>
                {kpis.totalCount}
              </span>
            </button>
          </div>

          {/* Secondary Filters: Balance & City */}
          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={balanceFilter}
              onChange={(e) => setBalanceFilter(e.target.value as any)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-hidden cursor-pointer"
            >
              <option value="all">All Balances</option>
              <option value="receivable">Receivable Only (&gt; 0)</option>
              <option value="credit">Advance Credit (&lt; 0)</option>
              <option value="zero">Settled / Zero</option>
            </select>

            {uniqueCities.length > 0 && (
              <select
                value={cityFilter}
                onChange={(e) => setCityFilter(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-hidden cursor-pointer"
              >
                <option value="all">All Cities</option>
                {uniqueCities.map(city => (
                  <option key={city} value={city}>{city}</option>
                ))}
              </select>
            )}
          </div>
        </div>
      </div>

      {/* Cards Grid */}
      {filteredCustomers.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 shadow-xs space-y-3">
          <Users className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-base font-bold text-slate-800">No matching accounts found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Try adjusting your search keywords or filter criteria, or add a new customer or company.
          </p>
          <div className="pt-2 flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => {
                setEditingCustomer(null);
                setCustomerModalType(activeTab === 'companies' ? 'company' : 'customer');
                setShowCustomerModal(true);
              }}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-black shadow-xs transition-all cursor-pointer"
            >
              + Add {activeTab === 'companies' ? 'Company' : 'Customer'}
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCustomers.map((cust) => {
            const isComp = cust.type === 'company';
            const bal = cust.computedBalance;

            return (
              <div
                key={cust.id}
                onDoubleClick={() => setSelectedCustomerId(cust.id)}
                onClick={() => {
                  // Single click on card on mobile can open, or buttons
                }}
                className={`bg-white rounded-3xl border transition-all duration-150 shadow-xs hover:shadow-md flex flex-col justify-between group cursor-pointer ${
                  isComp ? 'border-slate-200 hover:border-red-400' : 'border-slate-200 hover:border-blue-400'
                }`}
              >
                {/* Card Top / Header */}
                <div className="p-5 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold shadow-2xs ${
                        isComp ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                      }`}>
                        {isComp ? <Building2 className="w-5 h-5" /> : <User className="w-5 h-5" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className={`px-1.5 py-0.2 rounded text-[9px] font-black uppercase tracking-wider ${
                            isComp ? 'bg-red-50 text-red-700' : 'bg-blue-50 text-blue-700'
                          }`}>
                            {isComp ? 'Company' : 'Customer'}
                          </span>
                          {cust.city && (
                            <span className="text-[10px] text-slate-400 font-semibold">
                              • {cust.city}
                            </span>
                          )}
                        </div>
                        <h3 className="text-base font-black text-slate-900 group-hover:text-red-600 transition-colors line-clamp-1">
                          {cust.name}
                        </h3>
                      </div>
                    </div>

                    {/* Quick Edit/Delete Dropdown */}
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingCustomer(cust);
                          setCustomerModalType(cust.type || 'customer');
                          setShowCustomerModal(true);
                        }}
                        className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                        title="Edit details"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => handleDeleteCustomer(cust.id, e)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="Delete customer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Contact Info & Details */}
                  <div className="space-y-1.5 text-xs text-slate-600">
                    {cust.contactPerson && (
                      <div className="flex items-center justify-between text-slate-700">
                        <span className="text-slate-400 font-medium">Contact:</span>
                        <span className="font-bold">{cust.contactPerson}</span>
                      </div>
                    )}

                    {cust.phone && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 font-medium">Phone:</span>
                        <div className="flex items-center gap-1">
                          <span className="font-semibold text-slate-900">{cust.phone}</span>
                          <a
                            href={`https://wa.me/${cust.phone.replace(/[^0-9]/g, '')}`}
                            target="_blank"
                            rel="noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="p-1 text-emerald-600 hover:text-emerald-700 rounded-md"
                            title="WhatsApp"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      </div>
                    )}

                    {isComp && (
                      <div className="p-2.5 bg-red-50/70 border border-red-100 rounded-2xl flex items-center justify-between text-xs mt-2">
                        <span className="font-bold text-red-950 flex items-center gap-1.5">
                          <Wrench className="w-3.5 h-3.5 text-red-600" />
                          Machines Configured:
                        </span>
                        <span className="font-black text-red-700">
                          {cust.machineCount} Machines ({cust.totalDemandItems} parts)
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Net Balance Pill */}
                  <div className={`p-3 rounded-2xl border flex items-center justify-between ${
                    bal > 0 
                      ? 'bg-rose-50/80 border-rose-200 text-rose-950' 
                      : (bal < 0 ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950' : 'bg-slate-50 border-slate-200 text-slate-700')
                  }`}>
                    <span className="text-[10px] font-black uppercase tracking-wider">
                      {bal > 0 ? 'Receivable (Dr)' : (bal < 0 ? 'Advance (Cr)' : 'Settled Balance')}
                    </span>
                    <span className="text-sm font-black font-mono">
                      {formatPKR(Math.abs(bal))}
                    </span>
                  </div>

                  {/* Company Double-Click Hint */}
                  {isComp && (
                    <p className="text-[10px] text-center text-slate-400 font-medium italic pt-0.5">
                      💡 Double-click card to open Demand & Ledger tabs
                    </p>
                  )}
                </div>

                {/* Card Footer Actions */}
                <div className="px-5 py-3 bg-slate-50/90 border-t border-slate-100 rounded-b-3xl flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedCustomerId(cust.id)}
                    className={`text-xs font-black hover:underline cursor-pointer flex items-center gap-1 ${
                      isComp ? 'text-red-700' : 'text-blue-700'
                    }`}
                  >
                    <span>{isComp ? 'Demand & Khata ➔' : 'View Khata / Ledger ➔'}</span>
                  </button>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      id={`btn-customer-card-pdf-${cust.id}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        const rows = computeCustomerLedgerRows(cust, safeSales, safeCustomerLedger);
                        downloadCustomerLedgerPDF(cust, rows, bal, 'Complete Ledger Statement');
                      }}
                      className="p-1.5 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-[11px] font-bold transition-colors flex items-center gap-1 cursor-pointer"
                      title="Download Customer Ledger PDF"
                    >
                      <Download className="w-3 h-3 text-red-600" />
                      <span>PDF</span>
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setPaymentPreselectedCustomer(cust);
                        setShowPaymentModal(true);
                      }}
                      className="p-1.5 px-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-xl text-[11px] font-bold transition-colors flex items-center gap-1 cursor-pointer"
                      title="Receive Payment"
                    >
                      <Wallet className="w-3 h-3" />
                      <span>Payment</span>
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenNewSale(cust.id);
                      }}
                      className="p-1.5 px-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-[11px] font-bold transition-colors flex items-center gap-1 cursor-pointer"
                      title="New Sale"
                    >
                      <ShoppingCart className="w-3 h-3" />
                      <span>Sale</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Customer Form Modal */}
      {showCustomerModal && (
        <CustomerFormModal
          isOpen={showCustomerModal}
          onClose={() => setShowCustomerModal(false)}
          customer={editingCustomer}
          defaultType={customerModalType}
          onSaveCustomer={handleSaveCustomer}
        />
      )}

      {/* Payment Modal */}
      {showPaymentModal && (
        <CustomerPaymentModal
          isOpen={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          customers={customers}
          preselectedCustomer={paymentPreselectedCustomer}
          onSavePayment={handleSavePayment}
        />
      )}
    </div>
  );
};
