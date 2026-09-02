const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else if (file.endsWith('.tsx')) {
      results.push(file);
    }
  });
  return results;
}

const files = walk('./src/components');
let brokenForms = [];

files.forEach(file => {
  const content = fs.readFileSync(file, 'utf-8');
  const formRegex = /<form[^>]*>/g;
  let match;
  while ((match = formRegex.exec(content)) !== null) {
    const tag = match[0];
    if (!tag.includes('onSubmit')) {
      brokenForms.push({ file, tag });
    }
  }
});

console.log(JSON.stringify(brokenForms, null, 2));
