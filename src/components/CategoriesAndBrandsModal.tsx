import React, { useState } from 'react';
import { Brand, LocationItem, ProductType } from '../types';
import { 
  X, 
  Plus, 
  Trash2, 
  Tag, 
  Layers, 
  MapPin, 
  Check, 
  Edit2 
} from 'lucide-react';

interface CategoriesAndBrandsModalProps {
  isOpen: boolean;
  onClose: () => void;
  brands: Brand[];
  types: ProductType[];
  locations: LocationItem[];
  onUpdateBrands: (brands: Brand[]) => void;
  onUpdateTypes: (types: ProductType[]) => void;
  onUpdateLocations: (locations: LocationItem[]) => void;
}

export const CategoriesAndBrandsModal: React.FC<CategoriesAndBrandsModalProps> = ({
  isOpen,
  onClose,
  brands,
  types,
  locations,
  onUpdateBrands,
  onUpdateTypes,
  onUpdateLocations,
}) => {
  const [activeTab, setActiveTab] = useState<'types' | 'brands' | 'locations'>('types');

  // Input states
  const [newTypeName, setNewTypeName] = useState<string>('');
  const [newBrandName, setNewBrandName] = useState<string>('');
  const [newLocationName, setNewLocationName] = useState<string>('');
  const [newLocationCabin, setNewLocationCabin] = useState<string>('C-01');

  // Cabin addition state for locations
  const [selectedLocationId, setSelectedLocationId] = useState<string>(locations[0]?.id || '');
  const [newCabinForLocation, setNewCabinForLocation] = useState<string>('');

  if (!isOpen) return null;

  // Types handlers
  const handleAddType = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTypeName.trim()) return;
    const item: ProductType = {
      id: `t-${Date.now()}`,
      name: newTypeName.trim(),
    };
    onUpdateTypes([...types, item]);
    setNewTypeName('');
  };

  const handleDeleteType = (id: string) => {
    onUpdateTypes(types.filter(t => t.id !== id));
  };

  // Brands handlers
  const handleAddBrand = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBrandName.trim()) return;
    const item: Brand = {
      id: `b-${Date.now()}`,
      name: newBrandName.trim(),
    };
    onUpdateBrands([...brands, item]);
    setNewBrandName('');
  };

  const handleDeleteBrand = (id: string) => {
    onUpdateBrands(brands.filter(b => b.id !== id));
  };

  // Locations handlers
  const handleAddLocation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLocationName.trim()) return;
    const item: LocationItem = {
      id: `loc-${Date.now()}`,
      name: newLocationName.trim(),
      cabins: newLocationCabin.trim() ? [newLocationCabin.trim()] : ['C-01'],
    };
    onUpdateLocations([...locations, item]);
    setNewLocationName('');
    setNewLocationCabin('C-01');
    setSelectedLocationId(item.id);
  };

  const handleDeleteLocation = (id: string) => {
    const updated = locations.filter(l => l.id !== id);
    onUpdateLocations(updated);
    if (selectedLocationId === id) {
      setSelectedLocationId(updated[0]?.id || '');
    }
  };

  const handleAddCabinToLocation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCabinForLocation.trim()) return;

    const nextLocations = locations.map(loc => {
      if (loc.id === selectedLocationId) {
        if (!loc.cabins.includes(newCabinForLocation.trim())) {
          return {
            ...loc,
            cabins: [...loc.cabins, newCabinForLocation.trim()],
          };
        }
      }
      return loc;
    });

    onUpdateLocations(nextLocations);
    setNewCabinForLocation('');
  };

  const handleDeleteCabinFromLocation = (locId: string, cabinToDelete: string) => {
    const nextLocations = locations.map(loc => {
      if (loc.id === locId) {
        return {
          ...loc,
          cabins: loc.cabins.filter(c => c !== cabinToDelete),
        };
      }
      return loc;
    });
    onUpdateLocations(nextLocations);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl border border-red-100 w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-2 sm:my-8">
        {/* Header */}
        <div className="bg-gradient-to-r from-red-600 to-red-700 px-4 sm:px-6 py-3.5 sm:py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white/15 backdrop-blur-md flex items-center justify-center font-bold text-white border border-white/20 shrink-0">
              <Layers className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-xl font-bold tracking-tight truncate">Types, Brands & Cabins</h2>
              <p className="text-[10px] sm:text-xs text-red-100 truncate">Manage categories, manufacturers, and cabins</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white p-1.5 sm:p-2 rounded-lg hover:bg-white/10 transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Header */}
        <div className="flex border-b border-slate-200 bg-slate-50 text-xs font-bold px-3 sm:px-6 gap-1 sm:gap-2 pt-2 overflow-x-auto whitespace-nowrap">
          <button
            type="button"
            onClick={() => setActiveTab('types')}
            className={`pb-2.5 px-3 sm:px-4 border-b-2 transition-all flex items-center gap-1.5 shrink-0 ${
              activeTab === 'types'
                ? 'border-red-600 text-red-600 font-extrabold'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Types ({types.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('brands')}
            className={`pb-2.5 px-3 sm:px-4 border-b-2 transition-all flex items-center gap-1.5 shrink-0 ${
              activeTab === 'brands'
                ? 'border-red-600 text-red-600 font-extrabold'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Tag className="w-3.5 h-3.5" />
            Brands ({brands.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('locations')}
            className={`pb-2.5 px-3 sm:px-4 border-b-2 transition-all flex items-center gap-1.5 shrink-0 ${
              activeTab === 'locations'
                ? 'border-red-600 text-red-600 font-extrabold'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <MapPin className="w-3.5 h-3.5" />
            Locations & Cabins ({locations.length})
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 space-y-4 max-h-[60vh] overflow-y-auto">
          {/* TAB 1: Product Types */}
          {activeTab === 'types' && (
            <div className="space-y-4">
              <form onSubmit={handleAddType} className="flex gap-2">
                <input
                  type="text"
                  value={newTypeName}
                  onChange={(e) => setNewTypeName(e.target.value)}
                  placeholder="New product type name (e.g. Fuel Water Separator, Gasket)"
                  className="flex-1 px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-hidden focus:border-red-500"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-2xs flex items-center gap-1"
                >
                  <Plus className="w-4 h-4" /> Add Type
                </button>
              </form>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {types.length === 0 ? (
                  <div className="col-span-full py-8 text-center bg-slate-50 border border-dashed border-slate-300 rounded-xl text-xs text-slate-500 font-medium">
                    No product types added yet. Use the field above to add your first type.
                  </div>
                ) : (
                  types.map((t) => (
                    <div
                      key={t.id}
                      className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between hover:bg-red-50/30 transition-colors"
                    >
                      <span className="text-xs font-bold text-slate-800">{t.name}</span>
                      <button
                        type="button"
                        onClick={() => handleDeleteType(t.id)}
                        className="p-1 text-slate-400 hover:text-red-600 rounded"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 2: Brands */}
          {activeTab === 'brands' && (
            <div className="space-y-4">
              <form onSubmit={handleAddBrand} className="flex gap-2">
                <input
                  type="text"
                  value={newBrandName}
                  onChange={(e) => setNewBrandName(e.target.value)}
                  placeholder="New brand name (e.g. Baldwin, Fleetguard, Mann)"
                  className="flex-1 px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-hidden focus:border-red-500"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-2xs flex items-center gap-1"
                >
                  <Plus className="w-4 h-4" /> Add Brand
                </button>
              </form>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {brands.length === 0 ? (
                  <div className="col-span-full py-8 text-center bg-slate-50 border border-dashed border-slate-300 rounded-xl text-xs text-slate-500 font-medium">
                    No brands added yet. Use the field above to add your first brand.
                  </div>
                ) : (
                  brands.map((b) => (
                    <div
                      key={b.id}
                      className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between hover:bg-red-50/30 transition-colors"
                    >
                      <span className="text-xs font-bold text-slate-800">{b.name}</span>
                      <button
                        type="button"
                        onClick={() => handleDeleteBrand(b.id)}
                        className="p-1 text-slate-400 hover:text-red-600 rounded"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 3: Locations & Cabins */}
          {activeTab === 'locations' && (
            <div className="space-y-5">
              {/* Add Location Form */}
              <form onSubmit={handleAddLocation} className="space-y-2 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                  Add New Storage Location
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newLocationName}
                    onChange={(e) => setNewLocationName(e.target.value)}
                    placeholder="Location Name (e.g. Godown 3, Main Counter)"
                    className="flex-1 px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-900"
                  />
                  <input
                    type="text"
                    value={newLocationCabin}
                    onChange={(e) => setNewLocationCabin(e.target.value)}
                    placeholder="Initial Cabin (e.g. C-01)"
                    className="w-32 px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-mono font-semibold text-slate-900"
                  />
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-red-600 text-white rounded-xl text-xs font-bold"
                  >
                    Save
                  </button>
                </div>
              </form>

              {/* Add Cabin to Existing Location */}
              {locations.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      Cabins for Location
                    </label>
                    <select
                      value={selectedLocationId}
                      onChange={(e) => setSelectedLocationId(e.target.value)}
                      className="px-2.5 py-1 text-xs font-bold bg-slate-100 border border-slate-300 rounded-lg text-slate-800"
                    >
                      {locations.map((loc) => (
                        <option key={loc.id} value={loc.id}>{loc.name}</option>
                      ))}
                    </select>
                  </div>

                  <form onSubmit={handleAddCabinToLocation} className="flex gap-2">
                    <input
                      type="text"
                      value={newCabinForLocation}
                      onChange={(e) => setNewCabinForLocation(e.target.value)}
                      placeholder="Add Cabin / Rack ID (e.g. C-15, Rack-08)"
                      className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900"
                    />
                    <button
                      type="submit"
                      className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold"
                    >
                      Add Cabin
                    </button>
                  </form>
                </div>
              )}

              {/* List Locations & their Cabins */}
              <div className="space-y-3 pt-2">
                {locations.length === 0 ? (
                  <div className="py-8 text-center bg-slate-50 border border-dashed border-slate-300 rounded-xl text-xs text-slate-500 font-medium">
                    No locations added yet. Use the form above to add your first warehouse or shop location.
                  </div>
                ) : (
                  locations.map((loc) => (
                    <div key={loc.id} className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 font-bold text-xs text-slate-900">
                          <MapPin className="w-3.5 h-3.5 text-red-600" />
                          <span>{loc.name}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteLocation(loc.id)}
                          className="text-xs text-slate-400 hover:text-red-600"
                        >
                          Delete Location
                        </button>
                      </div>

                      {/* Cabin Chips */}
                      <div className="flex flex-wrap gap-1.5">
                        {loc.cabins.map((cabin) => (
                          <span
                            key={cabin}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs font-mono font-bold text-slate-800 shadow-2xs"
                          >
                            <span>Cabin: {cabin}</span>
                            <button
                              type="button"
                              onClick={() => handleDeleteCabinFromLocation(loc.id, cabin)}
                              className="text-slate-400 hover:text-red-600"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-md transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
