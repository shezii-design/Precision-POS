const fs = require('fs');
let code = fs.readFileSync('src/components/Navbar.tsx', 'utf-8');

// Replace all occurrences of </button>\n              </div> back to </button>
code = code.replace(/<\/button>\n              <\/div>/g, '</button>');

fs.writeFileSync('src/components/Navbar.tsx', code);
console.log('undid bad sed');
