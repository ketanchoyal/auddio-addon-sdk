export type DebridProviderType = "realdebrid" | "alldebrid" | "premiumize";

export enum TorrentStatus {
  MAGNET_CONVERSION = "magnet_conversion",
  WAITING_FILES_SELECTION = "waiting_files_selection",
  QUEUED = "queued",
  DOWNLOADING = "downloading",
  DOWNLOADED = "downloaded",
  ERROR = "error",
  VIRUS = "virus",
  DEAD = "dead",
}

export interface AccountInfo {
  username: string;
  email?: string;
  accountType: "free" | "premium";
  expiresAt?: Date;
  valid: boolean;
}

export interface CachedFile {
  id: number;
  filename: string;
  size: number;
}

export interface DebridCacheStatus {
  infoHash: string;
  cached: boolean;
  files?: CachedFile[];
}

export interface TorrentFile {
  id: number;
  filename: string;
  size: number;
  selected: boolean;
}

export interface TorrentInfo {
  id: string;
  hash: string;
  filename: string;
  status: TorrentStatus;
  progress: number;
  files: TorrentFile[];
}

export interface StreamFile {
  filename: string;
  url: string;
  size: number;
  mimeType?: string;
}

export interface IDebridProvider {
  readonly name: DebridProviderType;

  validateApiKey(apiKey: string): Promise<AccountInfo>;

  checkInstantAvailability(
    apiKey: string,
    infoHashes: string[]
  ): Promise<Map<string, DebridCacheStatus>>;

  addTorrent(apiKey: string, magnetOrHash: string): Promise<string>;

  getTorrentInfo(apiKey: string, torrentId: string): Promise<TorrentInfo>;

  selectFiles(
    apiKey: string,
    torrentId: string,
    fileIds: number[]
  ): Promise<void>;

  getStreamUrls(apiKey: string, torrentId: string): Promise<StreamFile[]>;

  deleteTorrent(apiKey: string, torrentId: string): Promise<void>;
}
