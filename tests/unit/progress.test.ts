import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { AddonServer } from "../../src/api/server";
import type { ProgressResponse, ProgressRequest } from "../../src/api/validators";

describe("AddonServer - Progress Endpoint", () => {
  let server: ReturnType<typeof Bun.serve>;

  const minimalManifest = {
    id: "test.addon",
    name: "Test Addon",
    version: "1.0.0",
    protocolVersion: "1.0.0",
    capabilities: ["SEARCH", "PROGRESS"] as ("SEARCH" | "CHECK_CACHE" | "RESOLVE" | "PROGRESS" | "INFO")[],
    endpoints: {
      search: "/search",
      progress: "/progress",
    },
  };

  beforeEach(() => {
    // Ensure no server is running
    if (server) {
      server.stop();
    }
  });

  afterEach(() => {
    // Cleanup: stop the server after each test
    if (server) {
      server.stop();
    }
  });

  describe("GET /progress/:torrentId", () => {
    test("should return 200 with valid torrentId and Authorization header when onProgress is configured", async () => {
      const addon = new AddonServer(minimalManifest);

      const progressHandler = async (req: ProgressRequest): Promise<ProgressResponse> => {
        return {
          infoHash: "abc123def456",
          rdTorrentId: req.torrentId,
          status: "downloading" as const,
          progress: 50,
          filename: "audiobook.m4b",
          files: [],
        };
      };

      addon.onProgress(progressHandler);
      server = addon.listen(0);

      const response = await server.fetch(
        new Request(`http://localhost/progress/abc123def456`, {
          method: "GET",
          headers: {
            Authorization: "Bearer testkey123",
          },
        })
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.infoHash).toBe("abc123def456");
      expect(data.rdTorrentId).toBe("abc123def456");
      expect(data.status).toBe("downloading");
      expect(data.progress).toBe(50);
    });

    test("should call onProgress handler with correct torrentId and apiKey", async () => {
      const addon = new AddonServer(minimalManifest);

      let handlerCalled = false;
      let receivedReq: ProgressRequest | null = null;

      const progressHandler = async (req: ProgressRequest): Promise<ProgressResponse> => {
        handlerCalled = true;
        receivedReq = req;
        return {
          infoHash: "testhash789",
          rdTorrentId: req.torrentId,
          status: "not_found" as const,
          progress: 0,
          filename: null,
          files: [],
        };
      };

      addon.onProgress(progressHandler);
      server = addon.listen(0);

      await server.fetch(
        new Request(`http://localhost/progress/testhash789`, {
          method: "GET",
          headers: {
            Authorization: "Bearer myapikey456",
          },
        })
      );

      expect(handlerCalled).toBe(true);
      expect((receivedReq as any)?.torrentId).toBe("testhash789");
      expect((receivedReq as any)?.apiKey).toBe("myapikey456");
    });

    test("should return 501 when onProgress is not configured", async () => {
      const addon = new AddonServer(minimalManifest);
      server = addon.listen(0);

      const response = await server.fetch(
        new Request(`http://localhost/progress/abc123`, {
          method: "GET",
          headers: {
            Authorization: "Bearer testkey",
          },
        })
      );

      expect(response.status).toBe(501);
      const data = await response.json();
      expect(data.error).toBe("NOT_IMPLEMENTED");
    });

    test("should return 400 when torrentId is empty", async () => {
      const addon = new AddonServer(minimalManifest);
      addon.onProgress(async (req) => ({
        infoHash: "testhash",
        rdTorrentId: req.torrentId,
        status: "not_found" as const,
        progress: 0,
        filename: null,
        files: [],
      }));
      server = addon.listen(0);

      const response = await server.fetch(
        new Request(`http://localhost/progress/`, {
          method: "GET",
          headers: {
            Authorization: "Bearer testkey",
          },
        })
      );

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe("INVALID_INPUT");
    });

    test("should return 401 when Authorization header is missing", async () => {
      const addon = new AddonServer(minimalManifest);
      addon.onProgress(async (req) => ({
        infoHash: "testhash",
        rdTorrentId: req.torrentId,
        status: "not_found" as const,
        progress: 0,
        filename: null,
        files: [],
      }));
      server = addon.listen(0);

      const response = await server.fetch(
        new Request(`http://localhost/progress/abc123`, {
          method: "GET",
        })
      );

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe("UNAUTHORIZED");
    });

    test("should return 401 when Authorization header does not start with Bearer", async () => {
      const addon = new AddonServer(minimalManifest);
      addon.onProgress(async (req) => ({
        infoHash: "testhash",
        rdTorrentId: req.torrentId,
        status: "not_found" as const,
        progress: 0,
        filename: null,
        files: [],
      }));
      server = addon.listen(0);

      const response = await server.fetch(
        new Request(`http://localhost/progress/abc123`, {
          method: "GET",
          headers: {
            Authorization: "Basic sometoken",
          },
        })
      );

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe("UNAUTHORIZED");
    });

    test("should return 401 when Bearer token is empty", async () => {
      const addon = new AddonServer(minimalManifest);
      addon.onProgress(async (req) => ({
        infoHash: "testhash",
        rdTorrentId: req.torrentId,
        status: "not_found" as const,
        progress: 0,
        filename: null,
        files: [],
      }));
      server = addon.listen(0);

      const response = await server.fetch(
        new Request(`http://localhost/progress/abc123`, {
          method: "GET",
          headers: {
            Authorization: "Bearer ",
          },
        })
      );

      expect(response.status).toBe(401);
    });

    test("should handle handler returning different statuses", async () => {
      const addon = new AddonServer(minimalManifest);

      addon.onProgress(async (req) => {
        if (req.torrentId === "status1") {
          return {
            infoHash: "hash1",
            rdTorrentId: "torrent123",
            status: "queued" as const,
            progress: 0,
            filename: null,
            files: [],
          };
        }
        if (req.torrentId === "status2") {
          return {
            infoHash: "hash2",
            rdTorrentId: "torrent123",
            status: "downloaded" as const,
            progress: 100,
            filename: "book.m4b",
            files: [],
          };
        }
        return {
          infoHash: "hash3",
          rdTorrentId: null,
          status: "error" as const,
          progress: 0,
          filename: null,
          files: [],
        };
      });

      server = addon.listen(0);

      const testCases = ["status1", "status2", "status3"];

      for (const torrentId of testCases) {
        const response = await server.fetch(
          new Request(`http://localhost/progress/${torrentId}`, {
            method: "GET",
            headers: {
              Authorization: "Bearer key",
            },
          })
        );

        expect(response.status).toBe(200);
        const data = await response.json();
        if (torrentId === "status3") {
          expect(data.rdTorrentId).toBeNull();
        } else {
          expect(data.rdTorrentId).toBe("torrent123");
        }
      }
    });

    test("should handle torrentId with various valid formats", async () => {
      const addon = new AddonServer(minimalManifest);

      const torrentIds: string[] = [];

      addon.onProgress(async (req) => {
        torrentIds.push(req.torrentId);
        return {
          infoHash: "hash",
          rdTorrentId: req.torrentId,
          status: "not_found" as const,
          progress: 0,
          filename: null,
          files: [],
        };
      });

      server = addon.listen(0);

      const testTorrentIds = ["a1b2c3d4e5f6", "123456789abcdef", "aaaaaaaaaaaaaaaa"];

      for (const torrentId of testTorrentIds) {
        await server.fetch(
          new Request(`http://localhost/progress/${torrentId}`, {
            method: "GET",
            headers: {
              Authorization: "Bearer key",
            },
          })
        );
      }

      expect(torrentIds).toEqual(testTorrentIds);
    });

    test("should return 404 for other GET endpoints", async () => {
      const addon = new AddonServer(minimalManifest);
      addon.onProgress(async (req) => ({
        infoHash: "hash",
        rdTorrentId: req.torrentId,
        status: "not_found" as const,
        progress: 0,
        filename: null,
        files: [],
      }));
      server = addon.listen(0);

      const response = await server.fetch(
        new Request(`http://localhost/other-endpoint`, {
          method: "GET",
          headers: {
            Authorization: "Bearer testkey",
          },
        })
      );

      expect(response.status).toBe(404);
    });
  });

  describe("Method validation", () => {
    test("should reject POST requests to /progress/:torrentId", async () => {
      const addon = new AddonServer(minimalManifest);
      addon.onProgress(async (req) => ({
        infoHash: "hash",
        rdTorrentId: req.torrentId,
        status: "not_found" as const,
        progress: 0,
        filename: null,
        files: [],
      }));
      server = addon.listen(0);

      const response = await server.fetch(
        new Request(`http://localhost/progress/abc123`, {
          method: "POST",
          headers: {
            Authorization: "Bearer testkey",
          },
        })
      );

      expect(response.status).toBe(404);
    });
  });
});
