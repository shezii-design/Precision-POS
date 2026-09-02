import { GlobalPricingSettings, PricingTierConfig, ProductSellingPrice } from '../types';

export const DEFAULT_PRICING_SETTINGS: GlobalPricingSettings = {
  activeTierCount: 2,
  roundToNearest: 5,
  tiers: [
    { id: 'tier-wholesale', name: 'Wholesale', markupPercent: 10, isDefault: true },
    { id: 'tier-retail', name: 'Retail', markupPercent: 25, isDefault: true },
    { id: 'tier-3', name: 'Sell@15%', markupPercent: 15 },
    { id: 'tier-4', name: 'Sell@20%', markupPercent: 20 },
    { id: 'tier-5', name: 'Sell@30%', markupPercent: 30 },
  ]
};

export function formatPKR(amount: number | undefined | null, includePrefix: boolean = true): string {
  if (amount === undefined || amount === null || isNaN(amount)) return includePrefix ? 'PKR 0' : '0';
  const formatted = Math.round(amount).toLocaleString('en-PK');
  return includePrefix ? `PKR ${formatted}` : formatted;
}

export function formatPKRShort(amount: number | undefined | null): string {
  if (amount === undefined || amount === null || isNaN(amount)) return '₨ 0';
  const val = Math.round(amount);
  if (val >= 1000000) {
    return `₨ ${(val / 1000000).toFixed(2)}M`;
  }
  if (val >= 1000) {
    return `₨ ${(val / 1000).toFixed(1)}k`;
  }
  return `₨ ${val.toLocaleString('en-PK')}`;
}

export function calculateSellingPrice(
  costPrice: number,
  markupPercent: number,
  roundToNearest: number = 0
): number {
  if (!costPrice || !Number.isFinite(costPrice) || isNaN(costPrice) || costPrice <= 0) return 0;
  const safeMarkup = !Number.isFinite(markupPercent) || isNaN(markupPercent) ? 0 : markupPercent;
  const raw = costPrice * (1 + safeMarkup / 100);
  if (!Number.isFinite(raw) || isNaN(raw) || raw < 0) return 0;
  if (roundToNearest > 0 && Number.isFinite(roundToNearest)) {
    return Math.round(raw / roundToNearest) * roundToNearest;
  }
  return Math.round(raw);
}

export function generateProductSellingPrices(
  costPrice: number,
  settings: GlobalPricingSettings,
  existingPrices?: ProductSellingPrice[]
): ProductSellingPrice[] {
  const activeTiers = settings.tiers.slice(0, settings.activeTierCount);

  return activeTiers.map(tier => {
    const existing = existingPrices?.find(p => p.tierId === tier.id);
    
    // If the price was manually overridden for this specific product, preserve it unless recalculate is forced
    if (existing && existing.isOverridden) {
      return existing;
    }

    const price = calculateSellingPrice(costPrice, tier.markupPercent, settings.roundToNearest);
    return {
      tierId: tier.id,
      tierName: tier.name,
      price,
      markupPercent: tier.markupPercent,
      isOverridden: false
    };
  });
}

/**
 * Gets the standard/middle retail price for a product.
 * Falls back to retail tier, or middle tier, or cost * 1.25.
 */
export function getDefaultRetailPrice(product: { costPrice?: number; sellingPrices?: ProductSellingPrice[] }): number {
  if (!product) return 0;
  
  if (product.sellingPrices && product.sellingPrices.length > 0) {
    // 1. Look for a tier explicitly named "Retail"
    const retailTier = product.sellingPrices.find(
      p => (p?.tierName && p.tierName.toLowerCase().includes('retail')) || (p?.tierId && p.tierId.includes('retail'))
    );
    if (retailTier && retailTier.price > 0) {
      return retailTier.price;
    }

    // 2. If multiple tiers exist, take the middle or last tier
    if (product.sellingPrices.length >= 2) {
      const middleIndex = Math.floor(product.sellingPrices.length / 2);
      const tier = product.sellingPrices[middleIndex];
      if (tier && tier.price > 0) return tier.price;
    }

    // 3. Fallback to first available selling price
    if (product.sellingPrices[0]?.price > 0) {
      return product.sellingPrices[0].price;
    }
  }

  // Fallback to cost + 25%
  if (product.costPrice && product.costPrice > 0) {
    return Math.round(product.costPrice * 1.25);
  }

  return 0;
}

/**
 * Returns the list of available pricing tiers for a product.
 * If sellingPrices exists and has items, uses those. Otherwise generates from costPrice & settings.
 */
export function getProductAvailableTiers(
  product: { costPrice?: number; sellingPrices?: ProductSellingPrice[] },
  settings?: GlobalPricingSettings
): ProductSellingPrice[] {
  if (!product) return [];

  if (product.sellingPrices && product.sellingPrices.length > 0) {
    return product.sellingPrices.filter(p => p && p.price > 0);
  }

  if (product.costPrice && product.costPrice > 0) {
    if (settings) {
      return generateProductSellingPrices(product.costPrice, settings);
    }
    return [
      { tierId: 'tier-wholesale', tierName: 'Wholesale', price: Math.round(product.costPrice * 1.10), markupPercent: 10 },
      { tierId: 'tier-retail', tierName: 'Retail', price: Math.round(product.costPrice * 1.25), markupPercent: 25 },
    ];
  }

  return [];
}

export interface TierTheme {
  type: 'wholesale' | 'retail';
  tierLevel: number;
  textColor: string;
  textColorDark: string;
  badgeBg: string;
  badgeText: string;
  cardBg: string;
  border: string;
  markupBadge: string;
  dotColor: string;
  hex: string;
  label: string;
}

/**
 * Returns distinct styling for inventory price tiers:
 * - Wholesale: Yellow / Amber
 * - Retail Tiers: Progressive Green shades based on tier level / markup percentage
 */
export function getTierTheme(
  tierNameOrSp: string | ProductSellingPrice,
  tierIndex: number = 0,
  totalTiers: number = 2
): TierTheme {
  const name = typeof tierNameOrSp === 'string' ? tierNameOrSp : (tierNameOrSp?.tierName || '');
  const tierId = typeof tierNameOrSp === 'object' ? (tierNameOrSp?.tierId || '') : '';
  const markup = typeof tierNameOrSp === 'object' ? tierNameOrSp?.markupPercent : undefined;
  const lower = name.toLowerCase();
  const lowerId = tierId.toLowerCase();

  const isWholesale = lower.includes('wholesale') || lowerId.includes('wholesale') || (tierIndex === 0 && lower.startsWith('whole'));

  if (isWholesale) {
    return {
      type: 'wholesale',
      tierLevel: 0,
      textColor: 'text-amber-600',
      textColorDark: 'text-amber-700',
      badgeBg: 'bg-amber-100/90',
      badgeText: 'text-amber-900',
      cardBg: 'bg-amber-50/80',
      border: 'border-amber-200 hover:border-amber-300',
      markupBadge: 'bg-amber-100 text-amber-800 font-extrabold',
      dotColor: 'bg-amber-500',
      hex: '#d97706',
      label: 'Wholesale'
    };
  }

  // Calculate retail tier step
  // If we have markup, we can gauge level, or use tierIndex (index 1 is retail 1, index 2 is retail 2, etc.)
  let retailLevel = Math.max(1, tierIndex);
  if (markup !== undefined) {
    if (markup <= 18) retailLevel = 1;
    else if (markup <= 26) retailLevel = 2;
    else if (markup <= 35) retailLevel = 3;
    else retailLevel = 4;
  }

  if (retailLevel === 1) {
    // Fresh Light Emerald Green
    return {
      type: 'retail',
      tierLevel: 1,
      textColor: 'text-emerald-500',
      textColorDark: 'text-emerald-600',
      badgeBg: 'bg-emerald-50',
      badgeText: 'text-emerald-800',
      cardBg: 'bg-emerald-50/40',
      border: 'border-emerald-200 hover:border-emerald-300',
      markupBadge: 'bg-emerald-100/80 text-emerald-700 font-extrabold',
      dotColor: 'bg-emerald-400',
      hex: '#10b981',
      label: 'Retail T1'
    };
  }

  if (retailLevel === 2) {
    // Medium Vibrant Emerald Green
    return {
      type: 'retail',
      tierLevel: 2,
      textColor: 'text-emerald-700',
      textColorDark: 'text-emerald-800',
      badgeBg: 'bg-emerald-100',
      badgeText: 'text-emerald-900',
      cardBg: 'bg-emerald-50/80',
      border: 'border-emerald-300 hover:border-emerald-400',
      markupBadge: 'bg-emerald-100 text-emerald-800 font-extrabold',
      dotColor: 'bg-emerald-600',
      hex: '#059669',
      label: 'Retail T2'
    };
  }

  if (retailLevel === 3) {
    // Rich Deep Green
    return {
      type: 'retail',
      tierLevel: 3,
      textColor: 'text-green-700',
      textColorDark: 'text-green-800',
      badgeBg: 'bg-green-100',
      badgeText: 'text-green-900',
      cardBg: 'bg-green-50/90',
      border: 'border-green-300 hover:border-green-400',
      markupBadge: 'bg-green-100 text-green-800 font-extrabold',
      dotColor: 'bg-green-600',
      hex: '#15803d',
      label: 'Retail T3'
    };
  }

  // Highest Tier: Deep Intense Forest Green
  return {
    type: 'retail',
    tierLevel: 4,
    textColor: 'text-green-900',
    textColorDark: 'text-green-950',
    badgeBg: 'bg-green-200',
    badgeText: 'text-green-950',
    cardBg: 'bg-green-100/70',
    border: 'border-green-400 hover:border-green-500',
    markupBadge: 'bg-green-200 text-green-950 font-black',
    dotColor: 'bg-green-800',
    hex: '#14532d',
    label: 'Retail T4+'
  };
}


