import React, { useState } from 'react';
import { GlobalPricingSettings, PricingTierConfig } from '../types';
import { calculateSellingPrice, formatPKR, getTierTheme } from '../services/pricing';
import { X, Plus, Trash2, CheckCircle2, Calculator, Sparkles, RefreshCw } from 'lucide-react';

interface PricingFormulaModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: GlobalPricingSettings;
  onSave: (newSettings: GlobalPricingSettings, recalculateAll: boolean) => void;
}

export const PricingFormulaModal: React.FC<PricingFormulaModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSave,
}) => {
  const [activeTierCount, setActiveTierCount] = useState<number>(settings.activeTierCount || 2);
  const [roundToNearest, setRoundToNearest] = useState<number>(settings.roundToNearest || 5);
  const [tiers, setTiers] = useState<PricingTierConfig[]>(() => {
    // Ensure we have 5 tiers available in state
    const current = [...settings.tiers];
    while (current.length < 5) {
      const idx = current.length + 1;
      current.push({
        id: `tier-${idx}`,
        name: `Sell@${idx * 5 + 10}%`,
        markupPercent: idx * 5 + 10,
      });
    }
    return current;
  });

  const [sampleCost, setSampleCost] = useState<number>(2000);
  const [recalculateAll, setRecalculateAll] = useState<boolean>(true);

  if (!isOpen) return null;

  const handleTierNameChange = (index: number, name: string) => {
    const next = [...tiers];
    next[index] = { ...next[index], name };
    setTiers(next);
  };

  const handleTierMarkupChange = (index: number, markupPercent: number) => {
    const next = [...tiers];
    next[index] = { ...next[index], markupPercent: isNaN(markupPercent) ? 0 : markupPercent };
    setTiers(next);
  };

  const handleSave = () => {
    onSave(
      {
        activeTierCount,
        tiers: tiers.slice(0, 5),
        roundToNearest,
      },
      recalculateAll
    );
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-red-100 w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-2 sm:my-8">
        {/* Header */}
        <div className="bg-gradient-to-r from-red-600 to-red-700 px-4 sm:px-6 py-3.5 sm:py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white/15 backdrop-blur-md flex items-center justify-center font-bold text-base sm:text-lg border border-white/20 shrink-0">
              ₨
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-xl font-bold text-white tracking-tight truncate">PKR Pricing Formulas</h2>
              <p className="text-[10px] sm:text-xs text-red-100 truncate">Configure profit markups & selling formulas</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white p-1.5 sm:p-2 rounded-lg hover:bg-white/10 transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Active Tiers Count Selector */}
          <div className="bg-red-50/70 border border-red-100 rounded-xl p-3 sm:p-4">
            <label className="block text-xs sm:text-sm font-semibold text-red-950 mb-2">
              Number of Active Selling Price Tiers (2 to 5)
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[2, 3, 4, 5].map((count) => (
                <button
                  key={count}
                  type="button"
                  onClick={() => setActiveTierCount(count)}
                  className={`py-2 px-2.5 rounded-lg text-xs sm:text-sm font-bold border transition-all ${
                    activeTierCount === count
                      ? 'bg-red-600 text-white border-red-600 shadow-sm'
                      : 'bg-white text-slate-700 border-slate-200 hover:border-red-300'
                  }`}
                >
                  {count} Tiers {count === 2 ? '(Wholesale & Retail)' : ''}
                </button>
              ))}
            </div>
          </div>

          {/* Pricing Tiers Table */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <h3 className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-2">
                <Calculator className="w-4 h-4 text-red-600" />
                Selling Price Tier Formulas
              </h3>
              <span className="text-[11px] sm:text-xs text-slate-500 font-mono">Formula: Cost × (1 + Profit% / 100)</span>
            </div>

            <div className="space-y-3">
              {tiers.slice(0, activeTierCount).map((tier, index) => {
                const calculatedSample = calculateSellingPrice(sampleCost, tier.markupPercent, roundToNearest);
                const theme = getTierTheme(tier.name, index, activeTierCount);
                return (
                  <div
                    key={tier.id || index}
                    className={`p-3 sm:p-3.5 rounded-xl border transition-colors flex flex-col sm:grid sm:grid-cols-12 gap-2.5 sm:gap-3 sm:items-center ${theme.cardBg} ${theme.border}`}
                  >
                    <div className="flex items-center justify-between sm:justify-center sm:col-span-1">
                      <div className="flex items-center gap-1.5 font-black text-xs text-slate-500">
                        <span className={`w-2.5 h-2.5 rounded-full ${theme.dotColor}`}></span>
                        <span>#{index + 1}</span>
                      </div>
                      <div className="sm:hidden text-right">
                        <span className={`inline-block px-2 py-0.5 bg-white border rounded-md font-mono font-black text-xs shadow-2xs ${theme.border} ${theme.textColor}`}>
                          {formatPKR(calculatedSample)}
                        </span>
                      </div>
                    </div>

                    {/* Tier Name */}
                    <div className="sm:col-span-5">
                      <label className="block text-[10px] sm:text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                        Tier Name ({theme.type === 'wholesale' ? 'Yellow' : 'Green'})
                      </label>
                      <input
                        type="text"
                        value={tier.name}
                        onChange={(e) => handleTierNameChange(index, e.target.value)}
                        placeholder="e.g. Wholesale, Retail, Sell@20%"
                        className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs sm:text-sm font-bold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                      />
                    </div>

                    {/* Markup Percent */}
                    <div className="sm:col-span-3">
                      <label className="block text-[10px] sm:text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                        Profit %
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          step="0.5"
                          min="0"
                          value={tier.markupPercent}
                          onChange={(e) => handleTierMarkupChange(index, parseFloat(e.target.value))}
                          className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs sm:text-sm font-bold text-red-600 focus:outline-hidden focus:ring-2 focus:ring-red-500/20 focus:border-red-500 pr-7"
                        />
                        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                          %
                        </span>
                      </div>
                    </div>

                    {/* Live Preview (Desktop) */}
                    <div className="hidden sm:block sm:col-span-3 text-right">
                      <span className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                        Sample Result
                      </span>
                      <span className={`inline-block px-2.5 py-1 bg-white border rounded-md font-mono font-black text-sm shadow-2xs ${theme.border} ${theme.textColor}`}>
                        {formatPKR(calculatedSample)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Interactive Calculator Simulation & Rounding */}
          <div className="bg-slate-900 text-white rounded-xl p-3.5 sm:p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-red-400">
                <Sparkles className="w-4 h-4" />
                Live Formula Simulator
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-300">
                <span>Rounding:</span>
                <select
                  value={roundToNearest}
                  onChange={(e) => setRoundToNearest(Number(e.target.value))}
                  className="bg-slate-800 text-white text-xs px-2 py-1 rounded border border-slate-700 focus:outline-hidden"
                >
                  <option value={0}>Exact (No Rounding)</option>
                  <option value={5}>Nearest ₨ 5</option>
                  <option value={10}>Nearest ₨ 10</option>
                  <option value={50}>Nearest ₨ 50</option>
                  <option value={100}>Nearest ₨ 100</option>
                </select>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
              <span className="text-xs text-slate-300 whitespace-nowrap">Simulate Cost Price:</span>
              <div className="relative flex-1">
                <input
                  type="number"
                  value={sampleCost}
                  onChange={(e) => setSampleCost(Number(e.target.value))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm font-bold text-white pl-8 focus:outline-hidden focus:border-red-500"
                />
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-bold">₨</span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1 border-t border-slate-800">
              {tiers.slice(0, activeTierCount).map((tier) => (
                <div key={tier.id} className="bg-slate-800/80 p-2 rounded-lg border border-slate-700/50">
                  <div className="text-[10px] text-slate-400 truncate font-medium">{tier.name} ({tier.markupPercent}%)</div>
                  <div className="text-xs font-bold text-red-300">
                    {formatPKR(calculateSellingPrice(sampleCost, tier.markupPercent, roundToNearest))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Option to recalculate existing inventory */}
          <label className="flex items-start gap-3 p-3 sm:p-3.5 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-100/70 transition-colors">
            <input
              type="checkbox"
              checked={recalculateAll}
              onChange={(e) => setRecalculateAll(e.target.checked)}
              className="mt-0.5 w-4 h-4 text-red-600 rounded border-slate-300 focus:ring-red-500 shrink-0"
            />
            <div className="text-xs text-slate-700">
              <span className="font-bold text-slate-900 block mb-0.5">Recalculate all existing inventory items</span>
              Update selling prices for all items based on their current cost prices (excluding manually locked overrides).
            </div>
          </label>
        </div>

        {/* Footer */}
        <div className="px-4 sm:px-6 py-3.5 sm:py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs sm:text-sm font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-300 rounded-xl hover:bg-slate-100 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-5 py-2 text-xs sm:text-sm font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-md hover:shadow-lg transition-all flex items-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4" />
            Save & Apply
          </button>
        </div>
      </div>
    </div>
  );
};
