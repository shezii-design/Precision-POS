import React, { useState } from 'react';
import { Product, StockLog } from '../types';
import { 
  X, 
  Box, 
  Plus, 
  Minus, 
  Check, 
  ArrowUpRight, 
  ArrowDownRight, 
  RotateCcw 
} from 'lucide-react';

interface StockAdjustModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
  onSaveStock: (productId: string, newStock: number, log: StockLog) => void;
}

export const StockAdjustModal: React.FC<StockAdjustModalProps> = ({
  isOpen,
  onClose,
  product,
  onSaveStock,
}) => {
  const [adjustmentAmount, setAdjustmentAmount] = useState<number>(1);
  const [adjustmentType, setAdjustmentType] = useState<'add' | 'remove' | 'set'>('add');
  const [reason, setReason] = useState<StockLog['reason']>('Received Stock');
  const [notes, setNotes] = useState<string>('');

  const calculateNewStock = (): number => {
    if (!product) return 0;
    if (adjustmentType === 'add') {
      return product.stockQuantity + adjustmentAmount;
    } else if (adjustmentType === 'remove') {
      return Math.max(0, product.stockQuantity - adjustmentAmount);
    } else {
      return Math.max(0, adjustmentAmount);
    }
  };

  const newStock = calculateNewStock();
  const stockDifference = product ? newStock - product.stockQuantity : 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!product) return;
    const log: StockLog = {
      id: `log-${Date.now()}`,
      productId: product.id,
      productName: product.name,
      internalId: product.internalId,
      brandName: product.brandName,
      typeName: product.typeName,
      unit: product.unit,
      change: stockDifference,
      previousStock: product.stockQuantity,
      newStock,
      reason,
      movementType: reason === 'Initial Count' ? 'initial_count' : 'manual_adjustment',
      referenceNumber: `ADJ-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`,
      entityName: 'Store Supervisor / Manual Adjustment',
      unitRate: product.costPrice || 0,
      totalMovementValue: Math.abs(stockDifference) * (product.costPrice || 0),
      locationName: product.locationName,
      cabinNumber: product.cabinNumber,
      timestamp: new Date().toISOString(),
      notes: notes.trim() || undefined,
    };

    onSaveStock(product.id, newStock, log);
    onClose();
  };

  if (!isOpen || !product) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-3xl shadow-2xl border border-red-100 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-gradient-to-r from-red-600 to-red-700 px-4 sm:px-6 py-3.5 sm:py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white/15 backdrop-blur-md flex items-center justify-center font-bold text-white border border-white/20 shrink-0">
              <Box className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] sm:text-xs font-bold text-red-200 shrink-0">{product.internalId}</span>
                <h2 className="text-sm sm:text-lg font-bold tracking-tight truncate">{product.name}</h2>
              </div>
              <p className="text-[10px] sm:text-xs text-red-100 truncate">Adjust stock inventory level</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white p-1.5 sm:p-2 rounded-lg shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 sm:space-y-5">
          {/* Current vs New stock summary */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex items-center justify-between">
            <div className="text-center">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Current</span>
              <span className="text-xl font-extrabold text-slate-800">
                {product.stockQuantity} {product.unit}
              </span>
            </div>

            <div className="text-center">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Change</span>
              <span
                className={`text-sm font-bold ${
                  stockDifference > 0
                    ? 'text-emerald-600'
                    : stockDifference < 0
                    ? 'text-rose-600'
                    : 'text-slate-600'
                }`}
              >
                {stockDifference > 0 ? `+${stockDifference}` : stockDifference} {product.unit}
              </span>
            </div>

            <div className="text-center">
              <span className="text-[11px] font-bold text-red-600 uppercase tracking-wider block">New Stock</span>
              <span className="text-xl font-black text-red-600">
                {newStock} {product.unit}
              </span>
            </div>
          </div>

          {/* Type of adjustment button group */}
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => { setAdjustmentType('add'); setReason('Received Stock'); }}
              className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 ${
                adjustmentType === 'add'
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                  : 'bg-slate-50 text-slate-700 border-slate-200'
              }`}
            >
              <Plus className="w-3.5 h-3.5" /> Stock In
            </button>
            <button
              type="button"
              onClick={() => { setAdjustmentType('remove'); setReason('Sale'); }}
              className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 ${
                adjustmentType === 'remove'
                  ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                  : 'bg-slate-50 text-slate-700 border-slate-200'
              }`}
            >
              <Minus className="w-3.5 h-3.5" /> Stock Out
            </button>
            <button
              type="button"
              onClick={() => { setAdjustmentType('set'); setReason('Adjustment'); }}
              className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 ${
                adjustmentType === 'set'
                  ? 'bg-slate-800 text-white border-slate-800 shadow-xs'
                  : 'bg-slate-50 text-slate-700 border-slate-200'
              }`}
            >
              <RotateCcw className="w-3.5 h-3.5" /> Direct Set
            </button>
          </div>

          {/* Amount input */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              {adjustmentType === 'set' ? 'Set Exact Quantity' : 'Quantity Amount'}
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="0"
                value={adjustmentAmount}
                onChange={(e) => setAdjustmentAmount(Math.max(0, Number(e.target.value)))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:outline-hidden focus:border-red-500"
              />
              <span className="text-xs font-bold text-slate-500">{product.unit}</span>
            </div>
          </div>

          {/* Reason selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Reason for Adjustment
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value as StockLog['reason'])}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:outline-hidden focus:border-red-500"
            >
              <option value="Received Stock">Received Stock (Purchase / Shipment)</option>
              <option value="Sale">Customer Sale / Dispatch</option>
              <option value="Adjustment">Physical Inventory Audit / Correction</option>
              <option value="Damage / Return">Damage / Defect / Customer Return</option>
              <option value="Initial Count">Initial Stock Entry</option>
            </select>
          </div>

          {/* Optional note */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Notes (Optional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Invoice #1024, Bin audit"
              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-hidden focus:border-red-500"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl shadow transition-colors flex items-center justify-center gap-1.5"
            >
              <Check className="w-4 h-4" /> Save Stock
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
