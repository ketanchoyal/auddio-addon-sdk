import { describe, test, expect } from "bun:test";
import {
  ProgressResponseSchema,
  ProgressRequestSchema,
  SearchRequestSchema,
  CheckCacheRequestSchema,
  ResolveRequestSchema,
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
        filesize: 1000000,
        links: ["http://example.com/file1"],
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
        filesize: null,
        links: [],
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
        filesize: null,
        links: [],
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
        filesize: null,
        links: [],
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
        filesize: null,
        links: [],
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
        filesize: null,
        links: [],
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
        filesize: null,
        links: [],
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
          filesize: null,
          links: [],
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
        filesize: 2000000,
      };

      const result = ProgressResponseSchema.parse(valid);
      expect(result.files).toHaveLength(2);
    });
  });

  describe("ProgressRequestSchema", () => {
    test("should parse valid ProgressRequest", () => {
      const valid = {
        infoHash: "abc123def456",
        apiKey: "key123xyz",
      };

      const result = ProgressRequestSchema.parse(valid);
      expect(result.infoHash).toBe("abc123def456");
      expect(result.apiKey).toBe("key123xyz");
    });

    test("should reject empty infoHash", () => {
      const invalid = {
        infoHash: "",
        apiKey: "key123",
      };

      expect(() => ProgressRequestSchema.parse(invalid)).toThrow(z.ZodError);
    });

    test("should reject empty apiKey", () => {
      const invalid = {
        infoHash: "abc123",
        apiKey: "",
      };

      expect(() => ProgressRequestSchema.parse(invalid)).toThrow(z.ZodError);
    });

    test("should reject missing infoHash", () => {
      const invalid = {
        apiKey: "key123",
      };

      expect(() => ProgressRequestSchema.parse(invalid)).toThrow(z.ZodError);
    });

    test("should reject missing apiKey", () => {
      const invalid = {
        infoHash: "abc123",
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
    test("should parse valid ResolveRequest", () => {
      const valid = {
        provider: "realdebrid",
        apiKey: "key123",
        infoHash: "a".repeat(40),
        fileIds: [1, 2, 3],
        requireInstant: true,
        maxWaitSeconds: 300,
      };

      const result = ResolveRequestSchema.parse(valid);
      expect(result.provider).toBe("realdebrid");
      expect(result.fileIds).toHaveLength(3);
    });

    test("should parse minimal ResolveRequest (only required fields)", () => {
      const valid = {
        provider: "realdebrid",
        apiKey: "key123",
        infoHash: "a".repeat(40),
      };

      const result = ResolveRequestSchema.parse(valid);
      expect(result.provider).toBe("realdebrid");
      expect(result.fileIds).toBeUndefined();
    });

    test("should reject invalid info hash", () => {
      const invalid = {
        provider: "realdebrid",
        apiKey: "key123",
        infoHash: "not-a-valid-hash",
      };

      expect(() => ResolveRequestSchema.parse(invalid)).toThrow(z.ZodError);
    });

    test("should reject maxWaitSeconds > 600", () => {
      const invalid = {
        provider: "realdebrid",
        apiKey: "key123",
        infoHash: "a".repeat(40),
        maxWaitSeconds: 1000,
      };

      expect(() => ResolveRequestSchema.parse(invalid)).toThrow(z.ZodError);
    });
  });
});
