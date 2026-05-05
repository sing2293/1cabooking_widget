/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_PAGE_TITLE?: string;
  readonly VITE_BOOKING_URL?: string;
  readonly VITE_N8N_WEBHOOK?: string;
  readonly VITE_PLACES_API_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
