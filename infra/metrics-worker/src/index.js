// Download host and anonymous counters for Siderkit apps.
//
// One host serves every product, so the first path segment is always the
// product slug. Nothing may live at the top level except the shared health
// probe and the legacy aliases below.
//
// Routes:
//   GET /health                             liveness probe
//   GET /                                   redirect to the site
//   GET /<product>/                         redirect to the product page
//   GET /<product>/latest.json              updater manifest from the latest release
//   GET /<product>/i                        one-time install beacon (204, counted)
//   GET /<product>/releases/<version>/<file> release asset proxied from GitHub
//
// Legacy aliases keep already-installed 1.0.0-rc.1 builds working. They point
// at the default product and must never be used by new code:
//   GET /latest.json
//   GET /i
//   GET /releases/<version>/<file>
//
// Every counter request must carry a random UUID in X-Siderkit-Install. A
// missing or malformed value is served normally but never counted, which is
// how the in-app "anonymous counts" switch opts out.

const PUBLIC_ORIGIN = 'https://dl.siderkit.com';
const SITE_ORIGIN = 'https://siderkit.com';
const DEFAULT_PRODUCT = 'siderkit-break';
const INSTALL_HEADER = 'x-siderkit-install';
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SLUG_PATTERN = /^[a-z0-9][a-z0-9-]{0,63}$/;
const VERSION_PATTERN = /^[0-9A-Za-z][0-9A-Za-z._-]{0,31}$/;
const FILE_PATTERN = /^[0-9A-Za-z][0-9A-Za-z._-]{0,127}$/;
const MANIFEST_ASSETS = ['latest-dl.json', 'latest-r2.json', 'latest.json'];
const ASSET_HEADERS = [
  'content-type',
  'content-length',
  'content-range',
  'accept-ranges',
  'etag',
  'last-modified',
];

// Adding a product means adding one registry entry. Nothing else in this
// Worker should learn about a repository or a product page.
const PRODUCTS = {
  'siderkit-break': {
    repo: 'siderkit/siderkit-break',
    page: `${SITE_ORIGIN}/apps/siderkit-break/`,
  },
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const method = request.method.toUpperCase();
    if (method !== 'GET' && method !== 'HEAD') {
      return text('method not allowed\n', 405);
    }
    return route(request, env, url, method);
  },
};

async function route(request, env, url, method) {
  if (url.pathname === '/health') {
    return text('ok\n');
  }

  if (url.pathname === '/') {
    return redirect(`${SITE_ORIGIN}/`);
  }

  const legacy = legacyRoute(request, env, url, method);
  if (legacy) {
    return legacy;
  }

  return productRoute(request, env, url, method);
}

// Legacy aliases: one product only, kept for builds shipped before the product
// namespace existed.
function legacyRoute(request, env, url, method) {
  if (url.pathname === '/latest.json') {
    return redirect(`${PUBLIC_ORIGIN}/${DEFAULT_PRODUCT}/latest.json`);
  }

  if (url.pathname === '/i') {
    if (method === 'GET') {
      record(env, DEFAULT_PRODUCT, 'install', request, url);
    }
    return beaconResponse();
  }

  const asset = url.pathname.match(/^\/releases\/([^/]+)\/([^/]+)$/);
  if (asset) {
    return redirect(`${PUBLIC_ORIGIN}/${DEFAULT_PRODUCT}/releases/${asset[1]}/${asset[2]}`);
  }

  return null;
}

async function productRoute(request, env, url, method) {
  const match = url.pathname.match(/^\/([^/]+)(?:\/(.*))?$/);
  if (!match) {
    return text('not found\n', 404);
  }

  const slug = match[1];
  const rest = match[2] ?? '';
  const product = SLUG_PATTERN.test(slug) ? PRODUCTS[slug] : undefined;
  if (!product) {
    return text('not found\n', 404);
  }

  if (rest === '' || rest === '/') {
    return redirect(product.page);
  }

  if (rest === 'latest.json') {
    return serveManifest(request, method, env, url, slug, product);
  }

  if (rest === 'i') {
    if (method === 'GET') {
      record(env, slug, 'install', request, url);
    }
    return beaconResponse();
  }

  const asset = rest.match(/^releases\/([^/]+)\/([^/]+)$/);
  if (asset) {
    return serveAsset(request, product, asset[1], asset[2]);
  }

  return text('not found\n', 404);
}

async function serveManifest(request, method, env, url, slug, product) {
  if (method === 'GET') {
    record(env, slug, 'check', request, url);
  }

  const manifest = await fetchManifest(product.repo);
  if (!manifest) {
    return text('manifest unavailable\n', 502);
  }

  for (const platform of Object.values(manifest.platforms ?? {})) {
    const branded = brandedAssetUrl(platform.url, slug);
    if (branded) platform.url = branded;
  }

  const body = method === 'HEAD' ? null : JSON.stringify(manifest);
  return new Response(body, {
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'public, max-age=60',
      'access-control-allow-origin': '*',
      'x-robots-tag': 'noindex',
    },
  });
}

async function fetchManifest(repo) {
  for (const asset of MANIFEST_ASSETS) {
    const upstream = `https://github.com/${repo}/releases/latest/download/${asset}`;
    const response = await fetch(upstream, { cf: { cacheTtl: 60, cacheEverything: true } });
    if (!response.ok) continue;
    try {
      return await response.json();
    } catch {
      continue;
    }
  }
  return null;
}

// Any release download URL becomes a product-scoped URL on this host, so a
// hand-edited manifest can never leak github.com or a product-less path.
function brandedAssetUrl(raw, slug) {
  if (typeof raw !== 'string') return null;

  const fromGithub = raw.match(
    /^https:\/\/github\.com\/[^/]+\/[^/]+\/releases\/download\/v([^/]+)\/([^/]+)$/,
  );
  if (fromGithub) return `${PUBLIC_ORIGIN}/${slug}/releases/${fromGithub[1]}/${fromGithub[2]}`;

  const fromThisHost = raw.match(
    /^https:\/\/dl\.siderkit\.com\/(?:[a-z0-9-]+\/)?releases\/([^/]+)\/([^/]+)$/,
  );
  if (fromThisHost)
    return `${PUBLIC_ORIGIN}/${slug}/releases/${fromThisHost[1]}/${fromThisHost[2]}`;

  return null;
}

async function serveAsset(request, product, rawVersion, rawFile) {
  const version = decode(rawVersion);
  const file = decode(rawFile);
  if (!version || !file || !VERSION_PATTERN.test(version) || !FILE_PATTERN.test(file)) {
    return text('not found\n', 404);
  }

  const upstream = `https://github.com/${product.repo}/releases/download/v${version}/${file}`;
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

function redirect(location) {
  return new Response(null, {
    status: 302,
    headers: { location, 'cache-control': 'no-store' },
  });
}

function beaconResponse() {
  return new Response(null, {
    status: 204,
    headers: { 'cache-control': 'no-store', 'x-robots-tag': 'noindex' },
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

function record(env, product, event, request, url) {
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
      blobs: [product, event, installId.toLowerCase(), version, target, arch, bundle],
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
