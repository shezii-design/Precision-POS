const fs = require('fs');
let content = fs.readFileSync('src/services/supabase.ts', 'utf8');
const search = "END $$;\n`;";
if (content.includes(search)) {
  content = content.replace(search, "END $$;\n\nNOTIFY pgrst, 'reload schema';\n`;");
  fs.writeFileSync('src/services/supabase.ts', content);
  console.log("Replaced using \\n");
} else if (content.includes("END $$;\r\n`;")) {
  content = content.replace("END $$;\r\n`;", "END $$;\n\nNOTIFY pgrst, 'reload schema';\n`;");
  fs.writeFileSync('src/services/supabase.ts', content);
  console.log("Replaced using \\r\\n");
} else {
  console.log("Could not find the target string.");
}
