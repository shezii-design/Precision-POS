const fs = require('fs');

let code = fs.readFileSync('src/components/ProductTable.tsx', 'utf-8');

// Add import
code = code.replace(
  "import { \n  Edit3,",
  "import { TableVirtuoso } from 'react-virtuoso';\nimport { \n  Edit3,"
);

// We'll replace from `<table className="w-full min-w-[920px] text-left text-xs">` down to `</table>`

const targetRegex = /<table className="w-full min-w-\[920px\] text-left text-xs">[\s\S]*?<\/table>/;

const replacement = `<TableVirtuoso
          style={{ height: '70vh' }}
          data={products}
          components={{
            Table: (props) => <table className="w-full min-w-[920px] text-left text-xs" {...props} />,
            TableHead: React.forwardRef((props, ref) => <thead className="bg-slate-100/90 text-slate-600 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200" {...props} ref={ref} />),
            TableBody: React.forwardRef((props, ref) => <tbody className="divide-y divide-slate-100" {...props} ref={ref} />)
          }}
          fixedHeaderContent={() => (
            <tr>
              <th className="py-3 px-3.5 bg-slate-100/90">ID / Name</th>
              <th className="py-3 px-3 bg-slate-100/90">Brand / Type</th>
              <th className="py-3 px-3 bg-slate-100/90">Location & Cabin</th>
              <th className="py-3 px-3 bg-slate-100/90">Stock</th>
              <th className="py-3 px-3 text-red-600 font-black bg-slate-100/90">Cost (PKR)</th>
              <th className="py-3 px-3 text-amber-600 font-black bg-slate-100/90">Wholesale (PKR)</th>
              <th className="py-3 px-3 text-emerald-700 font-black bg-slate-100/90">Retail (PKR)</th>
              <th className="py-3 px-3 bg-slate-100/90">Dimensions ({tableUnit})</th>
              <th className="py-3 px-3 bg-slate-100/90">Thread</th>
              <th className="py-3 px-3 text-right bg-slate-100/90">Actions</th>
            </tr>
          )}
          itemContent={(index, p) => {
            const dims = p.dimensions;
            const stockQty = typeof p.stockQuantity === 'number' && !isNaN(p.stockQuantity) ? p.stockQuantity : 0;
            const alertThreshold = typeof p.minStockAlert === 'number' && !isNaN(p.minStockAlert) ? p.minStockAlert : 5;
            const isOutOfStock = stockQty <= 0;
            const isLowStock = !isOutOfStock && stockQty <= alertThreshold;
            const activeTiers = (p.sellingPrices || []).slice(0, pricingSettings.activeTierCount);
            const wholesaleSp = activeTiers.find(s => s?.tierName && s.tierName.toLowerCase().includes('wholesale')) || activeTiers[0];
            const wholesale = wholesaleSp?.price || 0;
            
            // All non-wholesale / retail tiers
            const retailTiers = activeTiers.filter(s => s?.tierId !== wholesaleSp?.tierId);
            const defaultRetailSp = retailTiers.find(s => s?.tierName && s.tierName.toLowerCase().includes('retail')) || retailTiers[0] || activeTiers[1];

            return (
              <>
                  {/* ID & Name */}
                  <td className="py-3 px-3.5">
                    <div className="flex flex-col">
                      <span className="font-mono text-xs font-bold text-slate-800">
                        {p.internalId}
                      </span>
                      <span className="font-semibold text-sm text-slate-900 mt-0.5 max-w-[200px] truncate" title={p.name}>
                        {p.name}
                      </span>
                    </div>
                  </td>

                  {/* Brand & Type */}
                  <td className="py-3 px-3">
                    <div className="flex flex-col gap-1 items-start">
                      <span className="bg-slate-100 text-slate-700 border border-slate-200 px-2 py-0.5 rounded text-[10px] font-bold">
                        {p.brandName}
                      </span>
                      <span className="text-[11px] text-slate-500 font-semibold truncate max-w-[120px]" title={p.typeName}>
                        {p.typeName}
                      </span>
                    </div>
                  </td>

                  {/* Location & Cabin */}
                  <td className="py-3 px-3 text-slate-600 text-xs">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-1 font-semibold truncate max-w-[120px]" title={p.locationName}>
                        <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                        <span>{p.locationName}</span>
                      </div>
                      {p.cabinNumber && (
                        <div className="flex items-center gap-1 text-[10px] font-mono text-slate-500">
                          <Box className="w-3 h-3 text-slate-400 shrink-0" />
                          <span>{p.cabinNumber}</span>
                        </div>
                      )}
                    </div>
                  </td>

                  {/* Stock */}
                  <td className="py-3 px-3">
                    <div
                      onClick={() => onAdjustStock(p)}
                      className={\`inline-flex font-mono text-xs font-black px-2 py-1 rounded cursor-pointer hover:opacity-80 transition-opacity \${
                        isOutOfStock
                          ? 'bg-red-100 text-red-700'
                          : isLowStock
                          ? 'bg-amber-100 text-amber-900'
                          : 'bg-emerald-100 text-emerald-800'
                      }\`}
                      title="Click to adjust stock"
                    >
                      <span>{p.stockQuantity} {p.unit}</span>
                    </div>
                  </td>

                  {/* Cost Price - RED */}
                  <td className="py-3 px-3">
                    {editingCostId === p.id ? (
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          value={tempCostValue}
                          onChange={(e) => setTempCostValue(e.target.value)}
                          className="w-16 px-1.5 py-0.5 border border-red-500 rounded text-xs font-black text-red-600"
                          autoFocus
                        />
                        <button
                          type="button"
                          onClick={() => handleSaveCost(p.id)}
                          className="p-1 bg-red-600 text-white rounded cursor-pointer"
                        >
                          <Check className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <div
                        onClick={() => handleStartCostEdit(p)}
                        className="font-mono font-black text-red-600 cursor-pointer hover:text-red-700 group"
                        title="Click to edit cost (Red)"
                      >
                        <div className="flex items-center gap-1">
                          <span>{formatPKR(p.costPrice)}</span>
                          <Edit3 className="w-3 h-3 opacity-0 group-hover:opacity-100 text-red-400" />
                        </div>
                        {p.costBatches && p.costBatches.length > 1 && (
                          <div className="text-[9px] font-semibold text-slate-400 font-sans">
                            {p.costBatches.length} FIFO batches
                          </div>
                        )}
                      </div>
                    )}
                  </td>

                  {/* Wholesale - YELLOW / AMBER */}
                  <td className="py-3 px-3 font-mono font-black text-amber-600">
                    {formatPKR(wholesale)}
                  </td>

                  {/* Retail Tiers - GREEN */}
                  <td className="py-3 px-3 min-w-[140px]">
                    {retailTiers.length > 0 ? (
                      <div className="flex flex-col gap-1">
                        {retailTiers.map((rt, rtIdx) => {
                          const theme = getTierTheme(rt, rtIdx, activeTiers.length);
                          return (
                            <div key={rt.tierId || rtIdx} className="flex items-center gap-1.5">
                              {retailTiers.length > 1 && (
                                <span className="text-[9px] font-bold text-slate-400 truncate max-w-[65px]">
                                  {rt.tierName}:
                                </span>
                              )}
                              <span className={\`font-mono font-black text-xs \${theme.textColor}\`}>
                                {formatPKR(rt.price)}
                              </span>
                              <span className={\`text-[9px] px-1 rounded \${theme.markupBadge}\`}>
                                {rt.markupPercent}%
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    ) : defaultRetailSp ? (
                      (() => {
                        const theme = getTierTheme(defaultRetailSp, 1, activeTiers.length);
                        return (
                          <div className={\`font-mono font-black text-xs \${theme.textColor}\`}>
                            {formatPKR(defaultRetailSp.price)}
                          </div>
                        );
                      })()
                    ) : (
                      <span className="text-slate-400 font-mono">—</span>
                    )}
                  </td>

                  {/* Dimensions */}
                  <td className="py-3 px-3 text-[11px] text-slate-700">
                    {dims && (dims.height !== undefined || dims.outerDia !== undefined || dims.innerDia !== undefined) ? (
                      <div className="space-y-0.5">
                        {dims.height !== undefined && (
                          <div>H: <strong>{formatDimension(dims.height, tableUnit)}</strong></div>
                        )}
                        {dims.outerDia !== undefined && (
                          <div>OD: <strong>{formatDimension(dims.outerDia, tableUnit)}</strong></div>
                        )}
                        {dims.innerDia !== undefined && (
                          <div>ID: <strong>{formatDimension(dims.innerDia, tableUnit)}</strong></div>
                        )}
                      </div>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>

                  {/* Thread (Never converted) */}
                  <td className="py-3 px-3 font-mono text-xs font-semibold text-slate-800">
                    {dims?.thread || <span className="text-slate-400">—</span>}
                  </td>

                  {/* Actions */}
                  <td className="py-3 px-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {onViewHistory && (
                        <button
                          type="button"
                          onClick={() => onViewHistory(p)}
                          className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="View Purchases & Sales History"
                        >
                          <History className="w-4 h-4 text-red-600" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => onPrintLabel(p)}
                        className="p-1.5 text-slate-500 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                        title="Print Label"
                      >
                        <Printer className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDuplicate(p)}
                        className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                        title="Duplicate"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onEdit(p)}
                        className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDelete(p.id)}
                        className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
              </>
            );
          }}
        />`;

code = code.replace(targetRegex, replacement);

fs.writeFileSync('src/components/ProductTable.tsx', code);
console.log('ProductTable.tsx updated');
