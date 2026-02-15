# audioio-addon-sdk

A lightweight framework for building Audiobook Addon Protocol compliant servers with Bun.

## Features

- **Minimalist API**: Create a working addon in ~10 lines of code.
- **Protocol Enforcement**: Automatically handles `manifest.json`, Zod validation, and error codes.
- **Debrid Utilities**: Includes `IDebridProvider` interface, `StreamResolverService`, and `Audio File Filter` to help build stream-resolution addons.
- **Bun-Native**: High-performance implementation using `Bun.serve`.

## Installation

```bash
bun add audioio-addon-sdk
```

## Quick Start (Scraper Addon)

```typescript
import { AddonServer } from "audioio-addon-sdk";

const addon = new AddonServer({
  id: "com.example.my-scraper",
  name: "My Scraper",
  version: "1.0.0",
  type: "SCRAPER",
  capabilities: ["SEARCH"],
});

addon.onSearch(async (query) => {
  // Your scraping logic here
  return {
    results: [
      {
        title: "Book Title",
        infoHash: "...",
        size: 123456,
        seeders: 10,
        leechers: 2,
        source: "MySource",
      }
    ],
    total: 1,
    query: { title: query.title }
  };
});

addon.listen(3000);
```

## Unified Addon (with Debrid)

The SDK provides tools to build addons that resolve streams (e.g., using Debrid services). You just need to implement the `IDebridProvider` interface.

```typescript
import { AddonServer, IDebridProvider, StreamResolverService } from "audioio-addon-sdk";

// 1. Implement your provider (e.g., Real-Debrid, AllDebrid)
class MyDebridProvider implements IDebridProvider {
  // ... implement interface methods
}

const addon = new AddonServer({
  id: "com.example.unified",
  name: "Unified Addon",
  version: "1.0.0",
  type: "UNIFIED",
  capabilities: ["SEARCH", "CHECK_CACHE", "RESOLVE"],
});

const provider = new MyDebridProvider();
const resolver = new StreamResolverService(provider);

addon.onSearch(async (query) => {
  // ...
});

addon.onCheckCache(async (req) => {
  const status = await provider.checkInstantAvailability(req.apiKey, req.infoHashes);
  // ...
});

addon.onResolve(async (req) => {
  const result = await resolver.resolve(req.apiKey, req.infoHash, {
    requireInstant: req.requireInstant,
  });
  return { ...result, status: "ready" };
});

addon.listen(3000);
```

## License

MIT
