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

export interface ParsedDimensionQuery {
  height?: number;
  outerDia?: number;
  innerDia?: number;
  rawInput: string;
  unit: DimensionUnit;
}

/**
 * Parses queries like "10.5x8.2x6", "10.5 x 8.2 x 6", "150*75*20", "150 75 20", "10.5x8.2"
 * 1st number = Height (H)
 * 2nd number = Outer Dia (OD) / Length
 * 3rd number = Inner Dia (ID) / Width (optional)
 */
export function parseDimensionQuery(input: string, unit: DimensionUnit): ParsedDimensionQuery | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  // Split by x, X, *, or spaces
  const parts = trimmed
    .split(/[\s*xX×,]+/)
    .map(p => parseFloat(p.trim()))
    .filter(n => !isNaN(n) && n > 0);

  if (parts.length === 0) return null;

  return {
    height: parts[0],
    outerDia: parts[1],
    innerDia: parts[2],
    rawInput: trimmed,
    unit
  };
}

/**
 * Checks if a product matches a parsed dimension query.
 * Excludes gasket sizes from this check as requested.
 * Tolerance: ~0.08 inches (~2mm) for approximate matches.
 */
export function matchesDimensionQuery(
  product: Product,
  query: ParsedDimensionQuery | null
): boolean {
  if (!query) return true;
  const dims = product.dimensions;
  if (!dims) return false;

  // Convert product dimensions (stored in inches) to query's unit
  const targetMultiplier = query.unit === 'mm' ? INCH_TO_MM : 1;
  const tolerance = query.unit === 'mm' ? 2.5 : 0.08;

  const prodH = dims.height !== undefined ? dims.height * targetMultiplier : undefined;
  const prodOD = dims.outerDia !== undefined ? dims.outerDia * targetMultiplier : undefined;
  const prodID = dims.innerDia !== undefined ? dims.innerDia * targetMultiplier : undefined;

  // Height check
  if (query.height !== undefined) {
    if (prodH === undefined) return false;
    if (Math.abs(prodH - query.height) > tolerance) return false;
  }

  // OD / Length check
  if (query.outerDia !== undefined) {
    if (prodOD === undefined) return false;
    if (Math.abs(prodOD - query.outerDia) > tolerance) return false;
  }

  // ID / Width check (if provided in search)
  if (query.innerDia !== undefined) {
    if (prodID === undefined) return false;
    if (Math.abs(prodID - query.innerDia) > tolerance) return false;
  }

  return true;
}
