const fs = require('fs');
let code = fs.readFileSync('src/components/NewSaleModal.tsx', 'utf8');

code = code.replace(
  "                        </button>\n                      );\n                    })\n                  ) : (",
  "                        </button>\n                      );\n                    })}\n                  </div>\n                  ) : ("
);

fs.writeFileSync('src/components/NewSaleModal.tsx', code);
