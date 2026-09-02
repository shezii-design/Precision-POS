const fs = require('fs');
let code = fs.readFileSync('src/components/Navbar.tsx', 'utf-8');

const importStatement = `import { PWAInstallButton } from './PWAInstallButton';\n`;
code = code.replace(/import \{ AuthState/, importStatement + "import { AuthState");

const topRightActionButtons = `{/* Top-Right Action Buttons */}`;
const newTopRightActionButtons = `{/* Top-Right Action Buttons */}
            <div className="flex items-center gap-1 sm:gap-1.5 flex-nowrap overflow-x-auto overflow-y-hidden shrink-0 w-full sm:w-auto pb-0.5 sm:pb-0 mask-fade-edges" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
              
              {/* PWA Install Button */}
              <PWAInstallButton />`;

code = code.replace(
  /\{\/\* Top-Right Action Buttons \*\/\}\s*<div className="flex items-center gap-1 sm:gap-1\.5 flex-nowrap overflow-x-auto overflow-y-hidden shrink-0 w-full sm:w-auto pb-0\.5 sm:pb-0 mask-fade-edges".*?>/, 
  newTopRightActionButtons
);

fs.writeFileSync('src/components/Navbar.tsx', code);
console.log('patched Navbar PWA button');
