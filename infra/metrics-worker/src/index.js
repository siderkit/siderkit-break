// Download host and anonymous counters for Siderkit Break.
//
// Routes:
//   GET /                          redirect to the product page
//   GET /latest.json               updater manifest from the latest release
//   GET /releases/<version>/<file> release asset proxied from GitHub
//   GET /i                         one-time install beacon (204, counted)
//   GET /health                    liveness probe
//
// GitHub Releases is the only binary store. Proxying it keeps a single branded
// origin for the app, the website, and the updater, and lets the manifest stay
// independent of where the bytes live.
//
// Every counter request must carry a random UUID in X-Siderkit-Install. A
// missing or malformed value is served normally but never counted, which is
// how the in-app "anonymous counts" switch opts out.

const REPO = 'siderkit/siderkit-break';
const PUBLIC_ORIGIN = 'https://dl.siderkit.com';
const PRODUCT_PAGE = 'https://siderkit.com/apps/siderkit-break/';
const INSTALL_HEADER = 'x-siderkit-install';
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const VERSION_PATTERN = /^[0-9A-Za-z][0-9A-Za-z._-]{0,31}$/;
const FILE_PATTERN = /^[0-9A-Za-z][0-9A-Za-z._-]{0,127}$/;
const ASSET_HEADERS = [
  'content-type',
  'content-length',
  'content-range',
  'accept-ranges',
  'etag',
  'last-modified',
];

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const method = request.method.toUpperCase();
    if (method !== 'GET' && method !== 'HEAD') {
      return text('method not allowed\n', 405);
    }

    if (url.pathname === '/health') {
      return text('ok\n');
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

    if (url.pathname === '/') {
      return Response.redirect(PRODUCT_PAGE, 302);
    }

    if (url.pathname === '/latest.json') {
      return serveManifest(request, method, env, url);
    }

    const match = url.pathname.match(/^\/releases\/([^/]+)\/([^/]+)$/);
    if (match) {
      return serveAsset(request, match[1], match[2]);
    }

    return text('not found\n', 404);
  },
};

async function serveManifest(request, method, env, url) {
  if (method === 'GET') {
    record(env, 'check', request, url);
  }
  return manifestResponse(method);
}

async function manifestResponse(method) {
  // `latest-r2.json` already carries dl.siderkit.com URLs; it is what the
  // release workflow writes for the branded host.
  const upstream = `https://github.com/${REPO}/releases/latest/download/latest-r2.json`;
  const response = await fetch(upstream, { cf: { cacheTtl: 60, cacheEverything: true } });
  if (!response.ok) {
    return text(`manifest unavailable: ${response.status}\n`, 502);
  }

  if (method === 'HEAD') {
    return new Response(null, {
      status: 200,
      headers: {
        'content-type': 'application/json; charset=utf-8',
        'cache-control': 'public, max-age=60',
      },
    });
  }

  let manifest;
  try {
    manifest = await response.json();
  } catch {
    return text('manifest is not valid JSON\n', 502);
  }

  // Defensive rewrite: any GitHub release URL becomes a branded one, so a
  // hand-edited asset cannot leak github.com to clients.
  for (const platform of Object.values(manifest.platforms ?? {})) {
    const url = platform.url;
    if (typeof url !== 'string') continue;
    const match = url.match(/\/releases\/download\/v([^/]+)\/([^/]+)$/);
    if (match) platform.url = `${PUBLIC_ORIGIN}/releases/${match[1]}/${match[2]}`;
  }

  return new Response(JSON.stringify(manifest), {
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'public, max-age=60',
      'access-control-allow-origin': '*',
      'x-robots-tag': 'noindex',
    },
  });
}

async function serveAsset(request, rawVersion, rawFile) {
  const version = decode(rawVersion);
  const file = decode(rawFile);
  if (!version || !file || !VERSION_PATTERN.test(version) || !FILE_PATTERN.test(file)) {
    return text('not found\n', 404);
  }

  const upstream = `https://github.com/${REPO}/releases/download/v${version}/${file}`;
  const headers = new Headers();
  const range = request.headers.get('range');
  if (range) headers.set('range', range);

  const response = await fetch(upstream, {
    method: request.method === 'HEAD' ? 'HEAD' : 'GET',
    headers,
    redirect: 'follow',
    cf: { cacheTtl: 31536000, cacheEverything: true },
  });

  if (!response.ok && response.status !== 206) {
    return text(`asset unavailable: ${response.status}\n`, response.status === 404 ? 404 : 502);
  }

  const out = new Headers({
    'cache-control': 'public, max-age=31536000, immutable',
    'access-control-allow-origin': '*',
    'x-content-type-options': 'nosniff',
    'x-robots-tag': 'noindex',
  });
  for (const name of ASSET_HEADERS) {
    const value = response.headers.get(name);
    if (value) out.set(name, value);
  }

  return new Response(request.method === 'HEAD' ? null : response.body, {
    status: response.status,
    headers: out,
  });
}

function decode(segment) {
  try {
    return decodeURIComponent(segment);
  } catch {
    return null;
  }
}

function text(body, status = 200) {
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
  if (!env.METRICS || !request || !url) {
    return;
  }
  const installId = request.headers.get(INSTALL_HEADER);
  if (!installId || !UUID_PATTERN.test(installId)) {
    return;
  }
  const version = dimension(url.searchParams.get('v') ?? url.searchParams.get('cv'));
  const target = dimension(url.searchParams.get('t'));
  const arch = dimension(url.searchParams.get('a'));
  const bundle = dimension(url.searchParams.get('b'));
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

function dimension(value) {
  if (!value || value.length > 32 || !/^[a-z0-9_-]+$/i.test(value)) {
    return '';
  }
  return value;
}
