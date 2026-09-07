const str = 'HYPERLINK("https://example.com/formula.jpg", "Click Here")';
const match = str.match(/HYPERLINK\(\s*"([^"]+)"/i);
console.log(match ? match[1] : "no match");
