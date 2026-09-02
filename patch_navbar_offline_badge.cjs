const fs = require('fs');
let code = fs.readFileSync('src/components/Navbar.tsx', 'utf-8');

const target = `              </button>

              {/* Single Dedicated Menu Button on Top Bar */}`;

const replacement = `              </button>

              {/* Offline Badge */}
              {!isOnline && (
                <div className="flex items-center gap-1.5 px-1.5 sm:px-2 py-1 bg-amber-500 text-amber-950 rounded-xl text-[10px] sm:text-[11px] font-black shadow-inner shrink-0 border border-amber-400" title="Offline Mode: Read-Only Access (Writes Disabled)">
                  <span className="w-2 h-2 rounded-full bg-amber-950 animate-pulse shrink-0" />
                  <span className="hidden sm:inline">OFFLINE: Read-Only</span>
                  <span className="sm:hidden">OFFLINE</span>
                </div>
              )}

              {/* Single Dedicated Menu Button on Top Bar */}`;

code = code.replace(target, replacement);

fs.writeFileSync('src/components/Navbar.tsx', code);
console.log('patched navbar offline badge');
