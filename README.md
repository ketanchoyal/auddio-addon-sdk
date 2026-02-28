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
  capabilities: Array<"SEARCH" | "CHECK_CACHE" | "RESOLVE">;
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

## API Endpoints

The SDK automatically registers these HTTP endpoints when you call `addon.listen()`:

| Endpoint | Method | Handler |
|----------|--------|---------|
| `GET /manifest.json` | GET | Always available — returns the manifest |
| `POST /search` | POST | Registered via `addon.onSearch()` |
| `POST /check-cache` | POST | Registered via `addon.onCheckCache()` |
| `POST /resolve` | POST | Registered via `addon.onResolve()` |
| `GET /progress/:torrentId` | GET | Registered via `addon.onProgress()` |

---

## License

MIT
