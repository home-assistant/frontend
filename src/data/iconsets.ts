import type { UseStore } from "idb-keyval";
import { clear, get, set, createStore } from "idb-keyval";
import { iconMetadata } from "../resources/icon-metadata";
import type { IconMeta } from "../types";

export type Icons = Record<string, string>;

export type Chunks = Record<string, Promise<Icons>>;

let iconStorePromise: Promise<UseStore> | undefined;

const getStore = (): Promise<UseStore> => {
  if (!iconStorePromise) {
    iconStorePromise = initIconStore().catch((e) => {
      iconStorePromise = undefined;
      throw e;
    });
  }
  return iconStorePromise;
};

const initIconStore = async (): Promise<UseStore> => {
  const iconStore = createStore("hass-icon-db", "mdi-icon-store");

  // Supervisor doesn't use icons, and should not update/downgrade the icon DB.
  const version = await get("_version", iconStore);

  if (!version) {
    set("_version", iconMetadata.version, iconStore);
  } else if (version !== iconMetadata.version) {
    await clear(iconStore);
    set("_version", iconMetadata.version, iconStore);
  }

  return iconStore;
};

export const MDI_PREFIXES = ["mdi", "hass", "hassio", "hademo"];

export const getIcon = async (
  iconName: string
): Promise<string | undefined> => {
  try {
    const iconStore = await getStore();
    return await get<string | undefined>(iconName, iconStore);
  } catch (_err) {
    // IDB unavailable (Firefox private mode, Safari issues)
    return undefined;
  }
};

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
  const results = await Promise.allSettled(Object.values(chunks));
  const iconStore = await getStore();
  // We do a batch opening the store just once, for (considerable) performance
  iconStore("readwrite", (store) => {
    results.forEach((result, idx) => {
      if (result.status === "fulfilled") {
        Object.entries(result.value).forEach(([name, path]) => {
          store.put(path, name);
        });
      }
      delete chunks[keys[idx]];
    });
  });
};
