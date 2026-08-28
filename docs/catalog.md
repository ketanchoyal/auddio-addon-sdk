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

### 1. Discover Categories & Genres (`GET /catalog/filters`)

Used by the client to populate category tabs, genre chips, and navigation menus.

* **Method**: `GET` (or `POST`)
* **Endpoint**: `/catalog/filters` (also responds on `/catalog/categories` and `/catalog/genres`)
* **Response Body (`CatalogFiltersResponse`)**:

```json
{
  "categories": [
    {
      "id": "fiction",
      "name": "Fiction",
      "description": "Fictional stories and audiobooks",
      "count": 1420,
      "genres": [
        { "id": "sci-fi", "name": "Sci-Fi", "count": 350 },
        { "id": "fantasy", "name": "Fantasy", "count": 420 },
        { "id": "thriller", "name": "Thriller", "count": 290 }
      ]
    },
    {
      "id": "non-fiction",
      "name": "Non-Fiction",
      "description": "Educational and real-world audiobooks",
      "count": 980
    },
    {
      "id": "bestsellers",
      "name": "Bestsellers",
      "description": "Current top popular audiobooks"
    }
  ],
  "genres": [
    { "id": "sci-fi", "name": "Sci-Fi", "description": "Science Fiction" },
    { "id": "fantasy", "name": "Fantasy", "description": "Fantasy and Magic" },
    { "id": "mystery", "name": "Mystery", "description": "Crime & Detective" },
    { "id": "biography", "name": "Biography", "description": "Memoirs and Biographies" },
    { "id": "self-help", "name": "Self-Help", "description": "Personal Development" }
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
  * `sortBy`: Sorting field (`popular`, `rating`, `latest`, `title`, `trending`)
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
      "title": "Dune",
      "author": "Frank Herbert",
      "narrator": "George Guidall",
      "coverUrl": "https://m.media-amazon.com/images/I/91dSMhdIzTL._SL500_.jpg",
      "description": "Set on the desert planet Arrakis, Dune tells the story of Paul Atreides...",
      "genres": ["Sci-Fi", "Adventure"],
      "category": "Fiction",
      "rating": 4.8,
      "publishedYear": 1965,
      "duration": 75600,
      "durationFormatted": "21h 00m",
      "series": "Dune, Book 1",
      "seriesIndex": 1,
      "language": "en"
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

// 1. Return available categories and genres
addon.onCatalogFilters(async () => {
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
