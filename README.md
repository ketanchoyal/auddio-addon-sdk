# Auddio Addon SDK (TypeScript)

A high-performance, type-safe framework for building Audiobook Addon Protocol compliant backend microservices with **Bun**. Exposes simple APIs to scrape torrents, verify debrid cache lists, and resolve streams.

---

## 📚 Detailed Documentation Guides

To dive deep into specific sections of the protocol and development conventions, explore our local guides:

*   **[Audiobook Addon Protocol Spec](./docs/protocol.md)**: Explains the underlying JSON-over-HTTP API requests, headers, and payload structures.
*   **[Manifest Configuration Fields Guide](./docs/config-fields.md)**: Details field definitions (`text`, `password`, `dropdown`, `checkbox`, etc.) and how client apps compile them dynamically into mobile forms.
*   **[Stream Resolution & Caching Specs](./docs/resolution.md)**: Details debrid cache checking, the 2-step selection flow, and optimal strategies for resuming playback seamlessly.

---

## ⚡ Core Features

*   **High Performance**: Powered natively by `Bun.serve` for rapid connection handling.
*   **Protocol Enforcement**: Strict type-checking and automated input validation using Zod schemas.
*   **Dynamic Settings Forms**: Exposes rich config settings declarations to build client settings screens on the fly.
*   **Extensible Architecture**: Handles background torrent progress polling and grouping structures seamlessly.

---

## 📥 Installation

Ensure you have [Bun](https://bun.sh) installed, then run:

```bash
bun add auddio-addon-sdk
```

---

## 🚀 Quick Start (Scraper Addon)

Scrapers look up candidate torrent files across trackers. They require the `SEARCH` capability and return a formatted candidate list.

```typescript
import { AddonServer } from "auddio-addon-sdk";

// 1. Initialize the scraper microservice
const addon = new AddonServer({
  id: "com.example.my-scraper",
  name: "My Torrent Scraper",
  version: "1.0.0",
  type: "SCRAPER",
  capabilities: ["SEARCH"],
});

// 2. Register the search query handler
addon.onSearch(async (query) => {
  // Scraper database or search API lookup logic here...
  return {
    results: [
      {
        infoHash: "a5f822e1b12b23a9dcb8e4f5a112f45c22881a5f",
        title: "The Odyssey (Lord Translation)",
        author: "Homer",
        narrator: "Ian McKellen",
        size: 322485640,
        sizeFormatted: "307.54 MiB",
        seeders: 24,
        leechers: 2,
        source: "AudioBookBay",
        format: "MP3",
        bitrate: "64kbps",
      }
    ],
    total: 1,
    query: { title: query.title }
  };
});

// 3. Listen on port 3000
addon.listen(3000);
```

---

## 🌌 Unified Addon Example (Search + Debrid Caching)

Unified Addons combine scraper indexing with debrid server API calls to allow clients to stream instantly, download uncached items, and resolve torrent files into clean direct URLs.

```typescript
import { AddonServer } from "auddio-addon-sdk";

const addon = new AddonServer({
  id: "com.example.unified-addon",
  name: "Unified Debrid Addon",
  version: "1.0.0",
  type: "UNIFIED",
  capabilities: ["SEARCH", "CHECK_CACHE", "RESOLVE", "PROGRESS"],
  config: {
    fields: [
      {
        id: "debrid_provider",
        label: "Debrid Service Provider",
        type: "dropdown",
        required: true,
        default: "realdebrid",
        options: [
          { value: "realdebrid", label: "Real-Debrid" },
          { value: "alldebrid", label: "AllDebrid" }
        ]
      },
      {
        id: "debrid_api_key",
        label: "Debrid API Key",
        type: "password",
        required: true,
        placeholder: "Enter api token...",
        help: "Acquire your API token from provider settings."
      }
    ]
  }
});

// 1. Torrent scraper handler
addon.onSearch(async (query) => {
  return {
    results: [/* candidate torrent results... */],
    total: 0,
    query: { title: query.title }
  };
});

// 2. Cache availability handler
addon.onCheckCache(async ({ provider, apiKey, infoHashes }) => {
  return {
    "a5f822e1b12b23a9dcb8e4f5a112f45c22881a5f": { 
      cached: true, 
      torrentId: "rd_torrent_992a" 
    }
  };
});

// 3. direct URL resolution handler (handles 2-step selections)
addon.onResolve(async ({ provider, apiKey, infoHash, torrentId, fileIds }) => {
  return {
    torrentId: "rd_torrent_992a",
    infoHash: infoHash,
    status: "ready",
    files: [
      {
        id: 1,
        filename: "01-Chapter-1.mp3",
        url: "https://real-debrid.com/d/direct-download-link",
        size: 24901820,
        status: "ready",
        mimeType: "audio/mpeg"
      }
    ],
    totalSize: 24901820
  };
});

// 4. Background polling progress handler
addon.onProgress(async ({ torrentId, apiKey }) => {
  return {
    infoHash: "a5f822e1b12b23a9dcb8e4f5a112f45c22881a5f",
    status: "downloading",
    progress: 84.5,
    filename: "Odyssey Audio",
    files: [
      {
        id: "1",
        filename: "01-Chapter-1.mp3",
        size: 24901820,
        status: "downloading"
      }
    ]
  };
});

addon.listen(3000);
```

---

## 🛠️ Testing

Run the included SDK test suite locally:

```bash
# Run standard Zod schema, validation rules, and endpoint tests
bun test
```

---

## 📄 License

MIT
