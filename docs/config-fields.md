# Manifest Configuration Fields Guide

The manifest `config` block defines settings fields that client apps render for users before connecting the addon. 

By declaring fields inside the manifest instead of hardcoding forms in the mobile client, Auddio allows servers to evolve and collect parameters (like unique keys, mirror sites, filters) completely dynamically.

---

## 📋 The ConfigField Schema

Every field declared inside the `config.fields` array must conform to the following schema:

```typescript
interface ConfigField {
  id: string;             // Unique identifier used as the key in client payloads
  label: string;          // Human-readable label displayed in the UI
  type: ConfigFieldType;  // Widget type controlling the input visual control
  required: boolean;      // Client blocks integration until a value is supplied
  default?: any;          // Fallback value when no user inputs are set
  placeholder?: string;   // Faint helper prompt displayed inside input boxes
  help?: string;          // Guidelines text rendered underneath the input field
  options?: Array<{ value: string; label: string }>; // Required only for "dropdown"
}
```

---

## 🎛️ Field Types & Client Rendering Conventions

### 1. `text` — Plain Single-line Input
Ideal for simple string parameters, such as a base API mirror URL or custom usernames.

*   **Zod Schema Type**: `"text"`
*   **JSON Declaration**:
    ```json
    {
      "id": "custom_mirror",
      "label": "Custom Proxy Mirror",
      "type": "text",
      "required": false,
      "placeholder": "https://my-proxy-mirror.com",
      "help": "Override the default torrent indexer hostname."
    }
    ```

---

### 2. `password` — Masked Sensitive Input
Masks character entries in input blocks. Perfect for API Keys, credentials, or private credentials.

*   **Zod Schema Type**: `"password"`
*   **JSON Declaration**:
    ```json
    {
      "id": "debrid_api_key",
      "label": "Real-Debrid API Key",
      "type": "password",
      "required": true,
      "placeholder": "Enter apitoken...",
      "help": "Retrieve your token from https://real-debrid.com/apitoken"
    }
    ```

---

### 3. `number` — Numeric Input
Triggers the numeric keyboard layout on touch-screen devices (iOS/Android).

*   **Zod Schema Type**: `"number"`
*   **JSON Declaration**:
    ```json
    {
      "id": "max_results",
      "label": "Max Search Items",
      "type": "number",
      "required": true,
      "default": 20,
      "help": "Limit the maximum magnet files returned per search query."
    }
    ```

---

### 4. `textarea` — Multiline Input
Renders a large textbox suited for entries containing spacing or multiple lines, like list parameters.

*   **Zod Schema Type**: `"textarea"`
*   **JSON Declaration**:
    ```json
    {
      "id": "blocklist",
      "label": "Blocked Scraper Trackers",
      "type": "textarea",
      "required": false,
      "placeholder": "blockdomain.com\nbadtacker.org",
      "help": "Specify scrape sources to filter out (one per line)."
    }
    ```

---

### 5. `dropdown` — Selector List
Renders an select menu. **Requires** the `options` list parameter. The default field value must match one of the dropdown's option values.

*   **Zod Schema Type**: `"dropdown"`
*   **JSON Declaration**:
    ```json
    {
      "id": "debrid_provider",
      "label": "Debrid Service Provider",
      "type": "dropdown",
      "required": true,
      "default": "realdebrid",
      "options": [
        { "value": "realdebrid", "label": "Real-Debrid" },
        { "value": "alldebrid", "label": "AllDebrid" },
        { "value": "premiumize", "label": "Premiumize" }
      ],
      "help": "Select your active premium caching provider."
    }
    ```

---

### 6. `checkbox` — Boolean Toggle
Renders a standard checkbox or toggle switch. Defaults and inputs must map to `true` or `false`.

*   **Zod Schema Type**: `"checkbox"`
*   **JSON Declaration**:
    ```json
    {
      "id": "require_instant",
      "label": "Instant Availability",
      "type": "checkbox",
      "required": false,
      "default": true,
      "help": "Only display torrents that are fully cached on debrid."
    }
    ```

---

## 🔄 Dynamic Transmission Pipeline

1. **Manifest Retrieval**: Client makes a `GET` call to `/manifest.json` and loads the config schema.
2. **Form Layout Generation**: Client iterates through `manifest.config.fields` and constructs active form elements.
3. **Local Storage Persistence**: Once the user taps "Submit", input values are saved locally inside the client.
4. **Execution Request**: The saved keys are sent in the payload of every `/check-cache` and `/resolve` call. For example, if a user submits `debrid_api_key`, it is mapped to the `apiKey` property of standard request payloads automatically!
