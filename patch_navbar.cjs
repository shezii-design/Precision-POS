const fs = require('fs');

let code = fs.readFileSync('src/components/Navbar.tsx', 'utf-8');

code = code.replace(
  '                        <span>Security & PIN Config</span>\n                      </button>\n                    )}',
  `                        <span>Security & PIN Config</span>
                      </button>
                    )}
                    {canManageSettings && (
                      <button
                        type="button"
                        onClick={() => { setShowToolsMenu(false); onOpenWipeData(); }}
                        className="w-full px-3 py-2 text-left text-xs font-bold hover:bg-red-50 text-red-700 rounded-xl flex items-center gap-2.5 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4 text-red-600 shrink-0" />
                        <span>Factory Reset / Wipe Data</span>
                      </button>
                    )}`
);

// We need to import Trash2 from lucide-react in Navbar.tsx
if (!code.includes('Trash2')) {
  code = code.replace('Shield,', 'Shield, Trash2,');
}

fs.writeFileSync('src/components/Navbar.tsx', code);
console.log('patched Navbar.tsx');
