import React, { useState } from 'react';
import { DimensionUnit } from '../types';
import { parseDimensionQuery, ParsedDimensionQuery } from '../services/dimensions';
import { Ruler, X, HelpCircle, ArrowRightLeft } from 'lucide-react';

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

  const handleInputChange = (val: string) => {
    setInputValue(val);
    const parsed = parseDimensionQuery(val, currentUnit);
    onDimensionQueryChange(parsed);
  };

  const handleUnitToggle = (newUnit: DimensionUnit) => {
    onUnitChange(newUnit);
    const parsed = parseDimensionQuery(inputValue, newUnit);
    onDimensionQueryChange(parsed);
  };

  const handleClear = () => {
    setInputValue('');
    onDimensionQueryChange(null);
  };

  const parsedPreview = parseDimensionQuery(inputValue, currentUnit);

  return (
    <div className="space-y-2">
      <div className="flex flex-col xs:flex-row items-stretch xs:items-center gap-2">
        {/* Input container */}
        <div className="relative flex-1 group min-w-0">
          <div className="absolute left-3.5 top-1/2 -translate-y-1/2 flex items-center gap-1 text-slate-400 group-focus-within:text-red-600 transition-colors pointer-events-none">
            <Ruler className="w-4 h-4" />
          </div>

          <input
            ref={inputRef as any}
            type="text"
            value={inputValue}
            onChange={(e) => handleInputChange(e.target.value)}
            placeholder={
              currentUnit === 'inch'
                ? 'Size: e.g. 7.85x3.75x3.15 (H x OD x ID in)'
                : 'Size: e.g. 199.4x95.3 (H x OD x ID mm)'
            }
            className="w-full pl-10 pr-20 sm:pr-28 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-red-500/20 focus:border-red-600 transition-all shadow-2xs"
          />

          <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {inputValue && (
              <button
                type="button"
                onClick={handleClear}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-100"
                title="Clear size query"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}

            <button
              type="button"
              onClick={() => setShowHelp(!showHelp)}
              className="text-slate-400 hover:text-red-600 p-1 rounded-md hover:bg-slate-100"
              title="How size search works"
            >
              <HelpCircle className="w-3.5 h-3.5" />
            </button>

            <kbd 
              className="hidden md:inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono font-bold bg-slate-100 text-slate-500 border border-slate-200 rounded shadow-2xs select-none"
              title="Keyboard shortcut: Ctrl + E"
            >
              Ctrl+E
            </kbd>
          </div>
        </div>

        {/* Unit Selector Switch */}
        <div className="flex items-center justify-center bg-slate-100 p-0.5 rounded-xl border border-slate-300 shrink-0 self-auto">
          <button
            type="button"
            onClick={() => handleUnitToggle('inch')}
            className={`flex-1 xs:flex-initial px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition-all text-center ${
              currentUnit === 'inch'
                ? 'bg-red-600 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Inch (in)
          </button>
          <button
            type="button"
            onClick={() => handleUnitToggle('mm')}
            className={`flex-1 xs:flex-initial px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition-all text-center ${
              currentUnit === 'mm'
                ? 'bg-red-600 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            mm (Metric)
          </button>
        </div>
      </div>

      {/* Active parsing feedback badge */}
      {parsedPreview && (
        <div className="flex flex-wrap items-center gap-2 text-xs bg-red-50/80 border border-red-200 px-3 py-1.5 rounded-lg text-red-950 font-medium animate-in fade-in">
          <span className="font-bold text-red-700">Parsed Size Target:</span>
          {parsedPreview.height !== undefined && (
            <span className="bg-white px-2 py-0.5 rounded border border-red-200 text-slate-800">
              Height (H): <strong>{parsedPreview.height} {currentUnit}</strong>
            </span>
          )}
          {parsedPreview.outerDia !== undefined && (
            <span className="bg-white px-2 py-0.5 rounded border border-red-200 text-slate-800">
              OD / Length: <strong>{parsedPreview.outerDia} {currentUnit}</strong>
            </span>
          )}
          {parsedPreview.innerDia !== undefined && (
            <span className="bg-white px-2 py-0.5 rounded border border-red-200 text-slate-800">
              ID / Width: <strong>{parsedPreview.innerDia} {currentUnit}</strong>
            </span>
          )}
          <span className="text-[11px] text-red-600/80 ml-auto">
            (Exclusive of Gasket dimensions)
          </span>
        </div>
      )}

      {/* Help explanation banner */}
      {showHelp && (
        <div className="p-3 bg-slate-900 text-slate-200 rounded-xl text-xs space-y-1.5 border border-slate-800 animate-in fade-in">
          <div className="flex items-center justify-between text-white font-bold">
            <span className="flex items-center gap-1.5 text-red-400">
              <Ruler className="w-3.5 h-3.5" />
              Advanced Dimension Search Format
            </span>
            <button onClick={() => setShowHelp(false)} className="text-slate-400 hover:text-white">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <p className="text-[11px] text-slate-300">
            Type dimensions separated by <code className="bg-slate-800 px-1 py-0.5 rounded text-amber-300">x</code>, <code className="bg-slate-800 px-1 py-0.5 rounded text-amber-300">*</code>, or spaces.
          </p>
          <ul className="text-[11px] list-disc list-inside space-y-0.5 text-slate-300">
            <li><strong>1st value</strong>: Height (H)</li>
            <li><strong>2nd value</strong>: Outer Diameter (OD) or Length</li>
            <li><strong>3rd value</strong>: Inner Diameter (ID) or Width (optional)</li>
          </ul>
          <p className="text-[10px] text-slate-400 pt-1 border-t border-slate-800">
            Example: <span className="text-white font-mono">10.5x8.2x6</span> or <span className="text-white font-mono">150*75</span>. Gasket sizes and thread are excluded from this query.
          </p>
        </div>
      )}
    </div>
  );
};
