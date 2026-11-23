// Download host and anonymous counters for Siderkit Break.
//
// Routes:
//   GET /latest.json   current updater manifest (never cached, counted)
//   GET /i             one-time install beacon (counted, empty 204)
//   GET /health        liveness probe
//   GET /<key>         R2 asset, immutable under releases/
//
// Every counter request must carry a random UUID in X-Siderkit-Install. A
// missing or malformed value is served normally but never counted, which is
// how the in-app "anonymous counts" switch opts out.

const INSTALL_HEADER = 'x-siderkit-install';
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const VERSION_PATTERN = /^[0-9A-Za-z.+-]{1,32}$/;
const DISPOSITION_EXTENSIONS = new Set(['.exe', '.msi', '.dmg', '.deb', '.rpm', '.appimage']);
const CONTENT_TYPES = {
  '.json': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.sig': 'text/plain; charset=utf-8',
  '.exe': 'application/octet-stream',
  '.msi': 'application/octet-stream',
  '.dmg': 'application/x-apple-diskimage',
  '.deb': 'application/vnd.debian.binary-package',
  '.rpm': 'application/x-rpm',
  '.appimage': 'application/octet-stream',
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const method = request.method.toUpperCase();
    if (method !== 'GET' && method !== 'HEAD') {
      return new Response('Method not allowed\n', {
        status: 405,
        headers: { allow: 'GET, HEAD', 'cache-control': 'no-store' },
      });
    }

    if (url.pathname === '/health') {
      return new Response('ok\n', {
        status: 200,
        headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' },
      });
    }

    if (url.pathname === '/i') {
      if (method === 'GET') {
        record(env, 'install', request, url);
      }
      return new Response(null, {
        status: 204,
        headers: { 'cache-control': 'no-store', 'x-robots-tag': 'noindex' },
      });
    }

    if (url.pathname === '/latest.json') {
      return serveManifest(request, env, method);
    }

    return serveAsset(request, env, url, method);
  },
};

async function serveManifest(request, env, method) {
  if (!env.BUCKET) {
    return text('manifest storage is not configured\n', 503);
  }
  const object =
    method === 'HEAD' ? await env.BUCKET.head('latest.json') : await env.BUCKET.get('latest.json');
  if (!object) {
    return text('not found\n', 404);
  }
  if (method === 'GET') {
    record(env, 'check', request, new URL(request.url));
  }
  const headers = baseHeaders('application/json; charset=utf-8');
  headers.set('cache-control', 'no-store');
  headers.set('content-length', String(object.size));
  if (object.etag) {
    headers.set('etag', object.etag);
  }
  return new Response(method === 'HEAD' ? null : object.body, { status: 200, headers });
}

async function serveAsset(request, env, url, method) {
  if (!env.BUCKET) {
    return text('asset storage is not configured\n', 503);
  }
  const key = decodeKey(url.pathname);
  if (!key) {
    return text('not found\n', 404);
  }
  const object = method === 'HEAD' ? await env.BUCKET.head(key) : await env.BUCKET.get(key);
  if (!object) {
    return text('not found\n', 404);
  }

  const headers = baseHeaders(contentType(key, object));
  headers.set('cache-control', cacheControl(key));
  headers.set('content-length', String(object.size));
  if (object.etag) {
    headers.set('etag', object.etag);
  }
  const disposition = contentDisposition(key);
  if (disposition) {
    headers.set('content-disposition', disposition);
  }
  return new Response(method === 'HEAD' ? null : object.body, { status: 200, headers });
}

function decodeKey(pathname) {
  let decoded;
  try {
    decoded = decodeURIComponent(pathname.slice(1));
  } catch {
    return null;
  }
  if (
    !decoded ||
    decoded.includes('\0') ||
    decoded.includes('\\') ||
    decoded.split('/').includes('..')
  ) {
    return null;
  }
  return decoded;
}

function contentType(key, object) {
  const stored = object.httpMetadata?.contentType;
  if (stored) {
    return stored;
  }
  const extension = extensionOf(key);
  return CONTENT_TYPES[extension] ?? 'application/octet-stream';
}

function cacheControl(key) {
  return key.startsWith('releases/')
    ? 'public, max-age=31536000, immutable'
    : 'public, max-age=300';
}

function contentDisposition(key) {
  const extension = extensionOf(key);
  if (!DISPOSITION_EXTENSIONS.has(extension)) {
    return null;
  }
  const name =
    key
      .split('/')
      .pop()
      ?.replace(/["\\\r\n]/g, '') ?? 'download';
  return `attachment; filename="${name}"`;
}

function extensionOf(key) {
  const name = key.split('/').pop() ?? '';
  const dot = name.lastIndexOf('.');
  return dot === -1 ? '' : name.slice(dot).toLowerCase();
}

function baseHeaders(type) {
  return new Headers({
    'content-type': type,
    'access-control-allow-origin': '*',
    'access-control-expose-headers': 'content-length, content-disposition, etag',
    'x-content-type-options': 'nosniff',
    'referrer-policy': 'no-referrer',
    'x-robots-tag': 'noindex',
  });
}

function text(body, status) {
  return new Response(body, {
    status,
    headers: {
      'content-type': 'text/plain; charset=utf-8',
      'cache-control': 'no-store',
      'x-robots-tag': 'noindex',
    },
  });
}

function record(env, event, request, url) {
  if (!env.METRICS) {
    return;
  }
  const installId = request.headers.get(INSTALL_HEADER);
  if (!installId || !UUID_PATTERN.test(installId)) {
    return;
  }
  const version = dimension(
    url.searchParams.get('v') ?? url.searchParams.get('cv'),
    VERSION_PATTERN,
  );
  const target = dimension(url.searchParams.get('t'), /^[a-z0-9_-]{1,32}$/i);
  const arch = dimension(url.searchParams.get('a'), /^[a-z0-9_-]{1,32}$/i);
  const bundle = dimension(url.searchParams.get('b'), /^[a-z0-9_-]{1,32}$/i);
  try {
    env.METRICS.writeDataPoint({
      indexes: [event],
      blobs: [event, installId.toLowerCase(), version, target, arch, bundle],
      doubles: [1],
    });
  } catch {
    // Counting must never break a download.
  }
}

function dimension(value, pattern) {
  if (!value || value.length > 32 || !pattern.test(value)) {
    return '';
  }
  return value;
}
