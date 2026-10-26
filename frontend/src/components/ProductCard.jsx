import { PLACEHOLDER_IMAGE } from '../config';
import { formatPrice, discountPercent } from '../utils/products';
import './ProductCard.css';

const showPlaceholder = (img) => {
  if (!img.src.endsWith(PLACEHOLDER_IMAGE)) {
    img.src = PLACEHOLDER_IMAGE;
  }
};

const ProductCard = ({ product, onAddToCart }) => {
  const {
    id,
    title,
    author,
    price,
    discountPrice,
    imageUrl,
    stock = 0,
    rating,
    reviewCount = 0,
    isbn,
    description,
    specifications = {},
  } = product;

  const discount = discountPercent(product);
  const outOfStock = stock === 0;

  return (
    <article className="product-card">
      <div className="product-image-container">
        <img
          src={imageUrl || PLACEHOLDER_IMAGE}
          alt={`Coperta cărții ${title}`}
          className="product-image"
          loading="lazy"
          onLoad={(e) => e.currentTarget.naturalWidth < 10 && showPlaceholder(e.currentTarget)}
          onError={(e) => showPlaceholder(e.currentTarget)}
        />
        {discount > 0 && <span className="discount-badge">-{discount}%</span>}
        <div className="hover-overlay">
          <dl className="hover-content">
            <dt>ISBN</dt> <dd>{isbn || 'N/A'}</dd>
            <dt>Editura</dt> <dd>{specifications.publisher || 'N/A'}</dd>
            <dt>Pagini</dt> <dd>{specifications.pages || 'N/A'}</dd>
            <dt>An publicare</dt> <dd>{specifications.year || 'N/A'}</dd>
            <dt>Stoc</dt> <dd>{stock} bucăți</dd>
            {rating > 0 && (
              <>
                <dt>Evaluare</dt>
                <dd aria-label={`${rating} din 5 stele`}>
                  {'★'.repeat(Math.round(rating))}
                  {'☆'.repeat(5 - Math.round(rating))} ({reviewCount} recenzii)
                </dd>
              </>
            )}
          </dl>
          {description && <p className="description">{description}</p>}
        </div>
      </div>
      <div className="product-info">
        <h3>{title}</h3>
        <p className="author">de {author}</p>
        <div className="price-section">
          {discount > 0 ? (
            <>
              <span className="original-price">{formatPrice(price)}</span>
              <span className="current-price">{formatPrice(discountPrice)}</span>
            </>
          ) : (
            <span className="current-price">{formatPrice(price)}</span>
          )}
        </div>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => onAddToCart?.(id)}
          disabled={outOfStock}
        >
          {outOfStock ? 'Stoc epuizat' : 'Adaugă în coș'}
        </button>
      </div>
    </article>
  );
};

export default ProductCard;
