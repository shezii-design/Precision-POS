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
let brokenButtons = [];

files.forEach(file => {
  const content = fs.readFileSync(file, 'utf-8');
  // Find all <button ... > tags
  const buttonRegex = /<button[^>]*>/g;
  let match;
  while ((match = buttonRegex.exec(content)) !== null) {
    const buttonTag = match[0];
    if (!buttonTag.includes('onClick') && !buttonTag.includes('type="submit"')) {
      brokenButtons.push({ file, buttonTag });
    }
  }
});

console.log(JSON.stringify(brokenButtons, null, 2));
