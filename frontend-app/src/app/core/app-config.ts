export interface AppRuntimeConfig {
  apiUrl: string;
}

declare global {
  interface Window {
    __APP_CONFIG__?: Partial<AppRuntimeConfig>;
  }
}

export const runtimeConfig: AppRuntimeConfig = {
  apiUrl: window.__APP_CONFIG__?.apiUrl ?? '/api'
};
