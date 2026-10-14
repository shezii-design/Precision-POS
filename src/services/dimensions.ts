import { DimensionUnit, Product } from '../types';

export const INCH_TO_MM = 25.4;

export function inchToMm(valInInches: number | undefined): number | undefined {
  if (valInInches === undefined || isNaN(valInInches)) return undefined;
  return Number((valInInches * INCH_TO_MM).toFixed(2));
}

export function mmToInch(valInMm: number | undefined): number | undefined {
  if (valInMm === undefined || isNaN(valInMm)) return undefined;
  return Number((valInMm / INCH_TO_MM).toFixed(4));
}

export function formatDimension(valInInches: number | undefined, targetUnit: DimensionUnit): string {
  if (valInInches === undefined || isNaN(valInInches)) return '';
  if (targetUnit === 'mm') {
    const mm = valInInches * INCH_TO_MM;
    return `${Number(mm.toFixed(1))} mm`;
  }
  return `${Number(valInInches.toFixed(2))}"`;
}

export interface DimensionRange {
  min?: number;
  max?: number;
}

export interface ParsedDimensionQuery {
  height?: DimensionRange;
  outerDia?: DimensionRange;
  innerDia?: DimensionRange;
  rawInput: string;
  unit: DimensionUnit;
}

/**
 * Parses queries like "10.5x8.2x6", "10-12 x 5-8 x 2-4", "150*75*20", "10.5x8.2"
 */
export function parseDimensionQuery(input: string, unit: DimensionUnit): ParsedDimensionQuery | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const parts = trimmed.split(/[\s*xX×,]+/);
  const ranges: DimensionRange[] = [];
  for (const p of parts) {
    const range = parseDimensionToken(p);
    if (range) {
      ranges.push(range);
    }
  }

  if (ranges.length === 0) return null;

  return {
    height: ranges[0],
    outerDia: ranges[1],
    innerDia: ranges[2],
    rawInput: trimmed,
    unit
  };
}

function parseDimensionToken(token: string): DimensionRange | undefined {
  const trimmed = token.trim();
  if (!trimmed) return undefined;

  if (trimmed.includes('-') || trimmed.includes('..')) {
    const sep = trimmed.includes('..') ? '..' : '-';
    const subParts = trimmed.split(sep).map(s => s.trim());
    const minVal = subParts[0] ? parseFloat(subParts[0]) : undefined;
    const maxVal = subParts[1] ? parseFloat(subParts[1]) : undefined;

    const min = minVal !== undefined && !isNaN(minVal) ? minVal : undefined;
    const max = maxVal !== undefined && !isNaN(maxVal) ? maxVal : undefined;

    if (min === undefined && max === undefined) return undefined;
    return { min, max };
  }

  const val = parseFloat(trimmed);
  if (isNaN(val)) return undefined;
  return { min: val, max: val };
}

export function matchesDimensionRange(
  prodVal: number | undefined,
  range: DimensionRange | undefined,
  targetMultiplier: number,
  tolerance: number
): boolean {
  if (!range) return true;
  if (prodVal === undefined) return false;

  const convertedProdVal = prodVal * targetMultiplier;

  if (range.min !== undefined && range.max !== undefined && range.min === range.max) {
    return Math.abs(convertedProdVal - range.min) <= tolerance;
  }

  if (range.min !== undefined && convertedProdVal < range.min - tolerance) {
    return false;
  }
  if (range.max !== undefined && convertedProdVal > range.max + tolerance) {
    return false;
  }

  return true;
}

/**
 * Checks if a product matches a parsed dimension query or range.
 */
export function matchesDimensionQuery(
  product: Product,
  query: ParsedDimensionQuery | null
): boolean {
  if (!query) return true;
  const dims = product.dimensions;
  if (!dims) return false;

  const targetMultiplier = query.unit === 'mm' ? INCH_TO_MM : 1;
  const tolerance = query.unit === 'mm' ? 2.5 : 0.08;

  const prodH = dims.height !== undefined ? dims.height * targetMultiplier : undefined;
  const prodOD = dims.outerDia !== undefined ? dims.outerDia * targetMultiplier : undefined;
  const prodID = dims.innerDia !== undefined ? dims.innerDia * targetMultiplier : undefined;

  if (!matchesDimensionRange(prodH, query.height, targetMultiplier, tolerance)) return false;
  if (!matchesDimensionRange(prodOD, query.outerDia, targetMultiplier, tolerance)) return false;
  if (!matchesDimensionRange(prodID, query.innerDia, targetMultiplier, tolerance)) return false;

  return true;
}
