import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { AddonServer } from "../../src/api/server";
import type { ProgressResponse, ProgressRequest } from "../../src/api/validators";

describe("AddonServer - Progress Endpoint", () => {
  let server: ReturnType<typeof Bun.serve>;

  const minimalManifest = {
    id: "test.addon",
    name: "Test Addon",
    version: "1.0.0",
    type: "SCRAPER" as const,
    capabilities: ["SEARCH"] as const,
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

  describe("GET /progress/:infoHash", () => {
    test("should return 200 with valid infoHash and Authorization header when onProgress is configured", async () => {
      const addon = new AddonServer(minimalManifest);

      const progressHandler = async (req: ProgressRequest): Promise<ProgressResponse> => {
        return {
          infoHash: req.infoHash,
          rdTorrentId: "torrent123",
          status: "downloading" as const,
          progress: 50,
          filename: "audiobook.m4b",
          filesize: 1000000,
          links: [],
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
      expect(data.status).toBe("downloading");
      expect(data.progress).toBe(50);
    });

    test("should call onProgress handler with correct infoHash and apiKey", async () => {
      const addon = new AddonServer(minimalManifest);

      let handlerCalled = false;
      let receivedReq: ProgressRequest | null = null;

      const progressHandler = async (req: ProgressRequest): Promise<ProgressResponse> => {
        handlerCalled = true;
        receivedReq = req;
        return {
          infoHash: req.infoHash,
          rdTorrentId: null,
          status: "not_found" as const,
          progress: 0,
          filename: null,
          filesize: null,
          links: [],
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
      expect(receivedReq?.infoHash).toBe("testhash789");
      expect(receivedReq?.apiKey).toBe("myapikey456");
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

    test("should return 400 when infoHash is empty", async () => {
      const addon = new AddonServer(minimalManifest);
      addon.onProgress(async (req) => ({
        infoHash: req.infoHash,
        rdTorrentId: null,
        status: "not_found" as const,
        progress: 0,
        filename: null,
        filesize: null,
        links: [],
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
        infoHash: req.infoHash,
        rdTorrentId: null,
        status: "not_found" as const,
        progress: 0,
        filename: null,
        filesize: null,
        links: [],
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
        infoHash: req.infoHash,
        rdTorrentId: null,
        status: "not_found" as const,
        progress: 0,
        filename: null,
        filesize: null,
        links: [],
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
        infoHash: req.infoHash,
        rdTorrentId: null,
        status: "not_found" as const,
        progress: 0,
        filename: null,
        filesize: null,
        links: [],
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
        if (req.infoHash === "status1") {
          return {
            infoHash: req.infoHash,
            rdTorrentId: "torrent123",
            status: "queued" as const,
            progress: 0,
            filename: null,
            filesize: null,
            links: [],
          };
        }
        if (req.infoHash === "status2") {
          return {
            infoHash: req.infoHash,
            rdTorrentId: "torrent123",
            status: "downloaded" as const,
            progress: 100,
            filename: "book.m4b",
            filesize: 2000000,
            links: ["http://example.com/file"],
          };
        }
        return {
          infoHash: req.infoHash,
          rdTorrentId: null,
          status: "error" as const,
          progress: 0,
          filename: null,
          filesize: null,
          links: [],
        };
      });

      server = addon.listen(0);

      const testCases = ["status1", "status2", "status3"];

      for (const hash of testCases) {
        const response = await server.fetch(
          new Request(`http://localhost/progress/${hash}`, {
            method: "GET",
            headers: {
              Authorization: "Bearer key",
            },
          })
        );

        expect(response.status).toBe(200);
        const data = await response.json();
        expect(data.infoHash).toBe(hash);
      }
    });

    test("should handle infoHash with various valid formats", async () => {
      const addon = new AddonServer(minimalManifest);

      const hashes: string[] = [];

      addon.onProgress(async (req) => {
        hashes.push(req.infoHash);
        return {
          infoHash: req.infoHash,
          rdTorrentId: null,
          status: "not_found" as const,
          progress: 0,
          filename: null,
          filesize: null,
          links: [],
        };
      });

      server = addon.listen(0);

      const testHashes = ["a1b2c3d4e5f6", "123456789abcdef", "aaaaaaaaaaaaaaaa"];

      for (const hash of testHashes) {
        await server.fetch(
          new Request(`http://localhost/progress/${hash}`, {
            method: "GET",
            headers: {
              Authorization: "Bearer key",
            },
          })
        );
      }

      expect(hashes).toEqual(testHashes);
    });

    test("should return 404 for other GET endpoints", async () => {
      const addon = new AddonServer(minimalManifest);
      addon.onProgress(async (req) => ({
        infoHash: req.infoHash,
        rdTorrentId: null,
        status: "not_found" as const,
        progress: 0,
        filename: null,
        filesize: null,
        links: [],
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
    test("should reject POST requests to /progress/:infoHash", async () => {
      const addon = new AddonServer(minimalManifest);
      addon.onProgress(async (req) => ({
        infoHash: req.infoHash,
        rdTorrentId: null,
        status: "not_found" as const,
        progress: 0,
        filename: null,
        filesize: null,
        links: [],
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
