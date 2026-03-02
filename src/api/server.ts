import {
  type SearchRequest,
  type SearchResponse,
  type CheckCacheRequest,
  type CheckCacheResponse,
  type ResolveRequest,
  type ResolveResponse,
  type ProgressRequest,
  type ProgressResponse,
  type Manifest,
  ManifestSchema,
  SearchRequestSchema,
  CheckCacheRequestSchema,
  ResolveRequestSchema,
  ProgressRequestSchema,
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

  constructor(manifest: Omit<Manifest, 'protocolVersion' | 'endpoints'>) {
    const fullManifest: Manifest = {
      ...manifest,
      protocolVersion: '1.0.0',
      endpoints: {
        search: manifest.capabilities.includes('SEARCH')
          ? '/search'
          : undefined,
        checkCache: manifest.capabilities.includes('CHECK_CACHE')
          ? '/check-cache'
          : undefined,
        resolve: manifest.capabilities.includes('RESOLVE')
          ? '/resolve'
          : undefined,
      },
    };

    ManifestSchema.parse(fullManifest);
    this.manifest = fullManifest;
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
   * Start the Bun.serve server
   */
  listen(port: number = 3000) {
    const server = Bun.serve({
      port,
      fetch: async (req) => {
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
            const result = await this.progressHandler({ apiKey, torrentId });
            return Response.json(result, { headers: CORS_HEADERS });
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
