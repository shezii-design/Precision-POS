const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

const importStatement = `import { useOnlineStatus } from './hooks/useOnlineStatus';\n`;

// insert import after 'lucide-react'
code = code.replace(/} from 'lucide-react';/, "} from 'lucide-react';\n" + importStatement);

const appStart = `export default function App() {`;
const newAppStart = `export default function App() {\n  const isOnline = useOnlineStatus();`;
code = code.replace(appStart, newAppStart);

const rootDiv = `<div className="min-h-screen bg-slate-50 flex flex-col font-sans">`;
const newRootDiv = `<div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {!isOnline && (
        <div className="bg-amber-500 text-white text-center py-1.5 px-4 text-xs font-bold shadow-md z-50 flex items-center justify-center gap-2 sticky top-0">
          <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
          Offline Mode (Read-Only) — Working locally, edits disabled until connection is restored.
        </div>
      )}`;
code = code.replace(rootDiv, newRootDiv);

fs.writeFileSync('src/App.tsx', code);
console.log('patched App offline banner');
