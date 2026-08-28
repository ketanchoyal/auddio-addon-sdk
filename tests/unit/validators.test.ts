import { describe, test, expect } from "bun:test";
import {
  ProgressResponseSchema,
  ProgressRequestSchema,
  SearchRequestSchema,
  CheckCacheRequestSchema,
  ResolveRequestSchema,
  CatalogGenreSchema,
  CatalogCategorySchema,
  CatalogFiltersResponseSchema,
  CatalogRequestSchema,
  CatalogBookSchema,
  CatalogResponseSchema,
} from "../../src/api/validators";
import { z } from "zod";

describe("Validators", () => {
  describe("ProgressResponseSchema", () => {
    test("should parse valid ProgressResponse with all fields", () => {
      const valid = {
        infoHash: "abc123def456",
        rdTorrentId: "torrent123",
        status: "downloading" as const,
        progress: 50,
        filename: "audiobook.m4b",
        files: [],
      };

      const result = ProgressResponseSchema.parse(valid);
      expect(result.infoHash).toBe("abc123def456");
      expect(result.rdTorrentId).toBe("torrent123");
      expect(result.status).toBe("downloading");
      expect(result.progress).toBe(50);
      expect(result.filename).toBe("audiobook.m4b");
    });

    test("should parse ProgressResponse with null rdTorrentId", () => {
      const valid = {
        infoHash: "abc123def456",
        rdTorrentId: null,
        status: "queued" as const,
        progress: 0,
        filename: null,
        files: [],
      };

      const result = ProgressResponseSchema.parse(valid);
      expect(result.rdTorrentId).toBeNull();
      expect(result.filename).toBeNull();
    });

    test("should parse ProgressResponse with 'not_found' status", () => {
      const valid = {
        infoHash: "notfound123",
        rdTorrentId: null,
        status: "not_found" as const,
        progress: 0,
        filename: null,
        files: [],
      };

      const result = ProgressResponseSchema.parse(valid);
      expect(result.status).toBe("not_found");
    });

    test("should parse ProgressResponse with 'error' status", () => {
      const valid = {
        infoHash: "error123",
        rdTorrentId: null,
        status: "error" as const,
        progress: 0,
        filename: null,
        files: [],
      };

      const result = ProgressResponseSchema.parse(valid);
      expect(result.status).toBe("error");
    });

    test("should reject invalid status", () => {
      const invalid = {
        infoHash: "abc123",
        rdTorrentId: null,
        status: "INVALID",
        progress: 50,
        filename: null,
        files: [],
      };

      expect(() => ProgressResponseSchema.parse(invalid)).toThrow(z.ZodError);
    });

    test("should reject missing required fields", () => {
      const incomplete = {
        infoHash: "abc123",
        // missing rdTorrentId
        status: "downloading",
      };

      expect(() => ProgressResponseSchema.parse(incomplete)).toThrow(
        z.ZodError,
      );
    });

    test("should reject progress > 100", () => {
      const invalid = {
        infoHash: "abc123",
        rdTorrentId: null,
        status: "downloading" as const,
        progress: 150,
        filename: null,
        files: [],
      };

      expect(() => ProgressResponseSchema.parse(invalid)).toThrow(z.ZodError);
    });

    test("should reject progress < 0", () => {
      const invalid = {
        infoHash: "abc123",
        rdTorrentId: null,
        status: "downloading" as const,
        progress: -10,
        filename: null,
        files: [],
      };

      expect(() => ProgressResponseSchema.parse(invalid)).toThrow(z.ZodError);
    });

    test("should parse all valid status values", () => {
      const statuses = [
        "queued",
        "downloading",
        "downloaded",
        "selection_required",
        "error",
        "stale",
        "not_found",
      ] as const;

      for (const status of statuses) {
        const valid = {
          infoHash: "test123",
          rdTorrentId: null,
          status,
          progress: 0,
          filename: null,
          files: [],
        };

        const result = ProgressResponseSchema.parse(valid);
        expect(result.status).toBe(status);
      }
    });

    test("should parse with multiple links", () => {
      const valid = {
        infoHash: "abc123",
        rdTorrentId: "torrent456",
        status: "downloaded" as const,
        progress: 100,
        filename: "book.m4b",
        files: [
          {
            id: "1",
            filename: "book_part1.m4b",
            size: 1000000,
            status: "ready" as const,
          },
          {
            id: "2",
            filename: "book_part2.m4b",
            size: 1000000,
            status: "ready" as const,
          },
        ],
      };

      const result = ProgressResponseSchema.parse(valid);
      expect(result.files).toHaveLength(2);
    });
  });

  describe("ProgressRequestSchema", () => {
    test("should parse valid ProgressRequest", () => {
      const valid = {
        torrentId: "abc123def456",
        apiKey: "key123xyz",
      };

      const result = ProgressRequestSchema.parse(valid);
      expect(result.torrentId).toBe("abc123def456");
      expect(result.apiKey).toBe("key123xyz");
    });

    test("should reject empty torrentId", () => {
      const invalid = {
        torrentId: "",
        apiKey: "key123",
      };

      expect(() => ProgressRequestSchema.parse(invalid)).toThrow(z.ZodError);
    });

    test("should reject empty apiKey", () => {
      const invalid = {
        torrentId: "abc123",
        apiKey: "",
      };

      expect(() => ProgressRequestSchema.parse(invalid)).toThrow(z.ZodError);
    });

    test("should reject missing torrentId", () => {
      const invalid = {
        apiKey: "key123",
      };

      expect(() => ProgressRequestSchema.parse(invalid)).toThrow(z.ZodError);
    });

    test("should reject missing apiKey", () => {
      const invalid = {
        torrentId: "abc123",
      };

      expect(() => ProgressRequestSchema.parse(invalid)).toThrow(z.ZodError);
    });
  });

  describe("SearchRequestSchema", () => {
    test("should parse valid SearchRequest", () => {
      const valid = {
        title: "Dune",
        author: "Frank Herbert",
        narrator: "Kyle MacLachlan",
        isbn: "978-0441172719",
        limit: 10,
      };

      const result = SearchRequestSchema.parse(valid);
      expect(result.title).toBe("Dune");
      expect(result.author).toBe("Frank Herbert");
    });

    test("should reject empty title", () => {
      expect(() => SearchRequestSchema.parse({ title: "" })).toThrow(
        z.ZodError,
      );
    });

    test("should allow only title (minimal)", () => {
      const result = SearchRequestSchema.parse({ title: "Book Title" });
      expect(result.title).toBe("Book Title");
    });

    test("should parse valid SearchRequest with optional book IDs", () => {
      const valid = {
        title: "Dune",
        asin: "B001T35PH6",
        hardcoverId: "hardcover-123",
        openlibraryId: "OL26332766M",
      };

      const result = SearchRequestSchema.parse(valid);
      expect(result.title).toBe("Dune");
      expect(result.asin).toBe("B001T35PH6");
      expect(result.hardcoverId).toBe("hardcover-123");
      expect(result.openlibraryId).toBe("OL26332766M");
    });
  });

  describe("CheckCacheRequestSchema", () => {
    test("should parse valid CheckCacheRequest", () => {
      const valid = {
        provider: "realdebrid",
        apiKey: "abc123xyz789",
        infoHashes: ["a".repeat(40)],
      };

      const result = CheckCacheRequestSchema.parse(valid);
      expect(result.provider).toBe("realdebrid");
      expect(result.infoHashes).toHaveLength(1);
    });

    test("should reject invalid info hash format", () => {
      const invalid = {
        provider: "realdebrid",
        apiKey: "key123",
        infoHashes: ["invalid_not_hex"],
      };

      expect(() => CheckCacheRequestSchema.parse(invalid)).toThrow(z.ZodError);
    });

    test("should accept multiple valid info hashes", () => {
      const valid = {
        provider: "realdebrid",
        apiKey: "key123",
        infoHashes: ["a".repeat(40), "b".repeat(40), "c".repeat(40)],
      };

      const result = CheckCacheRequestSchema.parse(valid);
      expect(result.infoHashes).toHaveLength(3);
    });

    test("should reject empty infoHashes array", () => {
      const invalid = {
        provider: "realdebrid",
        apiKey: "key123",
        infoHashes: [],
      };

      expect(() => CheckCacheRequestSchema.parse(invalid)).toThrow(z.ZodError);
    });

    test("should reject more than 100 infoHashes", () => {
      const invalid = {
        provider: "realdebrid",
        apiKey: "key123",
        infoHashes: Array(101).fill("a".repeat(40)),
      };

      expect(() => CheckCacheRequestSchema.parse(invalid)).toThrow(z.ZodError);
    });
  });

  describe("ResolveRequestSchema", () => {
    test("should parse valid ResolveRequest with infohash", () => {
      const valid = {
        provider: "realdebrid",
        apiKey: "key123",
        infoHashOrMagnet: "a".repeat(40),
        fileIds: [1, 2, 3],
      };

      const result = ResolveRequestSchema.parse(valid);
      expect(result.provider).toBe("realdebrid");
      expect(result.fileIds).toHaveLength(3);
      expect(result.infoHashOrMagnet).toBe("a".repeat(40));
    });

    test("should parse valid ResolveRequest with magnet link", () => {
      const valid = {
        provider: "realdebrid",
        apiKey: "key123",
        infoHashOrMagnet: "magnet:?xt=urn:btih:" + "a".repeat(40),
      };

      const result = ResolveRequestSchema.parse(valid);
      expect(result.provider).toBe("realdebrid");
      expect(result.infoHashOrMagnet).toContain("magnet:");
    });

    test("should parse minimal ResolveRequest (only required fields)", () => {
      const valid = {
        provider: "realdebrid",
        apiKey: "key123",
        infoHashOrMagnet: "a".repeat(40),
      };

      const result = ResolveRequestSchema.parse(valid);
      expect(result.provider).toBe("realdebrid");
      expect(result.fileIds).toBeUndefined();
    });

    test("should reject empty infoHashOrMagnet", () => {
      const invalid = {
        provider: "realdebrid",
        apiKey: "key123",
        infoHashOrMagnet: "",
      };

      expect(() => ResolveRequestSchema.parse(invalid)).toThrow(z.ZodError);
    });
  });

  describe("CatalogFiltersResponseSchema", () => {
    test("should parse valid CatalogFiltersResponse", () => {
      const valid = {
        categories: [
          {
            id: "fiction",
            name: "Fiction",
            description: "Fictional works",
            genres: [
              { id: "sci-fi", name: "Science Fiction" },
              { id: "fantasy", name: "Fantasy" },
            ],
          },
        ],
        genres: [
          { id: "sci-fi", name: "Science Fiction" },
          { id: "fantasy", name: "Fantasy" },
        ],
      };

      const result = CatalogFiltersResponseSchema.parse(valid);
      expect(result.categories).toHaveLength(1);
      expect(result.categories[0]!.genres).toHaveLength(2);
      expect(result.genres).toHaveLength(2);
    });

    test("should parse empty categories and genres with defaults", () => {
      const result = CatalogFiltersResponseSchema.parse({});
      expect(result.categories).toEqual([]);
      expect(result.genres).toEqual([]);
    });

    test("should reject invalid category without name", () => {
      expect(() =>
        CatalogCategorySchema.parse({
          id: "fiction",
        }),
      ).toThrow(z.ZodError);
    });
  });

  describe("CatalogRequestSchema", () => {
    test("should parse valid CatalogRequest with all parameters", () => {
      const valid = {
        category: "fiction",
        genre: "sci-fi",
        page: 2,
        limit: 50,
        sortBy: "popular",
        sortOrder: "desc" as const,
        query: "space",
      };

      const result = CatalogRequestSchema.parse(valid);
      expect(result.category).toBe("fiction");
      expect(result.genre).toBe("sci-fi");
      expect(result.page).toBe(2);
      expect(result.limit).toBe(50);
      expect(result.sortBy).toBe("popular");
      expect(result.sortOrder).toBe("desc");
      expect(result.query).toBe("space");
    });

    test("should accept empty CatalogRequest with defaults", () => {
      const result = CatalogRequestSchema.parse({});
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
    });

    test("should reject negative page or limit > 100", () => {
      expect(() => CatalogRequestSchema.parse({ page: -1 })).toThrow(z.ZodError);
      expect(() => CatalogRequestSchema.parse({ limit: 101 })).toThrow(z.ZodError);
    });
  });

  describe("CatalogResponseSchema", () => {
    test("should parse valid CatalogResponse", () => {
      const valid = {
        books: [
          {
            id: "dune-1",
            title: "Dune",
            author: "Frank Herbert",
            narrator: "George Guidall",
            coverUrl: "https://example.com/dune.jpg",
            description: "A desert planet sci-fi classic",
            genres: ["Sci-Fi", "Adventure"],
            category: "Fiction",
            rating: 4.8,
            publishedYear: 1965,
            duration: 75600,
            durationFormatted: "21h 00m",
            series: "Dune",
            seriesIndex: 1,
            language: "en",
          },
        ],
        page: 1,
        limit: 20,
        hasMore: false,
        category: "fiction",
        genre: "sci-fi",
      };

      const result = CatalogResponseSchema.parse(valid);
      expect(result.books).toHaveLength(1);
      expect(result.books[0]!.title).toBe("Dune");
      expect(result.books[0]!.rating).toBe(4.8);
      expect(result.hasMore).toBe(false);
    });

    test("should reject book without title", () => {
      expect(() =>
        CatalogBookSchema.parse({
          author: "Frank Herbert",
        }),
      ).toThrow(z.ZodError);
    });
  });
});
