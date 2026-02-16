# audioio-addon-sdk

A lightweight framework for building Audiobook Addon Protocol compliant servers with Bun.

## Features

- **Minimalist API**: Create a working addon in ~10 lines of code.
- **Protocol Enforcement**: Automatically handles `manifest.json`, Zod validation, and error codes.
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

The SDK provides the server plumbing. You can implement your own logic for resolving streams.

```typescript
import { AddonServer } from "audioio-addon-sdk";

const addon = new AddonServer({
  id: "com.example.unified",
  name: "Unified Addon",
  version: "1.0.0",
  type: "UNIFIED",
  capabilities: ["SEARCH", "CHECK_CACHE", "RESOLVE"],
});

addon.onSearch(async (query) => {
  // ...
});

addon.onCheckCache(async (req) => {
  // Check your debrid provider
});

addon.onResolve(async (req) => {
  // Resolve stream URL
  return { 
    torrentId: "...",
    infoHash: req.infoHash,
    status: "ready",
    files: [],
    totalSize: 0
  };
});

addon.listen(3000);
```

## License

MIT
