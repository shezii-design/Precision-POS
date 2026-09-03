const fs = require('fs');

let code = fs.readFileSync('src/App.tsx', 'utf-8');

const injection = `
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 24;

  const paginatedProducts = useMemo(() => {
    return filteredProducts.slice(0, currentPage * itemsPerPage);
  }, [filteredProducts, currentPage]);

  const hasMoreProducts = paginatedProducts.length < filteredProducts.length;

  // Reset pagination when search/filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [primarySearch, dimensionQuery, brandFilter, typeFilter, locationFilter, cabinFilter, stockStatusFilter, sortBy]);
`;

code = code.replace(
  /  \}, \[products, primarySearch, dimensionQuery, brandFilter, typeFilter, locationFilter, cabinFilter, stockStatusFilter, sortBy\]\);/,
  `  }, [products, primarySearch, dimensionQuery, brandFilter, typeFilter, locationFilter, cabinFilter, stockStatusFilter, sortBy]);
${injection}`
);

fs.writeFileSync('src/App.tsx', code);
console.log('patched App.tsx with pagination');
