const vendors = [{name: 'Vendor A'}, {name: 'Vendor B'}];
const vendorSearch = 'vendor';
const filtered = vendors.filter(v => (v.name && (vendorSearch == null || v.name.toLowerCase().includes(vendorSearch.toLowerCase()))));
console.log(filtered);
