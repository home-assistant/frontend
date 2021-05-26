import { clear, get, set, createStore } from "idb-keyval";
import { iconMetadata } from "../resources/icon-metadata";
import { IconMeta } from "../types";

export interface Icons {
  [key: string]: string;
}

export interface Chunks {
  [key: string]: Promise<Icons>;
}

export const iconStore = createStore("hass-icon-db", "mdi-icon-store");

export const MDI_PREFIXES = ["mdi", "hass", "hassio", "hademo"];

let toRead: Array<[string, (iconPath: string) => void, () => void]> = [];

// Queue up as many icon fetches in 1 transaction
export const getIcon = (iconName: string) =>
  new Promise<string>((resolve, reject) => {
    toRead.push([iconName, resolve, reject]);

    if (toRead.length > 1) {
      return;
    }

    const results: Array<[(iconPath: string) => void, IDBRequest]> = [];

    iconStore("readonly", (store) => {
      for (const [iconName_, resolve_] of toRead) {
        results.push([resolve_, store.get(iconName_)]);
      }
    })
      .then(() => {
        for (const [resolve_, request] of results) {
          resolve_(request.result);
        }
      })
      .catch(() => {
        // Firefox in private mode doesn't support IDB
        for (const [, , reject_] of toRead) {
          reject_();
        }
      })
      .finally(() => {
        toRead = [];
      });
  });

export const findIconChunk = (icon: string): string => {
  let lastChunk: IconMeta;
  for (const chunk of iconMetadata.parts) {
    if (chunk.start !== undefined && icon < chunk.start) {
      break;
    }
    lastChunk = chunk;
  }
  return lastChunk!.file;
};

export const writeCache = async (chunks: Chunks) => {
  const keys = Object.keys(chunks);
  const iconsSets: Icons[] = await Promise.all(Object.values(chunks));
  // We do a batch opening the store just once, for (considerable) performance
  iconStore("readwrite", (store) => {
    iconsSets.forEach((icons, idx) => {
      Object.entries(icons).forEach(([name, path]) => {
        store.put(path, name);
      });
      delete chunks[keys[idx]];
    });
  });
};

export const checkCacheVersion = async () => {
  const version = await get("_version", iconStore);

  if (!version) {
    set("_version", iconMetadata.version, iconStore);
  } else if (version !== iconMetadata.version) {
    await clear(iconStore);
    set("_version", iconMetadata.version, iconStore);
  }
};
