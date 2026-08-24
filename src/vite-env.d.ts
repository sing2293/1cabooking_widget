/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_PAGE_TITLE?: string;
  readonly VITE_PLACES_API_KEY?: string;
  readonly VITE_FB_PIXEL_ID?: string;
  /** internal tool base for the PUBLIC endpoints (defaults to internal.1cleanair.app) */
  readonly VITE_INTERNAL_PUBLIC_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
