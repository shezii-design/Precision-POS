const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(/import \{ SwitchUserModal \} from '\.\/components\/SwitchUserModal';/g, '');
code = code.replace(/const \[showSwitchUserModal, setShowSwitchUserModal\] = useState<boolean>\(false\);/g, '');

const switchModalRegex = /<SwitchUserModal[\s\S]*?setShowSwitchUserModal\(false\);\n\s*\}\}\n\s*\/>/g;
code = code.replace(switchModalRegex, '');

fs.writeFileSync('src/App.tsx', code);
console.log("Removed SwitchUserModal from App.tsx");
