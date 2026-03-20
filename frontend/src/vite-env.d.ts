/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_ELEVENLABS_AGENT_ID?: string;
  readonly VITE_ELEVENLABS_USE_CONV_TOKEN?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
