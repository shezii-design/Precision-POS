import React, { useState } from 'react';
import { DimensionUnit } from '../types';
import { parseDimensionQuery, ParsedDimensionQuery } from '../services/dimensions';
import { Ruler, X, HelpCircle, SlidersHorizontal, Check } from 'lucide-react';

interface DimensionSearchBarProps {
  onDimensionQueryChange: (query: ParsedDimensionQuery | null) => void;
  currentUnit: DimensionUnit;
  onUnitChange: (unit: DimensionUnit) => void;
  inputRef?: React.RefObject<HTMLInputElement | null>;
}

export const DimensionSearchBar: React.FC<DimensionSearchBarProps> = ({
  onDimensionQueryChange,
  currentUnit,
  onUnitChange,
  inputRef,
}) => {
  const [inputValue, setInputValue] = useState<string>('');
  const [showHelp, setShowHelp] = useState<boolean>(false);
  const [showRangePanel, setShowRangePanel] = useState<boolean>(false);

  // Range panel state
  const [minH, setMinH] = useState<string>('');
  const [maxH, setMaxH] = useState<string>('');
  const [minOD, setMinOD] = useState<string>('');
  const [maxOD, setMaxOD] = useState<string>('');
  const [minID, setMinID] = useState<string>('');
  const [maxID, setMaxID] = useState<string>('');

  const handleInputChange = (val: string) => {
    setInputValue(val);
    const parsed = parseDimensionQuery(val, currentUnit);
    onDimensionQueryChange(parsed);
  };

  const handleUnitToggle = (newUnit: DimensionUnit) => {
    onUnitChange(newUnit);
    if (showRangePanel) {
      applyRangeQuery(newUnit);
    } else {
      const parsed = parseDimensionQuery(inputValue, newUnit);
      onDimensionQueryChange(parsed);
    }
  };

  const handleClear = () => {
    setInputValue('');
    setMinH('');
    setMaxH('');
    setMinOD('');
    setMaxOD('');
    setMinID('');
    setMaxID('');
    onDimensionQueryChange(null);
  };

  const applyRangeQuery = (unit = currentUnit) => {
    const hStr = minH || maxH ? `${minH || ''}-${maxH || ''}` : '';
    const odStr = minOD || maxOD ? `${minOD || ''}-${maxOD || ''}` : '';
    const idStr = minID || maxID ? `${minID || ''}-${maxID || ''}` : '';

    const parts = [hStr, odStr, idStr].filter(Boolean);
    const combined = parts.join(' x ');
    setInputValue(combined);
    const parsed = parseDimensionQuery(combined, unit);
    onDimensionQueryChange(parsed);
    setShowRangePanel(false);
  };

  const parsedPreview = parseDimensionQuery(inputValue, currentUnit);

  return (
    <div className="space-y-2">
      <div className="flex flex-col xs:flex-row items-stretch xs:items-center gap-2">
        {/* Input container */}
        <div className="relative flex-1 group min-w-0">
          <div className="absolute left-3.5 top-1/2 -translate-y-1/2 flex items-center gap-1 text-slate-500 group-focus-within:text-red-600 transition-colors pointer-events-none">
            <Ruler className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>

          <input
            ref={inputRef as any}
            type="text"
            value={inputValue}
            onChange={(e) => handleInputChange(e.target.value)}
            placeholder={
              currentUnit === 'inch'
                ? 'Size or Range: e.g. 7-8 x 3-4 (H x OD in)'
                : 'Size or Range: e.g. 150-200 x 80-100 (H x OD mm)'
            }
            className="w-full pl-10 sm:pl-11 pr-28 sm:pr-36 py-2.5 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm font-bold text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-red-500/20 focus:border-red-600 transition-all shadow-sm"
          />

          <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
            <button
              type="button"
              onClick={() => setShowRangePanel(!showRangePanel)}
              className={`px-2 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer ${
                showRangePanel
                  ? 'bg-red-600 text-white shadow-xs'
                  : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
              }`}
              title="Set Min-Max Range for dimensions"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Range</span>
            </button>

            {inputValue && (
              <button
                type="button"
                onClick={handleClear}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-200 cursor-pointer"
                title="Clear size query"
              >
                <X className="w-4 h-4" />
              </button>
            )}

            <button
              type="button"
              onClick={() => setShowHelp(!showHelp)}
              className="text-slate-400 hover:text-red-600 p-1.5 rounded-md hover:bg-slate-200 cursor-pointer"
              title="How size search works"
            >
              <HelpCircle className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Unit Selector Switch */}
        <div className="flex items-center justify-center bg-slate-200 p-0.5 rounded-xl border border-slate-300 shrink-0 self-auto">
          <button
            type="button"
            onClick={() => handleUnitToggle('inch')}
            className={`flex-1 xs:flex-initial px-3 sm:px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-extrabold transition-all text-center cursor-pointer ${
              currentUnit === 'inch'
                ? 'bg-red-600 text-white shadow-sm'
                : 'text-slate-700 hover:text-slate-900'
            }`}
          >
            Inch (in)
          </button>
          <button
            type="button"
            onClick={() => handleUnitToggle('mm')}
            className={`flex-1 xs:flex-initial px-3 sm:px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-extrabold transition-all text-center cursor-pointer ${
              currentUnit === 'mm'
                ? 'bg-red-600 text-white shadow-sm'
                : 'text-slate-700 hover:text-slate-900'
            }`}
          >
            mm (Metric)
          </button>
        </div>
      </div>

      {/* Range Panel Popup */}
      {showRangePanel && (
        <div className="bg-white border-2 border-red-200 rounded-2xl p-4 shadow-xl space-y-3 animate-in fade-in">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
            <span className="text-xs font-black uppercase text-slate-900 flex items-center gap-1.5">
              <SlidersHorizontal className="w-4 h-4 text-red-600" />
              Set Dimension Range ({currentUnit === 'inch' ? 'Inches' : 'mm'})
            </span>
            <button
              onClick={() => setShowRangePanel(false)}
              className="text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            {/* Height Range */}
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1.5">
              <span className="font-bold text-slate-700 block">Height (H)</span>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  step="any"
                  placeholder="Min"
                  value={minH}
                  onChange={(e) => setMinH(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800"
                />
                <span className="text-slate-400 font-bold">to</span>
                <input
                  type="number"
                  step="any"
                  placeholder="Max"
                  value={maxH}
                  onChange={(e) => setMaxH(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800"
                />
              </div>
            </div>

            {/* OD Range */}
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1.5">
              <span className="font-bold text-slate-700 block">Outer Dia (OD) / Length</span>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  step="any"
                  placeholder="Min"
                  value={minOD}
                  onChange={(e) => setMinOD(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800"
                />
                <span className="text-slate-400 font-bold">to</span>
                <input
                  type="number"
                  step="any"
                  placeholder="Max"
                  value={maxOD}
                  onChange={(e) => setMaxOD(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800"
                />
              </div>
            </div>

            {/* ID Range */}
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1.5">
              <span className="font-bold text-slate-700 block">Inner Dia (ID) / Width</span>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  step="any"
                  placeholder="Min"
                  value={minID}
                  onChange={(e) => setMinID(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800"
                />
                <span className="text-slate-400 font-bold">to</span>
                <input
                  type="number"
                  step="any"
                  placeholder="Max"
                  value={maxID}
                  onChange={(e) => setMaxID(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
            <button
              type="button"
              onClick={handleClear}
              className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              Clear Ranges
            </button>
            <button
              type="button"
              onClick={() => applyRangeQuery()}
              className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              Apply Range Filter
            </button>
          </div>
        </div>
      )}

      {/* Active parsing feedback badge */}
      {parsedPreview && (
        <div className="flex flex-wrap items-center gap-2 text-xs bg-red-50/80 border border-red-200 px-3 py-1.5 rounded-lg text-red-950 font-medium animate-in fade-in">
          <span className="font-bold text-red-700">Active Size Filter:</span>
          {parsedPreview.height !== undefined && (
            <span className="bg-white px-2 py-0.5 rounded border border-red-200 text-slate-800">
              Height (H): <strong>
                {parsedPreview.height.min !== undefined && parsedPreview.height.max !== undefined && parsedPreview.height.min !== parsedPreview.height.max
                  ? `${parsedPreview.height.min} - ${parsedPreview.height.max}`
                  : parsedPreview.height.min ?? parsedPreview.height.max} {currentUnit}
              </strong>
            </span>
          )}
          {parsedPreview.outerDia !== undefined && (
            <span className="bg-white px-2 py-0.5 rounded border border-red-200 text-slate-800">
              OD: <strong>
                {parsedPreview.outerDia.min !== undefined && parsedPreview.outerDia.max !== undefined && parsedPreview.outerDia.min !== parsedPreview.outerDia.max
                  ? `${parsedPreview.outerDia.min} - ${parsedPreview.outerDia.max}`
                  : parsedPreview.outerDia.min ?? parsedPreview.outerDia.max} {currentUnit}
              </strong>
            </span>
          )}
          {parsedPreview.innerDia !== undefined && (
            <span className="bg-white px-2 py-0.5 rounded border border-red-200 text-slate-800">
              ID: <strong>
                {parsedPreview.innerDia.min !== undefined && parsedPreview.innerDia.max !== undefined && parsedPreview.innerDia.min !== parsedPreview.innerDia.max
                  ? `${parsedPreview.innerDia.min} - ${parsedPreview.innerDia.max}`
                  : parsedPreview.innerDia.min ?? parsedPreview.innerDia.max} {currentUnit}
              </strong>
            </span>
          )}
          <span className="text-[11px] text-red-600/80 ml-auto">
            (Range Matcher Active)
          </span>
        </div>
      )}

      {/* Help explanation banner */}
      {showHelp && (
        <div className="p-3 bg-slate-900 text-slate-200 rounded-xl text-xs space-y-1.5 border border-slate-800 animate-in fade-in">
          <div className="flex items-center justify-between text-white font-bold">
            <span className="flex items-center gap-1.5 text-red-400">
              <Ruler className="w-3.5 h-3.5" />
              Dimension Range Search Format
            </span>
            <button onClick={() => setShowHelp(false)} className="text-slate-400 hover:text-white">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <p className="text-[11px] text-slate-300">
            You can type exact values or ranges separated by <code className="bg-slate-800 px-1 py-0.5 rounded text-amber-300">x</code>, or use the <strong>Range</strong> button above to set min-max for each dimension.
          </p>
          <ul className="text-[11px] list-disc list-inside space-y-0.5 text-slate-300">
            <li><strong>Range Format</strong>: e.g. <code className="text-amber-300 font-mono">7-8 x 3-5</code> (Height min-max x OD min-max)</li>
            <li><strong>Exact Format</strong>: e.g. <code className="text-amber-300 font-mono">10.5 x 8.2 x 6</code></li>
          </ul>
        </div>
      )}
    </div>
  );
};
