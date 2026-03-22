import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  ArrowLeft,
  ExternalLink,
  LocateFixed,
  MapPinned,
  Navigation,
  RefreshCw,
  Search,
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
    .split(',')
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

const geocodeAddressInBrowser = async (
  query: string
): Promise<DesktopGeocodeSuccessResult | DesktopGeocodeErrorResult> => {
  const params = new URLSearchParams({
    q: query.trim(),
    format: 'jsonv2',
    addressdetails: '1',
    limit: '5',
    dedupe: '1',
  });

  const response = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`, {
    headers: {
      'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.6',
    },
  });

  if (!response.ok) {
    return {
      ok: false,
      code: 'HTTP_ERROR',
      message: `地址搜索服务暂时不可用（HTTP ${response.status}）。`,
      results: [],
    };
  }

  const payload = await response.json();
  const results = Array.isArray(payload)
    ? payload
        .map((item) => ({
          id: `${item.place_id ?? item.osm_id ?? item.display_name}`,
          displayName: item.display_name,
          lat: Number(item.lat),
          lng: Number(item.lon),
          type: item.type || item.addresstype || item.category || '地点',
          licence: item.licence || '',
        }))
        .filter((item) => Number.isFinite(item.lat) && Number.isFinite(item.lng))
    : [];

  return {
    ok: true,
    source: 'nominatim',
    query: query.trim(),
    results,
  };
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

  const desktopRuntime = window.desktopApp;
  const isElectron = Boolean(desktopRuntime?.isElectron);
  const usesWindowsNativeLocation = desktopRuntime?.location?.provider === 'windows-native';
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
  const [locationSource, setLocationSource] = useState<LocationSource>('default');
  const [locationSourceLabel, setLocationSourceLabel] = useState('默认地图中心');
  const [manualQuery, setManualQuery] = useState('');
  const [addressQuery, setAddressQuery] = useState('');
  const [addressResults, setAddressResults] = useState<DesktopGeocodeResultItem[]>([]);
  const [addressSearchMessage, setAddressSearchMessage] = useState('输入地址后点击搜索，再从结果里选择一个位置。');
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
  const filteredFallbackLocations = FALLBACK_LOCATIONS.filter((location) => {
    const keyword = manualQuery.trim().toLowerCase();
    if (!keyword) {
      return true;
    }

    return `${location.name} ${location.region} ${location.note}`.toLowerCase().includes(keyword);
  });

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
      setLocationSourceLabel('手动城市');
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
            : `已切换到你手动选择的城市：${location.name}。`),
        advice:
          advice ||
          (source === 'saved'
            ? '如果你换了常驻区域，可以在下面重新选择并保存一个新的默认地点。'
            : location.note),
        source,
        sourceLabel: source === 'saved' ? '默认地点' : '手动城市',
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
        `${advice} 你也可以在下面换成别的城市。`
      );
      return;
    }

    applyMapCenter(DEFAULT_CENTER, {
      precise: false,
      status,
      advice: `${advice} 你也可以在下面手动选择一个城市作为兜底地点。`,
      source: 'default',
      sourceLabel: '默认地图中心',
      fallbackLocation: null,
      zoom: 13,
    });
  };

  const handleChooseFallbackLocation = (location: FallbackLocation) => {
    triggerHaptic();
    applyPresetLocation(location, 'manual');
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
      '如果你最近常驻地点变了，也可以在下面换一个城市再保存。'
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

  const openSystemLocationSettings = async () => {
    triggerHaptic();
    try {
      await desktopRuntime?.location?.openSystemLocationSettings?.();
    } catch {
      setLocationAdvice('没能直接打开系统定位设置，请在 Windows 设置里手动搜索“位置隐私”。');
    }
  };

  const handleAddressSearch = async () => {
    const keyword = addressQuery.trim();
    if (!keyword) {
      setAddressSearchMessage('先输入一个完整一些的地址，比如“上海市静安区南京西路”。');
      setAddressResults([]);
      return;
    }

    triggerHaptic();
    setIsAddressSearching(true);
    setAddressSearchMessage('正在搜索地址，请稍等...');

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
        setAddressSearchMessage('没有找到匹配的地址，试试补充区县、商圈、路名或门牌号。');
        return;
      }

      setAddressResults(result.results);
      setAddressSearchMessage('已找到候选地址，点一个结果就能把地图切过去。');
    } catch {
      setAddressResults([]);
      setAddressSearchMessage('地址搜索失败了，请检查网络后再试。');
    } finally {
      setIsAddressSearching(false);
    }
  };

  const handleChooseAddressResult = (result: DesktopGeocodeResultItem) => {
    const fallbackLocation = buildFallbackLocationFromAddressResult(result);

    triggerHaptic();
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
    if (!mapElementRef.current || mapRef.current) {
      return;
    }

    const map = L.map(mapElementRef.current, {
      zoomControl: false,
      preferCanvas: true,
    }).setView([DEFAULT_CENTER.lat, DEFAULT_CENTER.lng], 13);

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);

    mapRef.current = map;
    window.requestAnimationFrame(() => {
      map.invalidateSize();
    });

    void locateUser();

    return () => {
      markerLayerRef.current?.remove();
      markerLayerRef.current = null;
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
              ? '这里是你手动选择的城市中心。'
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
    <div className="w-full max-w-6xl animate-scaleIn pb-4">
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <button
          onClick={() => {
            triggerHaptic();
            onBack();
          }}
          className="inline-flex items-center justify-center rounded-full bg-white px-5 py-3 text-sm font-semibold text-gray-700 shadow-lg shadow-orange-100 transition-all hover:-translate-y-0.5 hover:text-orange-600"
        >
          <ArrowLeft size={18} className="mr-2" />
          返回主界面
        </button>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => {
              void locateUser(true);
            }}
            className="inline-flex items-center justify-center rounded-full bg-orange-500 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-orange-200 transition-all hover:-translate-y-0.5 hover:bg-orange-600"
          >
            <LocateFixed size={18} className="mr-2" />
            重新定位
          </button>
          <button
            onClick={recenterMap}
            className="inline-flex items-center justify-center rounded-full bg-white px-5 py-3 text-sm font-semibold text-gray-700 shadow-lg shadow-orange-100 transition-all hover:-translate-y-0.5 hover:text-orange-600"
          >
            <RefreshCw size={18} className="mr-2" />
            回到当前位置
          </button>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="rounded-[28px] border border-orange-100 bg-white/90 p-5 shadow-xl shadow-orange-100/70 backdrop-blur-md">
          <h2 className="text-2xl font-bold text-gray-900">附近地图</h2>

          <div className="mt-4 rounded-3xl bg-orange-50 p-4">
            <div className="flex items-start gap-3">
              <div className="mt-1 rounded-full bg-orange-500 p-2 text-white">
                <MapPinned size={16} />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold text-gray-900">当前位置状态</p>
                  <span className="rounded-full bg-stone-100 px-2 py-1 text-xs font-semibold text-stone-700">
                    {usesWindowsNativeLocation ? 'Windows 原生定位' : '浏览器定位'}
                  </span>
                  <span className="rounded-full bg-orange-100 px-2 py-1 text-xs font-semibold text-orange-700">
                    来源：{locationSourceLabel}
                  </span>
                  {!usesWindowsNativeLocation && (
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-semibold ${getBrowserPermissionStateClasses(browserPermissionState)}`}
                    >
                      权限：{getBrowserPermissionStateLabel(browserPermissionState)}
                    </span>
                  )}
                </div>
                <p className="mt-2 text-sm leading-6 text-gray-700">{locationStatus}</p>
                <p className="mt-2 text-xs text-gray-500">
                  中心点：{formatCoordinate(center.lat)}, {formatCoordinate(center.lng)}
                </p>
              </div>
            </div>
          </div>

          {usesWindowsNativeLocation && (
            <button
              onClick={() => {
                void openSystemLocationSettings();
              }}
              className="mt-4 inline-flex items-center rounded-full bg-white px-4 py-3 text-sm font-semibold text-gray-700 shadow-lg shadow-orange-100 transition-all hover:-translate-y-0.5 hover:text-orange-600"
            >
              <ExternalLink size={16} className="mr-2" />
              打开 Windows 定位设置
            </button>
          )}

          <div className="mt-4 rounded-3xl border border-orange-100 bg-white p-4 shadow-lg shadow-orange-50">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-gray-900">手动位置</p>
              {savedFallbackLocation && (
                <button
                  onClick={clearSavedFallbackLocation}
                  className="rounded-full bg-stone-100 px-3 py-2 text-xs font-semibold text-stone-600 transition-colors hover:bg-stone-200"
                >
                  清除默认地点
                </button>
              )}
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {savedFallbackLocation ? (
                <button
                  onClick={handleUseSavedFallbackLocation}
                  className="inline-flex items-center rounded-full bg-orange-500 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-orange-100 transition-all hover:-translate-y-0.5 hover:bg-orange-600"
                >
                  使用默认地点：{savedFallbackLocation.name}
                </button>
              ) : (
                <span className="rounded-full bg-stone-100 px-3 py-2 text-xs font-semibold text-stone-500">
                  还没有保存默认地点
                </span>
              )}

              {activeFallbackLocationId && locationSource !== 'saved' && !hasPreciseLocation && (
                <button
                  onClick={handleSaveCurrentFallbackLocation}
                  className="inline-flex items-center rounded-full bg-white px-4 py-2 text-xs font-semibold text-orange-600 shadow-md shadow-orange-100 transition-all hover:-translate-y-0.5 hover:text-orange-700"
                >
                  保存当前地点为默认地点
                </button>
              )}
            </div>

            <div className="mt-4 rounded-2xl bg-orange-50 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                <Search size={16} className="text-orange-500" />
                手动输入地址
              </div>

              <div className="mt-3 flex gap-2">
                <input
                  value={addressQuery}
                  onChange={(event) => setAddressQuery(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      void handleAddressSearch();
                    }
                  }}
                  placeholder="比如：上海市静安区南京西路"
                  className="min-w-0 flex-1 rounded-2xl border border-orange-100 bg-white px-4 py-3 text-sm text-gray-700 outline-none transition-colors focus:border-orange-300"
                />
                <button
                  onClick={() => {
                    void handleAddressSearch();
                  }}
                  disabled={isAddressSearching}
                  className="rounded-2xl bg-orange-500 px-4 py-3 text-sm font-semibold text-white shadow-md shadow-orange-100 transition-all hover:-translate-y-0.5 hover:bg-orange-600 disabled:translate-y-0 disabled:cursor-not-allowed disabled:bg-orange-300"
                >
                  {isAddressSearching ? '搜索中' : '搜索'}
                </button>
              </div>

              <p className="mt-3 text-xs text-gray-500">{addressSearchMessage}</p>

              {addressResults.length > 0 && (
                <div className="mt-3 space-y-2">
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

            <div className="mt-4 rounded-2xl bg-stone-50 p-3">
              <label className="flex items-center gap-2 text-xs font-semibold text-stone-500">
                <Search size={14} />
                城市
              </label>
              <input
                value={manualQuery}
                onChange={(event) => setManualQuery(event.target.value)}
                placeholder="输入城市名"
                className="mt-2 w-full rounded-2xl border border-orange-100 bg-white px-4 py-3 text-sm text-gray-700 outline-none transition-colors focus:border-orange-300"
              />
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              {filteredFallbackLocations.slice(0, 8).map((location) => {
                const isActive = activeFallbackLocationId === location.id;
                const isSaved = savedFallbackLocation?.id === location.id;

                return (
                  <button
                    key={location.id}
                    onClick={() => handleChooseFallbackLocation(location)}
                    className={`rounded-2xl border px-3 py-3 text-left transition-all ${
                      isActive
                        ? 'border-orange-300 bg-orange-50 shadow-md shadow-orange-100'
                        : 'border-transparent bg-stone-50 hover:border-orange-200 hover:bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-gray-900">{location.name}</span>
                      {isSaved && (
                        <span className="rounded-full bg-orange-100 px-2 py-1 text-[10px] font-semibold text-orange-700">
                          默认
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-gray-500">{location.region}</p>
                  </button>
                );
              })}
            </div>

            {filteredFallbackLocations.length === 0 && (
              <p className="mt-3 text-xs text-gray-500">
                没找到匹配城市。
              </p>
            )}
          </div>

          <div className="mt-6">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900">附近点位</h3>
              <span className="text-xs text-gray-400">{spots.length} 个</span>
            </div>

            <div className="space-y-3">
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
          </div>
        </aside>

        <section className="relative overflow-hidden rounded-[32px] border border-orange-100 bg-white shadow-2xl shadow-orange-100/70">
          <div ref={mapElementRef} className="h-[560px] w-full md:h-[680px]" />

          <div className="pointer-events-none absolute bottom-4 left-4 right-4 rounded-3xl border border-white/70 bg-white/92 p-4 shadow-lg backdrop-blur-md md:left-auto md:max-w-sm">
            <div className="flex items-center text-sm font-semibold text-orange-700">
              <MapPinned size={16} className="mr-2" />
              当前点位
            </div>
            <p className="mt-2 text-base font-semibold text-gray-900">{selectedSpot.name}</p>
            <p className="mt-2 text-xs text-gray-500">
              {selectedSpot.tag} · 约 {selectedSpot.distanceLabel}
            </p>
          </div>
        </section>
      </div>
    </div>
  );
};

export default MapView;
