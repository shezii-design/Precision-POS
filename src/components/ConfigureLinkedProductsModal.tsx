import React, { useState, useMemo } from 'react';
import { 
  X, 
  Search, 
  CheckSquare, 
  Square, 
  Package, 
  Check, 
  Building2,
  Boxes,
  MapPin,
  Tag
} from 'lucide-react';
import { Vendor, Product } from '../types';

interface ConfigureLinkedProductsModalProps {
  isOpen: boolean;
  onClose: () => void;
  vendor: Vendor;
  allProducts: Product[];
  onSaveLinks: (vendorId: string, linkedProductIds: string[]) => void;
}

export const ConfigureLinkedProductsModal: React.FC<ConfigureLinkedProductsModalProps> = ({
  isOpen,
  onClose,
  vendor,
  allProducts,
  onSaveLinks,
}) => {
  const [selectedIds, setSelectedIds] = useState<string[]>(vendor.linkedProductIds || []);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedBrand, setSelectedBrand] = useState<string>('all');

  // Reset when vendor changes
  React.useEffect(() => {
    if (isOpen) {
      setSelectedIds(vendor.linkedProductIds || []);
      setSearchTerm('');
    }
  }, [isOpen, vendor?.id]);

  const uniqueBrands = useMemo(() => {
    const brands = new Set<string>();
    allProducts.forEach(p => {
      if (p.brandName) brands.add(p.brandName);
    });
    return Array.from(brands).sort();
  }, [allProducts]);

  const uniqueTypes = useMemo(() => {
    const types = new Set<string>();
    allProducts.forEach(p => {
      if (p.typeName) types.add(p.typeName);
    });
    return Array.from(types).sort();
  }, [allProducts]);

  const filteredProducts = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();
    return allProducts.filter(p => {
      const matchesSearch = !q || (
        p.name.toLowerCase().includes(q) ||
        p.internalId.toLowerCase().includes(q) ||
        (p.brandName && p.brandName.toLowerCase().includes(q)) ||
        (p.typeName && p.typeName.toLowerCase().includes(q)) ||
        (p.crossReferences && p.crossReferences.toLowerCase().includes(q)) ||
        (p.machineNames && p.machineNames.toLowerCase().includes(q))
      );

      const matchesBrand = selectedBrand === 'all' || p.brandName === selectedBrand;
      const matchesType = selectedType === 'all' || p.typeName === selectedType;

      return matchesSearch && matchesBrand && matchesType;
    });
  }, [allProducts, searchTerm, selectedBrand, selectedType]);

  if (!isOpen) return null;

  const toggleSelectProduct = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleSelectAllFiltered = () => {
    const filteredIds = filteredProducts.map(p => p.id);
    setSelectedIds(prev => Array.from(new Set([...prev, ...filteredIds])));
  };

  const handleDeselectAllFiltered = () => {
    const filteredIds = new Set(filteredProducts.map(p => p.id));
    setSelectedIds(prev => prev.filter(id => !filteredIds.has(id)));
  };

  const handleSave = () => {
    onSaveLinks(vendor.id, selectedIds);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div 
        id="configure-linked-products-card"
        className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden border border-neutral-200 flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="px-5 py-4 bg-neutral-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
              <Boxes className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold">
                Configure Linked Inventory Items
              </h2>
              <p className="text-xs text-neutral-400">
                Link products supplied by <strong className="text-amber-300">{vendor.businessName}</strong>
              </p>
            </div>
          </div>
          <button 
            type="button" 
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toolbar & Filters */}
        <div className="p-4 bg-neutral-50 border-b border-neutral-200 space-y-3">
          {/* Search bar */}
          <div className="relative">
            <input
              type="text"
              id="search-linked-products-input"
              placeholder="Search by part #, name, cross reference, engine machine..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-neutral-300 rounded-xl text-sm font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none"
              autoFocus
            />
            <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-2.5 pointer-events-none" />
          </div>

          {/* Quick Category / Brand Filters */}
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={selectedBrand}
                onChange={e => setSelectedBrand(e.target.value)}
                className="px-2.5 py-1.5 bg-white border border-neutral-300 rounded-lg text-xs font-medium text-neutral-700"
              >
                <option value="all">All Brands</option>
                {uniqueBrands.map(b => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>

              <select
                value={selectedType}
                onChange={e => setSelectedType(e.target.value)}
                className="px-2.5 py-1.5 bg-white border border-neutral-300 rounded-lg text-xs font-medium text-neutral-700"
              >
                <option value="all">All Types</option>
                {uniqueTypes.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                id="btn-select-all-filtered"
                onClick={handleSelectAllFiltered}
                className="px-2.5 py-1.5 bg-white border border-neutral-300 rounded-lg text-xs font-semibold text-neutral-700 hover:bg-neutral-100"
              >
                Select All Shown
              </button>
              <button
                type="button"
                id="btn-deselect-all-filtered"
                onClick={handleDeselectAllFiltered}
                className="px-2.5 py-1.5 bg-white border border-neutral-300 rounded-lg text-xs font-semibold text-neutral-700 hover:bg-neutral-100"
              >
                Deselect All Shown
              </button>
            </div>
          </div>
        </div>

        {/* Product Items List */}
        <div className="p-4 overflow-y-auto flex-1 divide-y divide-neutral-100">
          {filteredProducts.length === 0 ? (
            <div className="py-12 text-center text-neutral-400">
              <Package className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p className="text-sm font-medium">No products match your search</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {filteredProducts.slice(0, 100).map(product => {
                const isSelected = selectedIds.includes(product.id);
                const retailPrice = product.sellingPrices?.find(p => p.tierId === 'tier-retail')?.price || product.costPrice * 1.25;

                return (
                  <div
                    key={product.id}
                    id={`link-product-item-${product.id}`}
                    onClick={() => toggleSelectProduct(product.id)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer select-none flex items-start gap-3 ${
                      isSelected
                        ? 'bg-amber-50/80 border-amber-400 ring-1 ring-amber-400 shadow-xs'
                        : 'bg-white border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50/50'
                    }`}
                  >
                    <div className="pt-0.5 text-amber-600">
                      {isSelected ? (
                        <CheckSquare className="w-5 h-5 fill-amber-600 text-white" />
                      ) : (
                        <Square className="w-5 h-5 text-neutral-300" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-xs font-bold text-amber-900 bg-amber-100 px-1.5 py-0.5 rounded">
                            {product.internalId}
                          </span>
                          <h4 className="text-sm font-bold text-neutral-900 truncate">
                            {product.name}
                          </h4>
                        </div>
                        <span className="text-xs font-semibold text-neutral-700 whitespace-nowrap">
                          Stock: <strong className={product.stockQuantity > 0 ? 'text-emerald-700' : 'text-red-600'}>{product.stockQuantity}</strong>
                        </span>
                      </div>

                      <div className="flex items-center gap-2 mt-1 text-xs text-neutral-500 flex-wrap">
                        {product.brandName && (
                          <span className="flex items-center gap-0.5 font-medium text-neutral-700">
                            <Tag className="w-3 h-3 text-neutral-400" />
                            {product.brandName}
                          </span>
                        )}
                        {product.typeName && (
                          <span className="text-neutral-400">• {product.typeName}</span>
                        )}
                        {product.cabinNumber && (
                          <span className="text-neutral-400">• Loc: {product.cabinNumber}</span>
                        )}
                      </div>

                      <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-neutral-100/80 text-xs">
                        <span className="text-neutral-500">
                          Cost: <strong className="text-neutral-800">₨ {product.costPrice?.toLocaleString()}</strong>
                        </span>
                        <span className="text-neutral-500">
                          Retail: <strong className="text-neutral-900 font-bold">₨ {Math.round(retailPrice).toLocaleString()}</strong>
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-neutral-50 border-t border-neutral-200 flex items-center justify-between">
          <div className="text-xs text-neutral-600">
            <strong>{selectedIds.length}</strong> items linked to this vendor
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              id="btn-cancel-configure-links"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-neutral-300 text-xs font-semibold text-neutral-700 hover:bg-neutral-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              id="btn-save-configure-links"
              onClick={handleSave}
              className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-md hover:shadow-lg transition-all flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>Save Linked Products</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
