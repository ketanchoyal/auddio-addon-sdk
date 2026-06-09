# Torrent Caching & Resolution Specifications

Resolving magnets and torrents into clear audio playback URL streams is a primary function of Auddio Addons. This document details cache-checking logic, the 2-step selection process, download monitoring, and proper playback resumption.

---

## 🏎️ Torrent Cache Verification (`/check-cache`)

Before attempting to stream or cache, the client checks if torrent infoHashes are cached on the debrid server. This checks instant availability.

```
[Search Result Candidates] 
         │
         ▼
[POST /check-cache] ──► [Contact Debrid Cache API] ──► [Return Instant Cache Map]
```

### Response Mapping Behavior
Addons return a key-value map matching query hashes:
- **`cached: true`**: Files are instantly available. Stream can be resolved immediately.
- **`cached: false`**: Files are not cached. Client must download the torrent to debrid before streaming.

---

## 🗺️ The Two-Step Selection Flow (`/resolve`)

Audiobook torrents often pack multiple tracks (e.g. 50 chapter MP3 files, PDF booklets, metadata files). Simply downloading all files wastes storage and bandwidth. Instead, Auddio splits resolution into a **Two-Step Interaction**:

### Step 1: Request with infoHash Only
When the user taps an audiobook, the client calls `/resolve` containing only the `infoHash`.

*   **Request Payload**:
    ```json
    {
      "provider": "realdebrid",
      "apiKey": "USER_API_KEY",
      "infoHash": "a5f822e1b12b23a9dcb8e4f5a112f45c22881a5f"
    }
    ```
*   **Addon Action**: The addon downloads/caches the torrent metadata and inspects the internal files.
*   **Addon Response (`selectionRequired` state)**:
    Since multiple files exist, the addon must request file choices:
    ```json
    {
      "torrentId": "rd_torrent_88192a",
      "infoHash": "a5f822e1b12b23a9dcb8e4f5a112f45c22881a5f",
      "status": "selectionRequired",
      "files": [
        { "id": 1, "filename": "Chapter_01.mp3", "size": 14282010 },
        { "id": 2, "filename": "Chapter_02.mp3", "size": 15820112 },
        { "id": 3, "filename": "Booklet.pdf", "size": 2401822 }
      ]
    }
    ```

### Step 2: Request with torrentId + fileIds
The client displays the files to the user or auto-selects audio files, then makes a second `/resolve` call.

*   **Request Payload**:
    ```json
    {
      "provider": "realdebrid",
      "apiKey": "USER_API_KEY",
      "infoHash": "a5f822e1b12b23a9dcb8e4f5a112f45c22881a5f",
      "torrentId": "rd_torrent_88192a",
      "fileIds": [1, 2]
    }
    ```
*   **Addon Action**: Addon activates downloading/unlocking for selected IDs only.
*   **Addon Response**:
    ```json
    {
      "torrentId": "rd_torrent_88192a",
      "infoHash": "a5f822e1b12b23a9dcb8e4f5a112f45c22881a5f",
      "status": "ready",
      "files": [
        {
          "id": 1,
          "filename": "Chapter_01.mp3",
          "url": "https://real-debrid.com/d/direct-download-link-1",
          "size": 14282010,
          "status": "ready"
        },
        {
          "id": 2,
          "filename": "Chapter_02.mp3",
          "url": "https://real-debrid.com/d/direct-download-link-2",
          "size": 15820112,
          "status": "ready"
        }
      ],
      "totalSize": 30102122
    }
    ```

---

## ⏳ Active Download Monitoring (`/progress/:torrentId`)

If the resolved status returns `"downloading"` or `"partial"` (meaning some files are queued or fetching on debrid), the client polls `/progress/:torrentId` every few seconds to monitor state:

```json
{
  "infoHash": "a5f822e1b12b23a9dcb8e4f5a112f45c22881a5f",
  "status": "downloading",
  "progress": 72.8,
  "filename": "My Audiobook Collection",
  "files": [
    {
      "id": "1",
      "filename": "Chapter_01.mp3",
      "size": 14282010,
      "status": "ready"
    },
    {
      "id": "2",
      "filename": "Chapter_02.mp3",
      "size": 15820112,
      "status": "downloading"
    }
  ]
}
```

---

## 🔄 Seamless Playback Resumption Integration

> [!IMPORTANT]
> Storing player state effectively is vital for user experience. Direct debrid link URLs are temporary and usually expire within a few hours.

### Optimization Pattern
When the user pauses or closes the application, save the following metadata inside the local state database:
1.  **`infoHash`** (Identifies the torrent metadata)
2.  **`torrentId`** (Identifies the debrid cache item)
3.  **`fileIds`** (List of user-selected file indices)

### Resume Pipeline
When the user returns to resume listening:
1.  **Do NOT trigger Step 1** (this would prompt the files selector again).
2.  Trigger a direct `/resolve` call passing both `torrentId` and `fileIds` saved in step 2.
3.  The addon skips all processing checks and returns fresh direct stream URLs immediately.
