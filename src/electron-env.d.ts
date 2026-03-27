export {};

declare global {
  interface ImportMetaEnv {
    readonly VITE_AMAP_PROXY_BASE_URL?: string;
  }

  interface ImportMeta {
    readonly env: ImportMetaEnv;
  }

  interface DesktopLocationSuccessResult {
    ok: true;
    source: string;
    coords: {
      lat: number;
      lng: number;
      accuracy?: number | null;
    };
  }

  interface DesktopLocationErrorResult {
    ok: false;
    code: string;
    message: string;
  }

  interface DesktopGeocodeResultItem {
    id: string;
    displayName: string;
    lat: number;
    lng: number;
    type: string;
    licence?: string;
  }

  interface DesktopGeocodeSuccessResult {
    ok: true;
    source: string;
    query: string;
    results: DesktopGeocodeResultItem[];
  }

  interface DesktopGeocodeErrorResult {
    ok: false;
    code: string;
    message: string;
    results: DesktopGeocodeResultItem[];
  }

  interface DesktopInputTipItem {
    id: string;
    name: string;
    displayName: string;
    district: string;
    address: string;
    adcode?: string;
    type: string;
    lat?: number | null;
    lng?: number | null;
  }

  interface DesktopInputTipsSuccessResult {
    ok: true;
    source: string;
    query: string;
    tips: DesktopInputTipItem[];
  }

  interface DesktopInputTipsErrorResult {
    ok: false;
    code: string;
    message: string;
    tips: DesktopInputTipItem[];
  }

  interface Window {
    desktopApp?: {
      isElectron: boolean;
      platform: string;
      location: {
        provider: string;
        getCurrentPosition: () => Promise<DesktopLocationSuccessResult | DesktopLocationErrorResult>;
        geocodeAddress: (
          query: string
        ) => Promise<DesktopGeocodeSuccessResult | DesktopGeocodeErrorResult>;
        getInputTips: (payload: {
          query: string;
          location?: {
            lat: number;
            lng: number;
          };
        }) => Promise<DesktopInputTipsSuccessResult | DesktopInputTipsErrorResult>;
        openSystemLocationSettings: () => Promise<boolean>;
      };
      versions: {
        electron: string;
        chrome: string;
        node: string;
      };
    };
  }
}
