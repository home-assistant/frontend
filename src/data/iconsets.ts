import { clear, get, set, Store } from "idb-keyval";
import { iconMetadata } from "../resources/icon-metadata";
import { IconMeta } from "../types";

export interface Icons {
  [key: string]: string;
}

export interface Chunks {
  [key: string]: Promise<Icons>;
}

export const iconStore = new Store("hass-icon-db", "mdi-icon-store");

export const MDI_PREFIXES = ["mdi", "hass", "hassio", "hademo"];

let toRead: Array<[string, (string) => void, () => void]> = [];

// Queue up as many icon fetches in 1 transaction
export const getIcon = (iconName: string) =>
  new Promise<string>((resolve, reject) => {
    toRead.push([iconName, resolve, reject]);

    if (toRead.length > 1) {
      return;
    }

    const results: Array<[(string) => void, IDBRequest]> = [];

    iconStore
      ._withIDBStore("readonly", (store) => {
        for (const [iconName_, resolve_] of toRead) {
          results.push([resolve_, store.get(iconName_)]);
        }
        toRead = [];
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
        toRead = [];
      });
  });

export const findIconChunk = (icon): string => {
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
  iconStore._withIDBStore("readwrite", (store) => {
    iconsSets.forEach((icons, idx) => {
      Object.entries(icons).forEach(([name, path]) => {
        store.put(path, name);
      });
      delete chunks[keys[idx]];
    });
  });
};

export const checkCacheVersion = () => {
  get("_version", iconStore).then((version) => {
    if (!version) {
      set("_version", iconMetadata.version, iconStore);
    } else if (version !== iconMetadata.version) {
      clear(iconStore).then(() =>
        set("_version", iconMetadata.version, iconStore)
      );
    }
  });
};
