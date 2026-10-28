import { Product, ProductVelocityMetrics } from '../types';
import { matchesDimensionQuery, ParsedDimensionQuery } from './dimensions';

export function normalizeSearchTerm(str: string | undefined | null): string {
  if (!str) return '';
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]/g, ''); // Removes spaces, hyphens, slashes, dots, underscores
}

export function matchesPrimarySearch(product: Product, query: string): boolean {
  if (!query || !query.trim()) return true;

  const rawQuery = query.toLowerCase().trim();
  const normalizedQuery = normalizeSearchTerm(query);

  // Check Internal ID (e.g. KFH-2501, matches 2501, kfh2501, kfh)
  const normInternalId = normalizeSearchTerm(product.internalId);
  if (normInternalId.includes(normalizedQuery) || product.internalId.toLowerCase().includes(rawQuery)) {
    return true;
  }

  // Check Product Name (e.g. sfc-5706, matches sfc5706, 5706, sfc)
  const normName = normalizeSearchTerm(product.name);
  if (normName.includes(normalizedQuery) || product.name.toLowerCase().includes(rawQuery)) {
    return true;
  }

  // Check Brand & Type
  if (product.brandName && product.brandName.toLowerCase().includes(rawQuery)) return true;
  if (product.typeName && product.typeName.toLowerCase().includes(rawQuery)) return true;

  // Check Cabin & Location
  if (product.cabinNumber && product.cabinNumber.toLowerCase().includes(rawQuery)) return true;
  if (product.locationName && product.locationName.toLowerCase().includes(rawQuery)) return true;

  // Check Thread
  if (product.dimensions?.thread) {
    const threadRaw = product.dimensions.thread.toLowerCase();
    const threadNorm = normalizeSearchTerm(product.dimensions.thread);
    if (threadRaw.includes(rawQuery) || threadNorm.includes(normalizedQuery)) return true;
  }

  // Check Machine Names (multiline)
  if (product.machineNames) {
    const lines = product.machineNames.toLowerCase();
    const normMachines = normalizeSearchTerm(product.machineNames);
    if (lines.includes(rawQuery) || normMachines.includes(normalizedQuery)) return true;
  }

  // Check Cross References (multiline)
  if (product.crossReferences) {
    const crossLines = product.crossReferences.toLowerCase();
    const normCross = normalizeSearchTerm(product.crossReferences);
    if (crossLines.includes(rawQuery) || normCross.includes(normalizedQuery)) return true;
  }

  return false;
}

export interface FilterOptions {
  primarySearch: string;
  dimensionQuery: ParsedDimensionQuery | null;
  brandFilter: string;
  typeFilter: string;
  locationFilter: string;
  cabinFilter: string;
  stockStatus: 'all' | 'in_stock' | 'low_stock' | 'out_of_stock';
  velocityFilter?: 'all' | 'fast' | 'moderate' | 'slow' | 'dead' | 'new_unsold' | 'stockout_risk';
  sortBy: 'name_asc' | 'id_asc' | 'price_low' | 'price_high' | 'stock_low' | 'stock_high' | 'recent' | 'velocity_desc' | 'velocity_asc' | 'dead_capital_desc' | 'days_no_sale_desc';
}

export function filterAndSortProducts(
  products: Product[],
  options: FilterOptions,
  velocityMap?: Map<string, ProductVelocityMetrics>
): Product[] {
  const filtered = products.filter(product => {
    // 1. Primary Text Search (Name, Cross Refs, Machines, Thread, ID, etc.)
    if (!matchesPrimarySearch(product, options.primarySearch)) {
      return false;
    }

    // 2. Secondary Dimension Search (H x OD x ID in mm/inch)
    if (options.dimensionQuery && !matchesDimensionQuery(product, options.dimensionQuery)) {
      return false;
    }

    // 3. Brand Filter
    if (options.brandFilter && options.brandFilter !== 'all') {
      if (product.brandId !== options.brandFilter && product.brandName !== options.brandFilter) {
        return false;
      }
    }

    // 4. Type Filter
    if (options.typeFilter && options.typeFilter !== 'all') {
      if (product.typeId !== options.typeFilter && product.typeName !== options.typeFilter) {
        return false;
      }
    }

    // 5. Location Filter
    if (options.locationFilter && options.locationFilter !== 'all') {
      if (product.locationId !== options.locationFilter && product.locationName !== options.locationFilter) {
        return false;
      }
    }

    // 6. Cabin Filter
    if (options.cabinFilter && options.cabinFilter !== 'all') {
      if (product.cabinNumber !== options.cabinFilter) {
        return false;
      }
    }

    // 7. Stock Status Filter
    const stock = typeof product.stockQuantity === 'number' && !isNaN(product.stockQuantity) ? product.stockQuantity : 0;
    const minAlert = typeof product.minStockAlert === 'number' && !isNaN(product.minStockAlert) ? product.minStockAlert : 5;

    if (options.stockStatus === 'out_of_stock' && stock > 0) return false;
    if (options.stockStatus === 'low_stock' && stock > minAlert) return false;
    if (options.stockStatus === 'in_stock' && stock <= 0) return false;

    // 8. Sales Velocity Filter
    if (options.velocityFilter && options.velocityFilter !== 'all' && velocityMap) {
      const v = velocityMap.get(product.id);
      if (!v) return false;
      if (options.velocityFilter === 'stockout_risk') {
        if (!v.isStockoutRisk) return false;
      } else if (v.velocityTier !== options.velocityFilter) {
        return false;
      }
    }

    return true;
  });

  // Sort
  return filtered.sort((a, b) => {
    switch (options.sortBy) {
      case 'velocity_desc': {
        const vA = velocityMap?.get(a.id)?.unitsLast30Days || 0;
        const vB = velocityMap?.get(b.id)?.unitsLast30Days || 0;
        if (vB !== vA) return vB - vA;
        return (velocityMap?.get(b.id)?.velocityScore || 0) - (velocityMap?.get(a.id)?.velocityScore || 0);
      }
      case 'velocity_asc': {
        const vA = velocityMap?.get(a.id)?.unitsLast30Days || 0;
        const vB = velocityMap?.get(b.id)?.unitsLast30Days || 0;
        if (vA !== vB) return vA - vB;
        return (velocityMap?.get(a.id)?.velocityScore || 0) - (velocityMap?.get(b.id)?.velocityScore || 0);
      }
      case 'dead_capital_desc': {
        const cA = velocityMap?.get(a.id)?.tiedUpCapital || 0;
        const cB = velocityMap?.get(b.id)?.tiedUpCapital || 0;
        if (cB !== cA) return cB - cA;
        return (b.stockQuantity || 0) - (a.stockQuantity || 0);
      }
      case 'days_no_sale_desc': {
        const dA = velocityMap?.get(a.id)?.daysSinceLastSale ?? 9999;
        const dB = velocityMap?.get(b.id)?.daysSinceLastSale ?? 9999;
        return dB - dA;
      }
      case 'name_asc':
        return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
      case 'id_asc':
        return a.internalId.localeCompare(b.internalId, undefined, { numeric: true });
      case 'price_low':
        return a.costPrice - b.costPrice;
      case 'price_high':
        return b.costPrice - a.costPrice;
      case 'stock_low':
        return a.stockQuantity - b.stockQuantity;
      case 'stock_high':
        return b.stockQuantity - a.stockQuantity;
      case 'recent':
      default:
        return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
    }
  });
}

