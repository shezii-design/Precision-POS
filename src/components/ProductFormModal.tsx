import React, { useState, useEffect } from 'react';
import { 
  Brand, 
  DimensionLabelConfig, 
  DimensionUnit, 
  GlobalPricingSettings, 
  LocationItem, 
  Product, 
  ProductSellingPrice, 
  ProductType, 
  QuantityUnit 
} from '../types';
import { inchToMm, mmToInch } from '../services/dimensions';
import { calculateSellingPrice, formatPKR, generateProductSellingPrices, getTierTheme } from '../services/pricing';
import { 
  X, 
  Upload, 
  Check, 
  Plus, 
  Ruler, 
  Tag, 
  Layers, 
  MapPin, 
  Box, 
  Cpu, 
  FileCode2, 
  DollarSign, 
  Calculator, 
  Image as ImageIcon,
  HelpCircle,
  History
} from 'lucide-react';

interface ProductFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  productToEdit?: Product | null;
  onSave: (productData: Partial<Product>) => void;
  nextInternalId: string;
  brands: Brand[];
  types: ProductType[];
  locations: LocationItem[];
  pricingSettings: GlobalPricingSettings;
  onAddNewBrand: (name: string) => Brand;
  onAddNewType: (name: string) => ProductType;
  onAddNewLocation: (name: string, cabin: string) => LocationItem;
}

export const ProductFormModal: React.FC<ProductFormModalProps> = ({
  isOpen,
  onClose,
  productToEdit,
  onSave,
  nextInternalId,
  brands,
  types,
  locations,
  pricingSettings,
  onAddNewBrand,
  onAddNewType,
  onAddNewLocation,
}) => {
  // Form State
  const [internalId, setInternalId] = useState<string>('');
  const [name, setName] = useState<string>('');
  const [image, setImage] = useState<string>('');
  const [typeId, setTypeId] = useState<string>('');
  const [brandId, setBrandId] = useState<string>('');
  const [locationId, setLocationId] = useState<string>('');
  const [cabinNumber, setCabinNumber] = useState<string>('');
  const [stockQuantity, setStockQuantity] = useState<number>(0);
  const [minStockAlert, setMinStockAlert] = useState<number>(5);
  const [unit, setUnit] = useState<QuantityUnit>('Pcs');
  const [costPrice, setCostPrice] = useState<number>(0);
  const [sellingPrices, setSellingPrices] = useState<ProductSellingPrice[]>([]);
  const [allowManualPriceOverride, setAllowManualPriceOverride] = useState<boolean>(false);

  // Dimensions state
  const [entryUnit, setEntryUnit] = useState<DimensionUnit>('inch');
  const [heightVal, setHeightVal] = useState<string>('');
  const [outerDiaVal, setOuterDiaVal] = useState<string>('');
  const [innerDiaVal, setInnerDiaVal] = useState<string>('');
  const [threadVal, setThreadVal] = useState<string>('');
  const [gasketODVal, setGasketODVal] = useState<string>('');
  const [gasketIDVal, setGasketIDVal] = useState<string>('');

  // Labels config
  const [heightLabel, setHeightLabel] = useState<'H' | 'Height'>('H');
  const [outerDiaLabel, setOuterDiaLabel] = useState<'OD' | 'Length'>('OD');
  const [innerDiaLabel, setInnerDiaLabel] = useState<'ID' | 'Width'>('ID');

  // Multiline fields
  const [machineNames, setMachineNames] = useState<string>('');
  const [crossReferences, setCrossReferences] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  // Quick inline creation modal/inputs
  const [showNewBrandInput, setShowNewBrandInput] = useState<boolean>(false);
  const [newBrandName, setNewBrandName] = useState<string>('');
  const [showNewTypeInput, setShowNewTypeInput] = useState<boolean>(false);
  const [newTypeName, setNewTypeName] = useState<string>('');
  const [showNewLocationInput, setShowNewLocationInput] = useState<boolean>(false);
  const [newLocationName, setNewLocationName] = useState<string>('');
  const [newLocationCabin, setNewLocationCabin] = useState<string>('');

  // Active Tab in Form
  const [activeTab, setActiveTab] = useState<'basic' | 'dimensions' | 'pricing' | 'compatibility'>('basic');

  useEffect(() => {
    if (productToEdit) {
      setInternalId(productToEdit.internalId || nextInternalId);
      setName(productToEdit.name || '');
      setImage(productToEdit.image || '');
      setTypeId(productToEdit.typeId || (types[0]?.id ?? ''));
      setBrandId(productToEdit.brandId || (brands[0]?.id ?? ''));
      setLocationId(productToEdit.locationId || (locations[0]?.id ?? ''));
      setCabinNumber(productToEdit.cabinNumber || '');
      setStockQuantity(productToEdit.stockQuantity || 0);
      setMinStockAlert(productToEdit.minStockAlert || 5);
      setUnit(productToEdit.unit || 'Pcs');
      setCostPrice(productToEdit.costPrice || 0);
      setSellingPrices(productToEdit.sellingPrices || []);

      const dims = productToEdit.dimensions;
      const inputU = dims?.inputUnit || 'inch';
      setEntryUnit(inputU);

      // Populate dimension values in user's preferred entry unit
      if (dims) {
        if (inputU === 'mm') {
          setHeightVal(dims.height !== undefined ? String(inchToMm(dims.height)) : '');
          setOuterDiaVal(dims.outerDia !== undefined ? String(inchToMm(dims.outerDia)) : '');
          setInnerDiaVal(dims.innerDia !== undefined ? String(inchToMm(dims.innerDia)) : '');
          setGasketODVal(dims.gasket_OD !== undefined ? String(inchToMm(dims.gasket_OD)) : '');
          setGasketIDVal(dims.gasket_ID !== undefined ? String(inchToMm(dims.gasket_ID)) : '');
        } else {
          setHeightVal(dims.height !== undefined ? String(dims.height) : '');
          setOuterDiaVal(dims.outerDia !== undefined ? String(dims.outerDia) : '');
          setInnerDiaVal(dims.innerDia !== undefined ? String(dims.innerDia) : '');
          setGasketODVal(dims.gasket_OD !== undefined ? String(dims.gasket_OD) : '');
          setGasketIDVal(dims.gasket_ID !== undefined ? String(dims.gasket_ID) : '');
        }
        setThreadVal(dims.thread || '');
      } else {
        setHeightVal('');
        setOuterDiaVal('');
        setInnerDiaVal('');
        setThreadVal('');
        setGasketODVal('');
        setGasketIDVal('');
      }

      if (productToEdit.dimensionLabels) {
        setHeightLabel(productToEdit.dimensionLabels.heightName);
        setOuterDiaLabel(productToEdit.dimensionLabels.outerDiaName);
        setInnerDiaLabel(productToEdit.dimensionLabels.innerDiaName);
      }

      setMachineNames(productToEdit.machineNames || '');
      setCrossReferences(productToEdit.crossReferences || '');
      setNotes(productToEdit.notes || '');

      const hasOverride = productToEdit.sellingPrices?.some(p => p.isOverridden);
      setAllowManualPriceOverride(!!hasOverride);
    } else {
      // New Product Initialization
      setInternalId(nextInternalId);
      setName('');
      setImage('');
      setTypeId(types[0]?.id || '');
      setBrandId(brands[0]?.id || '');
      setLocationId(locations[0]?.id || '');
      setCabinNumber(locations[0]?.cabins?.[0] || 'C-01');
      setStockQuantity(0);
      setMinStockAlert(5);
      setUnit('Pcs');
      setCostPrice(0);
      setSellingPrices(generateProductSellingPrices(0, pricingSettings));
      setAllowManualPriceOverride(false);
      setEntryUnit('inch');
      setHeightVal('');
      setOuterDiaVal('');
      setInnerDiaVal('');
      setThreadVal('');
      setGasketODVal('');
      setGasketIDVal('');
      setHeightLabel('H');
      setOuterDiaLabel('OD');
      setInnerDiaLabel('ID');
      setMachineNames('');
      setCrossReferences('');
      setNotes('');
    }
  }, [isOpen, productToEdit?.id, nextInternalId]);

  // Recalculate selling prices when cost changes unless manually overridden
  useEffect(() => {
    if (isOpen && !allowManualPriceOverride) {
      setSellingPrices(generateProductSellingPrices(costPrice, pricingSettings));
    }
  }, [isOpen, costPrice, allowManualPriceOverride]);

  if (!isOpen) return null;

  const handleImageFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size limit ~3MB
    if (file.size > 3 * 1024 * 1024) {
      alert('Image size exceeds 3MB. Please choose a smaller file.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setImage(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleCreateBrand = () => {
    if (newBrandName.trim()) {
      const created = onAddNewBrand(newBrandName.trim());
      setBrandId(created.id);
      setNewBrandName('');
      setShowNewBrandInput(false);
    }
  };

  const handleCreateType = () => {
    if (newTypeName.trim()) {
      const created = onAddNewType(newTypeName.trim());
      setTypeId(created.id);
      setNewTypeName('');
      setShowNewTypeInput(false);
    }
  };

  const handleCreateLocation = () => {
    if (newLocationName.trim()) {
      const created = onAddNewLocation(newLocationName.trim(), newLocationCabin.trim() || 'C-01');
      setLocationId(created.id);
      setCabinNumber(newLocationCabin.trim() || 'C-01');
      setNewLocationName('');
      setNewLocationCabin('');
      setShowNewLocationInput(false);
    }
  };

  const handleSellingPriceOverride = (index: number, newPrice: number) => {
    const next = [...sellingPrices];
    next[index] = {
      ...next[index],
      price: isNaN(newPrice) ? 0 : newPrice,
      isOverridden: true,
    };
    setSellingPrices(next);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('Please enter a Product Name (e.g. sfc-5706).');
      return;
    }

    // Convert dimensions back to canonical INCHES for storage
    const parseDim = (valStr: string) => {
      if (!valStr || !valStr.trim()) return undefined;
      const num = parseFloat(valStr.trim());
      if (isNaN(num) || num <= 0) return undefined;
      return entryUnit === 'mm' ? mmToInch(num) : num;
    };

    const finalDimensions = {
      height: parseDim(heightVal),
      outerDia: parseDim(outerDiaVal),
      innerDia: parseDim(innerDiaVal),
      inputUnit: entryUnit,
      thread: threadVal.trim() || undefined,
      gasket_OD: parseDim(gasketODVal),
      gasket_ID: parseDim(gasketIDVal),
    };

    const selectedBrand = brands.find(b => b.id === brandId);
    const selectedType = types.find(t => t.id === typeId);
    const selectedLocation = locations.find(l => l.id === locationId);

    const productPayload: Partial<Product> = {
      internalId: internalId.trim() || nextInternalId,
      name: name.trim(),
      image: image || undefined,
      typeId,
      typeName: selectedType?.name || 'General Part',
      brandId,
      brandName: selectedBrand?.name || 'Standard',
      locationId,
      locationName: selectedLocation?.name || 'Main Shop',
      cabinNumber: cabinNumber.trim() || 'C-01',
      stockQuantity: isNaN(stockQuantity) ? 0 : stockQuantity,
      minStockAlert: isNaN(minStockAlert) ? 5 : minStockAlert,
      unit,
      costPrice: isNaN(costPrice) ? 0 : costPrice,
      sellingPrices,
      dimensions: finalDimensions,
      dimensionLabels: {
        heightName: heightLabel,
        outerDiaName: outerDiaLabel,
        innerDiaName: innerDiaLabel,
      },
      machineNames: machineNames.trim() || undefined,
      crossReferences: crossReferences.trim() || undefined,
      notes: notes.trim() || undefined,
    };

    onSave(productPayload);
    onClose();
  };

  const selectedLocationItem = locations.find(l => l.id === locationId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl border border-red-100 w-full max-w-3xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-2 sm:my-8">
        {/* Header */}
        <div className="bg-gradient-to-r from-red-600 to-red-700 px-4 sm:px-6 py-3.5 sm:py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white/15 backdrop-blur-md flex items-center justify-center font-bold text-white border border-white/20 shrink-0">
              <Box className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-xl font-bold tracking-tight truncate">
                  {productToEdit ? 'Edit Product' : 'Add New Product'}
                </h2>
                <span className="px-2 py-0.5 bg-white/20 text-white font-mono text-[10px] sm:text-xs font-bold rounded shrink-0">
                  {internalId || nextInternalId}
                </span>
              </div>
              <p className="text-[10px] sm:text-xs text-red-100 truncate">Set product specs, dimensions, PKR pricing, and cabin</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white p-1.5 sm:p-2 rounded-lg hover:bg-white/10 transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 bg-slate-50 text-xs font-bold px-3 sm:px-6 gap-1 pt-2 overflow-x-auto whitespace-nowrap">
          <button
            type="button"
            onClick={() => setActiveTab('basic')}
            className={`pb-2.5 px-3 border-b-2 transition-all flex items-center gap-1.5 shrink-0 ${
              activeTab === 'basic'
                ? 'border-red-600 text-red-600 font-extrabold'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Tag className="w-3.5 h-3.5" />
            Basic Info & Location
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('dimensions')}
            className={`pb-2.5 px-3 border-b-2 transition-all flex items-center gap-1.5 shrink-0 ${
              activeTab === 'dimensions'
                ? 'border-red-600 text-red-600 font-extrabold'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Ruler className="w-3.5 h-3.5" />
            Dimensions & Thread
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('pricing')}
            className={`pb-2.5 px-3 border-b-2 transition-all flex items-center gap-1.5 shrink-0 ${
              activeTab === 'pricing'
                ? 'border-red-600 text-red-600 font-extrabold'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Calculator className="w-3.5 h-3.5" />
            Cost & Selling Tiers (PKR)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('compatibility')}
            className={`pb-2.5 px-3 border-b-2 transition-all flex items-center gap-1.5 shrink-0 ${
              activeTab === 'compatibility'
                ? 'border-red-600 text-red-600 font-extrabold'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            Machines & Cross Refs
          </button>
        </div>

        {/* Modal Form Body */}
        <form onSubmit={handleSubmit}>
          <div className="p-4 sm:p-6 space-y-4 sm:space-y-5 max-h-[65vh] overflow-y-auto">
            {/* TAB 1: Basic Info & Location */}
            {activeTab === 'basic' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                  {/* Internal ID */}
                  <div className="md:col-span-4">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Internal ID
                    </label>
                    <input
                      type="text"
                      value={internalId}
                      onChange={(e) => setInternalId(e.target.value)}
                      placeholder="e.g. KFH-2501"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold text-red-600 focus:bg-white focus:outline-hidden focus:border-red-500"
                    />
                    <span className="text-[10px] text-slate-400 mt-0.5 block">Starts from KFH-2501</span>
                  </div>

                  {/* Product Name */}
                  <div className="md:col-span-8">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Product Name / Part Number <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. sfc-5706, LF16015, Baldwin BF7587"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:outline-hidden focus:border-red-500"
                    />
                  </div>
                </div>

                {/* Brand & Type Row with Quick Add */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Brand */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                        Brand
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowNewBrandInput(!showNewBrandInput)}
                        className="text-[11px] font-bold text-red-600 hover:text-red-700 flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" /> Add Brand
                      </button>
                    </div>

                    {showNewBrandInput ? (
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={newBrandName}
                          onChange={(e) => setNewBrandName(e.target.value)}
                          placeholder="New Brand Name"
                          className="flex-1 px-3 py-1.5 bg-white border border-red-300 rounded-xl text-xs font-semibold"
                        />
                        <button
                          type="button"
                          onClick={handleCreateBrand}
                          className="px-3 py-1.5 bg-red-600 text-white rounded-xl text-xs font-bold"
                        >
                          Add
                        </button>
                      </div>
                    ) : (
                      <select
                        value={brandId}
                        onChange={(e) => setBrandId(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:outline-hidden focus:border-red-500"
                      >
                        {brands.map((b) => (
                          <option key={b.id} value={b.id}>{b.name}</option>
                        ))}
                      </select>
                    )}
                  </div>

                  {/* Product Type */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                        Product Type / Category
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowNewTypeInput(!showNewTypeInput)}
                        className="text-[11px] font-bold text-red-600 hover:text-red-700 flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" /> Add Type
                      </button>
                    </div>

                    {showNewTypeInput ? (
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={newTypeName}
                          onChange={(e) => setNewTypeName(e.target.value)}
                          placeholder="e.g. Fuel Separator, Valve"
                          className="flex-1 px-3 py-1.5 bg-white border border-red-300 rounded-xl text-xs font-semibold"
                        />
                        <button
                          type="button"
                          onClick={handleCreateType}
                          className="px-3 py-1.5 bg-red-600 text-white rounded-xl text-xs font-bold"
                        >
                          Add
                        </button>
                      </div>
                    ) : (
                      <select
                        value={typeId}
                        onChange={(e) => setTypeId(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:outline-hidden focus:border-red-500"
                      >
                        {types.map((t) => (
                          <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>

                {/* Location & Cabin */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Location */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                        Location
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowNewLocationInput(!showNewLocationInput)}
                        className="text-[11px] font-bold text-red-600 hover:text-red-700 flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" /> Add Location
                      </button>
                    </div>

                    {showNewLocationInput ? (
                      <div className="space-y-2 bg-slate-50 p-2 rounded-xl border border-red-200">
                        <input
                          type="text"
                          value={newLocationName}
                          onChange={(e) => setNewLocationName(e.target.value)}
                          placeholder="e.g. Warehouse B"
                          className="w-full px-2 py-1 text-xs border border-slate-300 rounded bg-white"
                        />
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={newLocationCabin}
                            onChange={(e) => setNewLocationCabin(e.target.value)}
                            placeholder="Initial Cabin (e.g. C-01)"
                            className="flex-1 px-2 py-1 text-xs border border-slate-300 rounded bg-white"
                          />
                          <button
                            type="button"
                            onClick={handleCreateLocation}
                            className="px-2.5 py-1 bg-red-600 text-white rounded text-xs font-bold"
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    ) : (
                      <select
                        value={locationId}
                        onChange={(e) => {
                          setLocationId(e.target.value);
                          const loc = locations.find(l => l.id === e.target.value);
                          if (loc && loc.cabins.length > 0) {
                            setCabinNumber(loc.cabins[0]);
                          }
                        }}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:outline-hidden focus:border-red-500"
                      >
                        {locations.map((loc) => (
                          <option key={loc.id} value={loc.id}>{loc.name}</option>
                        ))}
                      </select>
                    )}
                  </div>

                  {/* Cabin Number */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Cabin / Shelf / Rack Number
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={cabinNumber}
                        onChange={(e) => setCabinNumber(e.target.value)}
                        placeholder="e.g. C-12, Rack-04"
                        className="flex-1 px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900 focus:bg-white focus:outline-hidden focus:border-red-500"
                      />
                      {selectedLocationItem?.cabins && (
                        <select
                          onChange={(e) => setCabinNumber(e.target.value)}
                          value={cabinNumber}
                          className="w-28 px-2 py-1.5 bg-slate-100 border border-slate-300 rounded-xl text-xs font-mono text-slate-700"
                        >
                          <option value="">Quick Pick</option>
                          {selectedLocationItem.cabins.map((cab) => (
                            <option key={cab} value={cab}>{cab}</option>
                          ))}
                        </select>
                      )}
                    </div>
                  </div>
                </div>

                {/* Stock Quantity, Alert, Unit */}
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Stock Quantity
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={stockQuantity}
                      onChange={(e) => setStockQuantity(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:outline-hidden focus:border-red-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Min Alert Level
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={minStockAlert}
                      onChange={(e) => setMinStockAlert(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:outline-hidden focus:border-red-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Unit of Measure
                    </label>
                    <select
                      value={unit}
                      onChange={(e) => setUnit(e.target.value as QuantityUnit)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:outline-hidden focus:border-red-500"
                    >
                      <option value="Pcs">Pcs (Pieces)</option>
                      <option value="Kg">Kg (Kilogram)</option>
                      <option value="Litre">Litre (Ltr)</option>
                      <option value="Box">Box</option>
                      <option value="Set">Set</option>
                      <option value="Meter">Meter</option>
                      <option value="Dozen">Dozen</option>
                      <option value="Roll">Roll</option>
                      <option value="Carton">Carton</option>
                    </select>
                  </div>
                </div>

                {/* Product Image */}
                <div className="space-y-2 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Product Image (URL or Upload)
                  </label>
                  <div className="flex items-center gap-3">
                    {image ? (
                      <div className="w-14 h-14 rounded-xl overflow-hidden border border-slate-300 relative group shrink-0">
                        <img src={image} alt="Preview" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => setImage('')}
                          className="absolute inset-0 bg-red-600/80 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center text-xs font-bold"
                        >
                          Remove
                        </button>
                      </div>
                    ) : (
                      <div className="w-14 h-14 rounded-xl border-2 border-dashed border-slate-300 flex items-center justify-center text-slate-400 shrink-0">
                        <ImageIcon className="w-6 h-6" />
                      </div>
                    )}

                    <div className="flex-1 space-y-1.5">
                      <input
                        type="text"
                        value={image}
                        onChange={(e) => setImage(e.target.value)}
                        placeholder="Paste image URL..."
                        className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                      />
                      <div className="flex items-center gap-2">
                        <label className="px-3 py-1 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer shadow-2xs inline-flex items-center gap-1.5">
                          <Upload className="w-3.5 h-3.5" />
                          Choose Image File
                          <input type="file" accept="image/*" onChange={handleImageFileUpload} className="hidden" />
                        </label>
                        <span className="text-[11px] text-slate-400">PNG, JPG, WebP supported</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: Dimensions & Thread */}
            {activeTab === 'dimensions' && (
              <div className="space-y-5">
                {/* Unit selector banner */}
                <div className="bg-red-50/70 border border-red-100 rounded-xl p-3.5 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-red-950 block">Dimension Input Unit</span>
                    <span className="text-[11px] text-red-800/80">
                      Choose what unit you are inserting values in. (Export remains fixed in Inches).
                    </span>
                  </div>

                  <div className="flex bg-white p-0.5 rounded-lg border border-red-200">
                    <button
                      type="button"
                      onClick={() => setEntryUnit('inch')}
                      className={`px-3 py-1 text-xs font-bold rounded ${
                        entryUnit === 'inch' ? 'bg-red-600 text-white' : 'text-slate-600'
                      }`}
                    >
                      Inches (in)
                    </button>
                    <button
                      type="button"
                      onClick={() => setEntryUnit('mm')}
                      className={`px-3 py-1 text-xs font-bold rounded ${
                        entryUnit === 'mm' ? 'bg-red-600 text-white' : 'text-slate-600'
                      }`}
                    >
                      Millimeters (mm)
                    </button>
                  </div>
                </div>

                <div className="text-[11px] text-slate-500 bg-slate-50 p-2 rounded-lg border border-slate-200">
                  <span className="font-bold text-slate-700">Note on Optional Attributes:</span> If any measurement or thread is omitted, it will NOT be displayed on the product card.
                </div>

                {/* Dimension Inputs with Custom Dropdown Names */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Height */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-700 uppercase">Height ({heightLabel})</label>
                      <select
                        value={heightLabel}
                        onChange={(e) => setHeightLabel(e.target.value as 'H' | 'Height')}
                        className="text-[10px] font-bold text-slate-500 bg-slate-100 rounded border border-slate-200 px-1 py-0.5"
                      >
                        <option value="H">Label: H</option>
                        <option value="Height">Label: Height</option>
                      </select>
                    </div>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.01"
                        value={heightVal}
                        onChange={(e) => setHeightVal(e.target.value)}
                        placeholder={`e.g. ${entryUnit === 'inch' ? '7.85' : '199.4'}`}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:outline-hidden focus:border-red-500 pr-10"
                      />
                      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                        {entryUnit}
                      </span>
                    </div>
                  </div>

                  {/* Outer Dia / Length */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-700 uppercase">{outerDiaLabel}</label>
                      <select
                        value={outerDiaLabel}
                        onChange={(e) => setOuterDiaLabel(e.target.value as 'OD' | 'Length')}
                        className="text-[10px] font-bold text-slate-500 bg-slate-100 rounded border border-slate-200 px-1 py-0.5"
                      >
                        <option value="OD">Label: OD</option>
                        <option value="Length">Label: Length</option>
                      </select>
                    </div>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.01"
                        value={outerDiaVal}
                        onChange={(e) => setOuterDiaVal(e.target.value)}
                        placeholder={`e.g. ${entryUnit === 'inch' ? '3.75' : '95.3'}`}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:outline-hidden focus:border-red-500 pr-10"
                      />
                      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                        {entryUnit}
                      </span>
                    </div>
                  </div>

                  {/* Inner Dia / Width */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-700 uppercase">{innerDiaLabel}</label>
                      <select
                        value={innerDiaLabel}
                        onChange={(e) => setInnerDiaLabel(e.target.value as 'ID' | 'Width')}
                        className="text-[10px] font-bold text-slate-500 bg-slate-100 rounded border border-slate-200 px-1 py-0.5"
                      >
                        <option value="ID">Label: ID</option>
                        <option value="Width">Label: Width</option>
                      </select>
                    </div>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.01"
                        value={innerDiaVal}
                        onChange={(e) => setInnerDiaVal(e.target.value)}
                        placeholder={`e.g. ${entryUnit === 'inch' ? '2.44' : '62.0'}`}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:outline-hidden focus:border-red-500 pr-10"
                      />
                      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                        {entryUnit}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Thread (Excluded from mm/inch conversion) */}
                <div className="space-y-1 bg-red-50/40 p-3 rounded-xl border border-red-200">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-red-950 uppercase tracking-wider">
                      Thread Specification
                    </label>
                    <span className="text-[10px] text-red-700 font-semibold">(Excluded from unit math)</span>
                  </div>
                  <input
                    type="text"
                    value={threadVal}
                    onChange={(e) => setThreadVal(e.target.value)}
                    placeholder="e.g. 1&quot;-14, M20 x 1.5, 3/4-16 UNF, 1 3/8-16"
                    className="w-full px-3 py-2 bg-white border border-red-300 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-hidden focus:border-red-600"
                  />
                </div>

                {/* Gasket Dimensions */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Gasket Outer Diameter (Gasket_OD)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.01"
                        value={gasketODVal}
                        onChange={(e) => setGasketODVal(e.target.value)}
                        placeholder={`e.g. ${entryUnit === 'inch' ? '3.55' : '90.2'}`}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:outline-hidden focus:border-red-500 pr-10"
                      />
                      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                        {entryUnit}
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Gasket Inner Diameter (Gasket_ID)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.01"
                        value={gasketIDVal}
                        onChange={(e) => setGasketIDVal(e.target.value)}
                        placeholder={`e.g. ${entryUnit === 'inch' ? '3.15' : '80.0'}`}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:outline-hidden focus:border-red-500 pr-10"
                      />
                      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                        {entryUnit}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: Pricing (PKR) */}
            {activeTab === 'pricing' && (
              <div className="space-y-4">
                {/* Cost Price - Styled in RED */}
                <div className="bg-red-950/95 border border-red-900 rounded-2xl p-4 text-white space-y-2 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold uppercase tracking-wider text-red-200 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-red-500"></span>
                      Product Cost Price (PKR) <span className="text-red-400">*</span>
                    </label>
                    <span className="text-xs text-red-300 font-medium">Currency: Pakistani Rupee (PKR)</span>
                  </div>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      value={costPrice}
                      onChange={(e) => setCostPrice(Number(e.target.value))}
                      className="w-full bg-red-900/90 border border-red-500 rounded-xl px-4 py-2.5 text-base font-black text-red-100 pl-10 focus:outline-hidden focus:ring-2 focus:ring-red-400"
                    />
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-black text-red-400">
                      ₨
                    </span>
                  </div>
                </div>

                {/* Selling Prices Tiers Breakdown */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      Tiered Selling Prices ({pricingSettings.activeTierCount} Active Tiers)
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer text-xs font-semibold text-slate-600">
                      <input
                        type="checkbox"
                        checked={allowManualPriceOverride}
                        onChange={(e) => setAllowManualPriceOverride(e.target.checked)}
                        className="w-3.5 h-3.5 text-red-600 rounded border-slate-300"
                      />
                      <span>Manual Override for this Item</span>
                    </label>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {sellingPrices.slice(0, pricingSettings.activeTierCount).map((sp, idx) => {
                      const theme = getTierTheme(sp, idx, pricingSettings.activeTierCount);
                      return (
                        <div
                          key={sp.tierId || idx}
                          className={`p-3 rounded-xl border space-y-1.5 transition-colors ${theme.cardBg} ${theme.border}`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                              <span className={`w-2 h-2 rounded-full ${theme.dotColor}`}></span>
                              <span>{sp.tierName}</span>
                            </span>
                            <span className={`text-xs px-2 py-0.5 rounded-md ${theme.markupBadge}`}>
                              {sp.markupPercent}% Markup
                            </span>
                          </div>

                          {allowManualPriceOverride ? (
                            <div className="relative">
                              <input
                                type="number"
                                value={sp.price}
                                onChange={(e) => handleSellingPriceOverride(idx, Number(e.target.value))}
                                className={`w-full px-2.5 py-1.5 bg-white border rounded-lg text-xs font-black pl-7 ${theme.border} ${theme.textColor}`}
                              />
                              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                                ₨
                              </span>
                            </div>
                          ) : (
                            <div className={`text-base font-mono font-black ${theme.textColor}`}>
                              {formatPKR(sp.price)}
                            </div>
                          )}
                          <span className="text-[10px] text-slate-500 font-mono block">
                            Formula: <strong className="text-red-600">{formatPKR(costPrice, false)}</strong> × (1 + {sp.markupPercent}%)
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Purchase Records & FIFO Cost Batches */}
                {productToEdit?.costBatches && productToEdit.costBatches.length > 0 && (
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                        <History className="w-3.5 h-3.5 text-red-600" />
                        Purchase Records & FIFO Cost Batches ({productToEdit.costBatches.length})
                      </label>
                      <span className="text-[10px] font-semibold text-slate-500">
                        FIFO Sales Deductions Engine Active
                      </span>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-slate-200/70 text-[10px] font-bold uppercase tracking-wider text-slate-600">
                          <tr>
                            <th className="py-2 px-2.5 rounded-l-lg">Bill / Batch</th>
                            <th className="py-2 px-2">Vendor</th>
                            <th className="py-2 px-2">Date</th>
                            <th className="py-2 px-2 text-right">Unit Rate</th>
                            <th className="py-2 px-2 text-right">Orig Qty</th>
                            <th className="py-2 px-2.5 text-right rounded-r-lg text-red-600">Remaining</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 text-[11px]">
                          {productToEdit.costBatches.map((batch) => (
                            <tr key={batch.id} className="hover:bg-white transition-colors">
                              <td className="py-2 px-2.5 font-mono font-bold text-red-600">
                                {batch.billNumber ? `#${batch.billNumber}` : 'Initial Stock'}
                              </td>
                              <td className="py-2 px-2 font-medium text-slate-800">
                                {batch.vendorName || 'Inventory'}
                              </td>
                              <td className="py-2 px-2 text-slate-500">
                                {new Date(batch.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                              </td>
                              <td className="py-2 px-2 font-mono font-bold text-right text-slate-900">
                                {formatPKR(batch.unitCost)}
                              </td>
                              <td className="py-2 px-2 font-mono text-right text-slate-600">
                                {batch.quantity}
                              </td>
                              <td className="py-2 px-2.5 font-mono font-bold text-right text-red-600">
                                {batch.remainingQuantity}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 4: Machinery & Cross References */}
            {activeTab === 'compatibility' && (
              <div className="space-y-4">
                {/* Machine Names (Multiline 5-6 lines) */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                      <Cpu className="w-3.5 h-3.5 text-red-600" />
                      Compatible Machine Names / Engine Models
                    </label>
                    <span className="text-[11px] text-slate-400">Separate each machine by new line</span>
                  </div>
                  <textarea
                    rows={5}
                    value={machineNames}
                    onChange={(e) => setMachineNames(e.target.value)}
                    placeholder={`Perkins 1104D Engine\nCaterpillar CAT 320D Excavator\nKomatsu PC200-8\nJCB 3DX EcoMAX`}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono text-slate-800 focus:bg-white focus:outline-hidden focus:border-red-500 leading-relaxed"
                  />
                </div>

                {/* Cross References (Multiline 5-6 lines) */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                      <FileCode2 className="w-3.5 h-3.5 text-red-600" />
                      Interchange & Cross References
                    </label>
                    <span className="text-[11px] text-slate-400">Separate each part number by new line</span>
                  </div>
                  <textarea
                    rows={5}
                    value={crossReferences}
                    onChange={(e) => setCrossReferences(e.target.value)}
                    placeholder={`FS19732\nP550909\n361-9554\nBF7925\nSK3138`}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono text-slate-800 focus:bg-white focus:outline-hidden focus:border-red-500 leading-relaxed"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 bg-white border border-slate-300 rounded-xl hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-md hover:shadow-lg transition-all flex items-center gap-2"
            >
              <Check className="w-4 h-4" />
              {productToEdit ? 'Save Changes' : 'Add to Inventory'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
