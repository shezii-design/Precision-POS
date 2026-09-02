import React, { useState, useMemo } from 'react';
import { 
  AppWorkspaceView, 
  DeviceInfo, 
  EmployeeAccount, 
  EmployeePermissions, 
  RegisteredDevice, 
  UserRole 
} from '../types';
import { 
  ALL_WORKSPACE_TABS, 
  getRoleDefaultPermissions, 
  SUPER_ADMIN_PERMISSIONS, 
  saveEmployee, 
  deleteEmployee 
} from '../services/auth';
import { 
  registerCurrentDevice, 
  saveStoredRegisteredDevices, 
  deleteRegisteredDevice,
  getStoredRegisteredDevices,
  detectDeviceInfo
} from '../services/device';
import { 
  Users, 
  UserPlus, 
  Shield, 
  ShieldCheck, 
  ShieldAlert, 
  KeyRound, 
  Lock, 
  Unlock, 
  Laptop, 
  Monitor, 
  Smartphone, 
  Tablet, 
  Plus, 
  Edit3, 
  Trash2, 
  Check, 
  X, 
  RefreshCw, 
  Eye, 
  EyeOff, 
  CheckCircle2, 
  AlertCircle, 
  AlertTriangle,
  Sliders, 
  LayoutDashboard, 
  Box, 
  Receipt, 
  ShoppingBag, 
  Truck, 
  TrendingUp, 
  Building2, 
  RotateCcw, 
  FileText, 
  PackageSearch, 
  ClipboardList, 
  Sparkles,
  Info,
  DollarSign,
  Percent,
  CheckSquare,
  Square
} from 'lucide-react';

interface StaffManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  employees: EmployeeAccount[];
  onUpdateEmployees: (employees: EmployeeAccount[]) => void;
  registeredDevices?: RegisteredDevice[];
  onUpdateRegisteredDevices?: (devices: RegisteredDevice[]) => void;
  currentDeviceId?: string;
  activeDeviceId?: string;
  currentUserId?: string;
  deviceInfo?: DeviceInfo;
}

const TAB_METADATA: Record<AppWorkspaceView, { label: string; icon: React.ComponentType<{ className?: string }>; description: string }> = {
  dashboard: { label: 'Dashboard', icon: LayoutDashboard, description: 'Executive revenue, sales vs purchases & financial charts' },
  inventory: { label: 'Inventory & Stock', icon: Box, description: 'Product list, stock quantities, cabin shelves & labels' },
  sales: { label: 'Sales & Invoices', icon: Receipt, description: 'POS counter billing, customer slips & sale history' },
  purchases: { label: 'Purchases & Bills', icon: ShoppingBag, description: 'Supplier purchasing bills & inventory cost averaging' },
  purchase_orders: { label: 'Purchase Orders & Cargo', icon: Truck, description: 'POs, delayed billing & inward cargo receiving' },
  income_statement: { label: 'Income Statement (P&L)', icon: TrendingUp, description: 'Profit & Loss, operating expenses & net margin' },
  customers: { label: 'Customers & Ledgers', icon: Users, description: 'Customer Khata, machine fleet & balance statements' },
  vendors: { label: 'Vendors & Suppliers', icon: Building2, description: 'Supplier Khata, linked products & cash vouchers' },
  returns: { label: 'Returns & Credit Notes', icon: RotateCcw, description: 'Customer returns, vendor debit notes & restock/scrap' },
  quotations: { label: 'Quotations & Estimates', icon: FileText, description: 'Price quotes with validity dates & 1-click billing' },
  demands: { label: 'Demands & Backorders', icon: PackageSearch, description: 'Customer part inquiries, sizing specs & promises' },
  inventory_audit: { label: 'Inventory Audit Trail', icon: ClipboardList, description: 'Timestamped stock movements & audit snapshots' },
  audit_logs: { label: 'Audit Logs', icon: ClipboardList, description: 'Historical system and movement audit logs' },
};

const ROLE_INFO: Record<UserRole, { label: string; badgeClass: string; desc: string }> = {
  admin: { label: 'Super Admin', badgeClass: 'bg-red-100 text-red-800 border-red-200', desc: 'Unrestricted full access to all data, financials & settings' },
  cashier: { label: 'Sales Cashier', badgeClass: 'bg-blue-100 text-blue-800 border-blue-200', desc: 'Can make sales and customer khata, buying costs hidden' },
  procurement: { label: 'Purchasing Incharge', badgeClass: 'bg-amber-100 text-amber-800 border-amber-200', desc: 'Manages vendor bills, POs & stock buying rates' },
  stockkeeper: { label: 'Store / Stock Keeper', badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-200', desc: 'Adjusts physical inventory, prints barcodes & demands' },
  accountant: { label: 'Accountant / Auditor', badgeClass: 'bg-purple-100 text-purple-800 border-purple-200', desc: 'Manages ledgers, P&L & audit logs with cost visibility' },
  editor: { label: 'General Editor', badgeClass: 'bg-indigo-100 text-indigo-800 border-indigo-200', desc: 'Can create and edit daily transactions across modules' },
  viewer: { label: 'Read-Only Viewer', badgeClass: 'bg-slate-100 text-slate-800 border-slate-200', desc: 'Strictly view-only access, cannot alter records' },
  custom: { label: 'Custom Access', badgeClass: 'bg-teal-100 text-teal-800 border-teal-200', desc: 'Tailored permissions with customized module toggles' },
};

export const StaffManagementModal: React.FC<StaffManagementModalProps> = ({
  isOpen,
  onClose,
  employees,
  onUpdateEmployees,
  registeredDevices: propRegisteredDevices,
  onUpdateRegisteredDevices: propOnUpdateRegisteredDevices,
  currentDeviceId: propCurrentDeviceId,
  activeDeviceId,
  currentUserId = 'admin-master',
  deviceInfo: propDeviceInfo
}) => {
  const [internalRegisteredDevices, setInternalRegisteredDevices] = useState<RegisteredDevice[]>(() => getStoredRegisteredDevices());
  const registeredDevices = propRegisteredDevices || internalRegisteredDevices;
  const onUpdateRegisteredDevices = (devices: RegisteredDevice[]) => {
    setInternalRegisteredDevices(devices);
    saveStoredRegisteredDevices(devices);
    if (propOnUpdateRegisteredDevices) {
      propOnUpdateRegisteredDevices(devices);
    }
  };
  const currentDeviceId = propCurrentDeviceId || activeDeviceId || (registeredDevices[0]?.id || 'DEV-WIN-8492');
  const deviceInfo = propDeviceInfo || detectDeviceInfo();

  const [activeTab, setActiveTab] = useState<'employees' | 'devices'>('employees');
  const [editingEmployee, setEditingEmployee] = useState<EmployeeAccount | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showPinInForm, setShowPinInForm] = useState<boolean>(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string>('');
  const [editingDeviceNameId, setEditingDeviceNameId] = useState<string | null>(null);
  const [customDeviceNameInput, setCustomDeviceNameInput] = useState<string>('');
  const [employeeToDelete, setEmployeeToDelete] = useState<EmployeeAccount | null>(null);
  const [deviceToDelete, setDeviceToDelete] = useState<RegisteredDevice | null>(null);

  // Form State for Employee
  const [formData, setFormData] = useState<{
    id: string;
    name: string;
    email: string;
    phone: string;
    pin: string;
    role: UserRole;
    designation: string;
    status: 'active' | 'inactive';
    avatarColor: string;
    restrictToDevices: boolean;
    allowedDeviceIds: string[];
    permissions: EmployeePermissions;
    notes: string;
  }>({
    id: '',
    name: '',
    email: '',
    phone: '',
    pin: '1234',
    role: 'cashier',
    designation: 'Sales Cashier',
    status: 'active',
    avatarColor: 'blue',
    restrictToDevices: false,
    allowedDeviceIds: [],
    permissions: getRoleDefaultPermissions('cashier'),
    notes: ''
  });

  const showNotification = (msg: string) => {
    setFeedbackMessage(msg);
    setTimeout(() => setFeedbackMessage(''), 3500);
  };

  const handleStartCreate = () => {
    const newId = `emp-${Date.now()}`;
    const initialPerms = getRoleDefaultPermissions('cashier');
    setFormData({
      id: newId,
      name: '',
      email: '',
      phone: '',
      pin: Math.floor(1000 + Math.random() * 9000).toString(),
      role: 'cashier',
      designation: 'Counter Cashier',
      status: 'active',
      avatarColor: 'blue',
      restrictToDevices: false,
      allowedDeviceIds: [currentDeviceId],
      permissions: initialPerms,
      notes: ''
    });
    setEditingEmployee(null);
    setIsCreatingNew(true);
  };

  const handleStartEdit = (emp: EmployeeAccount) => {
    setFormData({
      id: emp.id,
      name: emp.name,
      email: emp.email,
      phone: emp.phone || '',
      pin: emp.pin,
      role: emp.role,
      designation: emp.designation,
      status: emp.status,
      avatarColor: emp.avatarColor || 'blue',
      restrictToDevices: emp.restrictToDevices,
      allowedDeviceIds: emp.allowedDeviceIds || [],
      permissions: { ...emp.permissions },
      notes: emp.notes || ''
    });
    setEditingEmployee(emp);
    setIsCreatingNew(true);
  };

  const handleRoleChange = (newRole: UserRole) => {
    const defaultPerms = getRoleDefaultPermissions(newRole);
    setFormData(prev => ({
      ...prev,
      role: newRole,
      permissions: defaultPerms,
      designation: ROLE_INFO[newRole].label
    }));
  };

  const toggleTabVisibility = (tab: AppWorkspaceView) => {
    setFormData(prev => {
      const allowed = prev.permissions.allowedTabs;
      const isPresent = allowed.includes(tab);
      const updatedTabs = isPresent 
        ? allowed.filter(t => t !== tab) 
        : [...allowed, tab];
      return {
        ...prev,
        permissions: {
          ...prev.permissions,
          allowedTabs: updatedTabs
        }
      };
    });
  };

  const toggleAllTabs = (selectAll: boolean) => {
    setFormData(prev => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        allowedTabs: selectAll ? [...ALL_WORKSPACE_TABS] : []
      }
    }));
  };

  const togglePermissionAction = (actionKey: keyof EmployeePermissions) => {
    if (actionKey === 'allowedTabs') return;
    setFormData(prev => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [actionKey]: !prev.permissions[actionKey]
      }
    }));
  };

  const toggleDeviceWhitelist = (deviceId: string) => {
    setFormData(prev => {
      const currentList = prev.allowedDeviceIds;
      const exists = currentList.includes(deviceId);
      return {
        ...prev,
        allowedDeviceIds: exists 
          ? currentList.filter(id => id !== deviceId) 
          : [...currentList, deviceId]
      };
    });
  };

  const handleSaveEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      showNotification('Please enter the employee full name.');
      return;
    }
    if (!formData.email.trim()) {
      showNotification('Please enter an email or username.');
      return;
    }
    if (!formData.pin || formData.pin.length < 4) {
      showNotification('PIN must be at least 4 digits.');
      return;
    }

    const employeeRecord: EmployeeAccount = {
      id: formData.id,
      name: formData.name.trim(),
      email: formData.email.trim(),
      phone: formData.phone.trim(),
      pin: formData.pin.trim(),
      role: formData.role,
      designation: formData.designation.trim() || ROLE_INFO[formData.role].label,
      status: formData.status,
      permissions: formData.permissions,
      restrictToDevices: formData.restrictToDevices,
      allowedDeviceIds: formData.allowedDeviceIds,
      avatarColor: formData.avatarColor,
      createdAt: editingEmployee ? editingEmployee.createdAt : new Date().toISOString(),
      notes: formData.notes.trim()
    };

    const saved = saveEmployee(employeeRecord);
    const updatedList = employees.map(e => e.id === saved.id ? saved : e);
    if (!employees.some(e => e.id === saved.id)) {
      updatedList.push(saved);
    }
    onUpdateEmployees(updatedList);
    setIsCreatingNew(false);
    setEditingEmployee(null);
    showNotification(`Employee ${saved.name} saved successfully.`);
  };

  const handleDelete = (emp: EmployeeAccount) => {
    if (emp.id === 'admin-master') {
      showNotification('The Master Admin account cannot be deleted.');
      return;
    }
    setEmployeeToDelete(emp);
  };

  const confirmDeleteEmployee = () => {
    if (!employeeToDelete) return;
    const id = employeeToDelete.id;
    deleteEmployee(id);
    const updated = employees.filter(e => e.id !== id);
    onUpdateEmployees(updated);
    if (editingEmployee && editingEmployee.id === id) {
      setIsCreatingNew(false);
      setEditingEmployee(null);
    }
    showNotification(`Employee account "${employeeToDelete.name}" removed successfully.`);
    setEmployeeToDelete(null);
  };

  const handleToggleStatus = (emp: EmployeeAccount) => {
    if (emp.id === 'admin-master') return;
    const newStatus: 'active' | 'inactive' = emp.status === 'active' ? 'inactive' : 'active';
    const updated: EmployeeAccount = { ...emp, status: newStatus };
    saveEmployee(updated);
    onUpdateEmployees(employees.map(e => e.id === emp.id ? updated : e));
    showNotification(`Account marked as ${newStatus}.`);
  };

  const handleRegisterCurrentWorkstation = () => {
    const registered = registerCurrentDevice();
    onUpdateRegisteredDevices([...registeredDevices.filter(d => d.id !== registered.id), registered]);
    showNotification(`Current computer "${registered.name}" registered successfully.`);
  };

  const handleSaveDeviceName = (deviceId: string) => {
    if (!customDeviceNameInput.trim()) return;
    const updated = registeredDevices.map(d => {
      if (d.id === deviceId) {
        return { ...d, name: customDeviceNameInput.trim() };
      }
      return d;
    });
    saveStoredRegisteredDevices(updated);
    onUpdateRegisteredDevices(updated);
    setEditingDeviceNameId(null);
    setCustomDeviceNameInput('');
    showNotification('Device name updated.');
  };

  const handleDeleteDevice = (device: RegisteredDevice) => {
    setDeviceToDelete(device);
  };

  const confirmDeleteDevice = () => {
    if (!deviceToDelete) return;
    const id = deviceToDelete.id;
    deleteRegisteredDevice(id);
    onUpdateRegisteredDevices(registeredDevices.filter(d => d.id !== id));
    showNotification(`Device "${deviceToDelete.name}" authorization revoked.`);
    setDeviceToDelete(null);
  };

  const filteredEmployees = useMemo(() => {
    if (!searchQuery.trim()) return employees;
    const q = searchQuery.toLowerCase();
    return employees.filter(e => 
      e.name.toLowerCase().includes(q) || 
      e.email.toLowerCase().includes(q) || 
      e.designation.toLowerCase().includes(q) ||
      e.role.toLowerCase().includes(q)
    );
  }, [employees, searchQuery]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden border border-slate-200">
        
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-600/30 border border-red-500/30 flex items-center justify-center text-red-400">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white">Staff Accounts & Access Permissions</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500/20 text-red-300 border border-red-500/30">
                  RBAC Security
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Manage employee roles, tab visibility, sales/purchasing rights & Windows device binding
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {feedbackMessage && (
              <div className="hidden sm:flex items-center gap-1 px-3 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded-lg text-xs font-semibold animate-in fade-in">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{feedbackMessage}</span>
              </div>
            )}
            <button
              type="button"
              id="btn-close-staff-modal"
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Sub-Header Navigation Tabs */}
        {!isCreatingNew && (
          <div className="px-6 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0 flex-wrap gap-2">
            <div className="flex items-center gap-1.5 p-1 bg-slate-200/80 rounded-xl">
              <button
                type="button"
                id="tab-btn-staff-list"
                onClick={() => setActiveTab('employees')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'employees' 
                    ? 'bg-white text-slate-900 shadow-xs' 
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Users className="w-4 h-4 text-blue-600" />
                <span>Employees ({employees.length})</span>
              </button>

              <button
                type="button"
                id="tab-btn-devices-list"
                onClick={() => setActiveTab('devices')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'devices' 
                    ? 'bg-white text-slate-900 shadow-xs' 
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Monitor className="w-4 h-4 text-emerald-600" />
                <span>Registered Devices ({registeredDevices.length})</span>
              </button>
            </div>

            {activeTab === 'employees' ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Search staff by name or role..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-red-500 w-48 sm:w-64"
                />
                <button
                  type="button"
                  id="btn-add-new-employee"
                  onClick={handleStartCreate}
                  className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Add Employee</span>
                </button>
              </div>
            ) : (
              <button
                type="button"
                id="btn-register-this-pc"
                onClick={handleRegisterCurrentWorkstation}
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Laptop className="w-4 h-4" />
                <span>Authorize Current PC ({currentDeviceId})</span>
              </button>
            )}
          </div>
        )}

        {/* Modal Main Content Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50/50">
          {isCreatingNew ? (
            /* CREATE / EDIT EMPLOYEE FORM */
            <form onSubmit={handleSaveEmployee} className="space-y-6 max-w-4xl mx-auto">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                    {editingEmployee ? <Edit3 className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      {editingEmployee ? `Edit Employee Account: ${editingEmployee.name}` : 'Create New Employee Account'}
                    </h3>
                    <p className="text-xs text-slate-500">Configure credentials, access preset, and granular permissions</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => { setIsCreatingNew(false); setEditingEmployee(null); }}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-200 rounded-lg font-bold"
                >
                  Back to List
                </button>
              </div>

              {/* 1. Basic Account Credentials */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-4">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-blue-600" />
                  <span>1. Employee Profile & Quick Login</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Full Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Muhammad Bilal"
                      value={formData.name}
                      onChange={e => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Email or Username *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. cashier1 or bilal@shop.pk"
                      value={formData.email}
                      onChange={e => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Phone Number (Optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. 0300-1234567"
                      value={formData.phone}
                      onChange={e => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:bg-white"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-bold text-slate-700">Quick PIN (4-6 digits) *</label>
                      <button
                        type="button"
                        onClick={() => setShowPinInForm(!showPinInForm)}
                        className="text-[11px] text-blue-600 hover:underline flex items-center gap-0.5"
                      >
                        {showPinInForm ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                        <span>{showPinInForm ? 'Hide' : 'Show'}</span>
                      </button>
                    </div>
                    <div className="relative">
                      <input
                        type={showPinInForm ? 'text' : 'password'}
                        required
                        maxLength={6}
                        pattern="[0-9]*"
                        placeholder="1234"
                        value={formData.pin}
                        onChange={e => setFormData({ ...formData, pin: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold tracking-widest focus:ring-2 focus:ring-blue-500 focus:bg-white"
                      />
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, pin: Math.floor(1000 + Math.random() * 9000).toString() })}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-blue-600 text-[10px] font-bold"
                        title="Generate random PIN"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Role Preset</label>
                    <select
                      value={formData.role}
                      onChange={e => handleRoleChange(e.target.value as UserRole)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="cashier">Sales Cashier (Sales & POS Only)</option>
                      <option value="procurement">Purchasing Incharge (Purchases & POs Only)</option>
                      <option value="stockkeeper">Store & Warehouse Keeper (Stock Adjustments)</option>
                      <option value="accountant">Accountant / Auditor (Ledgers & P&L)</option>
                      <option value="editor">General Editor (Full Operational Edit)</option>
                      <option value="viewer">Read-Only Viewer (No Edits)</option>
                      <option value="admin">Super Admin (Unrestricted Full Access)</option>
                      <option value="custom">Custom Configuration</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Job Designation</label>
                    <input
                      type="text"
                      placeholder="e.g. Senior Counter Billing Staff"
                      value={formData.designation}
                      onChange={e => setFormData({ ...formData, designation: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Account Status</label>
                    <div className="flex items-center gap-2 mt-1">
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, status: 'active' })}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                          formData.status === 'active' 
                            ? 'bg-emerald-600 text-white shadow-2xs' 
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Active</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, status: 'inactive' })}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                          formData.status === 'inactive' 
                            ? 'bg-red-600 text-white shadow-2xs' 
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>Deactivated</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* 2. Visible Tabs & Modules */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <LayoutDashboard className="w-4 h-4 text-red-600" />
                      <span>2. Navigation Tab Visibility (Show / Hide)</span>
                    </h4>
                    <p className="text-[11px] text-slate-500">Enable or disable specific sections from appearing in this employee's navigation bar</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => toggleAllTabs(true)}
                      className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md text-[11px] font-bold"
                    >
                      Check All
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleAllTabs(false)}
                      className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md text-[11px] font-bold"
                    >
                      Uncheck All
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-1">
                  {ALL_WORKSPACE_TABS.map(tab => {
                    const meta = TAB_METADATA[tab];
                    const Icon = meta.icon;
                    const isAllowed = formData.permissions.allowedTabs.includes(tab);

                    return (
                      <div
                        key={tab}
                        onClick={() => toggleTabVisibility(tab)}
                        className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-start gap-2.5 select-none ${
                          isAllowed 
                            ? 'bg-red-50/60 border-red-200 text-slate-900 shadow-2xs' 
                            : 'bg-slate-50 border-slate-200 text-slate-400 opacity-60 hover:opacity-90'
                        }`}
                      >
                        <div className={`p-1.5 rounded-lg shrink-0 mt-0.5 ${
                          isAllowed ? 'bg-red-100 text-red-700' : 'bg-slate-200 text-slate-500'
                        }`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-800 truncate">{meta.label}</span>
                            {isAllowed ? (
                              <CheckSquare className="w-4 h-4 text-red-600 shrink-0" />
                            ) : (
                              <Square className="w-4 h-4 text-slate-400 shrink-0" />
                            )}
                          </div>
                          <p className="text-[10px] text-slate-500 leading-tight mt-0.5 line-clamp-1">
                            {meta.description}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 3. Granular Action Permissions */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Sliders className="w-4 h-4 text-amber-600" />
                    <span>3. Granular Operations & Action Rights</span>
                  </h4>
                  <span className="text-[11px] font-bold text-slate-500">
                    Preset: <strong className="text-slate-800">{ROLE_INFO[formData.role].label}</strong>
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  
                  {/* Sales Invoicing Section */}
                  <div className="p-3 bg-blue-50/40 rounded-xl border border-blue-100 space-y-2">
                    <div className="flex items-center gap-1.5 pb-1 border-b border-blue-100 text-blue-900 font-bold text-xs">
                      <Receipt className="w-4 h-4 text-blue-700" />
                      <span>Sales & Invoicing Privileges</span>
                    </div>

                    <label className="flex items-center justify-between p-1.5 hover:bg-blue-50 rounded-lg cursor-pointer text-xs">
                      <span className="font-semibold text-slate-800">Can Create New Sales (Cashier Billing)</span>
                      <input
                        type="checkbox"
                        checked={formData.permissions.canCreateSales}
                        onChange={() => togglePermissionAction('canCreateSales')}
                        className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                      />
                    </label>

                    <label className="flex items-center justify-between p-1.5 hover:bg-blue-50 rounded-lg cursor-pointer text-xs">
                      <span className="font-semibold text-slate-800">Can Apply Custom Discounts on Bill</span>
                      <input
                        type="checkbox"
                        checked={formData.permissions.canApplySaleDiscount}
                        onChange={() => togglePermissionAction('canApplySaleDiscount')}
                        className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                      />
                    </label>

                    <label className="flex items-center justify-between p-1.5 hover:bg-blue-50 rounded-lg cursor-pointer text-xs">
                      <span className="font-semibold text-slate-800">Can Edit / Modify Past Invoices</span>
                      <input
                        type="checkbox"
                        checked={formData.permissions.canEditSales}
                        onChange={() => togglePermissionAction('canEditSales')}
                        className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                      />
                    </label>

                    <label className="flex items-center justify-between p-1.5 hover:bg-blue-50 rounded-lg cursor-pointer text-xs">
                      <div className="flex items-center gap-1 text-slate-800 font-bold">
                        <Eye className="w-3.5 h-3.5 text-blue-600" />
                        <span>View Cost Prices (Purchase Rates)</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={formData.permissions.canViewCostPrices}
                        onChange={() => togglePermissionAction('canViewCostPrices')}
                        className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                      />
                    </label>
                    <p className="text-[10px] text-slate-500 pl-1">
                      {formData.permissions.canViewCostPrices 
                        ? 'Cost prices are visible on inventory & sales.' 
                        : 'Cost prices are hidden & masked as ••• for this user.'}
                    </p>

                    <label className="flex items-center justify-between p-1.5 hover:bg-blue-50 rounded-lg cursor-pointer text-xs">
                      <div className="flex items-center gap-1 text-slate-800 font-bold">
                        <Percent className="w-3.5 h-3.5 text-blue-600" />
                        <span>View Profit Margins & Net P&L</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={formData.permissions.canViewProfitMargins}
                        onChange={() => togglePermissionAction('canViewProfitMargins')}
                        className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                      />
                    </label>
                  </div>

                  {/* Purchasing & Cargo Section */}
                  <div className="p-3 bg-amber-50/40 rounded-xl border border-amber-100 space-y-2">
                    <div className="flex items-center gap-1.5 pb-1 border-b border-amber-100 text-amber-900 font-bold text-xs">
                      <ShoppingBag className="w-4 h-4 text-amber-700" />
                      <span>Purchasing & Vendor Privileges</span>
                    </div>

                    <label className="flex items-center justify-between p-1.5 hover:bg-amber-50 rounded-lg cursor-pointer text-xs">
                      <span className="font-semibold text-slate-800">Can Record Purchase Bills</span>
                      <input
                        type="checkbox"
                        checked={formData.permissions.canCreatePurchases}
                        onChange={() => togglePermissionAction('canCreatePurchases')}
                        className="rounded text-amber-600 focus:ring-amber-500 w-4 h-4"
                      />
                    </label>

                    <label className="flex items-center justify-between p-1.5 hover:bg-amber-50 rounded-lg cursor-pointer text-xs">
                      <span className="font-semibold text-slate-800">Can Create Purchase Orders (POs)</span>
                      <input
                        type="checkbox"
                        checked={formData.permissions.canCreatePurchaseOrders}
                        onChange={() => togglePermissionAction('canCreatePurchaseOrders')}
                        className="rounded text-amber-600 focus:ring-amber-500 w-4 h-4"
                      />
                    </label>

                    <label className="flex items-center justify-between p-1.5 hover:bg-amber-50 rounded-lg cursor-pointer text-xs">
                      <span className="font-semibold text-slate-800">Can Receive Cargo & Landed Costs</span>
                      <input
                        type="checkbox"
                        checked={formData.permissions.canReceivePurchaseOrders}
                        onChange={() => togglePermissionAction('canReceivePurchaseOrders')}
                        className="rounded text-amber-600 focus:ring-amber-500 w-4 h-4"
                      />
                    </label>

                    <label className="flex items-center justify-between p-1.5 hover:bg-amber-50 rounded-lg cursor-pointer text-xs">
                      <span className="font-semibold text-slate-800">Can Manage Suppliers & Payables</span>
                      <input
                        type="checkbox"
                        checked={formData.permissions.canManageVendors}
                        onChange={() => togglePermissionAction('canManageVendors')}
                        className="rounded text-amber-600 focus:ring-amber-500 w-4 h-4"
                      />
                    </label>

                    <label className="flex items-center justify-between p-1.5 hover:bg-amber-50 rounded-lg cursor-pointer text-xs">
                      <span className="font-semibold text-slate-800">Can Record Vendor Cash Payments</span>
                      <input
                        type="checkbox"
                        checked={formData.permissions.canRecordVendorPayments}
                        onChange={() => togglePermissionAction('canRecordVendorPayments')}
                        className="rounded text-amber-600 focus:ring-amber-500 w-4 h-4"
                      />
                    </label>
                  </div>

                  {/* Stock & Catalog Section */}
                  <div className="p-3 bg-emerald-50/40 rounded-xl border border-emerald-100 space-y-2">
                    <div className="flex items-center gap-1.5 pb-1 border-b border-emerald-100 text-emerald-900 font-bold text-xs">
                      <Box className="w-4 h-4 text-emerald-700" />
                      <span>Inventory & Stock Privileges</span>
                    </div>

                    <label className="flex items-center justify-between p-1.5 hover:bg-emerald-50 rounded-lg cursor-pointer text-xs">
                      <span className="font-semibold text-slate-800">Can Adjust Physical Stock Quantities</span>
                      <input
                        type="checkbox"
                        checked={formData.permissions.canAdjustStock}
                        onChange={() => togglePermissionAction('canAdjustStock')}
                        className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                      />
                    </label>

                    <label className="flex items-center justify-between p-1.5 hover:bg-emerald-50 rounded-lg cursor-pointer text-xs">
                      <span className="font-semibold text-slate-800">Can Add New Products to Catalog</span>
                      <input
                        type="checkbox"
                        checked={formData.permissions.canAddProducts}
                        onChange={() => togglePermissionAction('canAddProducts')}
                        className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                      />
                    </label>

                    <label className="flex items-center justify-between p-1.5 hover:bg-emerald-50 rounded-lg cursor-pointer text-xs">
                      <span className="font-semibold text-slate-800">Can Edit Product Details & Prices</span>
                      <input
                        type="checkbox"
                        checked={formData.permissions.canEditProducts}
                        onChange={() => togglePermissionAction('canEditProducts')}
                        className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                      />
                    </label>

                    <label className="flex items-center justify-between p-1.5 hover:bg-emerald-50 rounded-lg cursor-pointer text-xs">
                      <span className="font-semibold text-slate-800">Can Print Barcode Labels</span>
                      <input
                        type="checkbox"
                        checked={formData.permissions.canPrintLabels}
                        onChange={() => togglePermissionAction('canPrintLabels')}
                        className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                      />
                    </label>
                  </div>

                  {/* Khata & Financials Section */}
                  <div className="p-3 bg-purple-50/40 rounded-xl border border-purple-100 space-y-2">
                    <div className="flex items-center gap-1.5 pb-1 border-b border-purple-100 text-purple-900 font-bold text-xs">
                      <TrendingUp className="w-4 h-4 text-purple-700" />
                      <span>Ledgers, Khata & System Rights</span>
                    </div>

                    <label className="flex items-center justify-between p-1.5 hover:bg-purple-50 rounded-lg cursor-pointer text-xs">
                      <span className="font-semibold text-slate-800">Can Receive Customer Cash Payments</span>
                      <input
                        type="checkbox"
                        checked={formData.permissions.canRecordCustomerPayments}
                        onChange={() => togglePermissionAction('canRecordCustomerPayments')}
                        className="rounded text-purple-600 focus:ring-purple-500 w-4 h-4"
                      />
                    </label>

                    <label className="flex items-center justify-between p-1.5 hover:bg-purple-50 rounded-lg cursor-pointer text-xs">
                      <span className="font-semibold text-slate-800">Can Issue Customer Returns / Credit Notes</span>
                      <input
                        type="checkbox"
                        checked={formData.permissions.canProcessReturns}
                        onChange={() => togglePermissionAction('canProcessReturns')}
                        className="rounded text-purple-600 focus:ring-purple-500 w-4 h-4"
                      />
                    </label>

                    <label className="flex items-center justify-between p-1.5 hover:bg-purple-50 rounded-lg cursor-pointer text-xs">
                      <span className="font-semibold text-slate-800">Can Manage Customer Demands</span>
                      <input
                        type="checkbox"
                        checked={formData.permissions.canManageDemands}
                        onChange={() => togglePermissionAction('canManageDemands')}
                        className="rounded text-purple-600 focus:ring-purple-500 w-4 h-4"
                      />
                    </label>

                    <label className="flex items-center justify-between p-1.5 hover:bg-purple-50 rounded-lg cursor-pointer text-xs">
                      <span className="font-semibold text-slate-800">Can View Income Statement (P&L)</span>
                      <input
                        type="checkbox"
                        checked={formData.permissions.canViewIncomeStatement}
                        onChange={() => togglePermissionAction('canViewIncomeStatement')}
                        className="rounded text-purple-600 focus:ring-purple-500 w-4 h-4"
                      />
                    </label>

                    <label className="flex items-center justify-between p-1.5 hover:bg-purple-50 rounded-lg cursor-pointer text-xs">
                      <span className="font-semibold text-slate-800">Can Access System & Pricing Settings</span>
                      <input
                        type="checkbox"
                        checked={formData.permissions.canManageSettings}
                        onChange={() => togglePermissionAction('canManageSettings')}
                        className="rounded text-purple-600 focus:ring-purple-500 w-4 h-4"
                      />
                    </label>
                  </div>

                </div>
              </div>

              {/* 4. Windows / Device ID Binding */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Laptop className="w-4 h-4 text-emerald-600" />
                    <div>
                      <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                        4. Windows PC / Device Hardware Whitelisting
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        Optionally lock this employee account so they can only sign in on authorized shop computers
                      </p>
                    </div>
                  </div>

                  <label className="flex items-center gap-2 text-xs font-bold text-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.restrictToDevices}
                      onChange={e => setFormData({ ...formData, restrictToDevices: e.target.checked })}
                      className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                    />
                    <span>Enforce Device Restriction</span>
                  </label>
                </div>

                {formData.restrictToDevices ? (
                  <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-200 space-y-3 animate-in fade-in">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-emerald-900">
                        Select Authorized Terminals for {formData.name || 'this staff'}:
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          if (!formData.allowedDeviceIds.includes(currentDeviceId)) {
                            setFormData({
                              ...formData,
                              allowedDeviceIds: [...formData.allowedDeviceIds, currentDeviceId]
                            });
                          }
                        }}
                        className="text-[11px] text-emerald-700 hover:underline font-bold flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Whitelist Current PC ({currentDeviceId})</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {registeredDevices.map(dev => {
                        const isWhitelisted = formData.allowedDeviceIds.includes(dev.id);
                        return (
                          <div
                            key={dev.id}
                            onClick={() => toggleDeviceWhitelist(dev.id)}
                            className={`p-2.5 rounded-lg border flex items-center justify-between cursor-pointer select-none transition-all ${
                              isWhitelisted 
                                ? 'bg-white border-emerald-400 shadow-2xs text-slate-900' 
                                : 'bg-emerald-50/40 border-emerald-200/60 text-slate-500 opacity-70'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <Monitor className="w-4 h-4 text-emerald-600 shrink-0" />
                              <div>
                                <div className="text-xs font-bold text-slate-800">{dev.name}</div>
                                <div className="text-[10px] text-slate-500 font-mono">{dev.id} • {dev.os}</div>
                              </div>
                            </div>
                            <input
                              type="checkbox"
                              checked={isWhitelisted}
                              onChange={() => {}}
                              className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-slate-50 rounded-xl text-xs text-slate-500 flex items-center gap-2">
                    <Info className="w-4 h-4 text-slate-400 shrink-0" />
                    <span>Unrestricted: This employee can log in from any computer, tablet, or terminal with their PIN.</span>
                  </div>
                )}
              </div>

              {/* Form Action Buttons */}
              <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-200">
                {editingEmployee && editingEmployee.id !== 'admin-master' ? (
                  <button
                    type="button"
                    id="btn-delete-employee-from-form"
                    onClick={() => handleDelete(editingEmployee)}
                    className="px-3.5 py-2 text-xs text-red-600 hover:bg-red-50 hover:text-red-700 border border-red-200 hover:border-red-300 rounded-xl font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Employee</span>
                  </button>
                ) : <div />}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => { setIsCreatingNew(false); setEditingEmployee(null); }}
                    className="px-4 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    id="btn-save-employee-form"
                    className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-md transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <Check className="w-4 h-4" />
                    <span>{editingEmployee ? 'Save Changes' : 'Create Employee Account'}</span>
                  </button>
                </div>
              </div>
            </form>
          ) : activeTab === 'employees' ? (
            /* EMPLOYEES DIRECTORY TABLE */
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredEmployees.map(emp => {
                  const isCurrent = emp.id === currentUserId;
                  const isMaster = emp.id === 'admin-master';
                  const roleDef = ROLE_INFO[emp.role] || ROLE_INFO.custom;

                  return (
                    <div 
                      key={emp.id}
                      className={`bg-white rounded-xl border p-4 shadow-2xs flex flex-col justify-between transition-all hover:shadow-md ${
                        emp.status === 'inactive' ? 'opacity-60 bg-slate-50 border-slate-200' : 'border-slate-200'
                      }`}
                    >
                      <div>
                        {/* Top Strip */}
                        <div className="flex items-start justify-between gap-2 mb-2.5">
                          <div className="flex items-center gap-2.5">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white shadow-xs ${
                              emp.role === 'admin' ? 'bg-gradient-to-br from-red-500 to-red-700' :
                              emp.role === 'cashier' ? 'bg-gradient-to-br from-blue-500 to-blue-700' :
                              emp.role === 'procurement' ? 'bg-gradient-to-br from-amber-500 to-amber-700' :
                              emp.role === 'stockkeeper' ? 'bg-gradient-to-br from-emerald-500 to-emerald-700' :
                              'bg-gradient-to-br from-purple-500 to-purple-700'
                            }`}>
                              {emp.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <h3 className="text-xs font-bold text-slate-900 leading-tight">{emp.name}</h3>
                                {isCurrent && (
                                  <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-blue-100 text-blue-800">
                                    Current Session
                                  </span>
                                )}
                              </div>
                              <span className="text-[11px] text-slate-500">{emp.designation}</span>
                            </div>
                          </div>

                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${roleDef.badgeClass}`}>
                            {roleDef.label}
                          </span>
                        </div>

                        {/* Details */}
                        <div className="space-y-1.5 py-2 border-y border-slate-100 text-[11px]">
                          <div className="flex items-center justify-between text-slate-600">
                            <span className="text-slate-400">Login ID:</span>
                            <span className="font-mono font-bold text-slate-800">{emp.email}</span>
                          </div>

                          <div className="flex items-center justify-between text-slate-600">
                            <span className="text-slate-400">Quick PIN:</span>
                            <span className="font-mono font-bold text-slate-800">•••• ({emp.pin.length} digits)</span>
                          </div>

                          <div className="flex items-center justify-between text-slate-600">
                            <span className="text-slate-400">Allowed Tabs:</span>
                            <span className="font-bold text-slate-800">
                              {emp.role === 'admin' ? 'All (12)' : `${emp.permissions.allowedTabs.length} of ${ALL_WORKSPACE_TABS.length}`}
                            </span>
                          </div>

                          <div className="flex items-center justify-between text-slate-600">
                            <span className="text-slate-400">Device Lock:</span>
                            <span className={`font-bold ${emp.restrictToDevices ? 'text-emerald-700' : 'text-slate-500'}`}>
                              {emp.restrictToDevices ? `Locked (${emp.allowedDeviceIds?.length || 0} PCs)` : 'Any Device'}
                            </span>
                          </div>

                          <div className="flex items-center justify-between text-slate-600">
                            <span className="text-slate-400">Cost Rates:</span>
                            <span className={`font-bold ${emp.permissions.canViewCostPrices ? 'text-blue-700' : 'text-slate-400'}`}>
                              {emp.permissions.canViewCostPrices ? 'Visible' : 'Hidden (•••)'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Card Action Footer */}
                      <div className="pt-3 flex items-center justify-between gap-1.5">
                        <button
                          type="button"
                          disabled={isMaster}
                          onClick={() => handleToggleStatus(emp)}
                          className={`px-2 py-1 rounded-lg text-[11px] font-bold transition-colors cursor-pointer ${
                            isMaster ? 'opacity-40 cursor-not-allowed' :
                            emp.status === 'active' 
                              ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200' 
                              : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                          }`}
                        >
                          {emp.status === 'active' ? 'Active' : 'Disabled'}
                        </button>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            id={`btn-edit-employee-${emp.id}`}
                            onClick={() => handleStartEdit(emp)}
                            className="px-2.5 py-1 bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 rounded-lg text-[11px] font-bold transition-colors flex items-center gap-1 cursor-pointer"
                          >
                            <Edit3 className="w-3 h-3" />
                            <span>Edit</span>
                          </button>

                          {!isMaster && (
                            <button
                              type="button"
                              id={`btn-delete-employee-${emp.id}`}
                              onClick={() => handleDelete(emp)}
                              className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                              title="Delete employee account"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* REGISTERED DEVICES DIRECTORY */
            <div className="space-y-4">
              <div className="bg-emerald-50/60 p-4 rounded-xl border border-emerald-200 flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-emerald-900">Windows & Terminal Device Authorization</h4>
                  <p className="text-xs text-emerald-800/80 mt-0.5">
                    Register and whitelist specific shop PCs (e.g. Counter 1, Backoffice Laptop). When an employee account is device-locked, they cannot unlock or sign in from any other computer outside your authorized list.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {registeredDevices.map(device => {
                  const isCurrentMachine = device.id === currentDeviceId;

                  return (
                    <div
                      key={device.id}
                      className={`bg-white rounded-xl border p-4 shadow-2xs space-y-3 ${
                        isCurrentMachine ? 'border-emerald-300 ring-2 ring-emerald-500/20' : 'border-slate-200'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                            {device.os === 'Windows' ? <Monitor className="w-4 h-4" /> : <Laptop className="w-4 h-4" />}
                          </div>
                          <div>
                            {editingDeviceNameId === device.id ? (
                              <div className="flex items-center gap-1">
                                <input
                                  type="text"
                                  value={customDeviceNameInput}
                                  onChange={e => setCustomDeviceNameInput(e.target.value)}
                                  className="px-2 py-0.5 text-xs font-bold border border-emerald-300 rounded focus:ring-1 focus:ring-emerald-500"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleSaveDeviceName(device.id)}
                                  className="p-1 bg-emerald-600 text-white rounded text-xs"
                                >
                                  <Check className="w-3 h-3" />
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5">
                                <h4 className="text-xs font-bold text-slate-900">{device.name}</h4>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingDeviceNameId(device.id);
                                    setCustomDeviceNameInput(device.name);
                                  }}
                                  className="p-0.5 text-slate-400 hover:text-slate-600"
                                >
                                  <Edit3 className="w-3 h-3" />
                                </button>
                              </div>
                            )}
                            <span className="text-[10px] text-slate-400 font-mono">{device.id}</span>
                          </div>
                        </div>

                        {isCurrentMachine && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            This Computer
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[11px] bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                        <div>
                          <span className="text-slate-400 block text-[10px]">Operating System:</span>
                          <span className="font-bold text-slate-800">{device.os} {device.deviceType}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px]">Browser Engine:</span>
                          <span className="font-bold text-slate-800">{device.browser}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px]">Registered On:</span>
                          <span className="text-slate-700">{new Date(device.registeredAt).toLocaleDateString()}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px]">Trust Status:</span>
                          <span className="font-bold text-emerald-700">Authorized & Trusted</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-end">
                        <button
                          type="button"
                          id={`btn-revoke-device-${device.id}`}
                          onClick={() => handleDeleteDevice(device)}
                          className="px-2 py-1 text-[11px] text-red-600 hover:bg-red-50 rounded-lg font-bold transition-colors cursor-pointer"
                        >
                          Revoke Authorization
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 bg-white border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-slate-400" />
            <span>Role-Based Access Control (RBAC) & Windows Hardware Identification</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-bold transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>

        {/* In-App Delete Employee Confirmation Modal */}
        {employeeToDelete && (
          <div className="fixed inset-0 z-60 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
            <div 
              className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-red-100 space-y-4 animate-in zoom-in-95 duration-150"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-start gap-3.5">
                <div className="w-11 h-11 rounded-xl bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                  <Trash2 className="w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-bold text-slate-900">Delete Employee Account?</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    This action will permanently remove the employee account and credentials.
                  </p>
                </div>
              </div>

              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Employee Name:</span>
                  <span className="font-bold text-slate-900">{employeeToDelete.name}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Email / Username:</span>
                  <span className="font-mono font-medium text-slate-700">{employeeToDelete.email}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Role:</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 text-slate-800">
                    {ROLE_INFO[employeeToDelete.role]?.label || employeeToDelete.role}
                  </span>
                </div>
                {employeeToDelete.id === currentUserId && (
                  <div className="pt-2 border-t border-slate-200 text-[11px] text-amber-700 flex items-center gap-1.5 font-medium">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
                    <span>This account is currently active. Deleting it will switch the session to Master Admin.</span>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  id="btn-cancel-delete-employee"
                  onClick={() => setEmployeeToDelete(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 rounded-xl border border-slate-200 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  id="btn-confirm-delete-employee"
                  onClick={confirmDeleteEmployee}
                  className="px-4 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Delete Account</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* In-App Revoke Device Confirmation Modal */}
        {deviceToDelete && (
          <div className="fixed inset-0 z-60 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
            <div 
              className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-amber-100 space-y-4 animate-in zoom-in-95 duration-150"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-start gap-3.5">
                <div className="w-11 h-11 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
                  <ShieldAlert className="w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-bold text-slate-900">Revoke Device Authorization?</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Unregister this device from authorized shop hardware terminals.
                  </p>
                </div>
              </div>

              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Device Name:</span>
                  <span className="font-bold text-slate-900">{deviceToDelete.name}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Device Identifier:</span>
                  <span className="font-mono text-slate-700">{deviceToDelete.id}</span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  id="btn-cancel-revoke-device"
                  onClick={() => setDeviceToDelete(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 rounded-xl border border-slate-200 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  id="btn-confirm-revoke-device"
                  onClick={confirmDeleteDevice}
                  className="px-4 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Revoke Authorization</span>
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
