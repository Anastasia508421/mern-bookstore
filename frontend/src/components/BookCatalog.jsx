import { useState, useEffect } from 'react';
import axios from 'axios';
import { API_URL } from '../config';
import ProductCard from './ProductCard';
import SearchFilterSort from './SearchFilterSort';
import './BookCatalog.css';

const BookCatalog = () => {
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    const fetchProducts = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await axios.get(`${API_URL}/api/products`, {
          signal: controller.signal,
        });
        if (response.data.success) {
          const list = response.data.products ?? [];
          setProducts(list);
          setFilteredProducts(list);
        } else {
          setError(response.data.message || 'Eroare la încărcarea produselor');
        }
      } catch (error) {
        if (error.name === 'CanceledError') return;
        setError('Eroare la încărcarea produselor');
        console.error('Eroare la obținerea produselor:', error);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    fetchProducts();
    return () => controller.abort();
  }, [reloadKey]);

  if (loading) return <div className="loading">Se încarcă produsele...</div>;
  if (error) {
    return (
      <div className="error" role="alert">
        <p>{error}</p>
        <button type="button" className="btn btn-primary" onClick={() => setReloadKey((k) => k + 1)}>
          Reîncearcă
        </button>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="header">
        <div className="header-content">
          <div className="logo">
            MERN BookStore
            <span className="version-badge">E-Commerce</span>
          </div>
        </div>
      </header>
      <main>
        <SearchFilterSort products={products} onFilteredProducts={setFilteredProducts} />
        <p className="results-count" aria-live="polite">
          {filteredProducts.length} {filteredProducts.length === 1 ? 'produs găsit' : 'produse găsite'}
        </p>
        {filteredProducts.length > 0 ? (
          <div className="products-grid">
            {filteredProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="no-products">
            <h2>Nu sunt produse disponibile</h2>
            <p>
              {products.length > 0
                ? 'Niciun produs nu corespunde filtrelor. Modificați criteriile de căutare.'
                : 'Magazinul este în curs de actualizare. Reveniți curând!'}
            </p>
          </div>
        )}
      </main>
    </div>
  );
};

export default BookCatalog;
