#!/usr/bin/env bun run
/**
 * Kopiert Storage-Objekte von Supabase Cloud nach Self-Hosted.
 * Benötigt: PLATFORM_URL, PLATFORM_SERVICE_ROLE_KEY, SELFHOST_URL, SELFHOST_SERVICE_ROLE_KEY
 * Optional: PLATFORM_STORAGE_BUCKET / SELFHOST_STORAGE_BUCKET (sonst alle Buckets)
 *
 * Aufruf: bun run scripts/migrate-storage.ts
 */

import { createClient } from "@supabase/supabase-js";

const platformUrl = process.env.PLATFORM_URL;
const platformKey = process.env.PLATFORM_SERVICE_ROLE_KEY;
const selfhostUrl = process.env.SELFHOST_URL;
const selfhostKey = process.env.SELFHOST_SERVICE_ROLE_KEY;

if (!platformUrl || !platformKey || !selfhostUrl || !selfhostKey) {
  console.error("Fehler: Setze PLATFORM_URL, PLATFORM_SERVICE_ROLE_KEY, SELFHOST_URL, SELFHOST_SERVICE_ROLE_KEY");
  process.exit(1);
}

const platform = createClient(platformUrl, platformKey);
const selfhost = createClient(selfhostUrl, selfhostKey);

async function listBuckets(supabase: ReturnType<typeof createClient>) {
  const { data, error } = await supabase.storage.listBuckets();
  if (error) throw error;
  return data;
}

async function listObjects(supabase: ReturnType<typeof createClient>, bucketId: string, prefix = "") {
  const { data, error } = await supabase.storage.from(bucketId).list(prefix, { limit: 1000 });
  if (error) throw error;
  return data;
}

async function* listAllPaths(
  supabase: ReturnType<typeof createClient>,
  bucketId: string,
  prefix = ""
): AsyncGenerator<{ name: string; path: string }> {
  const items = await listObjects(supabase, bucketId, prefix);
  for (const item of items) {
    const path = prefix ? `${prefix}/${item.name}` : item.name;
    if (item.id == null) {
      // Ordner
      yield* listAllPaths(supabase, bucketId, path);
    } else {
      yield { name: item.name, path };
    }
  }
}

async function ensureBucket(supabase: ReturnType<typeof createClient>, bucketId: string) {
  const { data: buckets } = await supabase.storage.listBuckets();
  if (buckets?.some((b) => b.name === bucketId)) return;
  const { error } = await supabase.storage.createBucket(bucketId, { public: false });
  if (error) console.warn("Bucket erstellen:", bucketId, error.message);
}

async function copyBucket(source: typeof platform, target: typeof selfhost, bucketId: string) {
  await ensureBucket(target, bucketId);
  let count = 0;
  for await (const { path } of listAllPaths(source, bucketId)) {
    const { data: blob, error: downError } = await source.storage.from(bucketId).download(path);
    if (downError) {
      console.warn("Download übersprungen:", bucketId, path, downError.message);
      continue;
    }
    if (!blob) continue;
    const { error: upError } = await target.storage.from(bucketId).upload(path, blob, { upsert: true });
    if (upError) {
      console.warn("Upload fehlgeschlagen:", bucketId, path, upError.message);
      continue;
    }
    count++;
    if (count % 50 === 0) console.log("  ", count, "Dateien …");
  }
  return count;
}

async function main() {
  const buckets = await listBuckets(platform);
  const filter = process.env.PLATFORM_STORAGE_BUCKET;
  const toCopy = filter ? buckets.filter((b) => b.name === filter) : buckets;
  if (toCopy.length === 0) {
    console.log("Keine Buckets zum Kopieren.");
    return;
  }
  console.log("Kopiere Buckets:", toCopy.map((b) => b.name).join(", "));
  for (const b of toCopy) {
    console.log("Bucket:", b.name);
    const n = await copyBucket(platform, selfhost, b.name);
    console.log("  ->", n, "Dateien kopiert.");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
