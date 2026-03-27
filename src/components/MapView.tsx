import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  ArrowLeft,
  ExternalLink,
  LocateFixed,
  Navigation,
  RefreshCw,
} from 'lucide-react';
import { triggerHaptic } from '../utils/sound';
import { FALLBACK_LOCATIONS, FallbackLocation } from '../data/fallbackLocations';

interface MapViewProps {
  onBack: () => void;
}

interface Coordinates {
  lat: number;
  lng: number;
}

interface DemoSpot extends Coordinates {
  id: string;
  name: string;
  description: string;
  tag: string;
  fillColor: string;
  strokeColor: string;
  distanceLabel: string;
}

type BrowserPermissionStateValue = PermissionState | 'unsupported' | 'unknown';

type LocationSource = 'system' | 'saved' | 'manual' | 'default';

const DEFAULT_CENTER: Coordinates = {
  lat: 31.2304,
  lng: 121.4737,
};

const MAP_FALLBACK_STORAGE_KEY = 'wte_map_fallback_location';

const spotTemplates = [
  {
    id: 'home-style',
    name: '家常小炒灵感点',
    description: '适合想吃热乎现炒、下饭菜的时候。',
    tag: '家常菜',
    fillColor: '#fb923c',
    strokeColor: '#c2410c',
    latOffset: 0.0052,
    lngOffset: -0.0046,
  },
  {
    id: 'noodle',
    name: '面馆和馄饨灵感点',
    description: '适合想吃一碗热汤面或小馄饨的时候。',
    tag: '面食',
    fillColor: '#facc15',
    strokeColor: '#a16207',
    latOffset: -0.0048,
    lngOffset: -0.0032,
  },
  {
    id: 'bbq',
    name: '夜宵烧烤灵感点',
    description: '适合晚饭后还想吃点带烟火气的东西。',
    tag: '夜宵',
    fillColor: '#f87171',
    strokeColor: '#b91c1c',
    latOffset: 0.0038,
    lngOffset: 0.0063,
  },
  {
    id: 'light-meal',
    name: '轻食和沙拉灵感点',
    description: '适合今天想吃轻一点、清爽一点的时候。',
    tag: '轻食',
    fillColor: '#4ade80',
    strokeColor: '#15803d',
    latOffset: -0.0054,
    lngOffset: 0.0049,
  },
  {
    id: 'hotpot',
    name: '火锅聚餐灵感点',
    description: '适合想和朋友吃顿热闹的正餐。',
    tag: '聚餐',
    fillColor: '#c084fc',
    strokeColor: '#7e22ce',
    latOffset: 0.0019,
    lngOffset: -0.0074,
  },
];

const toRadians = (value: number) => (value * Math.PI) / 180;

const getDistanceMeters = (from: Coordinates, to: Coordinates) => {
  const earthRadius = 6371000;
  const dLat = toRadians(to.lat - from.lat);
  const dLng = toRadians(to.lng - from.lng);
  const lat1 = toRadians(from.lat);
  const lat2 = toRadians(to.lat);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);

  return Math.round(earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
};

const buildDemoSpots = (center: Coordinates): DemoSpot[] =>
  spotTemplates.map((template) => {
    const nextSpot = {
      lat: center.lat + template.latOffset,
      lng: center.lng + template.lngOffset,
    };

    return {
      id: template.id,
      name: template.name,
      description: template.description,
      tag: template.tag,
      fillColor: template.fillColor,
      strokeColor: template.strokeColor,
      lat: nextSpot.lat,
      lng: nextSpot.lng,
      distanceLabel: `${getDistanceMeters(center, nextSpot)} 米`,
    };
  });

const formatCoordinate = (value: number) => value.toFixed(4);

const createPopupContent = (spot: DemoSpot) =>
  `<div style="min-width:180px;">
    <div style="font-weight:700;color:#7c2d12;margin-bottom:4px;">${spot.name}</div>
    <div style="font-size:12px;color:#57534e;line-height:1.5;">${spot.description}</div>
    <div style="margin-top:8px;font-size:12px;color:#9a3412;">${spot.tag} · ${spot.distanceLabel}</div>
  </div>`;

const getBrowserPermissionStateLabel = (permissionState: BrowserPermissionStateValue) => {
  switch (permissionState) {
    case 'granted':
      return '已允许';
    case 'prompt':
      return '等待授权';
    case 'denied':
      return '已拒绝';
    case 'unsupported':
      return '无法检测';
    default:
      return '检测中';
  }
};

const getBrowserPermissionStateClasses = (permissionState: BrowserPermissionStateValue) => {
  switch (permissionState) {
    case 'granted':
      return 'bg-green-100 text-green-700';
    case 'prompt':
      return 'bg-amber-100 text-amber-700';
    case 'denied':
      return 'bg-red-100 text-red-700';
    default:
      return 'bg-stone-100 text-stone-600';
  }
};

const readSavedFallbackLocation = (): FallbackLocation | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const rawValue = window.localStorage.getItem(MAP_FALLBACK_STORAGE_KEY);
    if (!rawValue) {
      return null;
    }

    const parsed = JSON.parse(rawValue) as FallbackLocation;
    if (
      typeof parsed?.id !== 'string' ||
      typeof parsed?.name !== 'string' ||
      typeof parsed?.region !== 'string' ||
      typeof parsed?.note !== 'string' ||
      typeof parsed?.lat !== 'number' ||
      typeof parsed?.lng !== 'number'
    ) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
};

const buildFallbackLocationFromAddressResult = (
  result: DesktopGeocodeResultItem
): FallbackLocation => {
  const parts = result.displayName
    .split(/[，,]/)
    .map((part: string) => part.trim())
    .filter(Boolean);

  return {
    id: `address-${result.id}`,
    name: parts[0] || '手动地址',
    region: parts[1] || result.type || '地址搜索',
    lat: result.lat,
    lng: result.lng,
    note: result.displayName,
  };
};

const buildFallbackLocationFromInputTip = (tip: DesktopInputTipItem): FallbackLocation | null => {
  if (!Number.isFinite(tip.lat) || !Number.isFinite(tip.lng)) {
    return null;
  }

  return {
    id: `tip-${tip.id}`,
    name: tip.name || '输入提示地点',
    region: tip.district || tip.type || '输入提示',
    lat: Number(tip.lat),
    lng: Number(tip.lng),
    note: tip.displayName,
  };
};

const getBrowserProxyBaseUrl = () => {
  const configuredBaseUrl = import.meta.env.VITE_AMAP_PROXY_BASE_URL?.trim();
  if (configuredBaseUrl) {
    return configuredBaseUrl.replace(/\/$/, '');
  }

  if (
    typeof window !== 'undefined' &&
    (window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost')
  ) {
    return 'http://127.0.0.1:5174/api';
  }

  return '/api';
};

const BROWSER_PROXY_BASE_URL = getBrowserProxyBaseUrl();

const requestBrowserProxyJson = async (pathname: string, params: URLSearchParams) => {
  const response = await fetch(`${BROWSER_PROXY_BASE_URL}${pathname}?${params.toString()}`, {
    headers: {
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`网页端地图代理暂时不可用（HTTP ${response.status}）。`);
  }

  return response.json();
};

const geocodeAddressInBrowser = async (
  query: string
): Promise<DesktopGeocodeSuccessResult | DesktopGeocodeErrorResult> => {
  try {
    const params = new URLSearchParams({
      query: query.trim(),
    });

    return await requestBrowserProxyJson('/amap/geocode', params);
  } catch (error) {
    return {
      ok: false,
      code: 'PROXY_REQUEST_FAILED',
      message: error instanceof Error ? error.message : '网页端地址搜索代理请求失败。',
      results: [],
    };
  }
};

const getInputTipsInBrowser = async (payload: {
  query: string;
  location?: Coordinates;
}): Promise<DesktopInputTipsSuccessResult | DesktopInputTipsErrorResult> => {
  try {
    const params = new URLSearchParams({
      query: payload.query.trim(),
    });

    if (payload.location) {
      params.set('lat', String(payload.location.lat));
      params.set('lng', String(payload.location.lng));
    }

    return await requestBrowserProxyJson('/amap/inputtips', params);
  } catch (error) {
    return {
      ok: false,
      code: 'PROXY_REQUEST_FAILED',
      message: error instanceof Error ? error.message : '网页端输入提示代理请求失败。',
      tips: [],
    };
  }
};

const matchAddressToFallbackLocations = (query: string): DesktopGeocodeResultItem[] => {
  const normalizedQuery = query.trim();
  if (!normalizedQuery) {
    return [];
  }

  return FALLBACK_LOCATIONS.filter(
    (location) =>
      normalizedQuery.includes(location.name) ||
      normalizedQuery.includes(`${location.name}市`) ||
      normalizedQuery.includes(location.region)
  ).map((location) => ({
    id: `fallback-${location.id}`,
    displayName: `${normalizedQuery}（已匹配到 ${location.name} 的兜底中心）`,
    lat: location.lat,
    lng: location.lng,
    type: '城市兜底',
    licence: '',
  }));
};

const MapView: React.FC<MapViewProps> = ({ onBack }) => {
  const mapElementRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerLayerRef = useRef<L.LayerGroup | null>(null);
  const baseTileLayerRef = useRef<L.TileLayer | null>(null);

  const desktopRuntime = window.desktopApp;
  const isElectron = Boolean(desktopRuntime?.isElectron);
  const usesWindowsNativeLocation = desktopRuntime?.location?.provider === 'windows-native';
  const supportsInputTips = isElectron ? Boolean(desktopRuntime?.location?.getInputTips) : true;
  const [savedFallbackLocation, setSavedFallbackLocation] = useState<FallbackLocation | null>(() =>
    readSavedFallbackLocation()
  );

  const [center, setCenter] = useState<Coordinates>(DEFAULT_CENTER);
  const [locationStatus, setLocationStatus] = useState(
    isElectron ? '正在通过 Windows 原生定位获取你附近的位置...' : '正在尝试获取你附近的位置...'
  );
  const [locationAdvice, setLocationAdvice] = useState(
    isElectron
      ? '如果没有成功，通常是 Windows 系统定位服务未开启，或当前设备还没有可用的位置数据。'
      : '如果浏览器弹出定位请求，请选择允许。'
  );
  const [browserPermissionState, setBrowserPermissionState] =
    useState<BrowserPermissionStateValue>('unknown');
  const [hasPreciseLocation, setHasPreciseLocation] = useState(false);
  const [isBaseMapReady, setIsBaseMapReady] = useState(false);
  const [baseMapError, setBaseMapError] = useState('');
  const [locationSource, setLocationSource] = useState<LocationSource>('default');
  const [locationSourceLabel, setLocationSourceLabel] = useState('默认地图中心');
  const [addressQuery, setAddressQuery] = useState('');
  const [inputTips, setInputTips] = useState<DesktopInputTipItem[]>([]);
  const [isInputTipsLoading, setIsInputTipsLoading] = useState(false);
  const [addressResults, setAddressResults] = useState<DesktopGeocodeResultItem[]>([]);
  const [addressSearchMessage, setAddressSearchMessage] = useState('输入国内地址、小区、商场或地标后搜索。');
  const [isAddressSearching, setIsAddressSearching] = useState(false);
  const [activeFallbackLocationId, setActiveFallbackLocationId] = useState<string | null>(
    savedFallbackLocation?.id ?? null
  );
  const [activeFallbackLocation, setActiveFallbackLocation] = useState<FallbackLocation | null>(
    savedFallbackLocation
  );
  const [selectedSpotId, setSelectedSpotId] = useState(spotTemplates[0].id);

  const spots = buildDemoSpots(center);
  const selectedSpot = spots.find((spot) => spot.id === selectedSpotId) ?? spots[0];

  const applyMapCenter = (
    nextCenter: Coordinates,
    options: {
      precise: boolean;
      status: string;
      advice: string;
      source: LocationSource;
      sourceLabel: string;
      fallbackLocationId?: string | null;
      fallbackLocation?: FallbackLocation | null;
      zoom?: number;
    }
  ) => {
    setCenter(nextCenter);
    setHasPreciseLocation(options.precise);
    setLocationStatus(options.status);
    setLocationAdvice(options.advice);
    setLocationSource(options.source);
    setLocationSourceLabel(options.sourceLabel);
    setActiveFallbackLocationId(options.fallbackLocationId ?? null);
    setActiveFallbackLocation(options.fallbackLocation ?? null);
    mapRef.current?.flyTo([nextCenter.lat, nextCenter.lng], options.zoom ?? 13, { duration: 0.8 });
  };

  const persistFallbackLocation = (location: FallbackLocation) => {
    window.localStorage.setItem(MAP_FALLBACK_STORAGE_KEY, JSON.stringify(location));
    setSavedFallbackLocation(location);
  };

  const clearSavedFallbackLocation = () => {
    triggerHaptic();
    const currentSavedLocation = savedFallbackLocation;
    window.localStorage.removeItem(MAP_FALLBACK_STORAGE_KEY);
    setSavedFallbackLocation(null);
    if (locationSource === 'saved' && currentSavedLocation) {
      setLocationSource('manual');
      setLocationSourceLabel('手动地点');
      setLocationStatus(`已经取消 ${currentSavedLocation.name} 的默认地点状态。`);
      setLocationAdvice(`当前位置仍保持在 ${currentSavedLocation.name}，只是以后定位失败时不会再自动回退到这里。`);
      return;
    }
    setLocationAdvice('已经清除保存的默认地点。之后如果定位失败，会先回到地图默认中心。');
  };

  const applyPresetLocation = (
    location: FallbackLocation,
    source: Extract<LocationSource, 'saved' | 'manual'>,
    status?: string,
    advice?: string
  ) => {
    applyMapCenter(
      {
        lat: location.lat,
        lng: location.lng,
      },
      {
        precise: false,
        status:
          status ||
          (source === 'saved'
            ? `这次没有拿到实时位置，已回退到你保存的默认地点：${location.name}。`
            : `已切换到你手动选择的地点：${location.name}。`),
        advice:
          advice ||
          (source === 'saved'
            ? '如果你常用地点变了，可以重新搜索并保存一个新的默认地点。'
            : location.note),
        source,
        sourceLabel: source === 'saved' ? '默认地点' : '手动地点',
        fallbackLocationId: location.id,
        fallbackLocation: location,
        zoom: 13,
      }
    );
  };

  const moveToDefaultCenter = (status: string, advice: string) => {
    if (savedFallbackLocation) {
      applyPresetLocation(
        savedFallbackLocation,
        'saved',
        `${status} 已自动回退到你保存的默认地点。`,
        `${advice} 你也可以重新搜索一个地点。`
      );
      return;
    }

    applyMapCenter(DEFAULT_CENTER, {
      precise: false,
      status,
      advice: `${advice} 你也可以搜索一个常用地点，并把它保存成默认地点。`,
      source: 'default',
      sourceLabel: '默认地图中心',
      fallbackLocation: null,
      zoom: 13,
    });
  };

  const handleUseSavedFallbackLocation = () => {
    if (!savedFallbackLocation) {
      return;
    }

    triggerHaptic();
    applyPresetLocation(
      savedFallbackLocation,
      'saved',
      `已切换到你保存的默认地点：${savedFallbackLocation.name}。`,
      '如果你最近常用地点变了，也可以重新搜索一个地点再保存。'
    );
  };

  const handleSaveCurrentFallbackLocation = () => {
    const locationToSave = activeFallbackLocation;

    if (!locationToSave) {
      return;
    }

    triggerHaptic();
    persistFallbackLocation(locationToSave);
    setLocationAdvice(`已经把 ${locationToSave.name} 保存成默认地点。以后定位失败时会优先回退到这里。`);
  };

  const focusSpot = (spot: DemoSpot) => {
    triggerHaptic();
    setSelectedSpotId(spot.id);

    const map = mapRef.current;
    if (!map) {
      return;
    }

    map.flyTo([spot.lat, spot.lng], 16, { duration: 0.8 });
    L.popup({ offset: L.point(0, -6) })
      .setLatLng([spot.lat, spot.lng])
      .setContent(createPopupContent(spot))
      .openOn(map);
  };

  const recenterMap = () => {
    triggerHaptic();
    const map = mapRef.current;
    if (!map) {
      return;
    }

    map.flyTo([center.lat, center.lng], hasPreciseLocation ? 15 : 13, { duration: 0.8 });
  };

  const refreshBaseMap = () => {
    triggerHaptic();
    setBaseMapError('');
    setIsBaseMapReady(false);
    mapRef.current?.invalidateSize();
    baseTileLayerRef.current?.redraw();
  };

  const openSystemLocationSettings = async () => {
    triggerHaptic();
    try {
      await desktopRuntime?.location?.openSystemLocationSettings?.();
    } catch {
      setLocationAdvice('没能直接打开系统定位设置，请在 Windows 设置里手动搜索“位置隐私”。');
    }
  };

  const runAddressSearch = async (
    rawKeyword: string,
    options?: {
      loadingMessage?: string;
      emptyMessage?: string;
    }
  ) => {
    const keyword = rawKeyword.trim();
    if (!keyword) {
      setAddressSearchMessage(
        options?.emptyMessage || '先输入一个国内地址或地标，比如“上海市静安区南京西路”或“北京三里屯太古里”。'
      );
      setAddressResults([]);
      return;
    }

    setIsAddressSearching(true);
    setInputTips([]);
    setAddressSearchMessage(options?.loadingMessage || '正在搜索地址，请稍等...');

    try {
      const result = isElectron
        ? await desktopRuntime?.location?.geocodeAddress(keyword)
        : await geocodeAddressInBrowser(keyword);

      if (!result?.ok) {
        const localMatches = matchAddressToFallbackLocations(keyword);
        if (localMatches.length > 0) {
          setAddressResults(localMatches);
          setAddressSearchMessage(
            `${result?.message || '在线地址搜索失败了。'} 先按你输入的地址匹配到城市中心，你可以先选一个兜底结果。`
          );
          return;
        }

        setAddressResults([]);
        setAddressSearchMessage(result?.message || '地址搜索失败了，请稍后再试。');
        return;
      }

      if (result.results.length === 0) {
        const localMatches = matchAddressToFallbackLocations(keyword);
        if (localMatches.length > 0) {
          setAddressResults(localMatches);
          setAddressSearchMessage('没有找到更精确的地址，先按城市名给你匹配了兜底中心。');
          return;
        }

        setAddressResults([]);
        setAddressSearchMessage('没有找到匹配的国内地址，试试补充城市、区县、商圈、路名或门牌号。');
        return;
      }

      setAddressResults(result.results);
      setAddressSearchMessage('已找到候选地点，点一个结果就能把地图切过去。');
    } catch {
      setAddressResults([]);
      setAddressSearchMessage('地址搜索失败了，请检查网络后再试。');
    } finally {
      setIsAddressSearching(false);
    }
  };

  const handleAddressSearch = async () => {
    triggerHaptic();
    await runAddressSearch(addressQuery);
  };

  const handleChooseInputTip = async (tip: DesktopInputTipItem) => {
    triggerHaptic();
    setAddressQuery(tip.name || tip.displayName);
    setInputTips([]);

    const fallbackLocation = buildFallbackLocationFromInputTip(tip);
    if (fallbackLocation) {
      setAddressResults([]);
      applyMapCenter(
        {
          lat: fallbackLocation.lat,
          lng: fallbackLocation.lng,
        },
        {
          precise: false,
          status: `已切换到输入提示匹配的位置：${fallbackLocation.name}。`,
          advice: fallbackLocation.note,
          source: 'manual',
          sourceLabel: '输入提示',
          fallbackLocationId: fallbackLocation.id,
          fallbackLocation,
          zoom: 15,
        }
      );
      setAddressSearchMessage('已根据输入提示切到候选位置。');
      return;
    }

    await runAddressSearch(tip.name || tip.displayName, {
      loadingMessage: '正在根据输入提示继续搜索更精确的位置...',
      emptyMessage: '这个输入提示还不够完整，可以补充城市、区县或路名后再搜。',
    });
  };

  const handleChooseAddressResult = (result: DesktopGeocodeResultItem) => {
    const fallbackLocation = buildFallbackLocationFromAddressResult(result);

    triggerHaptic();
    setInputTips([]);
    applyMapCenter(
      {
        lat: fallbackLocation.lat,
        lng: fallbackLocation.lng,
      },
      {
        precise: false,
        status: `已切换到你手动输入的地址：${fallbackLocation.name}。`,
        advice: fallbackLocation.note,
        source: 'manual',
        sourceLabel: '手动地址',
        fallbackLocationId: fallbackLocation.id,
        fallbackLocation,
        zoom: 15,
      }
    );
  };

  const locateUser = async (manual = false) => {
    if (manual) {
      triggerHaptic();
    }

    if (usesWindowsNativeLocation) {
      setLocationStatus('正在通过 Windows 原生定位获取当前坐标...');
      setLocationAdvice('如果失败，通常是系统定位服务关闭，或 Windows 还没有拿到可用位置。');

      try {
        const result = await desktopRuntime?.location?.getCurrentPosition();
        if (result?.ok) {
          const nextCenter = {
            lat: result.coords.lat,
            lng: result.coords.lng,
          };

          applyMapCenter(nextCenter, {
            precise: true,
            status: '已经通过 Windows 原生定位到你附近。',
            advice:
              result.coords.accuracy && Number.isFinite(result.coords.accuracy)
                ? `当前定位精度约 ${Math.round(result.coords.accuracy)} 米。`
                : '这次定位成功了，你可以点“重新定位”再次刷新。',
            source: 'system',
            sourceLabel: '系统实时定位',
            zoom: 15,
          });
          return;
        }

        switch (result?.code) {
          case 'START_FAILED':
            moveToDefaultCenter(
              'Windows 原生定位服务没能启动，先展示默认地图中心。',
              '请先确认 Windows 的“位置服务”已经开启，然后再点“重新定位”。'
            );
            return;
          case 'LOCATION_UNKNOWN':
            moveToDefaultCenter(
              'Windows 还没有返回可用的位置数据，先展示默认地图中心。',
              '这通常表示系统定位服务关闭、设备暂时拿不到位置，或当前位置没有稳定的定位来源。'
            );
            return;
          case 'UNSUPPORTED':
            moveToDefaultCenter(
              '当前系统暂未接入原生定位，先展示默认地图中心。',
              '这版原生定位目前只接入了 Windows。'
            );
            return;
          default:
            moveToDefaultCenter(
              '原生定位没有成功完成，先展示默认地图中心。',
              result?.message || '可以先检查系统定位开关，然后再试一次。'
            );
            return;
        }
      } catch {
        moveToDefaultCenter(
          '原生定位请求失败，先展示默认地图中心。',
          '可以先检查系统定位开关，然后再试一次。'
        );
        return;
      }
    }

    if (!navigator.geolocation) {
      moveToDefaultCenter(
        '当前环境不支持定位，先展示默认地图原型。',
        '可以先继续看地图原型，后面再接更稳定的定位或地图服务。'
      );
      return;
    }

    setLocationStatus('正在获取浏览器定位权限和当前坐标...');
    setLocationAdvice('如果短时间内没有结果，可能是系统定位服务关闭、浏览器权限未允许或请求超时。');

    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const nextCenter = {
          lat: coords.latitude,
          lng: coords.longitude,
        };

        applyMapCenter(nextCenter, {
          precise: true,
          status: '已经定位到你附近，地图点位会围绕当前位置刷新。',
          advice: '这次定位成功了。如果你移动位置，可以点“重新定位”刷新。',
          source: 'system',
          sourceLabel: '系统实时定位',
          zoom: 15,
        });
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          moveToDefaultCenter(
            '浏览器定位权限被拒绝了，当前先展示默认地图中心。',
            '请允许页面访问位置；如果之前点过拒绝，需要到浏览器站点设置里重新开启。'
          );
          return;
        }

        if (error.code === error.POSITION_UNAVAILABLE) {
          moveToDefaultCenter(
            '系统暂时拿不到可用的位置数据，先展示默认地图中心。',
            '这通常表示系统定位服务未开启、网络定位不可用，或当前环境还拿不到稳定定位结果。'
          );
          return;
        }

        if (error.code === error.TIMEOUT) {
          moveToDefaultCenter(
            '定位超时了，先展示默认地图中心。',
            '可以稍后点“重新定位”再试一次，或者检查系统定位服务与网络连接。'
          );
          return;
        }

        moveToDefaultCenter(
          '定位没有成功完成，先展示默认地图中心。',
          '这次失败原因未明确返回，可以先检查系统定位开关。'
        );
      },
      {
        enableHighAccuracy: true,
        timeout: 8000,
        maximumAge: 300000,
      }
    );
  };

  useEffect(() => {
    if (usesWindowsNativeLocation) {
      setBrowserPermissionState('unsupported');
      return;
    }

    if (!navigator.permissions?.query) {
      setBrowserPermissionState('unsupported');
      return;
    }

    let disposed = false;
    let permissionStatus: PermissionStatus | null = null;

    navigator.permissions
      .query({ name: 'geolocation' as PermissionName })
      .then((status) => {
        if (disposed) {
          return;
        }

        permissionStatus = status;
        setBrowserPermissionState(status.state);
        status.onchange = () => {
          if (!disposed) {
            setBrowserPermissionState(status.state);
          }
        };
      })
      .catch(() => {
        if (!disposed) {
          setBrowserPermissionState('unsupported');
        }
      });

    return () => {
      disposed = true;
      if (permissionStatus) {
        permissionStatus.onchange = null;
      }
    };
  }, [usesWindowsNativeLocation]);

  useEffect(() => {
    if (!supportsInputTips) {
      setInputTips([]);
      setIsInputTipsLoading(false);
      return;
    }

    const keyword = addressQuery.trim();
    if (keyword.length < 2) {
      setInputTips([]);
      setIsInputTipsLoading(false);
      return;
    }

    let disposed = false;
    const timer = window.setTimeout(() => {
      setIsInputTipsLoading(true);
      const request =
        isElectron && desktopRuntime?.location?.getInputTips
          ? desktopRuntime.location.getInputTips({
              query: keyword,
              location: center,
            })
          : getInputTipsInBrowser({
              query: keyword,
              location: center,
            });

      request
        .then((result) => {
          if (disposed) {
            return;
          }

          setInputTips(result?.ok ? result.tips : []);
        })
        .catch(() => {
          if (!disposed) {
            setInputTips([]);
          }
        })
        .finally(() => {
          if (!disposed) {
            setIsInputTipsLoading(false);
          }
        });
    }, 220);

    return () => {
      disposed = true;
      window.clearTimeout(timer);
    };
  }, [addressQuery, center, desktopRuntime?.location, isElectron, supportsInputTips]);

  useEffect(() => {
    if (!mapElementRef.current || mapRef.current) {
      return;
    }

    const map = L.map(mapElementRef.current, {
      zoomControl: false,
      preferCanvas: true,
    }).setView([DEFAULT_CENTER.lat, DEFAULT_CENTER.lng], 13);

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    const tileLayer = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);

    let tileErrorCount = 0;
    tileLayer.on('load', () => {
      tileErrorCount = 0;
      setIsBaseMapReady(true);
      setBaseMapError('');
    });
    tileLayer.on('tileerror', () => {
      tileErrorCount += 1;
      if (tileErrorCount >= 4) {
        setBaseMapError('网页端底图暂时没有加载出来，可以点右上角按钮再试一次。');
      }
    });

    mapRef.current = map;
    baseTileLayerRef.current = tileLayer;

    const invalidate = () => {
      map.invalidateSize();
    };

    const timeoutIds = [
      window.setTimeout(invalidate, 0),
      window.setTimeout(invalidate, 180),
      window.setTimeout(invalidate, 420),
    ];

    const resizeHandler = () => {
      map.invalidateSize();
    };
    window.addEventListener('resize', resizeHandler);

    const resizeObserver =
      typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(() => {
            map.invalidateSize();
          })
        : null;

    if (resizeObserver && mapElementRef.current) {
      resizeObserver.observe(mapElementRef.current);
    }

    void locateUser();

    return () => {
      timeoutIds.forEach((timeoutId) => window.clearTimeout(timeoutId));
      window.removeEventListener('resize', resizeHandler);
      resizeObserver?.disconnect();
      markerLayerRef.current?.remove();
      markerLayerRef.current = null;
      baseTileLayerRef.current = null;
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) {
      return;
    }

    markerLayerRef.current?.remove();

    const layer = L.layerGroup().addTo(map);

    L.circle([center.lat, center.lng], {
      radius: 420,
      color: '#fb923c',
      weight: 1.5,
      fillColor: '#fdba74',
      fillOpacity: 0.14,
    }).addTo(layer);

    L.circleMarker([center.lat, center.lng], {
      radius: 9,
      color: '#1d4ed8',
      weight: 3,
      fillColor: '#60a5fa',
      fillOpacity: 0.95,
    })
      .addTo(layer)
      .bindPopup(
        hasPreciseLocation
          ? '这里是你当前附近的位置。'
          : locationSource === 'saved'
            ? '这里是你保存的默认地点。'
            : locationSource === 'manual'
              ? '这里是你手动选择的位置。'
              : '这里是默认展示的地图中心。'
      );

    for (const spot of spots) {
      const isSelected = spot.id === selectedSpotId;
      const marker = L.circleMarker([spot.lat, spot.lng], {
        radius: isSelected ? 10 : 8,
        color: isSelected ? '#7c2d12' : spot.strokeColor,
        weight: isSelected ? 3 : 2,
        fillColor: spot.fillColor,
        fillOpacity: 0.92,
      }).addTo(layer);

      marker.bindPopup(createPopupContent(spot));
      marker.on('click', () => {
        setSelectedSpotId(spot.id);
      });
    }

    markerLayerRef.current = layer;
    window.requestAnimationFrame(() => {
      map.invalidateSize();
    });
  }, [center, hasPreciseLocation, locationSource, selectedSpotId]);

  return (
    <div className="w-full max-w-6xl pb-4">
      <section className="relative overflow-hidden rounded-[32px] border border-orange-100 bg-white shadow-2xl shadow-orange-100/70">
        <div ref={mapElementRef} className="h-[68vh] min-h-[620px] w-full md:h-[74vh]" />

        {!isBaseMapReady && !baseMapError && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-orange-50/80 text-sm font-semibold text-orange-700 backdrop-blur-[1px]">
            正在加载地图...
          </div>
        )}

        {baseMapError && (
          <div className="absolute inset-0 flex items-center justify-center bg-orange-50/90 px-6 text-center">
            <div className="max-w-sm rounded-3xl border border-orange-200 bg-white/95 p-5 shadow-lg shadow-orange-100">
              <p className="text-sm font-semibold text-gray-900">{baseMapError}</p>
              <button
                onClick={refreshBaseMap}
                className="mt-4 inline-flex items-center justify-center rounded-full bg-orange-500 px-4 py-2 text-sm font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-orange-600"
              >
                重新加载地图
              </button>
            </div>
          </div>
        )}

        <div className="absolute left-4 right-4 top-4 z-[500]">
          <div className="pointer-events-auto w-full max-w-sm">
            <div className="flex gap-2">
              <input
                value={addressQuery}
                onChange={(event) => {
                  setAddressQuery(event.target.value);
                  setAddressResults([]);
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    void handleAddressSearch();
                  }
                }}
                placeholder="比如：上海市静安区南京西路 / 北京三里屯太古里"
                className="min-w-0 flex-1 rounded-2xl border border-orange-100 bg-white px-3 py-2 text-sm text-gray-700 outline-none transition-colors focus:border-orange-300"
              />
              <button
                onClick={() => {
                  void handleAddressSearch();
                }}
                disabled={isAddressSearching}
                className="rounded-2xl bg-orange-500 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-orange-100 transition-all hover:-translate-y-0.5 hover:bg-orange-600 disabled:translate-y-0 disabled:cursor-not-allowed disabled:bg-orange-300"
              >
                {isAddressSearching ? '搜索中' : '搜索'}
              </button>
            </div>

            {supportsInputTips && addressQuery.trim().length >= 2 && (
              <div className="mt-3">
                {inputTips.length > 0 && (
                  <div className="mt-2 max-h-[24vh] space-y-2 overflow-y-auto pr-1 custom-scrollbar">
                    {inputTips.map((tip) => (
                      <button
                        key={tip.id}
                        onClick={() => {
                          void handleChooseInputTip(tip);
                        }}
                        className="w-full rounded-2xl border border-transparent bg-white/70 px-3 py-3 text-left transition-all hover:border-orange-200 hover:bg-white"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-sm font-semibold text-gray-900">{tip.name}</span>
                          <span className="rounded-full bg-stone-100 px-2 py-1 text-[10px] font-semibold text-stone-600">
                            {tip.lat != null && tip.lng != null ? '可直达' : '联想'}
                          </span>
                        </div>
                        <p className="mt-1 text-xs leading-5 text-gray-500">{tip.displayName}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {addressResults.length > 0 && (
              <div className="mt-3 max-h-[26vh] space-y-2 overflow-y-auto pr-1 custom-scrollbar">
                {addressResults.map((result) => {
                  const isActive = activeFallbackLocationId === `address-${result.id}`;

                  return (
                    <button
                      key={result.id}
                      onClick={() => handleChooseAddressResult(result)}
                      className={`w-full rounded-2xl border px-3 py-3 text-left transition-all ${
                        isActive
                          ? 'border-orange-300 bg-white shadow-md shadow-orange-100'
                          : 'border-transparent bg-white/70 hover:border-orange-200 hover:bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm font-semibold text-gray-900">
                          {buildFallbackLocationFromAddressResult(result).name}
                        </span>
                        <span className="rounded-full bg-stone-100 px-2 py-1 text-[10px] font-semibold text-stone-600">
                          {result.type}
                        </span>
                      </div>
                      <p className="mt-1 text-xs leading-5 text-gray-500">{result.displayName}</p>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </section>

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_360px]">
        <section className="rounded-[28px] border border-orange-100 bg-white/90 p-5 shadow-xl shadow-orange-100/70 backdrop-blur-md">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold text-gray-900">位置与默认地点</h2>
              <p className="mt-2 text-sm leading-6 text-gray-600">{locationStatus}</p>
              <p className="mt-1 text-xs leading-5 text-gray-500">{locationAdvice}</p>
              <p className="mt-2 text-xs text-gray-500">
                {locationSourceLabel} · {usesWindowsNativeLocation ? 'Windows 原生定位' : '浏览器定位'} · 中心点：
                {' '}
                {formatCoordinate(center.lat)}, {formatCoordinate(center.lng)}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => {
                  triggerHaptic();
                  onBack();
                }}
                className="inline-flex items-center rounded-full bg-white px-4 py-3 text-sm font-semibold text-gray-700 shadow-md shadow-orange-100 transition-all hover:-translate-y-0.5 hover:text-orange-600"
              >
                <ArrowLeft size={18} className="mr-2" />
                返回
              </button>
              <button
                onClick={() => {
                  void locateUser(true);
                }}
                className="inline-flex items-center rounded-full bg-orange-500 px-4 py-3 text-sm font-semibold text-white shadow-md shadow-orange-100 transition-all hover:-translate-y-0.5 hover:bg-orange-600"
              >
                <LocateFixed size={18} className="mr-2" />
                重新定位
              </button>
              <button
                onClick={recenterMap}
                className="inline-flex items-center rounded-full bg-white px-4 py-3 text-sm font-semibold text-gray-700 shadow-md shadow-orange-100 transition-all hover:-translate-y-0.5 hover:text-orange-600"
              >
                <RefreshCw size={18} className="mr-2" />
                回到当前位置
              </button>
              {usesWindowsNativeLocation && (
                <button
                  onClick={() => {
                    void openSystemLocationSettings();
                  }}
                  className="inline-flex items-center rounded-full bg-stone-100 px-4 py-3 text-sm font-semibold text-gray-700 transition-all hover:-translate-y-0.5 hover:bg-white hover:text-orange-600"
                >
                  <ExternalLink size={16} className="mr-2" />
                  Windows 定位设置
                </button>
              )}
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {savedFallbackLocation ? (
              <button
                onClick={handleUseSavedFallbackLocation}
                className="inline-flex items-center rounded-full bg-orange-500 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-orange-100 transition-all hover:-translate-y-0.5 hover:bg-orange-600"
              >
                使用默认地点：{savedFallbackLocation.name}
              </button>
            ) : (
              <span className="rounded-full bg-stone-100 px-3 py-2 text-sm font-semibold text-stone-500">
                还没有保存默认地点
              </span>
            )}

            {activeFallbackLocationId && locationSource !== 'saved' && !hasPreciseLocation && (
              <button
                onClick={handleSaveCurrentFallbackLocation}
                className="inline-flex items-center rounded-full bg-white px-4 py-2 text-sm font-semibold text-orange-600 shadow-md shadow-orange-100 transition-all hover:-translate-y-0.5 hover:text-orange-700"
              >
                保存当前地点为默认地点
              </button>
            )}

            {savedFallbackLocation && (
              <button
                onClick={clearSavedFallbackLocation}
                className="inline-flex items-center rounded-full bg-stone-100 px-4 py-2 text-sm font-semibold text-stone-600 transition-colors hover:bg-stone-200"
              >
                清除默认地点
              </button>
            )}
          </div>
        </section>

        <aside className="rounded-[28px] border border-orange-100 bg-white/90 p-5 shadow-xl shadow-orange-100/70 backdrop-blur-md">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-lg font-bold text-gray-900">附近点位</h3>
            <span className="text-xs text-gray-400">{spots.length} 个</span>
          </div>

          <div className="max-h-[420px] space-y-3 overflow-y-auto pr-1 custom-scrollbar">
            {spots.map((spot) => {
              const isActive = spot.id === selectedSpotId;

              return (
                <button
                  key={spot.id}
                  onClick={() => focusSpot(spot)}
                  className={`w-full rounded-3xl border p-4 text-left transition-all ${
                    isActive
                      ? 'border-orange-300 bg-orange-50 shadow-md shadow-orange-100'
                      : 'border-transparent bg-stone-50 hover:border-orange-200 hover:bg-white'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-base font-semibold text-gray-900">{spot.name}</p>
                    </div>
                    <span
                      className="rounded-full px-2 py-1 text-xs font-semibold"
                      style={{
                        color: spot.strokeColor,
                        backgroundColor: `${spot.fillColor}26`,
                      }}
                    >
                      {spot.tag}
                    </span>
                  </div>

                  <div className="mt-3 flex items-center text-xs text-gray-500">
                    <Navigation size={14} className="mr-2" />
                    约 {spot.distanceLabel}
                  </div>
                </button>
              );
            })}
          </div>
        </aside>
      </div>
    </div>
  );
};

export default MapView;
