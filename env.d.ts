/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_VTA_VERSION: string;
  readonly VITE_ENTERPRISE_MODE: string;
  readonly VITE_PORT: string;
  readonly VITE_DASHBOARD_ENABLED: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
