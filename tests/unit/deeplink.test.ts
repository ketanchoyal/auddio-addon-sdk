import { describe, test, expect } from "bun:test";
import { getInstallDeeplink } from "../../src/utils/deeplink";

describe("getInstallDeeplink", () => {
  test("should generate simple deeplink with scheme auddio:///", () => {
    const url = "http://localhost:3000/manifest.json";
    const deeplink = getInstallDeeplink(url);
    expect(deeplink).toBe("auddio:///addon/install?url=http%3A%2F%2Flocalhost%3A3000%2Fmanifest.json");
  });

  test("should generate deeplink with config values and three slashes", () => {
    const url = "https://myaddon.com/manifest.json";
    const config = {
      apiKey: "12345",
      provider: "real-debrid",
      enabled: true,
      port: 8080,
    };
    const deeplink = getInstallDeeplink(url, config);
    expect(deeplink).toBe(
      "auddio:///addon/install?url=https%3A%2F%2Fmyaddon.com%2Fmanifest.json&apiKey=12345&provider=real-debrid&enabled=true&port=8080"
    );
  });

  test("should correctly encode special characters", () => {
    const url = "https://myaddon.com/manifest.json";
    const config = {
      key: "a & b = c",
    };
    const deeplink = getInstallDeeplink(url, config);
    expect(deeplink).toBe("auddio:///addon/install?url=https%3A%2F%2Fmyaddon.com%2Fmanifest.json&key=a+%26+b+%3D+c");
  });
});
