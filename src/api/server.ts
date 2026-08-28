/// <reference lib="dom" />
/// <reference types="bun" />

import {
  type SearchRequest,
  type SearchResponse,
  type CheckCacheRequest,
  type CheckCacheResponse,
  type ResolveRequest,
  type ResolveResponse,
  type ProgressRequest,
  type ProgressResponse,
  type TorrentFilesRequest,
  type TorrentFilesResponse,
  type AirlockRequest,
  type AirlockResponse,
  type CatalogFiltersRequest,
  type CatalogFiltersResponse,
  type CatalogRequest,
  type CatalogResponse,
  type Manifest,
  ManifestSchema,
  SearchRequestSchema,
  CheckCacheRequestSchema,
  ResolveRequestSchema,
  ProgressRequestSchema,
  TorrentFilesRequestSchema,
  AirlockRequestSchema,
  CatalogFiltersRequestSchema,
  CatalogFiltersResponseSchema,
  CatalogRequestSchema,
  CatalogResponseSchema,
} from './validators';
import { z } from 'zod';


// CORS headers for web client support
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export class AddonServer {
  private manifest: Manifest;
  private searchHandler?: (req: SearchRequest) => Promise<SearchResponse>;
  private checkCacheHandler?: (
    req: CheckCacheRequest,
  ) => Promise<CheckCacheResponse>;
  private resolveHandler?: (req: ResolveRequest) => Promise<ResolveResponse>;
  private progressHandler?: (req: ProgressRequest) => Promise<ProgressResponse>;
  private torrentFilesHandler?: (
    req: TorrentFilesRequest,
  ) => Promise<TorrentFilesResponse>;
  private airlockHandler?: (req: AirlockRequest) => Promise<AirlockResponse>;
  private catalogFiltersHandler?: (
    req: CatalogFiltersRequest,
  ) => Promise<CatalogFiltersResponse>;
  private catalogHandler?: (req: CatalogRequest) => Promise<CatalogResponse>;

  constructor(manifest: Manifest) {
    ManifestSchema.parse(manifest);
    this.manifest = manifest;
  }

  /**
   * Define the search capability handler
   */
  onSearch(handler: (req: SearchRequest) => Promise<SearchResponse>): this {
    this.searchHandler = handler;
    return this;
  }

  /**
   * Define the check cache capability handler
   */
  onCheckCache(
    handler: (req: CheckCacheRequest) => Promise<CheckCacheResponse>,
  ): this {
    this.checkCacheHandler = handler;
    return this;
  }

  /**
   * Define the resolve capability handler
   */
  onResolve(handler: (req: ResolveRequest) => Promise<ResolveResponse>): this {
    this.resolveHandler = handler;
    return this;
  }

  /**
   * Define the progress capability handler
   */
  onProgress(
    handler: (req: ProgressRequest) => Promise<ProgressResponse>,
  ): this {
    this.progressHandler = handler;
    return this;
  }

  /**
   * Define the torrent files handler (POST /info)
   */
  onTorrentFiles(
    handler: (req: TorrentFilesRequest) => Promise<TorrentFilesResponse>,
  ): this {
    this.torrentFilesHandler = handler;
    return this;
  }

  /**
   * Define the airlock handler (POST /airlock).
   * Called when the app wants to toggle permanent caching on a TorBox torrent.
   * Only relevant for addons that use the TorBox debrid provider.
   */
  onAirlock(handler: (req: AirlockRequest) => Promise<AirlockResponse>): this {
    this.airlockHandler = handler;
    return this;
  }

  /**
   * Define the catalog filters capability handler (returns categories and genres list)
   */
  onCatalogFilters(
    handler: (req: CatalogFiltersRequest) => Promise<CatalogFiltersResponse>,
  ): this {
    this.catalogFiltersHandler = handler;
    return this;
  }

  /**
   * Define the catalog books capability handler (returns books by category / genre)
   */
  onCatalog(
    handler: (req: CatalogRequest) => Promise<CatalogResponse>,
  ): this {
    this.catalogHandler = handler;
    return this;
  }

  /**
   * Start the Bun.serve server
   */
  listen(port: number = 3000) {
    const server = Bun.serve({
      port,
      fetch: async (req: Request) => {
        const url = new URL(req.url);
        const path = url.pathname;

        // Handle OPTIONS preflight requests for CORS
        if (req.method === 'OPTIONS') {
          return new Response(null, { status: 204, headers: CORS_HEADERS });
        }

        try {
          if (path === '/manifest.json' && req.method === 'GET') {
            return Response.json(this.manifest, { headers: CORS_HEADERS });
          }

          if (path === '/search' && req.method === 'POST') {
            if (!this.searchHandler)
              return this.errorResponse(
                'NOT_IMPLEMENTED',
                'Search capability not configured',
                501,
              );
            const body = await req.json();
            const validated = SearchRequestSchema.parse(body);
            const result = await this.searchHandler(validated);
            return Response.json(result, { headers: CORS_HEADERS });
          }

          if (path === '/check-cache' && req.method === 'POST') {
            if (!this.checkCacheHandler)
              return this.errorResponse(
                'NOT_IMPLEMENTED',
                'Check Cache capability not configured',
                501,
              );
            const body = await req.json();
            const validated = CheckCacheRequestSchema.parse(body);
            const result = await this.checkCacheHandler(validated);
            return Response.json(result, { headers: CORS_HEADERS });
          }

          if (path === '/resolve' && req.method === 'POST') {
            if (!this.resolveHandler)
              return this.errorResponse(
                'NOT_IMPLEMENTED',
                'Resolve capability not configured',
                501,
              );
            const body = await req.json();
            const validated = ResolveRequestSchema.parse(body);
            const result = await this.resolveHandler(validated);
            return Response.json(result, { headers: CORS_HEADERS });
          }

          if (path.startsWith('/progress/') && req.method === 'GET') {
            const torrentId = path.slice('/progress/'.length);
            if (!torrentId)
              return this.errorResponse(
                'INVALID_INPUT',
                'torrentId is required',
                400,
              );
            if (!this.progressHandler)
              return this.errorResponse(
                'NOT_IMPLEMENTED',
                'Progress endpoint not configured',
                501,
              );
            const authHeader = req.headers.get('Authorization');
            const apiKey = authHeader?.startsWith('Bearer ')
              ? authHeader.slice(7)
              : null;
            if (!apiKey)
              return this.errorResponse(
                'UNAUTHORIZED',
                'Authorization: Bearer <apiKey> required',
                401,
              );
            const provider = url.searchParams.get('provider') || undefined;
            const fileIdsParam = url.searchParams.get('fileIds');
            const fileIds = fileIdsParam
              ? fileIdsParam.split(',').map((id) => parseInt(id, 10)).filter((id) => !isNaN(id))
              : undefined;
            const result = await this.progressHandler({ apiKey, torrentId, provider, fileIds });
            return Response.json(result, { headers: CORS_HEADERS });
          }

          if (path === '/info' && req.method === 'POST') {
            if (!this.torrentFilesHandler)
              return this.errorResponse(
                'NOT_IMPLEMENTED',
                'Torrent Files endpoint not configured',
                501,
              );
            const body = await req.json();
            const validated = TorrentFilesRequestSchema.parse(body);
            const result = await this.torrentFilesHandler(validated);
            return Response.json(result, { headers: CORS_HEADERS });
          }

          if (path === '/airlock' && req.method === 'POST') {
            if (!this.airlockHandler)
              return this.errorResponse(
                'NOT_IMPLEMENTED',
                'Airlock capability not configured',
                501,
              );
            const body = await req.json();
            const validated = AirlockRequestSchema.parse(body);
            const result = await this.airlockHandler(validated);
            return Response.json(result, { headers: CORS_HEADERS });
          }

          if (
            (path === '/catalog/filters' ||
              path === '/catalog/categories' ||
              path === '/catalog/genres') &&
            (req.method === 'GET' || req.method === 'POST')
          ) {
            if (!this.catalogFiltersHandler)
              return this.errorResponse(
                'NOT_IMPLEMENTED',
                'Catalog Filters capability not configured',
                501,
              );
            let rawReq: any = {};
            if (req.method === 'POST') {
              try {
                rawReq = await req.json();
              } catch {
                rawReq = {};
              }
            } else {
              const randomParam = url.searchParams.get('random');
              const random = randomParam === 'true' || randomParam === '1' ? true : undefined;
              rawReq = { random };
            }
            const validated = CatalogFiltersRequestSchema.parse(rawReq);
            const result = await this.catalogFiltersHandler(validated);
            const validatedResult = CatalogFiltersResponseSchema.parse(result);
            return Response.json(validatedResult, { headers: CORS_HEADERS });
          }

          if (path === '/catalog' && (req.method === 'POST' || req.method === 'GET')) {
            if (!this.catalogHandler)
              return this.errorResponse(
                'NOT_IMPLEMENTED',
                'Catalog capability not configured',
                501,
              );
            let rawReq: any = {};
            if (req.method === 'POST') {
              rawReq = await req.json();
            } else {
              const category = url.searchParams.get('category') || undefined;
              const genre = url.searchParams.get('genre') || undefined;
              const pageStr = url.searchParams.get('page');
              const limitStr = url.searchParams.get('limit');
              const sortBy = url.searchParams.get('sortBy') || undefined;
              const sortOrder = (url.searchParams.get('sortOrder') as 'asc' | 'desc') || undefined;
              const query = url.searchParams.get('query') || undefined;
              const asin = url.searchParams.get('asin') || undefined;
              const id = url.searchParams.get('id') || undefined;

              rawReq = {
                category,
                genre,
                page: pageStr ? parseInt(pageStr, 10) : undefined,
                limit: limitStr ? parseInt(limitStr, 10) : undefined,
                sortBy,
                sortOrder,
                query,
                asin,
                id,
              };
            }
            const validated = CatalogRequestSchema.parse(rawReq);
            const result = await this.catalogHandler(validated);
            const validatedResult = CatalogResponseSchema.parse(result);
            return Response.json(validatedResult, { headers: CORS_HEADERS });
          }

          return this.errorResponse(
            'NOT_FOUND',
            `Endpoint ${path} not found`,
            404,
          );
        } catch (error) {
          return this.handleGlobalError(error);
        }
      },
    });

    console.log(
      `✓ Audiobook Addon "${this.manifest.name}" running on port ${server.port}`,
    );
    return server;
  }

  private handleGlobalError(error: unknown): Response {
    if (error instanceof z.ZodError) {
      return this.errorResponse(
        'INVALID_INPUT',
        'Request validation failed',
        400,
        error.issues,
      );
    }

    console.error('[Addon Framework] Internal Error:', error);
    return this.errorResponse(
      (error as any).code || 'INTERNAL_ERROR',
      (error as any).message || 'An unexpected error occurred',
      (error as any).httpStatus || 500,
    );
  }

  private errorResponse(
    error: string,
    message: string,
    status: number,
    details?: any,
  ): Response {
    return new Response(JSON.stringify({ error, message, details }), {
      status,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    });
  }
}
