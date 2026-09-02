const fs = require('fs');
let code = fs.readFileSync('src/components/Navbar.tsx', 'utf-8');

const target = `                <Lock className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
        {/* Tier 2: Clean Grid-Based Icon Navigation Bar (Zero Slider, Fully Responsive & Non-Glitchy) */}`;

const replacement = `                <Lock className="w-3.5 h-3.5" />
              </button>
              </div>
            </div>
          </div>
        </div>
        {/* Tier 2: Clean Grid-Based Icon Navigation Bar (Zero Slider, Fully Responsive & Non-Glitchy) */}`;

code = code.replace(target, replacement);

fs.writeFileSync('src/components/Navbar.tsx', code);
console.log('patched closing div');
