export {};

declare global {
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
