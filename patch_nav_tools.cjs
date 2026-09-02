const fs = require('fs');
let code = fs.readFileSync('src/components/Navbar.tsx', 'utf-8');

const oldTopRightStart = `{/* Top-Right Action Buttons */}
            <div className="flex items-center gap-1 sm:gap-1.5 flex-nowrap overflow-x-auto overflow-y-hidden shrink-0 w-full sm:w-auto pb-0.5 sm:pb-0 mask-fade-edges" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>`;
const newTopRightStart = `{/* Top-Right Action Buttons */}
            <div className="flex items-center justify-end gap-1 sm:gap-1.5 shrink-0 w-full sm:w-auto">
              <div className="flex items-center justify-end gap-1 sm:gap-1.5 flex-nowrap overflow-x-auto overflow-y-hidden shrink-0 flex-1 sm:flex-none pb-0.5 sm:pb-0 mask-fade-edges" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>`;

code = code.replace(oldTopRightStart, newTopRightStart);

const oldActiveOpStart = `{/* Active Operator / Employee Badge & Quick Switch */}`;
const newActiveOpStart = `</div>
              <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
              {/* Active Operator / Employee Badge & Quick Switch */}`;
code = code.replace(oldActiveOpStart, newActiveOpStart);

// Note: we added an extra opening div, and closed one. We need one more closing div at the very end of this block.
// The block ends with the Tools & More Dropdown Menu's parent div being closed.
// Let's find: `              </div>\n            </div>` (which closes the relative shrink-0 div, and then the parent)
// and replace it with `              </div>\n              </div>\n            </div>`

code = code.replace(
  `                  </div>\n                )}\n              </div>\n            </div>`,
  `                  </div>\n                )}\n              </div>\n              </div>\n            </div>`
);

fs.writeFileSync('src/components/Navbar.tsx', code);
console.log('patched Navbar tools button clipping');
