import type { IDebridProvider, TorrentInfo } from "../providers/interface";
import { TorrentStatus } from "../providers/interface";
import { DebridError, DebridErrorCode } from "../errors/debrid-error";
import { filterAudioFiles } from "./file-filter";

export interface ResolveOptions {
  requireInstant?: boolean;
  maxWaitSeconds?: number;
}

export interface ResolveResult {
  torrentId: string;
  infoHash: string;
  files: Array<{
    filename: string;
    url: string;
    size: number;
    mimeType?: string;
  }>;
  totalSize: number;
}

export class StreamResolverService {
  constructor(private provider: IDebridProvider) {}

  async resolve(
    apiKey: string,
    infoHash: string,
    options: ResolveOptions = {}
  ): Promise<ResolveResult> {
    const cacheStatus = await this.provider.checkInstantAvailability(apiKey, [
      infoHash,
    ]);

    const status = cacheStatus.get(infoHash);

    if (!status?.cached && options.requireInstant) {
      throw new DebridError(
        DebridErrorCode.NOT_CACHED,
        "Torrent not cached and requireInstant=true",
        undefined,
        404
      );
    }

    const torrentId = await this.provider.addTorrent(apiKey, infoHash);

    try {
      let info = await this.provider.getTorrentInfo(apiKey, torrentId);

      if (info.status === TorrentStatus.WAITING_FILES_SELECTION) {
        const audioFiles = filterAudioFiles(info.files);

        if (audioFiles.length === 0) {
          await this.provider.deleteTorrent(apiKey, torrentId);
          throw new DebridError(
            DebridErrorCode.NO_AUDIO_FILES,
            "No audio files found in torrent",
            undefined,
            422
          );
        }

        await this.provider.selectFiles(
          apiKey,
          torrentId,
          audioFiles.map((f) => f.id)
        );

        info = await this.provider.getTorrentInfo(apiKey, torrentId);
      }

      info = await this.waitForDownload(
        apiKey,
        torrentId,
        options.maxWaitSeconds || 180
      );

      const files = await this.provider.getStreamUrls(apiKey, torrentId);

      return {
        torrentId,
        infoHash,
        files,
        totalSize: files.reduce((sum, f) => sum + f.size, 0),
      };
    } catch (error) {
      await this.provider.deleteTorrent(apiKey, torrentId);
      throw error;
    }
  }

  private async waitForDownload(
    apiKey: string,
    torrentId: string,
    maxWaitSeconds: number
  ): Promise<TorrentInfo> {
    const startTime = Date.now();
    const maxWaitMs = maxWaitSeconds * 1000;
    const pollInterval = 2000;

    while (true) {
      const info = await this.provider.getTorrentInfo(apiKey, torrentId);

      if (info.status === TorrentStatus.DOWNLOADED) {
        return info;
      }

      if (
        [TorrentStatus.ERROR, TorrentStatus.VIRUS, TorrentStatus.DEAD].includes(
          info.status
        )
      ) {
        throw new DebridError(
          DebridErrorCode.TORRENT_FAILED,
          `Torrent failed with status: ${info.status}`,
          undefined,
          422
        );
      }

      if (Date.now() - startTime > maxWaitMs) {
        throw new DebridError(
          DebridErrorCode.TIMEOUT,
          `Timeout after ${maxWaitSeconds}s. Status: ${info.status}, Progress: ${info.progress}%`,
          undefined,
          504
        );
      }

      await Bun.sleep(pollInterval);
    }
  }
}
