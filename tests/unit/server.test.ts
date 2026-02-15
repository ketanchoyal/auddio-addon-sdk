import { describe, test, expect } from "bun:test";
import { AddonServer } from "../../src/api/server";

describe("AddonServer", () => {
  const minimalManifest = {
    id: "test.addon",
    name: "Test Addon",
    version: "1.0.0",
    type: "SCRAPER" as const,
    capabilities: ["SEARCH"] as ("SEARCH" | "CHECK_CACHE" | "RESOLVE")[],
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
});
