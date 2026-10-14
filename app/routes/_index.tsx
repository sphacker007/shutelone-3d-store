import {
  Await,
  useLoaderData,
  Link,
} from 'react-router';
import type {Route} from './+types/_index';
import {Suspense} from 'react';
import {Image} from '@shopify/hydrogen';
import type {
  RecommendedProductsQuery,
} from 'storefrontapi.generated';
import {ProductItem} from '~/components/ProductItem';

export const meta: Route.MetaFunction = () => {
  return [
    {title: 'SHUTELONE — The Salon'},
    {name: 'description', content: 'Independent Indian streetwear, worn after hours.'},
  ];
};

export async function loader(args: Route.LoaderArgs) {
  // Start fetching non-critical data without blocking time to first byte
  const deferredData = loadDeferredData(args);

  // Await the critical data required to render initial state of the page
  const criticalData = await loadCriticalData(args);

  return {...deferredData, ...criticalData};
}

/**
 * Load data necessary for rendering content above the fold. This is the critical data
 * needed to render the page. If it's unavailable, the whole page should 400 or 500 error.
 */
async function loadCriticalData({context}: Route.LoaderArgs) {
  const [{collections}] = await Promise.all([
    context.storefront.query(FEATURED_COLLECTION_QUERY),
    // Add other queries here, so that they are loaded in parallel
  ]);

  return {featuredCollection: collections.nodes[0]};
}

/**
 * Load data for rendering content below the fold. This data is deferred and will be
 * fetched after the initial page load. If it's unavailable, the page should still 200.
 * Make sure to not throw any errors here, as it will cause the page to 500.
 */
function loadDeferredData({context}: Route.LoaderArgs) {
  const recommendedProducts = context.storefront
    .query(RECOMMENDED_PRODUCTS_QUERY)
    .catch((error: Error) => {
      // Log query errors, but don't throw them so the page can still render
      console.error(error);
      return null;
    });

  return {
    recommendedProducts,
  };
}

export default function Homepage() {
  const data = useLoaderData<typeof loader>();
  return (
    <div className="salon-home">
      <section className="salon" aria-label="SHUTELONE editorial collection">
        <div className="salon-intro">
          <p className="eyebrow">EST. 2026 / INDIA</p>
          <h1>SHUTELONE</h1>
          <p className="salon-manifesto">Streetwear for the hours<br />that belong to you.</p>
        </div>
        <SalonWall products={data.recommendedProducts} />
        <div className="salon-footer">
          <span>DRAG TO EXPLORE</span><span>SCROLL TO ENTER ↓</span>
        </div>
      </section>
      <section className="home-statement">
        <p className="eyebrow">THE DROP</p>
        <h2>Objects of<br /><em>after hours.</em></h2>
        <p>Graphic t-shirts built for the people who move differently. Every piece is drawn from the SHUTELONE catalogue and remains live with our Shopify inventory.</p>
        <Link className="editorial-link" to="/collections/all">SHOP ALL PIECES <span>↗</span></Link>
      </section>
      <RecommendedProducts products={data.recommendedProducts} />
    </div>
  );
}

function SalonWall({products}: {products: Promise<RecommendedProductsQuery | null>}) {
  return <Suspense fallback={<div className="salon-loading">Loading the salon</div>}>
    <Await resolve={products}>{(response) => {
      const items = response?.products.nodes ?? [];
      const first = items.slice(0, 4);
      const second = items.slice(4, 8).length ? items.slice(4, 8) : first;
      const third = items.slice(8, 12).length ? items.slice(8, 12) : first;
      return <div className="salon-wall">
        <SalonRow products={first} direction="left" />
        <SalonRow products={second} direction="right" />
        <SalonRow products={third} direction="left" />
      </div>;
    }}</Await>
  </Suspense>;
}

function SalonRow({products, direction}: {products: NonNullable<RecommendedProductsQuery>['products']['nodes']; direction: 'left' | 'right'}) {
  const doubled = [...products, ...products];
  return <div className={`salon-row ${direction}`}>
    <div className="salon-track">
      {doubled.map((product, index) => <Link to={`/products/${product.handle}`} className="salon-look" key={`${product.id}-${index}`}>
        {product.featuredImage && <Image data={product.featuredImage} sizes="(max-width: 700px) 35vw, 19vw" />}
        <span>{product.title}</span>
      </Link>)}
    </div>
  </div>;
}

function RecommendedProducts({
  products,
}: {
  products: Promise<RecommendedProductsQuery | null>;
}) {
  return (
    <section className="recommended-products">
      <div className="section-heading"><p className="eyebrow">SELECTED PIECES</p><Link to="/collections/all">VIEW COLLECTION ↗</Link></div>
      <Suspense fallback={<div>Loading...</div>}>
        <Await resolve={products}>
          {(response) => (
            <div className="recommended-products-grid">
              {response
                ? response.products.nodes.map((product) => (
                    <ProductItem key={product.id} product={product} />
                  ))
                : null}
            </div>
          )}
        </Await>
      </Suspense>
      <br />
    </section>
  );
}

const FEATURED_COLLECTION_QUERY = `#graphql
  fragment FeaturedCollection on Collection {
    id
    title
    image {
      id
      url
      altText
      width
      height
    }
    handle
  }
  query FeaturedCollection($country: CountryCode, $language: LanguageCode)
    @inContext(country: $country, language: $language) {
    collections(first: 1, sortKey: UPDATED_AT, reverse: true) {
      nodes {
        ...FeaturedCollection
      }
    }
  }
` as const;

const RECOMMENDED_PRODUCTS_QUERY = `#graphql
  fragment RecommendedProduct on Product {
    id
    title
    handle
    priceRange {
      minVariantPrice {
        amount
        currencyCode
      }
    }
    featuredImage {
      id
      url
      altText
      width
      height
    }
  }
  query RecommendedProducts ($country: CountryCode, $language: LanguageCode)
    @inContext(country: $country, language: $language) {
    products(first: 12, sortKey: UPDATED_AT, reverse: true) {
      nodes {
        ...RecommendedProduct
      }
    }
  }
` as const;
