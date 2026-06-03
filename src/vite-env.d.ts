/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_PAGE_TITLE?: string;
  readonly VITE_N8N_WEBHOOK?: string;
  readonly VITE_N8N_LEAD_WEBHOOK?: string;
  readonly VITE_PLACES_API_KEY?: string;
  readonly VITE_API_SECRET?: string;
  readonly VITE_FB_PIXEL_ID?: string;
  readonly VITE_PREFERRED_SLOTS_URL?: string;
  readonly VITE_PREFERRED_SLOTS_SECRET?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
