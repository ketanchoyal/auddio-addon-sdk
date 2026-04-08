# auddio-addon-sdk

A lightweight framework for building Audiobook Addon Protocol compliant servers with Bun.

## Features

- **Minimalist API**: Create a working addon in ~10 lines of code.
- **Protocol Enforcement**: Automatically handles `manifest.json`, Zod validation, and error codes.
- **Bun-Native**: High-performance implementation using `Bun.serve`.

## Installation

```bash
bun add auddio-addon-sdk
```

## Quick Start (Scraper Addon)

```typescript
import { AddonServer } from "auddio-addon-sdk";

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
        infoHash: "abc123def456...",
        title: "Book Title",
        author: "Author Name",
        narrator: "Narrator Name",
        size: 123456789,
        sizeFormatted: "117.74 MiB",
        seeders: 10,
        leechers: 2,
        source: "MySource",
        format: "MP3",
        bitrate: "64kbps",
      }
    ],
    total: 1,
    query: { title: query.title }
  };
});

addon.listen(3000);
```

---

## Capabilities

Capabilities define which endpoints your addon exposes. Each capability requires a corresponding handler to be registered.

| Capability | Handler | Endpoint | Description |
|------------|---------|----------|-------------|
| `SEARCH` | `onSearch()` | `POST /search` | Search for audiobook torrents |
| `CHECK_CACHE` | `onCheckCache()` | `POST /check-cache` | Check if torrents are cached on debrid |
| `RESOLVE` | `onResolve()` | `POST /resolve` | Resolve torrents to streamable URLs |
| `PROGRESS` | `onProgress()` | `GET /progress/:torrentId` | Check download progress |
| `INFO` | `onTorrentFiles()` | `POST /info` | Get torrent file listing (no debrid needed) |

**Addon Types:**
- `SCRAPER` — Only needs `SEARCH` capability (finds torrents)
- `DEBRID` — Only needs `CHECK_CACHE`, `RESOLVE`, `PROGRESS` (debrid operations)
- `UNIFIED` — Combines all capabilities (search + debrid)

---

## Unified Addon (with Debrid)

The SDK provides the server plumbing. You can implement your own logic for resolving streams.

```typescript
import { AddonServer } from "auddio-addon-sdk";

const addon = new AddonServer({
  id: "com.example.unified",
  name: "Unified Addon",
  version: "1.0.0",
  type: "UNIFIED",
  capabilities: ["SEARCH", "CHECK_CACHE", "RESOLVE", "PROGRESS", "INFO"],
});

addon.onSearch(async (query) => {
  // Search torrent indexers
  return {
    results: [/* ... */],
    total: 0,
    query: { title: query.title }
  };
});

addon.onCheckCache(async (req) => {
  // Check if torrents are cached on debrid provider
  return {
    "abc123...": { cached: true, torrentId: "rd123" },
  };
});

addon.onResolve(async (req) => {
  // Resolve stream URL via debrid provider
  return { 
    torrentId: "rd123abc",
    infoHash: req.infoHash,
    status: "ready",
    files: [
      {
        id: 1,
        filename: "chapter1.mp3",
        url: "https://real-debrid.com/...",
        size: 15548842,
        status: "ready",
        mimeType: "audio/mpeg",
      }
    ],
    totalSize: 15548842,
  };
});

addon.onProgress(async (req) => {
  // Check download progress from debrid provider
  return {
    infoHash: "abc123...",
    rdTorrentId: "rd123abc",
    status: "downloading",
    progress: 45,
    filename: "audiobook.mp3",
    files: [
      {
        id: "1",
        filename: "chapter1.mp3",
        size: 15548842,
        status: "ready",
      }
    ],
  };
});

addon.listen(3000);
```

---

## Manifest Config Fields

The manifest `config` block defines the configuration form that client apps (e.g. the Flutter app) render for users to fill in before using the addon. Fields are declared in the `config.fields` array and each field has a `type` that controls how the client renders it.

### Declaring Config Fields

```typescript
const addon = new AddonServer({
  id: "com.example.unified",
  name: "My Addon",
  version: "1.0.0",
  type: "UNIFIED",
  capabilities: ["SEARCH", "CHECK_CACHE", "RESOLVE"],
  config: {
    fields: [
      {
        id: "debrid_provider",
        label: "Debrid Provider",
        type: "dropdown",
        required: true,
        default: "realdebrid",
        options: [
          { value: "realdebrid", label: "Real-Debrid" },
          { value: "alldebrid", label: "AllDebrid" },
        ],
      },
      {
        id: "debrid_api_key",
        label: "Debrid API Key",
        type: "password",
        required: true,
        placeholder: "Enter your API key",
        help: "Get your API key from https://real-debrid.com/apitoken",
      },
      {
        id: "require_instant",
        label: "Require Instant Availability",
        type: "checkbox",
        required: false,
        default: false,
        help: "Only show cached torrents for instant playback",
      },
    ],
  },
});
```

### Config Field Schema

Every field in `config.fields` conforms to the `ConfigField` type:

```typescript
interface ConfigField {
  id: string;          // Unique key used to store/retrieve the value
  label: string;       // Human-readable label shown in the UI
  type: ConfigFieldType;
  required: boolean;   // Whether the field must be filled before connecting
  default?: any;       // Default value (applied when no saved value exists)
  placeholder?: string; // Hint text inside the input (text/password/textarea/number)
  help?: string;       // Secondary description shown below the field
  options?: Array<{ value: string; label: string }>; // Required for "dropdown"
}
```

### Field Types

| Type | UI Control | Notes |
|------|-----------|-------|
| `"text"` | Single-line text input | General-purpose string value |
| `"password"` | Obscured text input | Sensitive values like API keys; input is masked |
| `"number"` | Numeric text input | Shows numeric keyboard on mobile |
| `"textarea"` | Multi-line text input | For longer text values |
| `"dropdown"` | Drop-down selector | Requires `options` array; `default` must match an option `value` |
| `"checkbox"` | Toggle / checkbox | Boolean; `default` should be `true` or `false` |

#### `"text"` — Plain text input

```typescript
{
  id: "custom_domain",
  label: "Custom Domain",
  type: "text",
  required: false,
  placeholder: "https://myproxy.example.com",
  help: "Override the default scraper base URL",
}
```

#### `"password"` — Masked input for sensitive values

```typescript
{
  id: "debrid_api_key",
  label: "Debrid API Key",
  type: "password",
  required: true,
  placeholder: "Enter your Real-Debrid API key",
  help: "Get your key at https://real-debrid.com/apitoken",
}
```

#### `"number"` — Numeric input

```typescript
{
  id: "max_results",
  label: "Max Results",
  type: "number",
  required: false,
  default: 20,
  help: "Maximum number of search results to return",
}
```

#### `"textarea"` — Multi-line text

```typescript
{
  id: "blocklist",
  label: "Blocked Sources",
  type: "textarea",
  required: false,
  placeholder: "One source per line",
  help: "Scraper sources to exclude from results",
}
```

#### `"dropdown"` — Select from a list of options

Requires an `options` array. The `default` must be one of the `value` strings.

```typescript
{
  id: "debrid_provider",
  label: "Debrid Provider",
  type: "dropdown",
  required: true,
  default: "realdebrid",
  options: [
    { value: "realdebrid", label: "Real-Debrid" },
    { value: "alldebrid", label: "AllDebrid" },
    { value: "premiumize", label: "Premiumize" },
  ],
}
```

#### `"checkbox"` — Boolean toggle

```typescript
{
  id: "require_instant",
  label: "Require Instant Availability",
  type: "checkbox",
  required: false,
  default: false,
  help: "Only show torrents already cached on your debrid service",
}
```

### How Config Values Are Used

Config values are provided by the client app at runtime — they are **not** set via environment variables on the server. The user fills in the form rendered from `config.fields`, and those values are passed as part of each API request:

- `apiKey` — always passed from `debrid_api_key` field
- `provider` — always passed from `debrid_provider` field
- Additional fields can be read from request body per your handler logic

The client persists these values locally (e.g. SharedPreferences on mobile) and sends them with every `/check-cache` and `/resolve` request.

---

## Manifest Reference

Full manifest shape accepted by `new AddonServer(manifest)`:

```typescript
{
  id: string;                   // Reverse-domain unique ID, e.g. "com.example.my-addon"
  name: string;                 // Display name
  version: string;              // SemVer, e.g. "1.0.0"
  description?: string;         // Short description
  type: "UNIFIED" | "SCRAPER" | "DEBRID";
  capabilities: Array<"SEARCH" | "CHECK_CACHE" | "RESOLVE" | "PROGRESS" | "INFO">;
  icon?: string | null;         // URL to addon icon image
  config?: {
    fields: ConfigField[];      // See Config Fields section above
  };
  author?: string;
  repository?: string;          // URL to source repo
  license?: string;
}
```

The `protocolVersion` and `endpoints` fields are injected automatically by the SDK — you do not need to provide them.

---

## Torrent Files Endpoint (`POST /info`)

Fetch the complete file listing for a torrent using only the info hash. No debrid API key is required — this endpoint queries public torrent caches directly.

```typescript
import { AddonServer } from "auddio-addon-sdk";

const addon = new AddonServer({
  id: "com.example.unified",
  name: "Unified Addon",
  version: "1.0.0",
  type: "UNIFIED",
  capabilities: ["SEARCH", "CHECK_CACHE", "RESOLVE", "INFO"],
});

addon.onTorrentFiles(async (req) => {
  // Fetch torrent metadata from public torrent caches
  // Return file listing grouped by book
  return {
    infoHash: req.infoHash,
    name: "Torrent Display Name",
    files: [
      {
        fileId: 1,
        name: "chapter1.mp3",
        path: "Book/chapter1.mp3",
        bookName: "Book",
        size: 15548842,
        sizeFormatted: "14.83 MiB",
        isAudio: true,
      }
    ],
    books: [
      {
        bookName: "Book",
        files: [
          {
            fileId: 1,
            name: "chapter1.mp3",
            path: "Book/chapter1.mp3",
            bookName: "Book",
            size: 15548842,
            sizeFormatted: "14.83 MiB",
            isAudio: true,
          }
        ]
      }
    ],
    totalSize: 15548842,
    totalSizeFormatted: "14.83 MiB",
  };
});

addon.listen(3000);
```

### Request

**Method:** `POST`  
**Path:** `/info`  
**Body:** `{ infoHash: string }` — 40-character hex info hash

### Response

```typescript
{
  infoHash: string;            // Normalised (lowercase) 40-char hex
  name: string;                // Torrent display name
  files: TorrentFileEntry[];   // Flat list of all files
  books: TorrentBook[];        // Files grouped by book name
  totalSize: number;           // Total size in bytes
  totalSizeFormatted: string;  // Human-readable size (e.g., "1.76 GiB")
}
```

See the [torrent-files-endpoint.md](../../../addons/audiio-addon/docs/torrent-files-endpoint.md) doc for full type definitions and examples.

---

## API Endpoints

The SDK automatically registers these HTTP endpoints when you call `addon.listen()`:

| Endpoint | Method | Handler |
|----------|--------|---------|
| `GET /manifest.json` | GET | Always available — returns the manifest |
| `POST /search` | POST | Registered via `addon.onSearch()` |
| `POST /check-cache` | POST | Registered via `addon.onCheckCache()` |
| `POST /resolve` | POST | Registered via `addon.onResolve()` |
| `GET /progress/:torrentId` | GET | Registered via `addon.onProgress()` |
| `POST /info` | POST | Registered via `addon.onTorrentFiles()` |

---

## Exported Types

All types are exported from `auddio-addon-sdk` for use in your addon implementation:

### Manifest & Config Types
```typescript
import type {
  Manifest,
  ConfigField,
  ConfigFieldType,
  ConfigOption,
} from "auddio-addon-sdk";
```

### Request/Response Types
```typescript
import type {
  SearchRequest,
  SearchResponse,
  SearchResult,
  CheckCacheRequest,
  CheckCacheResponse,
  CacheStatus,
  ResolveRequest,
  ResolveResponse,
  ProgressRequest,
  ProgressResponse,
  TorrentFilesRequest,
  TorrentFilesResponse,
  TorrentFileEntry,
  TorrentBook,
  TorrentFilesErrorResponse,
} from "auddio-addon-sdk";
```

### Validation Schemas (Zod)
```typescript
import {
  SearchRequestSchema,
  CheckCacheRequestSchema,
  ResolveRequestSchema,
  ProgressRequestSchema,
  ProgressResponseSchema,
  TorrentFilesRequestSchema,
  TorrentFilesResponseSchema,
  TorrentFileEntrySchema,
  TorrentBookSchema,
} from "auddio-addon-sdk";
```

---

## License

MIT
