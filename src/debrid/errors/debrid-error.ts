export enum DebridErrorCode {
  INVALID_API_KEY = "INVALID_API_KEY",
  API_ERROR = "API_ERROR",
  UNSUPPORTED_PROVIDER = "UNSUPPORTED_PROVIDER",
  INVALID_TORRENT = "INVALID_TORRENT",
  NOT_CACHED = "NOT_CACHED",
  NO_AUDIO_FILES = "NO_AUDIO_FILES",
  NO_FILES = "NO_FILES",
  TORRENT_NOT_READY = "TORRENT_NOT_READY",
  TORRENT_FAILED = "TORRENT_FAILED",
  TIMEOUT = "TIMEOUT",
}

export class DebridError extends Error {
  constructor(
    public code: DebridErrorCode,
    message: string,
    public details?: any,
    public statusCode: number = 500
  ) {
    super(message);
    this.name = "DebridError";
  }
}
