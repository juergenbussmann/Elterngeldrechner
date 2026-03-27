/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Nur DEV: simulierter Abo-Plan (none | monthly | yearly). */
  readonly VITE_DEV_PLAN?: string;
}
