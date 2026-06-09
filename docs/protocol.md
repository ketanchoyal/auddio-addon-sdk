# Audiobook Addon Protocol Specification v1.0

Auddio utilizes an open, decentralized JSON-over-HTTP protocol. Any backend service that implements the following API endpoints can seamlessly serve catalogs and streams directly to Auddio client applications (such as the Flutter mobile client).

---

## 🏗️ General Architecture

Auddio client apps discover and interact with addons dynamically at runtime. The architecture supports three types of addons:

1. **`SCRAPER`**: Only implements search capabilities to find audiobook torrents across trackers.
2. **`DEBRID`**: Only implements debrid caching and URL resolution (Real-Debrid, AllDebrid, etc.).
3. **`UNIFIED`**: Combines search scraping and debrid resolution in a single high-performance microservice.

---

## 📡 Core API Endpoints

### 1. Fetch Manifest (`GET /manifest.json`)
The manifest describes the addon, its operational capabilities, and declares any configuration parameters the client must collect from the user before connecting.

*   **Request Method**: `GET`
*   **Response Payload (`Manifest`)**:
    ```json
    {
      "id": "com.example.unified-addon",
      "name": "My Unified Source",
      "version": "1.0.0",
      "description": "Scrapes torrents and resolves streams dynamically.",
      "type": "UNIFIED",
      "capabilities": ["SEARCH", "CHECK_CACHE", "RESOLVE", "PROGRESS"],
      "icon": "https://example.com/icon.png",
      "config": {
        "fields": [
          {
            "id": "debrid_api_key",
            "label": "Debrid API Key",
            "type": "password",
            "required": true,
            "help": "Get your key from your debrid account settings."
          }
        ]
      }
    }
    ```

---

### 2. Search Torrents (`POST /search`)
Triggered when the user searches for a specific audiobook in the client app.

*   **Request Method**: `POST`
*   **Request Body (`SearchRequest`)**:
    ```json
    {
      "title": "Dune",
      "author": "Frank Herbert",
      "limit": 10
    }
    ```
*   **Response Body (`SearchResponse`)**:
    ```json
    {
      "results": [
        {
          "infoHash": "a5f822e1b12b23a9dcb8e4f5a112f45c22881a5f",
          "title": "Dune (1965) [MP3@64kbps]",
          "author": "Frank Herbert",
          "narrator": "George Guidall",
          "size": 322485640,
          "sizeFormatted": "307.54 MiB",
          "seeders": 12,
          "leechers": 1,
          "source": "AudioBookBay",
          "format": "MP3",
          "bitrate": "64kbps"
        }
      ],
      "total": 1,
      "query": { "title": "Dune" }
    }
    ```

---

### 3. Check Caching Status (`POST /check-cache`)
Determines if specific torrent candidates are already cached on the user's debrid server for instant playback.

*   **Request Method**: `POST`
*   **Request Body (`CheckCacheRequest`)**:
    ```json
    {
      "provider": "realdebrid",
      "apiKey": "USER_PRIVATE_API_KEY",
      "infoHashes": ["a5f822e1b12b23a9dcb8e4f5a112f45c22881a5f"]
    }
    ```
*   **Response Body (`CheckCacheResponse`)**:
    ```json
    {
      "a5f822e1b12b23a9dcb8e4f5a112f45c22881a5f": {
        "cached": true,
        "torrentId": "rd_active_99182"
      }
    }
    ```

---

### 4. Resolve Stream URL (`POST /resolve`)
Resolves a torrent infoHash into direct streamable URLs. This utilizes a **two-step selection flow** for multi-file audiobooks.

*   **Request Method**: `POST`
*   **Request Body (`ResolveRequest`)**:
    ```json
    {
      "provider": "realdebrid",
      "apiKey": "USER_PRIVATE_API_KEY",
      "infoHash": "a5f822e1b12b23a9dcb8e4f5a112f45c22881a5f",
      "torrentId": "rd_active_99182",
      "fileIds": [1, 2]
    }
    ```
*   **Response Body (`ResolveResponse`)**:
    ```json
    {
      "torrentId": "rd_active_99182",
      "infoHash": "a5f822e1b12b23a9dcb8e4f5a112f45c22881a5f",
      "status": "ready",
      "files": [
        {
          "id": 1,
          "filename": "Dune_Part01.mp3",
          "url": "https://real-debrid.com/d/streamable-direct-url-1",
          "size": 161242820,
          "status": "ready",
          "mimeType": "audio/mpeg"
        }
      ],
      "totalSize": 161242820
    }
    ```

---

### 5. Check Download Progress (`GET /progress/:torrentId`)
Polled by the client when an uncached torrent is downloading/caching on the debrid server.

*   **Request Method**: `GET`
*   **Query Parameters**: Requires `apiKey` and `provider` passed in standard query headers or body.
*   **Response Body (`ProgressResponse`)**:
    ```json
    {
      "infoHash": "a5f822e1b12b23a9dcb8e4f5a112f45c22881a5f",
      "status": "downloading",
      "progress": 42.5,
      "filename": "Dune Audiobook",
      "files": [
        {
          "id": "1",
          "filename": "Dune_Part01.mp3",
          "size": 161242820,
          "status": "downloading"
        }
      ]
    }
    ```

---

### 6. Torrent Metadata (`POST /info`)
Retrieves the raw internal files structure grouped by book name without contacting debrid servers.

*   **Request Method**: `POST`
*   **Request Body (`TorrentFilesRequest`)**:
    ```json
    {
      "infoHashOrMagnet": "a5f822e1b12b23a9dcb8e4f5a112f45c22881a5f"
    }
    ```
*   **Response Body (`TorrentFilesResponse`)**:
    ```json
    {
      "infoHash": "a5f822e1b12b23a9dcb8e4f5a112f45c22881a5f",
      "name": "Dune Frank Herbert Complete",
      "files": [
        {
          "fileId": 1,
          "name": "Dune_Part01.mp3",
          "path": "Dune/Dune_Part01.mp3",
          "bookName": "Dune",
          "size": 161242820,
          "sizeFormatted": "153.77 MiB",
          "isAudio": true
        }
      ],
      "books": [
        {
          "bookName": "Dune",
          "files": [
            {
              "fileId": 1,
              "name": "Dune_Part01.mp3",
              "path": "Dune/Dune_Part01.mp3",
              "bookName": "Dune",
              "size": 161242820,
              "sizeFormatted": "153.77 MiB",
              "isAudio": true
            }
          ]
        }
      ],
      "totalSize": 161242820,
      "totalSizeFormatted": "153.77 MiB"
    }
    ```
