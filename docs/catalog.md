# Books Catalog API Specification

The **Catalog API** allows Auddio addons to expose categorized and genre-based collections of audiobooks to client applications.

Client apps can dynamically discover the available categories (e.g. *Fiction*, *Non-Fiction*, *Bestsellers*, *New Releases*) and genres (e.g. *Sci-Fi*, *Fantasy*, *Mystery*, *Biography*), and request book listings filtered by category and/or genre with pagination and sorting.

---

## 🌟 Capabilities & Manifest Declaration

To support catalogs, declare the `'CATALOG'` capability in your addon's manifest:

```json
{
  "id": "com.example.catalog-addon",
  "name": "Featured Audiobooks Catalog",
  "version": "1.0.0",
  "protocolVersion": "1.0.0",
  "capabilities": ["CATALOG", "SEARCH", "RESOLVE"],
  "endpoints": {
    "catalog": "/catalog",
    "catalogFilters": "/catalog/filters"
  }
}
```

---

## 📡 API Endpoints

### 1. Discover Categories & Genres (`GET /catalog/filters` or `POST /catalog/filters`)

Used by the client to populate category tabs, genre chips, and navigation menus.

* **Method**: `GET` (or `POST`)
* **Endpoint**: `/catalog/filters` (also responds on `/catalog/categories` and `/catalog/genres`)
* **Query Parameters** (for `GET`):
  * `random`: `true` or `1` to request randomized category and genre discovery
* **Request Payload (`CatalogFiltersRequest`)** (for `POST`):
  ```json
  {
    "random": true
  }
  ```
* **Response Body (`CatalogFiltersResponse`)**:

```json
{
  "categories": [
    {
      "id": "fiction",
      "name": "Fiction",
      "description": "Fictional stories and audiobooks"
    },
    {
      "id": "non-fiction",
      "name": "Non-Fiction",
      "description": "Educational and real-world audiobooks"
    }
  ],
  "genres": [
    { "id": "sci-fi", "name": "Sci-Fi", "description": "Science Fiction" },
    { "id": "fantasy", "name": "Fantasy", "description": "Fantasy and Magic" },
    { "id": "mystery", "name": "Mystery", "description": "Crime & Detective" }
  ]
}
```

---

### 2. Fetch Books Catalog (`POST /catalog` or `GET /catalog`)

Fetches a paginated list of books matching the specified category and/or genre filter.

* **Method**: `POST` (with JSON body) or `GET` (with query parameters)
* **Endpoint**: `/catalog`
* **Request Payload (`CatalogRequest`)**:

```json
{
  "category": "fiction",
  "genre": "sci-fi",
  "page": 1,
  "limit": 20,
  "sortBy": "popular",
  "sortOrder": "desc",
  "query": "dune",
  "asin": "B002V1OF70",
  "id": "B002V1OF70"
}
```

* **Query Parameters** (when using `GET /catalog`):
  * `category`: Category slug/ID
  * `genre`: Genre slug/ID
  * `page`: Page index (1-based, default: `1`)
  * `limit`: Page size (default: `20`, max: `100`)
  * `sortBy`: Sorting field (`popular`, `latest`, `title`, `author`, `size`)
  * `sortOrder`: `asc` or `desc`
  * `query`: Optional text search query within this category/genre
  * `asin`: Optional Audible ASIN to fetch a specific book
  * `id`: Optional unique book ID or BitTorrent info_hash

* **Response Body (`CatalogResponse`)**:

```json
{
  "books": [
    {
      "id": "B002V1OF70",
      "asin": "B002V1OF70",
      "asinRegion": "us",
      "title": "Dune",
      "author": "Frank Herbert",
      "coverUrl": "https://m.media-amazon.com/images/I/91dSMhdIzTL._SL500_.jpg"
    }
  ],
  "page": 1,
  "limit": 20,
  "hasMore": true,
  "category": "fiction",
  "genre": "sci-fi"
}
```

---

## 💻 Addon Server Implementation Example

```typescript
import { AddonServer } from "auddio-addon-sdk";

const addon = new AddonServer({
  id: "com.example.catalog-addon",
  name: "Catalog Addon",
  version: "1.0.0",
  protocolVersion: "1.0.0",
  capabilities: ["CATALOG", "SEARCH"],
  endpoints: {
    catalog: "/catalog",
    catalogFilters: "/catalog/filters",
    search: "/search",
  },
});

// 1. Return available categories and genres (supports random exploration)
addon.onCatalogFilters(async ({ random }) => {
  return {
    categories: [
      { id: "fiction", name: "Fiction" },
      { id: "non-fiction", name: "Non-Fiction" },
    ],
    genres: [
      { id: "sci-fi", name: "Sci-Fi" },
      { id: "fantasy", name: "Fantasy" },
      { id: "mystery", name: "Mystery" },
    ],
  };
});

// 2. Return books filtered by category and genre with pagination
addon.onCatalog(async ({ category, genre, page, limit, sortBy }) => {
  const { books, hasMore } = await fetchBooksFromDatabase({ category, genre, page, limit, sortBy });
  return {
    books,
    page,
    limit,
    hasMore,
    category,
    genre,
  };
});

addon.listen(3000);
```
