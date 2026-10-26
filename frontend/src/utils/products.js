const priceFormatter = new Intl.NumberFormat('ro-RO', {
  style: 'currency',
  currency: 'RON',
});

export const effectivePrice = (product) => product.discountPrice ?? product.price;

export const formatPrice = (value) => priceFormatter.format(value);

export const discountPercent = (product) => {
  const { price, discountPrice } = product;
  if (discountPrice == null || discountPrice >= price) return 0;
  return Math.round((1 - discountPrice / price) * 100);
};

export const getCategories = (products) =>
  [...new Set(products.map((p) => p.category))].toSorted((a, b) =>
    a.localeCompare(b, 'ro')
  );

export const getMaxPrice = (products) =>
  Math.ceil(Math.max(0, ...products.map(effectivePrice)));

export const createDefaultFilters = (maxPrice) => ({
  search: '',
  category: 'all',
  minPrice: 0,
  maxPrice,
  inStockOnly: false,
  featuredOnly: false,
  sortBy: 'name',
});

const COMPARATORS = {
  name: (a, b) => a.title.localeCompare(b.title, 'ro'),
  author: (a, b) => a.author.localeCompare(b.author, 'ro'),
  'price-low': (a, b) => effectivePrice(a) - effectivePrice(b),
  'price-high': (a, b) => effectivePrice(b) - effectivePrice(a),
  rating: (a, b) => (b.rating ?? 0) - (a.rating ?? 0),
  newest: (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
};

export const filterAndSortProducts = (products, filters) => {
  const keyword = filters.search.trim().toLowerCase();
  return products
    .filter((p) => {
      const matchesSearch =
        !keyword ||
        p.title.toLowerCase().includes(keyword) ||
        p.author.toLowerCase().includes(keyword) ||
        (p.description ?? '').toLowerCase().includes(keyword);

      const matchesCategory = filters.category === 'all' || p.category === filters.category;

      const price = effectivePrice(p);
      const matchesPrice = price >= filters.minPrice && price <= filters.maxPrice;

      const matchesStock = !filters.inStockOnly || p.stock > 0;
      const matchesFeatured = !filters.featuredOnly || p.featured === true;

      return matchesSearch && matchesCategory && matchesPrice && matchesStock && matchesFeatured;
    })
    .toSorted(COMPARATORS[filters.sortBy] ?? COMPARATORS.name);
};
