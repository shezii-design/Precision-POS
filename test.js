const v = { name: "Test Vendor" };
const vendorSearch = "";
console.log(v.name && (vendorSearch == null || v.name.toLowerCase().includes(vendorSearch.toLowerCase())));
