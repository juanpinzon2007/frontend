export interface AppRuntimeConfig {
  apiUrl: string;
}

declare global {
  interface Window {
    __APP_CONFIG__?: Partial<AppRuntimeConfig>;
  }
}

const DEFAULT_API_URL = '/api';

function readRuntimeConfig(): Partial<AppRuntimeConfig> | undefined {
  if (typeof globalThis === 'undefined') {
    return undefined;
  }

  return (globalThis as typeof globalThis & { __APP_CONFIG__?: Partial<AppRuntimeConfig> }).__APP_CONFIG__;
}

export const runtimeConfig: AppRuntimeConfig = {
  apiUrl: readRuntimeConfig()?.apiUrl ?? DEFAULT_API_URL
};
