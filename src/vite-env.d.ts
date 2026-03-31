/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_BACKEND_URL?: string;
  readonly VITE_AUTH_GATEWAY_URL?: string;
  readonly VITE_GRUDGE_API_URL?: string;
  readonly VITE_WCS_URL?: string;
  readonly VITE_COLYSEUS_WS_URL?: string;
  readonly VITE_COLYSEUS_HTTP_URL?: string;
  readonly VITE_OBJECTSTORE_URL?: string;
  readonly VITE_GRUDGE_WARS_URL?: string;
  readonly VITE_ENV?: string;
  readonly MODE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
