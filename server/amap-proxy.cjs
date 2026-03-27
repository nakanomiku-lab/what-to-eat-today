const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { gcj02ToWgs84 } = require('../electron/coordinates.cjs');

const rootDir = path.join(__dirname, '..');
const host = process.env.AMAP_PROXY_HOST || '127.0.0.1';
const port = Number(process.env.AMAP_PROXY_PORT || '5174');
const geocodeCache = new Map();
const inputTipCache = new Map();
let lastGeocodeAt = 0;
let lastInputTipAt = 0;
const AMAP_WEB_SERVICE_BASE_URL = 'https://restapi.amap.com';

function parseEnvValue(rawValue) {
  const trimmed = rawValue.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }

  return trimmed;
}

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return;
  }

  const content = fs.readFileSync(filePath, 'utf8');
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex <= 0) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    if (!key || process.env[key]) {
      continue;
    }

    process.env[key] = parseEnvValue(trimmed.slice(separatorIndex + 1));
  }
}

loadEnvFile(path.join(rootDir, '.env'));
loadEnvFile(path.join(rootDir, '.env.local'));

function wait(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function rateLimit(lastAt, minDelay) {
  const now = Date.now();
  const elapsed = now - lastAt;
  return elapsed < minDelay ? minDelay - elapsed : 0;
}

function getAmapWebServiceKey() {
  return (process.env.AMAP_WEB_SERVICE_KEY || process.env.VITE_AMAP_WEB_SERVICE_KEY || '').trim();
}

function parseLngLat(location) {
  const [lngText = '', latText = ''] = String(location || '').split(',');
  const lng = Number(lngText);
  const lat = Number(latText);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }

  return { lat, lng };
}

function buildAddressSegments(parts) {
  return parts
    .map((part) => String(part || '').trim())
    .filter(Boolean)
    .filter((part, index, items) => items.indexOf(part) === index);
}

function toMapCoordinates(location) {
  const parsed = parseLngLat(location);
  if (!parsed) {
    return null;
  }

  return gcj02ToWgs84(parsed.lat, parsed.lng);
}

function toAmapGeocodeResult(item, index) {
  const coords = toMapCoordinates(item.location);
  if (!coords) {
    return null;
  }

  const addressSegments = buildAddressSegments([
    item.formatted_address,
    item.province,
    item.city,
    item.district,
    item.township,
  ]);

  return {
    id: `amap-geo-${index}-${item.adcode || item.location || item.formatted_address || 'result'}`,
    displayName: addressSegments.join('，') || item.formatted_address || '高德地址结果',
    lat: coords.lat,
    lng: coords.lng,
    type: item.level || '地理编码',
    licence: 'AMap Web Service',
  };
}

function toAmapPoiResult(item, index) {
  const coords = toMapCoordinates(item.location);
  if (!coords) {
    return null;
  }

  const regionSegments = buildAddressSegments([item.pname, item.cityname, item.adname]);
  const displaySegments = buildAddressSegments([item.name, item.address, regionSegments.join(' ')]);

  return {
    id: `amap-poi-${index}-${item.id || item.location || item.name || 'result'}`,
    displayName: displaySegments.join('，') || item.name || item.address || '高德地点结果',
    lat: coords.lat,
    lng: coords.lng,
    type: item.type || item.typecode || 'POI',
    licence: 'AMap Web Service',
  };
}

function toAmapInputTip(item, index) {
  const coords = parseLngLat(item.location);
  const mappedCoords = coords ? gcj02ToWgs84(coords.lat, coords.lng) : null;
  const name = String(item.name || '').trim();
  const district = String(item.district || '').trim();
  const address = String(item.address || '').trim();
  const displayName = buildAddressSegments([name, address, district]).join('，') || name || district;

  if (!displayName) {
    return null;
  }

  return {
    id: `amap-tip-${index}-${item.id || item.adcode || name || displayName}`,
    name: name || displayName,
    displayName,
    district,
    address,
    adcode: String(item.adcode || '').trim() || undefined,
    type: item.type || '输入提示',
    lat: mappedCoords?.lat ?? null,
    lng: mappedCoords?.lng ?? null,
  };
}

function dedupeGeocodeResults(results) {
  const seen = new Set();

  return results.filter((result) => {
    const key = `${result.displayName}|${result.lat.toFixed(6)}|${result.lng.toFixed(6)}`;
    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function dedupeInputTips(tips) {
  const seen = new Set();

  return tips.filter((tip) => {
    const lat = Number.isFinite(tip.lat) ? Number(tip.lat).toFixed(6) : 'na';
    const lng = Number.isFinite(tip.lng) ? Number(tip.lng).toFixed(6) : 'na';
    const key = `${tip.displayName}|${lat}|${lng}`;
    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

async function requestAmapJson(pathname, params) {
  const response = await fetch(`${AMAP_WEB_SERVICE_BASE_URL}${pathname}?${params.toString()}`, {
    headers: {
      Accept: 'application/json',
      'User-Agent': 'what-to-eat-today-proxy/1.0 (amap web proxy)',
    },
  });

  if (!response.ok) {
    throw new Error(`高德服务暂时不可用（HTTP ${response.status}）。`);
  }

  return response.json();
}

async function geocodeAddress(query) {
  const normalizedQuery = String(query || '').trim();
  if (!normalizedQuery) {
    return {
      ok: false,
      code: 'EMPTY_QUERY',
      message: '请输入一个完整一些的地址或地名。',
      results: [],
    };
  }

  const cached = geocodeCache.get(normalizedQuery);
  if (cached) {
    return cached;
  }

  const amapKey = getAmapWebServiceKey();
  if (!amapKey) {
    return {
      ok: false,
      code: 'AMAP_KEY_MISSING',
      message: '还没有配置高德 Web 服务 Key，网页端暂时不能做国内精确地址搜索。',
      results: [],
    };
  }

  const delay = rateLimit(lastGeocodeAt, 200);
  if (delay > 0) {
    await wait(delay);
  }
  lastGeocodeAt = Date.now();

  const geoParams = new URLSearchParams({
    key: amapKey,
    address: normalizedQuery,
    output: 'JSON',
  });

  const placeParams = new URLSearchParams({
    key: amapKey,
    keywords: normalizedQuery,
    page_size: '5',
    page_num: '1',
    show_fields: 'business',
  });

  let geocodeItems = [];
  let placeItems = [];
  let latestErrorMessage = '';

  try {
    const geocodePayload = await requestAmapJson('/v3/geocode/geo', geoParams);
    if (String(geocodePayload?.status) === '1') {
      geocodeItems = Array.isArray(geocodePayload?.geocodes) ? geocodePayload.geocodes : [];
    } else {
      latestErrorMessage = String(geocodePayload?.info || '').trim();
    }
  } catch (error) {
    latestErrorMessage = error instanceof Error ? error.message : '高德地理编码请求失败。';
  }

  try {
    const placePayload = await requestAmapJson('/v5/place/text', placeParams);
    if (String(placePayload?.status) === '1') {
      placeItems = Array.isArray(placePayload?.pois) ? placePayload.pois : [];
    } else if (!latestErrorMessage) {
      latestErrorMessage = String(placePayload?.info || '').trim();
    }
  } catch (error) {
    if (!latestErrorMessage) {
      latestErrorMessage = error instanceof Error ? error.message : '高德地点搜索请求失败。';
    }
  }

  const results = dedupeGeocodeResults(
    [
      ...geocodeItems.map((item, index) => toAmapGeocodeResult(item, index)).filter(Boolean),
      ...placeItems.map((item, index) => toAmapPoiResult(item, index)).filter(Boolean),
    ].slice(0, 8)
  ).slice(0, 5);

  if (results.length === 0 && latestErrorMessage) {
    return {
      ok: false,
      code: 'AMAP_REQUEST_FAILED',
      message: latestErrorMessage,
      results: [],
    };
  }

  const result = {
    ok: true,
    source: 'amap-proxy',
    query: normalizedQuery,
    results,
  };

  geocodeCache.set(normalizedQuery, result);
  return result;
}

async function getInputTips(query, location) {
  const normalizedQuery = String(query || '').trim();
  if (normalizedQuery.length < 2) {
    return {
      ok: true,
      source: 'amap-inputtips-proxy',
      query: normalizedQuery,
      tips: [],
    };
  }

  const amapKey = getAmapWebServiceKey();
  if (!amapKey) {
    return {
      ok: false,
      code: 'AMAP_KEY_MISSING',
      message: '还没有配置高德 Web 服务 Key，网页端暂时不能加载地址联想。',
      tips: [],
    };
  }

  const normalizedLocation =
    location &&
    Number.isFinite(location.lat) &&
    Number.isFinite(location.lng)
      ? `${location.lng},${location.lat}`
      : '';

  const cacheKey = `${normalizedQuery}|${normalizedLocation}`;
  const cached = inputTipCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const delay = rateLimit(lastInputTipAt, 180);
  if (delay > 0) {
    await wait(delay);
  }
  lastInputTipAt = Date.now();

  const params = new URLSearchParams({
    key: amapKey,
    keywords: normalizedQuery,
    datatype: 'all',
    citylimit: 'false',
    output: 'JSON',
  });

  if (normalizedLocation) {
    params.set('location', normalizedLocation);
  }

  const payload = await requestAmapJson('/v3/assistant/inputtips', params);
  if (String(payload?.status) !== '1') {
    return {
      ok: false,
      code: 'AMAP_INPUT_TIPS_FAILED',
      message: String(payload?.info || '').trim() || '高德输入提示服务暂时不可用。',
      tips: [],
    };
  }

  const tips = dedupeInputTips(
    (Array.isArray(payload?.tips) ? payload.tips : [])
      .map((item, index) => toAmapInputTip(item, index))
      .filter(Boolean)
  ).slice(0, 8);

  const result = {
    ok: true,
    source: 'amap-inputtips-proxy',
    query: normalizedQuery,
    tips,
  };

  inputTipCache.set(cacheKey, result);
  return result;
}

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Cache-Control': 'no-store',
  });
  response.end(JSON.stringify(payload));
}

const server = http.createServer(async (request, response) => {
  if (!request.url) {
    sendJson(response, 400, { ok: false, code: 'BAD_REQUEST', message: '缺少请求地址。' });
    return;
  }

  if (request.method === 'OPTIONS') {
    response.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    response.end();
    return;
  }

  if (request.method !== 'GET') {
    sendJson(response, 405, { ok: false, code: 'METHOD_NOT_ALLOWED', message: '仅支持 GET 请求。' });
    return;
  }

  const url = new URL(request.url, `http://${host}:${port}`);

  if (url.pathname === '/health') {
    sendJson(response, 200, {
      ok: true,
      service: 'amap-proxy',
      keyConfigured: Boolean(getAmapWebServiceKey()),
    });
    return;
  }

  if (url.pathname === '/api/amap/geocode') {
    try {
      const result = await geocodeAddress(url.searchParams.get('query'));
      sendJson(response, 200, result);
    } catch (error) {
      sendJson(response, 500, {
        ok: false,
        code: 'REQUEST_FAILED',
        message: error instanceof Error ? error.message : '地址搜索代理请求失败。',
        results: [],
      });
    }
    return;
  }

  if (url.pathname === '/api/amap/inputtips') {
    const lat = Number(url.searchParams.get('lat'));
    const lng = Number(url.searchParams.get('lng'));
    const location =
      Number.isFinite(lat) && Number.isFinite(lng)
        ? {
            lat,
            lng,
          }
        : null;

    try {
      const result = await getInputTips(url.searchParams.get('query'), location);
      sendJson(response, 200, result);
    } catch (error) {
      sendJson(response, 500, {
        ok: false,
        code: 'REQUEST_FAILED',
        message: error instanceof Error ? error.message : '输入提示代理请求失败。',
        tips: [],
      });
    }
    return;
  }

  sendJson(response, 404, { ok: false, code: 'NOT_FOUND', message: '未找到对应的代理接口。' });
});

server.listen(port, host, () => {
  console.log(`AMap proxy listening on http://${host}:${port}`);
});
