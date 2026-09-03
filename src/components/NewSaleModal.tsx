import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Customer, 
  GlobalPricingSettings,
  InvoiceNamingPreference, 
  LocationItem,
  PaymentType, 
  Product, 
  ProductSellingPrice,
  QuantityUnit, 
  Sale, 
  SaleItem 
} from '../types';
import { getDefaultRetailPrice, getProductAvailableTiers, formatPKR, DEFAULT_PRICING_SETTINGS } from '../services/pricing';
import { getCustomerLastPrice, getNextSaleId, INITIAL_LOCATIONS } from '../services/storage';
import { 
  ShoppingCart, 
  Plus, 
  Trash2, 
  User, 
  Phone, 
  Search, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  FileText, 
  CreditCard, 
  Banknote, 
  Tag, 
  Percent, 
  Layers, 
  ArrowRight,
  HelpCircle,
  Clock,
  Keyboard,
  Maximize2,
  Calendar,
  CalendarDays,
  History,
  RotateCcw,
  MapPin,
  Building2
} from 'lucide-react';

export interface InitialSaleItemPreset {
  productId?: string;
  internalId?: string;
  productName: string;
  brandName?: string;
  typeName?: string;
  unit?: QuantityUnit;
  customerItemNumber?: string;
  machineNames?: string;
  quantity?: number;
  unitPrice?: number;
  notes?: string;
}

interface NewSaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  customers: Customer[];
  sales: Sale[];
  locations?: LocationItem[];
  pricingSettings?: GlobalPricingSettings;
  editingSale?: Sale | null;
  initialCustomerId?: string;
  initialCustomerName?: string;
  initialCustomerPhone?: string;
  initialNotes?: string;
  initialItems?: InitialSaleItemPreset[];
  onCompleteSale: (sale: Sale, originalSale?: Sale | null) => void;
}

interface DraftSaleItem {
  id: string;
  productId: string;
  internalId: string;
  productName: string;
  brandName: string;
  typeName: string;
  locationId: string;
  locationName: string;
  cabinNumber: string;
  unit: QuantityUnit;
  availableStock: number;
  quantity: number;
  unitPrice: number;
  costPrice: number;
  selectedTierId?: string;
  selectedTierName?: string;
  availableTiers: ProductSellingPrice[];
  crossReferences: string;
  machineNames: string;
  showDetailsOnInvoice: boolean;
  priceSource: 'customer_history' | 'inventory_retail' | 'tier_selected' | 'custom_entered';
  historyPriceNote?: string;
  historyPrice?: number;
}

// Helper date formatters for local date/time inputs
const getTodayDateString = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getCurrentTimeString = () => {
  const d = new Date();
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
};

const getYesterdayDateString = () => {
  const d = new Date(Date.now() - 86400000);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export interface ItemInventoryLocation {
  locationId: string;
  locationName: string;
  cabins: string[];
  stockQuantity: number;
  isPrimary?: boolean;
}

/**
 * Returns ONLY the specific locations where this item is registered/added in inventory.
 */
export const getItemInventoryLocations = (
  productId: string,
  productName: string,
  allProducts: Product[],
  globalLocations: LocationItem[] = []
): ItemInventoryLocation[] => {
  // Find all matching inventory records for this item (exact productId or exact name match)
  const matches = allProducts.filter(p =>
    p.id === productId ||
    (p.name && productName && p.name.trim().toLowerCase() === productName.trim().toLowerCase())
  );

  const locMap = new Map<string, ItemInventoryLocation>();

  matches.forEach(p => {
    const locName = p.locationName?.trim() || 'Main Shop';
    const matchedGlobal = globalLocations.find(l =>
      (p.locationId && l.id === p.locationId) ||
      (l.name && l.name.trim().toLowerCase() === locName.toLowerCase())
    );
    const locId = p.locationId || matchedGlobal?.id || `loc-${locName.toLowerCase().replace(/\s+/g, '-')}`;

    if (!locMap.has(locId)) {
      const cabinsList: string[] = [];
      if (p.cabinNumber?.trim()) {
        cabinsList.push(p.cabinNumber.trim());
      }
      locMap.set(locId, {
        locationId: locId,
        locationName: locName,
        cabins: cabinsList,
        stockQuantity: p.stockQuantity || 0,
        isPrimary: p.id === productId,
      });
    } else {
      const entry = locMap.get(locId)!;
      entry.stockQuantity += (p.stockQuantity || 0);
      if (p.cabinNumber?.trim() && !entry.cabins.includes(p.cabinNumber.trim())) {
        entry.cabins.push(p.cabinNumber.trim());
      }
    }
  });

  // If no inventory record had a specific location, fallback to direct product
  if (locMap.size === 0) {
    const direct = allProducts.find(p => p.id === productId);
    const locName = direct?.locationName?.trim() || 'Main Shop';
    const locId = direct?.locationId || 'loc-1';
    locMap.set(locId, {
      locationId: locId,
      locationName: locName,
      cabins: direct?.cabinNumber?.trim() ? [direct.cabinNumber.trim()] : [],
      stockQuantity: direct?.stockQuantity || 0,
      isPrimary: true,
    });
  }

  return Array.from(locMap.values());
};

export const NewSaleModal: React.FC<NewSaleModalProps> = ({
  isOpen,
  onClose,
  products = [],
  customers = [],
  sales = [],
  locations = [],
  pricingSettings = DEFAULT_PRICING_SETTINGS,
  editingSale,
  initialCustomerId,
  initialCustomerName,
  initialCustomerPhone,
  initialNotes,
  initialItems,
  onCompleteSale,
}) => {
  // Sale Date & Time State (Defaults to current date/time, fully editable for backdated sales)
  const [saleDate, setSaleDate] = useState<string>(getTodayDateString());
  const [saleTime, setSaleTime] = useState<string>(getCurrentTimeString());

  // Customer State
  const [customerMode, setCustomerMode] = useState<'walkin' | 'select' | 'new'>('walkin');
  const [customerSearch, setCustomerSearch] = useState<string>('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [newCustomerName, setNewCustomerName] = useState<string>('');
  const [newCustomerPhone, setNewCustomerPhone] = useState<string>('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState<boolean>(false);

  // Available Locations for item dispatch
  const availableLocations: LocationItem[] = useMemo(() => {
    if (locations && locations.length > 0) {
      return locations;
    }
    const locMap = new Map<string, LocationItem>();
    INITIAL_LOCATIONS.forEach(l => locMap.set(l.id, { ...l, cabins: [...l.cabins] }));
    products.forEach(p => {
      if (p.locationId && p.locationName) {
        if (!locMap.has(p.locationId)) {
          locMap.set(p.locationId, {
            id: p.locationId,
            name: p.locationName,
            cabins: p.cabinNumber ? [p.cabinNumber] : [],
          });
        } else {
          const existing = locMap.get(p.locationId)!;
          if (p.cabinNumber && !existing.cabins.includes(p.cabinNumber)) {
            existing.cabins.push(p.cabinNumber);
          }
        }
      }
    });
    return Array.from(locMap.values());
  }, [locations, products]);

  // Line items state
  const [saleItems, setSaleItems] = useState<DraftSaleItem[]>([]);

  // Product search in modal
  const [productSearchTerm, setProductSearchTerm] = useState<string>('');
  const [showProductDropdown, setShowProductDropdown] = useState<boolean>(false);
  const productSearchRef = useRef<HTMLInputElement | null>(null);

  // Discount & Payment
  const [discountType, setDiscountType] = useState<'amount' | 'percentage'>('amount');
  const [discountValue, setDiscountValue] = useState<number>(0);
  const [amountReceived, setAmountReceived] = useState<number | string>('');
  const [saleNotes, setSaleNotes] = useState<string>('');

  // Naming preference popup state
  const [showNamingPopup, setShowNamingPopup] = useState<boolean>(false);
  const [namingChoice, setNamingChoice] = useState<InvoiceNamingPreference>('product_name');
  const [validationError, setValidationError] = useState<string>('');

  // Reset / Preload state when opening
  useEffect(() => {
    if (isOpen) {
      if (editingSale) {
        // Preload from editingSale
        if (editingSale.date) {
          const dt = new Date(editingSale.date);
          const y = dt.getFullYear();
          const m = String(dt.getMonth() + 1).padStart(2, '0');
          const d = String(dt.getDate()).padStart(2, '0');
          setSaleDate(`${y}-${m}-${d}`);
          const hh = String(dt.getHours()).padStart(2, '0');
          const mm = String(dt.getMinutes()).padStart(2, '0');
          setSaleTime(`${hh}:${mm}`);
        } else {
          setSaleDate(getTodayDateString());
          setSaleTime(getCurrentTimeString());
        }

        if (editingSale.customerId) {
          const matchedCust = customers.find(c => c.id === editingSale.customerId);
          if (matchedCust) {
            setCustomerMode('select');
            setSelectedCustomer(matchedCust);
            setCustomerSearch(matchedCust.name);
          } else {
            setCustomerMode('new');
            setNewCustomerName(editingSale.customerName || '');
            setNewCustomerPhone(editingSale.customerPhone || '');
          }
        } else if (editingSale.customerName && editingSale.customerName !== 'Walk-in Customer') {
          const matchedCust = customers.find(c => c.name.toLowerCase() === editingSale.customerName?.toLowerCase());
          if (matchedCust) {
            setCustomerMode('select');
            setSelectedCustomer(matchedCust);
            setCustomerSearch(matchedCust.name);
          } else {
            setCustomerMode('new');
            setNewCustomerName(editingSale.customerName);
            setNewCustomerPhone(editingSale.customerPhone || '');
          }
        } else {
          setCustomerMode('walkin');
          setSelectedCustomer(null);
          setCustomerSearch('');
        }

        // Map sale items to DraftSaleItems
        const draftItems: DraftSaleItem[] = (editingSale.items || []).map(item => {
          const matchedProd = products.find(p => p.id === item.productId);
          const tiers = matchedProd ? getProductAvailableTiers(matchedProd, pricingSettings) : [];
          return {
            id: item.id || `item-${Date.now()}-${Math.random()}`,
            productId: item.productId,
            internalId: item.internalId || matchedProd?.internalId || '',
            productName: item.productName || matchedProd?.name || 'Product',
            brandName: item.brandName || matchedProd?.brandName || '',
            typeName: item.typeName || matchedProd?.typeName || '',
            locationId: item.locationId || matchedProd?.locationId || 'loc-1',
            locationName: item.locationName || matchedProd?.locationName || 'Main Shop',
            cabinNumber: item.cabinNumber || matchedProd?.cabinNumber || '',
            unit: item.unit || matchedProd?.unit || 'Pcs',
            availableStock: matchedProd?.stockQuantity !== undefined ? matchedProd.stockQuantity : 99,
            quantity: item.quantity || 1,
            unitPrice: item.unitPrice || 0,
            costPrice: item.costPrice || matchedProd?.costPrice || 0,
            selectedTierId: item.selectedTierId,
            selectedTierName: item.selectedTierName,
            availableTiers: tiers,
            crossReferences: item.crossReferences || '',
            machineNames: item.machineNames || '',
            showDetailsOnInvoice: Boolean(item.showDetailsOnInvoice),
            priceSource: item.priceSource || 'custom_entered',
          };
        });

        setSaleItems(draftItems);
        setProductSearchTerm('');
        setDiscountType(editingSale.discountType || 'amount');
        setDiscountValue(editingSale.discountValue || editingSale.discountAmount || 0);
        setAmountReceived(editingSale.amountReceived !== undefined ? editingSale.amountReceived : editingSale.totalAmount);
        setSaleNotes(editingSale.notes || '');
        setNamingChoice(editingSale.invoiceNamingPreference || 'product_name');
        setShowNamingPopup(false);
        setValidationError('');
      } else {
        // Standard New Sale Reset with possible initial items/customer presets
        setSaleDate(getTodayDateString());
        setSaleTime(getCurrentTimeString());

        const validInitialCustomerId = typeof initialCustomerId === 'string' && initialCustomerId.trim() ? initialCustomerId.trim() : undefined;
        const validInitialCustomerName = typeof initialCustomerName === 'string' && initialCustomerName.trim() ? initialCustomerName.trim() : undefined;

        if (validInitialCustomerId) {
          const matchedCust = customers.find(c => c.id === validInitialCustomerId);
          if (matchedCust) {
            setCustomerMode('select');
            setSelectedCustomer(matchedCust);
            setCustomerSearch(matchedCust.name);
          } else {
            setCustomerMode('walkin');
            setSelectedCustomer(null);
            setCustomerSearch('');
          }
        } else if (validInitialCustomerName) {
          const matchedCust = customers.find(c => c.name.toLowerCase() === validInitialCustomerName.toLowerCase());
          if (matchedCust) {
            setCustomerMode('select');
            setSelectedCustomer(matchedCust);
            setCustomerSearch(matchedCust.name);
          } else {
            setCustomerMode('new');
            setNewCustomerName(validInitialCustomerName);
            setNewCustomerPhone(initialCustomerPhone || '');
          }
        } else {
          setCustomerMode('walkin');
          setSelectedCustomer(null);
          setCustomerSearch('');
          setNewCustomerName('');
          setNewCustomerPhone('');
        }

        // Map initial preset items if provided (e.g. from Company Demand tab)
        if (Array.isArray(initialItems) && initialItems.length > 0) {
          const draftItems: DraftSaleItem[] = initialItems.map(item => {
            const matchedProd = products.find(p => (item.productId && p.id === item.productId) || (item.internalId && p.internalId.toLowerCase() === item.internalId.toLowerCase()));
            const tiers = matchedProd ? getProductAvailableTiers(matchedProd, pricingSettings) : [];
            const defaultRetail = matchedProd ? getDefaultRetailPrice(matchedProd) : 0;
            const unitPrice = item.unitPrice !== undefined && item.unitPrice > 0 ? item.unitPrice : defaultRetail;

            return {
              id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
              productId: matchedProd?.id || item.productId || `custom-${Date.now()}`,
              internalId: item.internalId || matchedProd?.internalId || '',
              productName: item.productName || matchedProd?.name || 'Item',
              brandName: item.brandName || matchedProd?.brandName || '',
              typeName: item.typeName || matchedProd?.typeName || '',
              locationId: matchedProd?.locationId || 'loc-1',
              locationName: matchedProd?.locationName || 'Main Shop',
              cabinNumber: matchedProd?.cabinNumber || '',
              unit: item.unit || matchedProd?.unit || 'Pcs',
              availableStock: matchedProd?.stockQuantity !== undefined ? matchedProd.stockQuantity : 99,
              quantity: item.quantity || 1,
              unitPrice: unitPrice,
              costPrice: matchedProd?.costPrice || 0,
              availableTiers: tiers,
              crossReferences: item.customerItemNumber || matchedProd?.crossReferences || '',
              machineNames: item.machineNames || matchedProd?.machineNames || '',
              showDetailsOnInvoice: true,
              priceSource: item.unitPrice ? 'tier_selected' : 'inventory_retail',
            };
          });
          setSaleItems(draftItems);
        } else {
          setSaleItems([]);
        }

        setProductSearchTerm('');
        setDiscountType('amount');
        setDiscountValue(0);
        setAmountReceived('');
        setSaleNotes(initialNotes || '');
        setShowNamingPopup(false);
        setNamingChoice('product_name');
        setValidationError('');
        
        // Auto focus product search input after opening
        setTimeout(() => {
          if (productSearchRef.current) {
            productSearchRef.current.focus();
          }
        }, 100);
      }
    }
  }, [isOpen, editingSale?.id, initialCustomerId, initialCustomerName, initialItems?.length]);

  // Is this sale recording a past date?
  const isBackdated = useMemo(() => {
    return Boolean(saleDate && saleDate !== getTodayDateString());
  }, [saleDate]);

  // Formatted date string for display
  const formattedSelectedDate = useMemo(() => {
    if (!saleDate) return 'Today';
    try {
      const [y, m, d] = saleDate.split('-').map(Number);
      const dateObj = new Date(y, m - 1, d);
      return dateObj.toLocaleDateString('en-PK', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return saleDate;
    }
  }, [saleDate]);

  // Filtered customer search
  const filteredCustomers = useMemo(() => {
    if (!customerSearch.trim()) return customers.slice(0, 8);
    const q = customerSearch.toLowerCase().trim();
    return customers.filter(
      c => c.name.toLowerCase().includes(q) || (c.phone && c.phone.includes(q))
    ).slice(0, 8);
  }, [customers, customerSearch]);

  // Filtered products for selection
  const filteredProducts = useMemo(() => {
    if (!productSearchTerm.trim()) return [];
    const q = productSearchTerm.toLowerCase().trim();
    return products.filter(p => {
      return (
        p.name.toLowerCase().includes(q) ||
        p.internalId.toLowerCase().includes(q) ||
        (p.brandName && p.brandName.toLowerCase().includes(q)) ||
        (p.typeName && p.typeName.toLowerCase().includes(q)) ||
        (p.crossReferences && p.crossReferences.toLowerCase().includes(q)) ||
        (p.machineNames && p.machineNames.toLowerCase().includes(q))
      );
    }).slice(0, 10);
  }, [products, productSearchTerm]);

  // Helper to determine customer effective name
  const effectiveCustomerName = useMemo(() => {
    if (customerMode === 'select' && selectedCustomer) return selectedCustomer.name;
    if (customerMode === 'new' && newCustomerName.trim()) return newCustomerName.trim();
    return 'Walk-in Customer';
  }, [customerMode, selectedCustomer, newCustomerName]);

  const effectiveCustomerPhone = useMemo(() => {
    if (customerMode === 'select' && selectedCustomer) return selectedCustomer.phone || '';
    if (customerMode === 'new' && newCustomerPhone.trim()) return newCustomerPhone.trim();
    return '';
  }, [customerMode, selectedCustomer, newCustomerPhone]);

  // When customer changes, optionally refresh the items with their history prices
  const handleSelectExistingCustomer = (cust: Customer) => {
    setSelectedCustomer(cust);
    setCustomerSearch(cust.name);
    setCustomerMode('select');
    setShowCustomerDropdown(false);

    // Re-check prices for existing items in cart for this customer
    setSaleItems(prev => prev.map(item => {
      const history = getCustomerLastPrice(cust.name, item.productId, sales);
      if (history && history.price > 0) {
        return {
          ...item,
          unitPrice: history.price,
          selectedTierId: 'customer_history',
          selectedTierName: 'Customer Last Price',
          priceSource: 'customer_history',
          historyPrice: history.price,
          historyPriceNote: `Customer Last Price from ${history.saleId} (₨ ${history.price})`,
        };
      }
      return item;
    }));
  };

  const handleSetWalkin = () => {
    setCustomerMode('walkin');
    setSelectedCustomer(null);
    setCustomerSearch('');
    setNewCustomerName('');
    setNewCustomerPhone('');
  };

  const handleSetNewCustomer = () => {
    setCustomerMode('new');
    setSelectedCustomer(null);
  };

  // Add Product to Cart
  const handleAddProductToSale = (product: Product) => {
    // Check if already in cart
    const existingIndex = saleItems.findIndex(i => i.productId === product.id);
    if (existingIndex >= 0) {
      // Increment quantity
      setSaleItems(prev => {
        const next = [...prev];
        next[existingIndex].quantity += 1;
        return next;
      });
      setProductSearchTerm('');
      setShowProductDropdown(false);
      return;
    }

    // Retrieve active tiers from inventory for this product
    const tiers = getProductAvailableTiers(product, pricingSettings);

    // Determine unit price:
    // 1. Check if selected customer has previous purchase history for this product
    let resolvedPrice = 0;
    let priceSource: 'customer_history' | 'inventory_retail' | 'tier_selected' | 'custom_entered' = 'inventory_retail';
    let historyNote = '';
    let historyPrice: number | undefined = undefined;
    let selectedTierId = '';
    let selectedTierName = '';

    if (effectiveCustomerName && effectiveCustomerName !== 'Walk-in Customer') {
      const history = getCustomerLastPrice(effectiveCustomerName, product.id, sales);
      if (history && history.price > 0) {
        resolvedPrice = history.price;
        historyPrice = history.price;
        priceSource = 'customer_history';
        selectedTierId = 'customer_history';
        selectedTierName = 'Customer Last Price';
        historyNote = `Customer Last Price from ${history.saleId} on ${new Date(history.date).toLocaleDateString()}`;
      }
    }

    // 2. If no customer history or walk-in, load default/retail price tier from inventory
    if (resolvedPrice <= 0) {
      const retailTier = tiers.find(
        t => t.tierName.toLowerCase().includes('retail') || t.tierId.includes('retail')
      ) || tiers[0];

      if (retailTier && retailTier.price > 0) {
        resolvedPrice = retailTier.price;
        selectedTierId = retailTier.tierId;
        selectedTierName = retailTier.tierName;
        priceSource = 'tier_selected';
      } else {
        resolvedPrice = getDefaultRetailPrice(product);
        selectedTierId = 'retail';
        selectedTierName = 'Retail';
        priceSource = 'inventory_retail';
      }
    }

    // Explicit User Intent: Do NOT autoload anything into crossReferences and machineNames
    // Default location strictly from this product's inventory locations
    const itemLocs = getItemInventoryLocations(product.id, product.name, products, locations);
    const defaultLoc = itemLocs[0] || {
      locationId: product.locationId || 'loc-1',
      locationName: product.locationName || 'Main Shop',
      cabins: product.cabinNumber ? [product.cabinNumber] : [],
      stockQuantity: product.stockQuantity || 0,
    };
    const defaultLocId = product.locationId || defaultLoc.locationId;
    const defaultLocName = product.locationName || defaultLoc.locationName;
    const defaultCabin = product.cabinNumber || defaultLoc.cabins[0] || '';

    const newItem: DraftSaleItem = {
      id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      productId: product.id,
      internalId: product.internalId,
      productName: product.name,
      brandName: product.brandName,
      typeName: product.typeName,
      locationId: defaultLocId,
      locationName: defaultLocName,
      cabinNumber: defaultCabin,
      unit: product.unit || 'Pcs',
      availableStock: product.stockQuantity || 0,
      quantity: 1,
      unitPrice: resolvedPrice,
      costPrice: product.costPrice || 0,
      selectedTierId,
      selectedTierName,
      availableTiers: tiers,
      crossReferences: '', // Do NOT autoload
      machineNames: '',    // Do NOT autoload
      showDetailsOnInvoice: false,
      priceSource,
      historyPriceNote: historyNote,
      historyPrice,
    };

    setSaleItems(prev => [...prev, newItem]);
    setProductSearchTerm('');
    setShowProductDropdown(false);
  };

  // Quick helper to apply a chosen location & cabin to compatible items in current sale
  const handleApplyLocationToAll = (sourceLocId: string, sourceLocName: string, sourceCabin: string) => {
    setSaleItems(prev => prev.map(item => {
      const itemLocs = getItemInventoryLocations(item.productId, item.productName, products, locations);
      const match = itemLocs.find(l => l.locationId === sourceLocId || l.locationName.toLowerCase() === sourceLocName.toLowerCase());
      if (match) {
        return {
          ...item,
          locationId: match.locationId,
          locationName: match.locationName,
          cabinNumber: match.cabins.includes(sourceCabin) ? sourceCabin : (match.cabins[0] || ''),
        };
      }
      return item;
    }));
  };

  // Select a specific price tier for an item
  const handleSelectTier = (itemId: string, tier: ProductSellingPrice) => {
    setSaleItems(prev => prev.map(item => {
      if (item.id === itemId) {
        return {
          ...item,
          unitPrice: tier.price,
          selectedTierId: tier.tierId,
          selectedTierName: tier.tierName,
          priceSource: 'tier_selected',
        };
      }
      return item;
    }));
  };

  // Select past customer price for an item
  const handleSelectCustomerHistoryPrice = (itemId: string) => {
    setSaleItems(prev => prev.map(item => {
      if (item.id === itemId && item.historyPrice) {
        return {
          ...item,
          unitPrice: item.historyPrice,
          selectedTierId: 'customer_history',
          selectedTierName: 'Customer Last Price',
          priceSource: 'customer_history',
        };
      }
      return item;
    }));
  };

  const handleUpdateItem = (id: string, updates: Partial<DraftSaleItem>) => {
    setSaleItems(prev => prev.map(item => {
      if (item.id === id) {
        const updated = { ...item, ...updates };
        if (updates.unitPrice !== undefined && updates.unitPrice !== item.unitPrice) {
          // Check if entered price matches any available tier
          const matchedTier = item.availableTiers?.find(t => t.price === updates.unitPrice);
          if (matchedTier) {
            updated.selectedTierId = matchedTier.tierId;
            updated.selectedTierName = matchedTier.tierName;
            updated.priceSource = 'tier_selected';
          } else if (item.historyPrice && updates.unitPrice === item.historyPrice) {
            updated.selectedTierId = 'customer_history';
            updated.selectedTierName = 'Customer Last Price';
            updated.priceSource = 'customer_history';
          } else {
            updated.selectedTierId = 'custom';
            updated.selectedTierName = 'Custom';
            updated.priceSource = 'custom_entered';
          }
        }
        return updated;
      }
      return item;
    }));
  };

  const handleRemoveItem = (id: string) => {
    setSaleItems(prev => prev.filter(item => item.id !== id));
  };

  // Calculations
  const subtotal = useMemo(() => {
    return saleItems.reduce((acc, item) => acc + (item.quantity * item.unitPrice), 0);
  }, [saleItems]);

  const totalCost = useMemo(() => {
    return saleItems.reduce((acc, item) => acc + (item.quantity * (item.costPrice || 0)), 0);
  }, [saleItems]);

  const discountAmount = useMemo(() => {
    if (!discountValue || isNaN(discountValue) || discountValue <= 0) return 0;
    if (discountType === 'percentage') {
      const pct = Math.min(100, Math.max(0, discountValue));
      return Math.round((subtotal * pct) / 100);
    }
    return Math.min(subtotal, discountValue);
  }, [subtotal, discountType, discountValue]);

  const totalAmount = useMemo(() => {
    return Math.max(0, subtotal - discountAmount);
  }, [subtotal, discountAmount]);

  const numericReceived = useMemo(() => {
    if (amountReceived === '' || amountReceived === undefined || amountReceived === null) {
      return totalAmount; // Default to exact cash if blank
    }
    const parsed = Number(amountReceived);
    return isNaN(parsed) ? 0 : parsed;
  }, [amountReceived, totalAmount]);

  const paymentType: PaymentType = useMemo(() => {
    if (numericReceived >= totalAmount) return 'cash';
    if (numericReceived > 0) return 'partial';
    return 'credit';
  }, [numericReceived, totalAmount]);

  const paymentStatus: 'paid' | 'partial' | 'credit' = useMemo(() => {
    if (numericReceived >= totalAmount) return 'paid';
    if (numericReceived > 0) return 'partial';
    return 'credit';
  }, [numericReceived, totalAmount]);

  const balanceDue = useMemo(() => {
    return Math.max(0, totalAmount - numericReceived);
  }, [totalAmount, numericReceived]);

  const changeGiven = useMemo(() => {
    return Math.max(0, numericReceived - totalAmount);
  }, [numericReceived, totalAmount]);

  // Trigger popup when user wants to finish sale
  const handleInitiateCompletion = () => {
    setValidationError('');

    if (saleItems.length === 0) {
      setValidationError('Please add at least one product item to this sale.');
      return;
    }

    for (const item of saleItems) {
      if (item.quantity <= 0) {
        setValidationError(`Quantity for ${item.productName} must be greater than 0.`);
        return;
      }
      if (item.unitPrice < 0) {
        setValidationError(`Price for ${item.productName} cannot be negative.`);
        return;
      }
    }

    // Open Naming Preference Popup
    setShowNamingPopup(true);
  };

  // Finalize Sale after naming preference is selected
  const handleFinalizeSale = () => {
    const saleIdToUse = editingSale ? editingSale.id : getNextSaleId(sales);

    const finalSaleItems: SaleItem[] = saleItems.map(item => ({
      id: item.id,
      productId: item.productId,
      internalId: item.internalId,
      productName: item.productName,
      brandName: item.brandName,
      typeName: item.typeName,
      locationId: item.locationId,
      locationName: item.locationName,
      cabinNumber: item.cabinNumber,
      unit: item.unit,
      quantity: Number(item.quantity),
      unitPrice: Number(item.unitPrice),
      costPrice: item.costPrice,
      totalPrice: Number(item.quantity) * Number(item.unitPrice),
      crossReferences: item.crossReferences?.trim() || '',
      machineNames: item.machineNames?.trim() || '',
      showDetailsOnInvoice: Boolean(item.showDetailsOnInvoice && (item.crossReferences?.trim() || item.machineNames?.trim())),
      selectedTierId: item.selectedTierId,
      selectedTierName: item.selectedTierName,
      priceSource: item.priceSource,
    }));

    // Combine editable saleDate and saleTime into an ISO timestamp
    let finalSaleDateIso = new Date().toISOString();
    if (saleDate) {
      const timePart = saleTime ? `${saleTime}:00` : '12:00:00';
      const parsedDate = new Date(`${saleDate}T${timePart}`);
      if (!isNaN(parsedDate.getTime())) {
        finalSaleDateIso = parsedDate.toISOString();
      }
    }

    const newSale: Sale = {
      id: saleIdToUse,
      date: finalSaleDateIso,
      customerId: selectedCustomer?.id || editingSale?.customerId,
      customerName: effectiveCustomerName,
      customerPhone: effectiveCustomerPhone,
      items: finalSaleItems,
      subtotal,
      discountType,
      discountValue: Number(discountValue) || 0,
      discountAmount,
      totalAmount,
      amountReceived: numericReceived,
      paymentType,
      paymentStatus,
      balanceDue,
      changeGiven,
      invoiceNamingPreference: namingChoice,
      notes: saleNotes.trim(),
      createdAt: editingSale ? editingSale.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      vendorId: editingSale?.vendorId,
      vendorName: editingSale?.vendorName,
      isVendorSale: editingSale?.isVendorSale,
    };

    setShowNamingPopup(false);
    onCompleteSale(newSale, editingSale);
  };

  // Global enter key listener to trigger completion or popup
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey || !showProductDropdown)) {
      // If popup is already showing, confirm
      if (showNamingPopup) {
        e.preventDefault();
        handleFinalizeSale();
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      onKeyDown={handleKeyDown}
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-xs overflow-y-auto"
    >
      <div className="bg-white rounded-3xl shadow-2xl border border-red-100 w-full max-w-5xl overflow-hidden my-auto flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-gradient-to-r from-red-700 via-red-600 to-red-700 px-4 sm:px-6 py-3.5 sm:py-4 text-white flex items-center justify-between shrink-0 shadow-md">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-white text-red-600 flex items-center justify-center font-black shadow-md border-2 border-red-100 shrink-0">
              <ShoppingCart className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-xl font-black tracking-tight text-white truncate">
                  {editingSale ? `Edit Sale #${editingSale.id}` : 'Make a Sale / POS System'}
                </h2>
                {!editingSale && (
                  <kbd className="hidden sm:inline-flex text-[10px] font-mono font-bold bg-black/25 text-white px-2 py-0.5 rounded-md border border-white/20">
                    F5 Shortcut
                  </kbd>
                )}
              </div>
              <p className="text-[10px] sm:text-[11px] text-red-100 font-medium truncate">
                {editingSale ? 'Update items, prices, quantities, and customer details' : 'Record sale, select inventory price tiers, and issue instant invoice receipt'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 sm:p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition-colors cursor-pointer shrink-0 ml-2"
          >
            <X className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        </div>

        {/* Validation error banner */}
        {validationError && (
          <div className="bg-red-50 border-b border-red-200 px-4 sm:px-6 py-2.5 text-xs font-bold text-red-700 flex items-center justify-between animate-shake">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{validationError}</span>
            </div>
            <button 
              type="button" 
              onClick={() => setValidationError('')}
              className="text-red-500 hover:text-red-800"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-3.5 sm:p-6 overflow-y-auto flex-1 space-y-4 sm:space-y-6">
          {/* SALE DATE & TIME CARD: AUTO CURRENT DATE + EDITABLE FOR BACKDATED SALES */}
          <div className={`rounded-2xl p-3 sm:p-4 border transition-all ${
            isBackdated 
              ? 'bg-amber-50/90 border-amber-300 ring-2 ring-amber-500/10' 
              : 'bg-slate-50 border-slate-200/90'
          }`}>
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              {/* Left Title & Status Indicator */}
              <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center font-bold shrink-0 shadow-2xs transition-colors ${
                  isBackdated 
                    ? 'bg-amber-600 text-white' 
                    : 'bg-red-600 text-white'
                }`}>
                  <Calendar className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-black uppercase tracking-wider text-slate-800">
                      Sale Date & Time
                    </span>
                    {isBackdated ? (
                      <span className="px-2 py-0.5 bg-amber-200/90 text-amber-900 border border-amber-300 rounded-md text-[10px] font-black flex items-center gap-1">
                        <History className="w-3 h-3 text-amber-800 shrink-0" />
                        <span>Past / Backdated Sale: {formattedSelectedDate}</span>
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-md text-[10px] font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                        <span>Current Date (Today)</span>
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] sm:text-[11px] text-slate-500 font-medium">
                    Automatically set to current date. Change anytime if recording a forgotten previous sale.
                  </p>
                </div>
              </div>

              {/* Right Controls: Date Picker, Time Picker, and Quick Presets */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Date Input */}
                <div className="flex items-center gap-1.5 bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 focus-within:ring-2 focus-within:ring-red-500/20 focus-within:border-red-500 shadow-2xs">
                  <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <input
                    type="date"
                    value={saleDate}
                    onChange={(e) => setSaleDate(e.target.value)}
                    className="text-xs font-bold text-slate-800 bg-transparent focus:outline-hidden cursor-pointer"
                    title="Sale Date (Change to record previous date sales)"
                  />
                </div>

                {/* Time Input */}
                <div className="flex items-center gap-1.5 bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 focus-within:ring-2 focus-within:ring-red-500/20 focus-within:border-red-500 shadow-2xs">
                  <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <input
                    type="time"
                    value={saleTime}
                    onChange={(e) => setSaleTime(e.target.value)}
                    className="text-xs font-bold text-slate-800 bg-transparent focus:outline-hidden cursor-pointer"
                    title="Sale Time"
                  />
                </div>

                {/* Quick Presets */}
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      setSaleDate(getTodayDateString());
                      setSaleTime(getCurrentTimeString());
                    }}
                    className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                      !isBackdated
                        ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                        : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300'
                    }`}
                    title="Set to today's date and current time"
                  >
                    Today
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setSaleDate(getYesterdayDateString());
                    }}
                    className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                      saleDate === getYesterdayDateString()
                        ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                        : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300'
                    }`}
                    title="Set date to yesterday"
                  >
                    Yesterday
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 1: CUSTOMER SELECTION & QUICK ENTRY */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5 sm:p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 mb-3">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-red-600 shrink-0" />
                <span className="text-xs font-black uppercase tracking-wider text-slate-700">
                  1. Customer Information
                </span>
              </div>

              {/* Mode Selector Buttons */}
              <div className="flex flex-wrap items-center gap-1 bg-slate-200/80 p-1 rounded-xl text-xs font-bold w-full sm:w-auto">
                <button
                  type="button"
                  onClick={handleSetWalkin}
                  className={`flex-1 sm:flex-initial text-center px-2.5 sm:px-3 py-1 rounded-lg transition-all cursor-pointer ${
                    customerMode === 'walkin'
                      ? 'bg-white text-red-600 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Walk-in
                </button>
                <button
                  type="button"
                  onClick={() => setCustomerMode('select')}
                  className={`flex-1 sm:flex-initial text-center px-2.5 sm:px-3 py-1 rounded-lg transition-all cursor-pointer ${
                    customerMode === 'select'
                      ? 'bg-white text-red-600 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Search Existing
                </button>
                <button
                  type="button"
                  onClick={handleSetNewCustomer}
                  className={`flex-1 sm:flex-initial text-center px-2.5 sm:px-3 py-1 rounded-lg transition-all cursor-pointer ${
                    customerMode === 'new'
                      ? 'bg-white text-red-600 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  + New Customer
                </button>
              </div>
            </div>

            {/* Dynamic Customer Inputs */}
            {customerMode === 'walkin' && (
              <div className="flex items-center gap-2 p-3 bg-white border border-slate-200 rounded-xl text-xs text-slate-600">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  Recording as <strong className="text-slate-900">Walk-in Customer</strong>. Product prices autoload from inventory price tiers.
                </span>
              </div>
            )}

            {customerMode === 'select' && (
              <div className="relative">
                <div className="relative">
                  <input
                    type="text"
                    value={customerSearch}
                    onChange={(e) => {
                      setCustomerSearch(e.target.value);
                      setShowCustomerDropdown(true);
                    }}
                    onFocus={() => setShowCustomerDropdown(true)}
                    placeholder="Type to search existing customer name or phone..."
                    className="w-full pl-9 pr-4 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                  />
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                </div>

                {/* Dropdown suggestions */}
                {showCustomerDropdown && (
                  <div className="absolute left-0 right-0 top-full mt-1.5 bg-white rounded-2xl shadow-xl border border-slate-200 z-30 overflow-hidden max-h-48 overflow-y-auto">
                    {filteredCustomers.length > 0 ? (
                      filteredCustomers.map(c => (
                        <div
                          key={c.id}
                          onClick={() => handleSelectExistingCustomer(c)}
                          className="p-2.5 hover:bg-red-50 cursor-pointer border-b border-slate-100 flex items-center justify-between text-xs transition-colors"
                        >
                          <div>
                            <div className="font-bold text-slate-900">{c.name}</div>
                            {c.phone && <div className="text-[11px] text-slate-500">{c.phone}</div>}
                          </div>
                          {c.totalPurchases && (
                            <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md text-[10px] font-bold">
                              {formatPKR(c.totalPurchases)} bought
                            </span>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="p-3 text-center text-xs text-slate-400">
                        No customer found. Select "+ New Customer" to add.
                      </div>
                    )}
                  </div>
                )}

                {selectedCustomer && (
                  <div className="mt-2 p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs flex items-center justify-between text-emerald-900 font-bold">
                    <span>Selected: {selectedCustomer.name} {selectedCustomer.phone ? `(${selectedCustomer.phone})` : ''}</span>
                    <span className="text-[11px] text-emerald-700 font-normal">Past customer prices will auto-load if available</span>
                  </div>
                )}
              </div>
            )}

            {customerMode === 'new' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Customer Name *
                  </label>
                  <input
                    type="text"
                    value={newCustomerName}
                    onChange={(e) => setNewCustomerName(e.target.value)}
                    placeholder="e.g. Tariq Machinery Works"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-hidden focus:border-red-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Phone Number (Optional)
                  </label>
                  <input
                    type="text"
                    value={newCustomerPhone}
                    onChange={(e) => setNewCustomerPhone(e.target.value)}
                    placeholder="e.g. 0300-1234567"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-hidden focus:border-red-500"
                  />
                </div>
              </div>
            )}
          </div>

          {/* SECTION 2: PRODUCT SEARCH & ADD MULTIPLE ITEMS */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-red-600" />
                <span className="text-xs font-black uppercase tracking-wider text-slate-700">
                  2. Select Products for this Sale
                </span>
              </div>
              <span className="text-xs font-bold text-slate-500">
                {saleItems.length} item{saleItems.length === 1 ? '' : 's'} added
              </span>
            </div>

            {/* Live Search Bar for Items */}
            <div className="relative">
              <div className="relative">
                <input
                  ref={productSearchRef}
                  type="text"
                  value={productSearchTerm}
                  onChange={(e) => {
                    setProductSearchTerm(e.target.value);
                    setShowProductDropdown(true);
                  }}
                  onFocus={() => setShowProductDropdown(true)}
                  placeholder="Search inventory by Part Name (sfc-5706), ID (KFH-2501), Brand, Cross Ref..."
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border-2 border-slate-200 hover:border-slate-300 rounded-2xl text-xs font-bold text-slate-800 focus:bg-white focus:outline-hidden focus:border-red-500 focus:ring-4 focus:ring-red-500/10 transition-all shadow-2xs"
                />
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                {productSearchTerm && (
                  <button
                    type="button"
                    onClick={() => setProductSearchTerm('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Product search suggestions with tier pricing previews & Cost Price */}
              {showProductDropdown && productSearchTerm.trim().length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-2 bg-white rounded-2xl shadow-2xl border border-slate-200 z-40 overflow-hidden max-h-64 overflow-y-auto">
                  {filteredProducts.length > 0 ? (
                    filteredProducts.slice(0, 50).map(prod => {
                      const prodTiers = getProductAvailableTiers(prod, pricingSettings);
                      const retailPrice = getDefaultRetailPrice(prod);
                      const cost = prod.costPrice || 0;
                      return (
                        <div
                          key={prod.id}
                          onClick={() => handleAddProductToSale(prod)}
                          className="p-3 hover:bg-red-50/80 cursor-pointer border-b border-slate-100 flex items-center justify-between text-xs transition-colors"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-[11px] font-bold bg-slate-100 text-slate-800 px-1.5 py-0.5 rounded">
                                {prod.internalId}
                              </span>
                              <span className="font-black text-slate-900 text-sm">
                                {prod.name}
                              </span>
                              {prod.brandName && (
                                <span className="text-[11px] text-slate-500 font-semibold">
                                  • {prod.brandName}
                                </span>
                              )}
                              {prod.locationName && (
                                <span className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded font-medium flex items-center gap-0.5">
                                  <MapPin className="w-2.5 h-2.5 text-slate-400" />
                                  {prod.locationName}{prod.cabinNumber ? ` (${prod.cabinNumber})` : ''}
                                </span>
                              )}
                            </div>
                            
                            {/* Cost Price & Tier prices preview list */}
                            <div className="flex flex-wrap items-center gap-1.5">
                              {/* Cost Price Badge (Red) */}
                              <span className="px-2 py-0.5 bg-red-50 text-red-700 border border-red-200 rounded-md text-[10px] font-black flex items-center gap-1 shadow-2xs">
                                <span className="text-red-500 font-bold">Cost:</span>
                                <span>{formatPKR(cost)}</span>
                              </span>

                              {prodTiers.map(t => (
                                <span key={t.tierId} className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md text-[10px] font-semibold">
                                  <span className="text-slate-500">{t.tierName}:</span> {formatPKR(t.price)}
                                </span>
                              ))}
                            </div>
                          </div>

                          <div className="text-right shrink-0 pl-3">
                            <div className="font-bold text-red-600 text-sm">
                              {formatPKR(retailPrice)}
                            </div>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              prod.stockQuantity > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                            }`}>
                              Stock: {prod.stockQuantity} {prod.unit}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="p-4 text-center text-xs text-slate-400 font-semibold">
                      No products matching "{productSearchTerm}"
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* List of Added Line Items */}
            {saleItems.length === 0 ? (
              <div className="border-2 border-dashed border-slate-200 rounded-2xl p-8 text-center bg-slate-50/50">
                <ShoppingCart className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-600">No items added to this sale yet</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Use the search bar above to select products from your inventory
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {saleItems.map((item, index) => (
                  <div
                    key={item.id}
                    className="bg-white border border-slate-200 rounded-2xl p-3.5 sm:p-4 shadow-2xs space-y-3 hover:border-red-200 transition-colors"
                  >
                    {/* Top Row: Item Name, Price Autoload Note, Remove */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-500 font-black text-[10px] flex items-center justify-center">
                          {index + 1}
                        </span>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 text-sm">
                              {item.productName}
                            </span>
                            <span className="font-mono text-[11px] font-bold text-slate-600 bg-slate-100 px-1.5 py-0.2 rounded">
                              {item.internalId}
                            </span>
                            {item.brandName && (
                              <span className="text-xs text-slate-500 font-medium">
                                ({item.brandName})
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Autoload Badge / Price indicator */}
                      <div className="flex items-center gap-2">
                        {item.priceSource === 'customer_history' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-lg text-[11px] font-bold" title={item.historyPriceNote}>
                            <Sparkles className="w-3 h-3 text-amber-600" />
                            Customer Last Price Auto-loaded
                          </span>
                        )}
                        {item.priceSource === 'tier_selected' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-red-50 text-red-700 border border-red-200 rounded-lg text-[11px] font-bold">
                            <Tag className="w-3 h-3 text-red-500" />
                            {item.selectedTierName} Tier Auto-loaded
                          </span>
                        )}
                        {item.priceSource === 'inventory_retail' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg text-[11px] font-semibold">
                            Retail Price Auto-loaded
                          </span>
                        )}
                        {item.priceSource === 'custom_entered' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg text-[11px] font-bold">
                            Custom Rate
                          </span>
                        )}

                        <button
                          type="button"
                          onClick={() => handleRemoveItem(item.id)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                          title="Remove Item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Middle Row: Quantity, Selling Price Input, Stock Status, Line Total */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 items-center">
                      <div>
                        <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">
                          Quantity ({item.unit})
                        </label>
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => handleUpdateItem(item.id, { quantity: Math.max(1, parseInt(e.target.value, 10) || 1) })}
                            className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:outline-hidden focus:border-red-500"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">
                          Selling Price (PKR) *Editable
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            min="0"
                            value={item.unitPrice}
                            onChange={(e) => handleUpdateItem(item.id, { unitPrice: parseFloat(e.target.value) || 0 })}
                            className="w-full pl-6 pr-2 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:outline-hidden focus:border-red-500"
                          />
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">₨</span>
                        </div>
                      </div>

                      <div>
                        <span className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">
                          Stock Status
                        </span>
                        <div className={`text-xs font-bold ${item.availableStock >= item.quantity ? 'text-emerald-700' : 'text-red-600'}`}>
                          {item.availableStock >= item.quantity 
                            ? `✓ In Stock (${item.availableStock})` 
                            : `⚠ Low Stock (${item.availableStock} available)`}
                        </div>
                      </div>

                      <div className="sm:text-right">
                        <span className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">
                          Line Total
                        </span>
                        <span className="text-sm font-black text-slate-900">
                          {formatPKR(item.quantity * item.unitPrice)}
                        </span>
                      </div>
                    </div>

                    {/* Cost Price (Red) & Margin Indicator for this product */}
                    <div className="bg-red-50/60 border border-red-200/80 rounded-xl p-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black uppercase tracking-wider text-red-900 bg-red-200/90 px-2 py-0.5 rounded-md">
                          Cost Price
                        </span>
                        <span className="font-mono font-black text-red-700 text-xs">
                          {formatPKR(item.costPrice)} / {item.unit}
                        </span>
                        {item.quantity > 1 && (
                          <span className="text-[10px] text-red-600/80 font-medium hidden sm:inline">
                            (Total Cost: {formatPKR(item.costPrice * item.quantity)})
                          </span>
                        )}
                      </div>

                      {/* Profit Margin Preview & Cost Warning */}
                      <div className="flex items-center gap-2.5 sm:gap-3">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] text-slate-600 font-medium">Unit Profit:</span>
                          <span className={`font-black ${item.unitPrice >= item.costPrice ? 'text-emerald-700' : 'text-red-600'}`}>
                            {item.unitPrice >= item.costPrice ? '+' : ''}{formatPKR(item.unitPrice - item.costPrice)}
                            {item.costPrice > 0 && (
                              <span className="ml-1 text-[10px] font-bold">
                                ({(((item.unitPrice - item.costPrice) / item.costPrice) * 100).toFixed(0)}%)
                              </span>
                            )}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 pl-2.5 border-l border-amber-200">
                          <span className="text-[11px] text-slate-600 font-medium">Total Margin:</span>
                          <span className={`font-black ${item.unitPrice >= item.costPrice ? 'text-emerald-700' : 'text-red-600'}`}>
                            {item.unitPrice >= item.costPrice ? '+' : ''}{formatPKR((item.unitPrice - item.costPrice) * item.quantity)}
                          </span>
                        </div>

                        {item.unitPrice < item.costPrice && (
                          <span className="px-1.5 py-0.5 bg-red-600 text-white text-[10px] font-bold rounded-md animate-pulse">
                            Below Cost!
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Price Tier Selection Row: Autoloaded prices from inventory with clickable tier names */}
                    <div className="bg-slate-50 border border-slate-200/90 rounded-xl p-2.5 space-y-2">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                        <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-slate-600">
                          <Tag className="w-3.5 h-3.5 text-red-600" />
                          <span>Select Price Tier (Autoload from Inventory):</span>
                        </div>
                        {item.selectedTierName && (
                          <span className="text-[11px] font-bold text-slate-700">
                            Current: <span className="text-red-600">{item.selectedTierName}</span>
                          </span>
                        )}
                      </div>

                      {/* Tier Name Selection Buttons */}
                      <div className="flex flex-wrap items-center gap-1.5">
                        {item.availableTiers && item.availableTiers.map(tier => {
                          const isSelected = item.unitPrice === tier.price && item.selectedTierId === tier.tierId;
                          return (
                            <button
                              type="button"
                              key={tier.tierId}
                              onClick={() => handleSelectTier(item.id, tier)}
                              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                                isSelected
                                  ? 'bg-red-600 text-white shadow-xs ring-2 ring-red-600/30'
                                  : 'bg-white hover:bg-slate-100 text-slate-700 hover:text-slate-900 border border-slate-200 shadow-2xs'
                              }`}
                              title={`Apply ${tier.tierName} price: ${formatPKR(tier.price)}`}
                            >
                              <span className={isSelected ? 'text-white' : 'text-slate-800'}>{tier.tierName}:</span>
                              <span className={isSelected ? 'text-white font-black' : 'text-red-600 font-bold'}>
                                {formatPKR(tier.price)}
                              </span>
                              {tier.markupPercent !== undefined && (
                                <span className={`text-[10px] ${isSelected ? 'text-red-100' : 'text-slate-400'} font-medium`}>
                                  (+{tier.markupPercent}%)
                                </span>
                              )}
                              {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-white shrink-0" />}
                            </button>
                          );
                        })}

                        {/* Customer History Last Price Pill */}
                        {item.historyPrice && (
                          <button
                            type="button"
                            onClick={() => handleSelectCustomerHistoryPrice(item.id)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                              item.unitPrice === item.historyPrice && item.selectedTierId === 'customer_history'
                                ? 'bg-amber-600 text-white shadow-xs ring-2 ring-amber-600/30'
                                : 'bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 shadow-2xs'
                            }`}
                            title={item.historyPriceNote}
                          >
                            <Sparkles className={`w-3.5 h-3.5 ${item.unitPrice === item.historyPrice && item.selectedTierId === 'customer_history' ? 'text-white' : 'text-amber-500'}`} />
                            <span>Customer Past Price:</span>
                            <span className={item.unitPrice === item.historyPrice && item.selectedTierId === 'customer_history' ? 'text-white font-black' : 'text-amber-800 font-black'}>
                              {formatPKR(item.historyPrice)}
                            </span>
                            {item.unitPrice === item.historyPrice && item.selectedTierId === 'customer_history' && (
                              <CheckCircle2 className="w-3.5 h-3.5 text-white shrink-0" />
                            )}
                          </button>
                        )}

                        {/* Custom Rate Tag */}
                        {item.priceSource === 'custom_entered' && (
                          <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1">
                            <Tag className="w-3.5 h-3.5 text-blue-500" />
                            <span>Custom Rate: {formatPKR(item.unitPrice)}</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Dispatch / Sale Location Selector for this specific item (ONLY inventory locations for this item) */}
                    {(() => {
                      const itemInventoryLocations = getItemInventoryLocations(item.productId, item.productName, products, locations);
                      const activeLocObj = itemInventoryLocations.find(l => l.locationId === item.locationId || l.locationName.toLowerCase() === item.locationName.toLowerCase()) || itemInventoryLocations[0];
                      const activeCabins = activeLocObj?.cabins || [];

                      return (
                        <div className="bg-slate-50 border border-slate-200/90 rounded-xl p-2.5 space-y-2">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                            <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-slate-700">
                              <MapPin className="w-3.5 h-3.5 text-red-600" />
                              <span>Dispatch Location:</span>
                              {itemInventoryLocations.length === 1 ? (
                                <span className="text-[10px] bg-emerald-100/90 text-emerald-800 border border-emerald-200 px-1.5 py-0.2 rounded font-bold">
                                  1 Location in Inventory
                                </span>
                              ) : (
                                <span className="text-[10px] bg-blue-100/90 text-blue-800 border border-blue-200 px-1.5 py-0.2 rounded font-bold">
                                  {itemInventoryLocations.length} Locations in Inventory
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-2">
                              {saleItems.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => handleApplyLocationToAll(item.locationId, item.locationName, item.cabinNumber)}
                                  className="text-[10px] font-bold text-red-600 hover:text-red-700 hover:underline flex items-center gap-1 cursor-pointer"
                                  title="Apply this location and cabin to compatible items in current sale"
                                >
                                  <Layers className="w-3 h-3" />
                                  <span>Apply to Compatible Items</span>
                                </button>
                              )}
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            {/* Location Select Dropdown - ONLY shows locations added to this item in inventory */}
                            <div>
                              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                                Item's Inventory Location
                              </label>
                              <select
                                value={item.locationId || activeLocObj?.locationId || ''}
                                onChange={(e) => {
                                  const locId = e.target.value;
                                  const matched = itemInventoryLocations.find(l => l.locationId === locId);
                                  const locName = matched ? matched.locationName : locId;
                                  const nextCabin = matched && matched.cabins && matched.cabins.length > 0
                                    ? (matched.cabins.includes(item.cabinNumber) ? item.cabinNumber : matched.cabins[0])
                                    : '';
                                  handleUpdateItem(item.id, {
                                    locationId: locId,
                                    locationName: locName,
                                    cabinNumber: nextCabin,
                                  });
                                }}
                                className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:outline-hidden focus:border-red-500 cursor-pointer"
                              >
                                {itemInventoryLocations.map(loc => (
                                  <option key={loc.locationId} value={loc.locationId}>
                                    {loc.locationName} ({loc.stockQuantity} {item.unit} in inventory)
                                  </option>
                                ))}
                              </select>
                            </div>

                            {/* Cabin / Rack / Shelf Selector */}
                            <div>
                              <div className="flex items-center justify-between mb-1">
                                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                  Cabin / Shelf / Rack
                                </label>
                                {activeCabins.length > 0 && (
                                  <span className="text-[10px] text-slate-400 font-semibold">
                                    {activeCabins.length} recorded
                                  </span>
                                )}
                              </div>
                              {activeCabins.length > 0 ? (
                                <select
                                  value={item.cabinNumber || activeCabins[0] || ''}
                                  onChange={(e) => handleUpdateItem(item.id, { cabinNumber: e.target.value })}
                                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:outline-hidden focus:border-red-500 cursor-pointer"
                                >
                                  {activeCabins.map((cab, cIdx) => (
                                    <option key={cIdx} value={cab}>
                                      {cab}
                                    </option>
                                  ))}
                                  {item.cabinNumber && !activeCabins.includes(item.cabinNumber) && (
                                    <option value={item.cabinNumber}>Custom: {item.cabinNumber}</option>
                                  )}
                                  <option value="">-- No Specific Cabin --</option>
                                </select>
                              ) : (
                                <input
                                  type="text"
                                  value={item.cabinNumber || ''}
                                  onChange={(e) => handleUpdateItem(item.id, { cabinNumber: e.target.value })}
                                  placeholder="e.g. C-12, Bay-1"
                                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:outline-hidden focus:border-red-500"
                                />
                              )}
                            </div>
                          </div>

                          {/* Active Dispatch Badge */}
                          <div className="flex items-center gap-2 pt-0.5 text-[11px]">
                            <span className="text-slate-500 font-medium">Dispatching from:</span>
                            <span className="px-2 py-0.5 bg-blue-50 text-blue-800 border border-blue-200 rounded-md font-bold text-[11px] inline-flex items-center gap-1 shadow-2xs">
                              <MapPin className="w-3 h-3 text-blue-600" />
                              <span>{item.locationName || activeLocObj?.locationName || 'Main Shop'}</span>
                              {item.cabinNumber && (
                                <span className="bg-blue-200/80 text-blue-900 font-mono px-1.5 py-0.2 rounded text-[10px]">
                                  Cabin: {item.cabinNumber}
                                </span>
                              )}
                            </span>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Bottom Row: Cross-Reference, Machine Name (NOT autoloaded - clean empty by default) */}
                    <div className="pt-2 border-t border-slate-100/80 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                            Cross Reference (Optional - Not Autoloaded)
                          </label>
                        </div>
                        <input
                          type="text"
                          value={item.crossReferences}
                          onChange={(e) => handleUpdateItem(item.id, { crossReferences: e.target.value })}
                          placeholder="Leave empty or type to add e.g. FS19732"
                          className="w-full px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:bg-white focus:outline-hidden focus:border-red-500"
                        />
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                            Machine Name (Optional - Not Autoloaded)
                          </label>
                        </div>
                        <input
                          type="text"
                          value={item.machineNames}
                          onChange={(e) => handleUpdateItem(item.id, { machineNames: e.target.value })}
                          placeholder="Leave empty or type to add e.g. CAT 320D"
                          className="w-full px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:bg-white focus:outline-hidden focus:border-red-500"
                        />
                      </div>

                      {/* Checkbox option to show on invoice */}
                      <div className="sm:col-span-2 flex items-center justify-between pt-1">
                        <label className="flex items-center gap-2 cursor-pointer select-none text-[11px] font-bold text-slate-600">
                          <input
                            type="checkbox"
                            checked={item.showDetailsOnInvoice}
                            onChange={(e) => handleUpdateItem(item.id, { showDetailsOnInvoice: e.target.checked })}
                            className="w-3.5 h-3.5 text-red-600 rounded border-slate-300 focus:ring-red-500"
                          />
                          <span>Show Cross-Reference & Machine Name on Printed Invoice</span>
                        </label>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* SECTION 3: TOTALS, DISCOUNT & AMOUNT RECEIVED */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Banknote className="w-4 h-4 text-red-600" />
              <span className="text-xs font-black uppercase tracking-wider text-slate-700">
                3. Totals, Discount & Payment Receipt
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-start">
              {/* Left Column: Discount Setting & Sale Notes */}
              <div className="space-y-3">
                {/* Discount Box */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1.5">
                    Set Discount (Amounts or Percentage)
                  </label>
                  <div className="flex items-center gap-2">
                    {/* Toggle */}
                    <div className="flex bg-slate-200 p-0.5 rounded-xl text-xs font-bold shrink-0">
                      <button
                        type="button"
                        onClick={() => setDiscountType('amount')}
                        className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                          discountType === 'amount' ? 'bg-white text-red-600 shadow-xs' : 'text-slate-600'
                        }`}
                      >
                        ₨ PKR
                      </button>
                      <button
                        type="button"
                        onClick={() => setDiscountType('percentage')}
                        className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                          discountType === 'percentage' ? 'bg-white text-red-600 shadow-xs' : 'text-slate-600'
                        }`}
                      >
                        % Percent
                      </button>
                    </div>

                    {/* Value Input */}
                    <input
                      type="number"
                      min="0"
                      value={discountValue || ''}
                      onChange={(e) => setDiscountValue(parseFloat(e.target.value) || 0)}
                      placeholder={discountType === 'percentage' ? 'e.g. 5%' : 'e.g. 500'}
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:outline-hidden focus:border-red-500"
                    />
                  </div>
                  {discountAmount > 0 && (
                    <span className="text-[11px] font-bold text-emerald-600 mt-1 block">
                      Saving: -{formatPKR(discountAmount)}
                    </span>
                  )}
                </div>

                {/* Sale Notes */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Invoice Notes / Delivery Remarks
                  </label>
                  <input
                    type="text"
                    value={saleNotes}
                    onChange={(e) => setSaleNotes(e.target.value)}
                    placeholder="Optional remarks e.g. 'Delivered via Bilal Travels', 'Payment on 1st'"
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-700 focus:outline-hidden focus:border-red-500"
                  />
                </div>
              </div>

              {/* Right Column: Calculations & Received Amount */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3 shadow-xs">
                <div className="flex justify-between items-center text-xs text-slate-600">
                  <span className="font-semibold">Subtotal:</span>
                  <span className="font-bold text-slate-800">{formatPKR(subtotal)}</span>
                </div>

                {discountAmount > 0 && (
                  <div className="flex justify-between items-center text-xs text-emerald-700 font-semibold">
                    <span>Discount:</span>
                    <span className="font-bold">-{formatPKR(discountAmount)}</span>
                  </div>
                )}

                <div className="border-t border-slate-200 pt-2 flex justify-between items-center text-base font-black text-slate-900">
                  <span>Total Amount:</span>
                  <span className="text-red-600">{formatPKR(totalAmount)}</span>
                </div>

                {/* Merchant Cost & Net Margin Info */}
                {saleItems.length > 0 && (
                  <div className="bg-amber-50/70 border border-amber-200/90 rounded-xl p-2.5 space-y-1 text-xs">
                    <div className="flex justify-between items-center text-amber-900 font-semibold">
                      <span>Total Inventory Cost:</span>
                      <span className="font-mono font-bold text-amber-950">{formatPKR(totalCost)}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-600 font-semibold">Est. Profit Margin:</span>
                      <span className={`font-black ${totalAmount >= totalCost ? 'text-emerald-700' : 'text-red-600'}`}>
                        {totalAmount >= totalCost ? '+' : ''}{formatPKR(totalAmount - totalCost)}
                        {totalCost > 0 && (
                          <span className="ml-1 text-[10px] font-bold">
                            ({(((totalAmount - totalCost) / totalCost) * 100).toFixed(0)}%)
                          </span>
                        )}
                      </span>
                    </div>
                  </div>
                )}

                {/* Amount Received & Payment Mode Selector */}
                <div className="border-t border-slate-200 pt-3 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <label className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                      <Banknote className="w-3.5 h-3.5 text-red-600" />
                      <span>Payment Mode & Amount:</span>
                    </label>
                    <span className="text-[11px] font-bold text-slate-500">
                      Total: <span className="text-slate-900 font-black">{formatPKR(totalAmount)}</span>
                    </span>
                  </div>

                  {/* Payment Mode Selector Tabs */}
                  <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setAmountReceived(totalAmount)}
                      className={`py-1.5 px-2 rounded-lg text-xs font-black transition-all cursor-pointer flex flex-col items-center justify-center gap-0.5 ${
                        numericReceived >= totalAmount && totalAmount > 0
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
                      }`}
                    >
                      <span>Full Cash</span>
                      <span className="text-[10px] font-medium opacity-90">100% Paid</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setAmountReceived(Math.round(totalAmount / 2))}
                      className={`py-1.5 px-2 rounded-lg text-xs font-black transition-all cursor-pointer flex flex-col items-center justify-center gap-0.5 ${
                        numericReceived > 0 && numericReceived < totalAmount && Math.abs(numericReceived - Math.round(totalAmount / 2)) <= 1
                          ? 'bg-amber-600 text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
                      }`}
                    >
                      <span>Half Paid</span>
                      <span className="text-[10px] font-medium opacity-90">50% Split</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setAmountReceived(0)}
                      className={`py-1.5 px-2 rounded-lg text-xs font-black transition-all cursor-pointer flex flex-col items-center justify-center gap-0.5 ${
                        numericReceived === 0 && totalAmount > 0
                          ? 'bg-red-600 text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
                      }`}
                    >
                      <span>Credit Sale</span>
                      <span className="text-[10px] font-medium opacity-90">0% Paid</span>
                    </button>
                  </div>

                  {/* Amount Received Input */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="font-bold text-slate-600">Amount Received (PKR):</span>
                      <div className="flex items-center gap-2 font-bold">
                        <button
                          type="button"
                          onClick={() => setAmountReceived(Math.round(totalAmount * 0.25))}
                          className="text-slate-600 hover:text-red-600 cursor-pointer"
                        >
                          25%
                        </button>
                        <span>•</span>
                        <button
                          type="button"
                          onClick={() => setAmountReceived(Math.round(totalAmount * 0.5))}
                          className="text-slate-600 hover:text-red-600 cursor-pointer"
                        >
                          50%
                        </button>
                        <span>•</span>
                        <button
                          type="button"
                          onClick={() => setAmountReceived(Math.round(totalAmount * 0.75))}
                          className="text-slate-600 hover:text-red-600 cursor-pointer"
                        >
                          75%
                        </button>
                        <span>•</span>
                        <button
                          type="button"
                          onClick={() => setAmountReceived(totalAmount)}
                          className="text-red-600 hover:text-red-800 underline cursor-pointer"
                        >
                          100%
                        </button>
                      </div>
                    </div>
                    
                    <input
                      type="number"
                      min="0"
                      value={amountReceived}
                      onChange={(e) => setAmountReceived(e.target.value)}
                      placeholder={`e.g. ${totalAmount}`}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-black text-slate-900 focus:bg-white focus:outline-hidden focus:border-red-500"
                    />
                  </div>

                  {/* Quick Cash Increment Chips */}
                  <div className="flex flex-wrap gap-1.5">
                    {[1000, 2000, 5000, 10000, 20000, 50000].map(amt => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => setAmountReceived(amt)}
                        className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md text-[10px] font-bold transition-colors cursor-pointer"
                      >
                        +{amt.toLocaleString()}
                      </button>
                    ))}
                  </div>

                  {/* Payment Status Detailed Card */}
                  {numericReceived >= totalAmount && totalAmount > 0 ? (
                    <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 space-y-1">
                      <div className="flex items-center justify-between font-black">
                        <span className="flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          <span>Status: FULL CASH (Fully Paid)</span>
                        </span>
                        <span>Paid: {formatPKR(numericReceived)}</span>
                      </div>
                      {changeGiven > 0 ? (
                        <div className="text-[11px] font-bold text-emerald-700">
                          Change to return: <span className="font-mono">{formatPKR(changeGiven)}</span>
                        </div>
                      ) : (
                        <div className="text-[11px] text-emerald-700">
                          Invoice settled completely. In customer ledger, the invoice is recorded first, followed by the cash payment receipt.
                        </div>
                      )}
                    </div>
                  ) : numericReceived > 0 && numericReceived < totalAmount ? (
                    <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-1">
                      <div className="flex items-center justify-between font-black">
                        <span className="flex items-center gap-1.5">
                          <Clock className="w-4 h-4 text-amber-600" />
                          <span>Status: SEMI-PAID / HALF PAID</span>
                        </span>
                        <span className="text-amber-800">Paid: {formatPKR(numericReceived)}</span>
                      </div>
                      <div className="flex justify-between items-center text-[11px] font-bold pt-0.5 border-t border-amber-200/60">
                        <span className="text-amber-700">Balance Due on Account:</span>
                        <span className="text-red-700 font-mono font-black">{formatPKR(balanceDue)}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-900 space-y-1">
                      <div className="flex items-center justify-between font-black">
                        <span className="flex items-center gap-1.5">
                          <AlertCircle className="w-4 h-4 text-red-600" />
                          <span>Status: CREDIT SALE (Unpaid)</span>
                        </span>
                        <span>Paid: ₨ 0</span>
                      </div>
                      <div className="flex justify-between items-center text-[11px] font-bold pt-0.5 border-t border-red-200/60">
                        <span className="text-red-700">Total Added to Customer Ledger:</span>
                        <span className="text-red-800 font-mono font-black">{formatPKR(totalAmount)}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="bg-slate-100 border-t border-slate-200 px-4 sm:px-6 py-3 sm:py-4 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="text-[11px] sm:text-xs text-slate-500 font-medium text-center sm:text-left">
            Pressing <kbd className="font-mono bg-white px-1.5 py-0.5 rounded border border-slate-300 text-slate-800 font-bold">Ctrl+Enter</kbd> or clicking Finish will prompt invoice naming.
          </div>

          <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-initial px-3.5 sm:px-4 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer text-center"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleInitiateCompletion}
              disabled={saleItems.length === 0}
              className="flex-1 sm:flex-initial px-4 sm:px-6 py-2 sm:py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-xs font-black rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-1.5 sm:gap-2 cursor-pointer"
            >
              <ShoppingCart className="w-4 h-4 shrink-0" />
              <span>Complete & Print</span>
              <ArrowRight className="w-4 h-4 shrink-0 hidden xs:inline" />
            </button>
          </div>
        </div>
      </div>

      {/* POPUP PROMPT: SELECT HOW PRODUCT NAMES APPEAR ON INVOICE */}
      {showNamingPopup && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl shadow-2xl border border-red-200 w-full max-w-md p-4 sm:p-6 space-y-4 sm:space-y-5 animate-in zoom-in-95 duration-150">
            <div className="text-center space-y-1.5 sm:space-y-2">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-red-100 text-red-600 mx-auto flex items-center justify-center shadow-inner">
                <FileText className="w-6 h-6 sm:w-7 sm:h-7" />
              </div>
              <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                Invoice Item Naming Preference
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Choose how items should be titled on the customer invoice & printable receipt:
              </p>
            </div>

            {/* Selection Choices */}
            <div className="space-y-2.5">
              {/* Option 1: Product Name / Part Number */}
              <label 
                onClick={() => setNamingChoice('product_name')}
                className={`p-3.5 rounded-2xl border-2 cursor-pointer flex items-center justify-between transition-all ${
                  namingChoice === 'product_name' 
                    ? 'border-red-600 bg-red-50/70 text-red-900 shadow-xs' 
                    : 'border-slate-200 hover:border-slate-300 text-slate-700'
                }`}
              >
                <div className="space-y-0.5">
                  <div className="text-xs font-black">Part Number / Product Name</div>
                  <div className="text-[11px] text-slate-500 font-mono">Example: "sfc-5706", "LF16015"</div>
                </div>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                  namingChoice === 'product_name' ? 'border-red-600 bg-red-600 text-white' : 'border-slate-300'
                }`}>
                  {namingChoice === 'product_name' && <CheckCircle2 className="w-4 h-4" />}
                </div>
              </label>

              {/* Option 2: Internal ID */}
              <label 
                onClick={() => setNamingChoice('internal_id')}
                className={`p-3.5 rounded-2xl border-2 cursor-pointer flex items-center justify-between transition-all ${
                  namingChoice === 'internal_id' 
                    ? 'border-red-600 bg-red-50/70 text-red-900 shadow-xs' 
                    : 'border-slate-200 hover:border-slate-300 text-slate-700'
                }`}
              >
                <div className="space-y-0.5">
                  <div className="text-xs font-black">Internal Inventory ID</div>
                  <div className="text-[11px] text-slate-500 font-mono">Example: "KFH-2501", "KFH-2502"</div>
                </div>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                  namingChoice === 'internal_id' ? 'border-red-600 bg-red-600 text-white' : 'border-slate-300'
                }`}>
                  {namingChoice === 'internal_id' && <CheckCircle2 className="w-4 h-4" />}
                </div>
              </label>

              {/* Option 3: Both */}
              <label 
                onClick={() => setNamingChoice('both')}
                className={`p-3.5 rounded-2xl border-2 cursor-pointer flex items-center justify-between transition-all ${
                  namingChoice === 'both' 
                    ? 'border-red-600 bg-red-50/70 text-red-900 shadow-xs' 
                    : 'border-slate-200 hover:border-slate-300 text-slate-700'
                }`}
              >
                <div className="space-y-0.5">
                  <div className="text-xs font-black">Both (Part Name + Internal ID)</div>
                  <div className="text-[11px] text-slate-500 font-mono">Example: "sfc-5706 [KFH-2501]"</div>
                </div>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                  namingChoice === 'both' ? 'border-red-600 bg-red-600 text-white' : 'border-slate-300'
                }`}>
                  {namingChoice === 'both' && <CheckCircle2 className="w-4 h-4" />}
                </div>
              </label>
            </div>

            {/* Invoice & Date Summary */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 text-xs space-y-1.5">
              <div className="flex justify-between items-center text-slate-600">
                <span className="font-semibold">Invoice Date:</span>
                <span className="font-bold text-slate-900 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-red-600" />
                  <span>{formattedSelectedDate}</span>
                  {isBackdated && (
                    <span className="px-1.5 py-0.2 bg-amber-100 text-amber-900 rounded text-[10px] font-bold">
                      Past Date
                    </span>
                  )}
                </span>
              </div>
              <div className="flex justify-between items-center text-slate-600">
                <span className="font-semibold">Total Amount:</span>
                <span className="font-mono font-black text-red-600">{formatPKR(totalAmount)}</span>
              </div>
              <div className="flex justify-between items-center text-slate-600 pt-1 border-t border-slate-200/80">
                <span className="font-semibold">Payment Mode:</span>
                <span className="font-bold text-slate-900">
                  {numericReceived >= totalAmount ? (
                    <span className="text-emerald-700 font-black">Full Cash (Paid ₨ {numericReceived.toLocaleString()})</span>
                  ) : numericReceived > 0 ? (
                    <span className="text-amber-700 font-black">Semi-Paid (Paid: ₨ {numericReceived.toLocaleString()}, Due: ₨ {balanceDue.toLocaleString()})</span>
                  ) : (
                    <span className="text-red-700 font-black">Credit Sale (Due: ₨ {totalAmount.toLocaleString()})</span>
                  )}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setShowNamingPopup(false)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleFinalizeSale}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white font-black text-xs rounded-xl shadow-md transition-colors cursor-pointer"
              >
                Generate & Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
