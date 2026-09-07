import React, { useEffect, useState } from 'react';
import { Product } from '../types';
import { AlertOctagon, ShoppingCart, X } from 'lucide-react';

interface StockBreachToastProps {
  breaches: { product: Product, eoq: number }[];
  onOpenCreatePO: (presets: Array<{productId: string, orderedQuantity: number}>) => void;
  onDismiss: (productId: string) => void;
}

export const StockBreachToast: React.FC<StockBreachToastProps> = ({ breaches, onOpenCreatePO, onDismiss }) => {
  if (breaches.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 pointer-events-none">
      {breaches.map((breach) => (
        <div 
          key={breach.product.id} 
          className="pointer-events-auto w-80 bg-white border border-amber-300 shadow-xl rounded-2xl p-3 flex flex-col gap-2 animate-in slide-in-from-right-8 fade-in duration-300"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start gap-2">
              <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                <AlertOctagon className="w-4 h-4 text-amber-700" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900">Stock Alert: {breach.product.internalId}</h4>
                <p className="text-[10px] text-slate-600 line-clamp-1">{breach.product.name}</p>
                <p className="text-[10px] text-amber-800 font-semibold mt-0.5">
                  Dropped to {breach.product.stockQuantity} (Min: {breach.product.minStockAlert})
                </p>
              </div>
            </div>
            <button 
              onClick={() => onDismiss(breach.product.id)}
              className="text-slate-400 hover:text-slate-700 transition-colors p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          
          <button
            onClick={() => {
              onOpenCreatePO([{ productId: breach.product.id, orderedQuantity: breach.eoq }]);
              onDismiss(breach.product.id);
            }}
            className="w-full mt-1 flex items-center justify-center gap-1.5 py-1.5 bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white text-xs font-bold rounded-lg shadow-sm transition-all"
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            <span>Add to PO (Order {breach.eoq} {breach.product.unit || 'pcs'})</span>
          </button>
        </div>
      ))}
    </div>
  );
};
