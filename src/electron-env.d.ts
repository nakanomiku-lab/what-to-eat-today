export {};

declare global {
  interface Window {
    desktopApp?: {
      isElectron: boolean;
      platform: string;
      versions: {
        electron: string;
        chrome: string;
        node: string;
      };
    };
  }
}
