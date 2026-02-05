/**
 * Runtime config: in Docker wird window.__ENV__ vom Entrypoint gesetzt,
 * lokal nutzt die App import.meta.env (Vite).
 */
declare global {
  interface Window {
    __ENV__?: {
      VITE_SUPABASE_URL?: string
      VITE_SUPABASE_ANON_KEY?: string
      VITE_ADMIN_PASSWORD?: string
    }
  }
}

export function getEnv(): NonNullable<Window['__ENV__']> {
  const fromMeta = {
    VITE_SUPABASE_URL: import.meta.env?.VITE_SUPABASE_URL,
    VITE_SUPABASE_ANON_KEY: import.meta.env?.VITE_SUPABASE_ANON_KEY,
    VITE_ADMIN_PASSWORD: import.meta.env?.VITE_ADMIN_PASSWORD,
  }
  if (typeof window !== 'undefined' && window.__ENV__) {
    return { ...fromMeta, ...window.__ENV__ }
  }
  return fromMeta
}
