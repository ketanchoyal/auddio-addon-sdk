import { describe, test, expect } from "bun:test";
import { AddonServer } from "../../src/api/server";

describe("AddonServer", () => {
  const minimalManifest = {
    id: "test.addon",
    name: "Test Addon",
    version: "1.0.0",
    protocolVersion: "1.0.0",
    capabilities: ["SEARCH"] as ("SEARCH" | "CHECK_CACHE" | "RESOLVE" | "PROGRESS" | "INFO")[],
    endpoints: {
      search: "/search",
    },
  };

  test("should serve manifest.json", async () => {
    const server = new AddonServer(minimalManifest);
    const response = await server.listen(0).fetch(new Request("http://localhost/manifest.json"));
    const data: any = await response.json();

    expect(response.status).toBe(200);
    expect(data.id).toBe("test.addon");
    expect(data.protocolVersion).toBe("1.0.0");
    expect(data.endpoints.search).toBe("/search");
  });

  test("should return 404 for unknown endpoints", async () => {
    const server = new AddonServer(minimalManifest);
    const response = await server.listen(0).fetch(new Request("http://localhost/unknown"));
    expect(response.status).toBe(404);
  });

  test("should handle search request", async () => {
    const server = new AddonServer(minimalManifest);
    server.onSearch(async (req) => {
      return {
        results: [],
        total: 0,
        query: { title: req.title },
      };
    });

    const response = await server.listen(0).fetch(new Request("http://localhost/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Dune" }),
    }));

    const data: any = await response.json();
    expect(response.status).toBe(200);
    expect(data.total).toBe(0);
  });

  test("should return 400 for invalid search request", async () => {
    const server = new AddonServer(minimalManifest);
    server.onSearch(async () => ({ results: [], total: 0, query: { title: "" } }));

    const response = await server.listen(0).fetch(new Request("http://localhost/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ }),
    }));

    expect(response.status).toBe(400);
    const data: any = await response.json();
    expect(data.error).toBe("INVALID_INPUT");
  });

  test("should handle catalog filters request", async () => {
    const server = new AddonServer({
      ...minimalManifest,
      capabilities: ["CATALOG"],
      endpoints: { catalog: "/catalog", catalogFilters: "/catalog/filters" },
    });

    server.onCatalogFilters(async () => ({
      categories: [{ id: "fiction", name: "Fiction" }],
      genres: [{ id: "sci-fi", name: "Science Fiction" }],
    }));

    const response = await server.listen(0).fetch(new Request("http://localhost/catalog/filters"));
    const data: any = await response.json();

    expect(response.status).toBe(200);
    expect(data.categories).toHaveLength(1);
    expect(data.categories[0].id).toBe("fiction");
    expect(data.genres[0].id).toBe("sci-fi");
  });

  test("should handle catalog post request with category and genre", async () => {
    const server = new AddonServer({
      ...minimalManifest,
      capabilities: ["CATALOG"],
      endpoints: { catalog: "/catalog", catalogFilters: "/catalog/filters" },
    });

    server.onCatalog(async (req) => ({
      books: [
        {
          title: "Dune",
          author: "Frank Herbert",
          genres: ["Sci-Fi"],
          category: req.category,
        },
      ],
      page: req.page,
      limit: req.limit,
      hasMore: false,
      category: req.category,
      genre: req.genre,
    }));

    const response = await server.listen(0).fetch(
      new Request("http://localhost/catalog", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category: "fiction", genre: "sci-fi", page: 1, limit: 10 }),
      }),
    );

    const data: any = await response.json();
    expect(response.status).toBe(200);
    expect(data.books).toHaveLength(1);
    expect(data.books[0].title).toBe("Dune");
    expect(data.category).toBe("fiction");
    expect(data.genre).toBe("sci-fi");
    expect(data.page).toBe(1);
    expect(data.limit).toBe(10);
    expect(data.hasMore).toBe(false);
  });

  test("should handle catalog GET request with query params", async () => {
    const server = new AddonServer({
      ...minimalManifest,
      capabilities: ["CATALOG"],
      endpoints: { catalog: "/catalog" },
    });

    server.onCatalog(async (req) => ({
      books: [
        {
          title: "Hyperion",
          author: "Dan Simmons",
          genres: ["Sci-Fi"],
        },
      ],
      page: req.page,
      limit: req.limit,
      hasMore: false,
      category: req.category,
      genre: req.genre,
    }));

    const response = await server.listen(0).fetch(
      new Request("http://localhost/catalog?category=fiction&genre=sci-fi&page=2&limit=5"),
    );

    const data: any = await response.json();
    expect(response.status).toBe(200);
    expect(data.books).toHaveLength(1);
    expect(data.books[0].title).toBe("Hyperion");
    expect(data.page).toBe(2);
    expect(data.limit).toBe(5);
    expect(data.hasMore).toBe(false);
  });

  test("should default page and limit in CatalogRequest when omitted", async () => {
    const server = new AddonServer({
      ...minimalManifest,
      capabilities: ["CATALOG"],
      endpoints: { catalog: "/catalog" },
    });

    let receivedPage: number | undefined;
    let receivedLimit: number | undefined;

    server.onCatalog(async (req) => {
      receivedPage = req.page;
      receivedLimit = req.limit;
      return {
        books: [],
        page: req.page,
        limit: req.limit,
        hasMore: false,
      };
    });

    const res = await server.listen(0).fetch(new Request("http://localhost/catalog"));
    expect(res.status).toBe(200);
    expect(receivedPage).toBe(1);
    expect(receivedLimit).toBe(20);
  });

  test("should parse random query parameter in GET /catalog", async () => {
    const server = new AddonServer({
      ...minimalManifest,
      capabilities: ["CATALOG"],
      endpoints: { catalog: "/catalog" },
    });

    let receivedRandom: boolean | undefined;

    server.onCatalog(async (req) => {
      receivedRandom = req.random;
      return {
        books: [],
        page: req.page,
        limit: req.limit,
        hasMore: false,
      };
    });

    const res = await server.listen(0).fetch(new Request("http://localhost/catalog?random=true"));
    expect(res.status).toBe(200);
    expect(receivedRandom).toBe(true);
  });

  test("should return 501 when catalog capability is not configured", async () => {
    const server = new AddonServer(minimalManifest);
    const response = await server.listen(0).fetch(new Request("http://localhost/catalog"));
    expect(response.status).toBe(501);
  });
});
