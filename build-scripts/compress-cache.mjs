// Content-addressed cache for compression output.
//
// brotli (quality 11) and zopfli are the slowest part of a production build,
// and they redo every file from scratch on every run. But production chunks are
// content-hashed in their filenames, so a chunk that didn't change produces
// byte-identical input here. Keying the compressed output by a hash of the
// input bytes lets an unchanged file skip compression entirely, and lets a
// nightly build warm the cache a release reuses the next day.
//
// Disabled unless COMPRESS_CACHE_DIR points at a directory. Local builds set
// nothing and behave exactly as before. The compressed bytes are unchanged
// either way; only whether they were recomputed differs.

import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import {
  mkdir,
  readFile,
  readdir,
  rename,
  rm,
  stat,
  utimes,
  writeFile,
} from "node:fs/promises";
import path from "node:path";

const rootDir = process.env.COMPRESS_CACHE_DIR;
export const cacheEnabled = Boolean(rootDir);

// Total cache size to keep across builds, least-recently-used first when over.
// The cache is shared between branches (a dev nightly warms it for a release,
// which builds from rc/master), so pruning must NOT drop everything the current
// build didn't touch — that would make each branch evict the other's
// branch-specific files every run. Instead the current build is pinned and the
// rest is kept up to this budget, so nothing is dropped unless the cache is
// genuinely too large. Override with COMPRESS_CACHE_MAX_BYTES.
const DEFAULT_MAX_BYTES = 1024 * 1024 * 1024; // 1 GiB
const maxBytes = () =>
  Number(process.env.COMPRESS_CACHE_MAX_BYTES) || DEFAULT_MAX_BYTES;

// Every cache key touched this build, hits and writes alike, so a prune can pin
// the current dist and never evict a file this build depends on.
const touched = new Set();

// Per-namespace directory, created lazily and only once.
const dirs = new Map();

let tmpCounter = 0;

const sha256 = (contents) =>
  createHash("sha256").update(contents).digest("hex");

const namespaceDir = (namespace) => {
  let dir = dirs.get(namespace);
  if (!dir) {
    const dirPath = path.join(rootDir, namespace);
    dir = { path: dirPath, ready: undefined };
    dirs.set(namespace, dir);
  }
  return dir;
};

const ensureDir = (dir) => {
  dir.ready ??= mkdir(dir.path, { recursive: true });
  return dir.ready;
};

// Written via a unique temp file and renamed into place so a concurrent reader
// in the same build never sees a half-written entry (rename is atomic on the
// same filesystem).
const writeAtomic = async (dir, name, contents) => {
  await ensureDir(dir);
  tmpCounter += 1;
  const tmp = path.join(dir.path, `.${process.pid}-${tmpCounter}.tmp`);
  await writeFile(tmp, contents);
  await rename(tmp, path.join(dir.path, name));
};

/**
 * Return the cached compression result for `contents`, or run `compute` and
 * cache what it returns. `compute` resolves to a Buffer for compressed output,
 * or `undefined` when the file should be dropped (brotli skipLarger); both
 * outcomes are cached, so a dropped file is not recompressed on the next build.
 *
 * @param {string} namespace Isolates entries by algorithm, parameters and tool
 *   version, so a change to any of them can never return a stale result.
 * @param {Buffer} contents Uncompressed input bytes, used as the cache key.
 * @param {() => Promise<Buffer | undefined>} compute Runs on a cache miss.
 * @returns {Promise<Buffer | undefined>}
 */
export const withCache = async (namespace, contents, compute) => {
  if (!cacheEnabled) {
    return compute();
  }

  const dir = namespaceDir(namespace);
  const hash = sha256(contents);
  touched.add(`${namespace}/${hash}`);

  const dataPath = path.join(dir.path, hash);
  const dropName = `${hash}.drop`;

  try {
    return await readFile(dataPath);
  } catch {
    // Miss (or unreadable) — fall through and compute.
  }
  if (existsSync(path.join(dir.path, dropName))) {
    return undefined;
  }

  const result = await compute();
  if (result === undefined) {
    await writeAtomic(dir, dropName, "");
  } else {
    await writeAtomic(dir, hash, result);
  }
  return result;
};

/**
 * Keep the cache under `maxBytes`, evicting least-recently-used entries first.
 * Files this build touched are always kept (and their timestamp refreshed, so
 * shared files stay warm across branches); the remainder — including another
 * branch's entries — is kept up to the budget. No-op when the cache is disabled
 * or nothing was compressed, so it never wipes a warm cache on a build that
 * skipped compression.
 */
export const pruneCache = async () => {
  if (!cacheEnabled || touched.size === 0 || !existsSync(rootDir)) {
    return;
  }

  const now = new Date();
  const pinned = [];
  const others = [];

  // Scan every namespace on disk, not just the ones this build used, so entries
  // from an old tool version (a different namespace) are eligible for eviction.
  const namespaces = await readdir(rootDir, { withFileTypes: true });
  await Promise.all(
    namespaces.map(async (ns) => {
      if (!ns.isDirectory()) {
        return;
      }
      const nsDir = path.join(rootDir, ns.name);
      const entries = await readdir(nsDir);
      await Promise.all(
        entries.map(async (entry) => {
          const entryPath = path.join(nsDir, entry);
          // Stray temp files from an interrupted write are never valid entries.
          if (entry.endsWith(".tmp")) {
            await rm(entryPath, { force: true });
            return;
          }
          const hash = entry.endsWith(".drop") ? entry.slice(0, -5) : entry;
          const info = await stat(entryPath);
          if (touched.has(`${ns.name}/${hash}`)) {
            pinned.push({ entryPath, size: info.size });
          } else {
            others.push({ entryPath, size: info.size, mtimeMs: info.mtimeMs });
          }
        })
      );
    })
  );

  // Pinned files stay and are refreshed so they rank as most-recently-used for
  // future prunes; they always count against the budget first.
  let kept = 0;
  await Promise.all(
    pinned.map(async ({ entryPath, size }) => {
      kept += size;
      // A failed timestamp refresh only affects future LRU ordering, not
      // correctness, so it is safe to ignore.
      await utimes(entryPath, now, now).catch(() => undefined);
    })
  );

  // Keep the most-recently-used others until the budget is spent; drop the rest.
  others.sort((a, b) => b.mtimeMs - a.mtimeMs);
  const budget = maxBytes();
  const toDelete = [];
  for (const entry of others) {
    if (kept + entry.size <= budget) {
      kept += entry.size;
    } else {
      toDelete.push(entry.entryPath);
    }
  }
  await Promise.all(toDelete.map((p) => rm(p, { force: true })));
};
