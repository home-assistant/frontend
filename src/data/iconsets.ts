import { clear, get, set, createStore, promisifyRequest } from "idb-keyval";
import memoizeOne from "memoize-one";
import { promiseTimeout } from "../common/util/promise-timeout";
import { iconMetadata } from "../resources/icon-metadata";
import type { IconMeta } from "../types";

export type Icons = Record<string, string>;

export type Chunks = Record<string, Promise<Icons>>;

const getStore = memoizeOne(async () => {
  const iconStore = createStore("hass-icon-db", "mdi-icon-store");

  // Supervisor doesn't use icons, and should not update/downgrade the icon DB.
  if (!__SUPERVISOR__) {
    const version = await get("_version", iconStore);

    if (!version) {
      set("_version", iconMetadata.version, iconStore);
    } else if (version !== iconMetadata.version) {
      await clear(iconStore);
      set("_version", iconMetadata.version, iconStore);
    }
  }

  return iconStore;
});

export const MDI_PREFIXES = ["mdi", "hass", "hassio", "hademo"];

let toRead: [
  string,
  (iconPath: string | undefined) => void,
  (e: any) => void,
][] = [];

// Queue up as many icon fetches in 1 transaction
export const getIcon = (iconName: string) =>
  new Promise<string | undefined>((resolve, reject) => {
    toRead.push([iconName, resolve, reject]);

    if (toRead.length > 1) {
      return;
    }

    // Start initializing the store, so it's ready when we need it
    const iconStoreProm = getStore();
    const readIcons = async () => {
      const iconStore = await iconStoreProm;
      iconStore("readonly", (store) => {
        for (const [iconName_, resolve_, reject_] of toRead) {
          promisifyRequest<string | undefined>(store.get(iconName_))
            .then((icon) => resolve_(icon))
            .catch((e) => reject_(e));
        }
        toRead = [];
      });
    };

    promiseTimeout(1000, readIcons()).catch((e) => {
      // Firefox in private mode doesn't support IDB
      // Safari sometime doesn't open the DB so we time out
      for (const [, , reject_] of toRead) {
        reject_(e);
      }
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
  const iconStore = await getStore();
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
