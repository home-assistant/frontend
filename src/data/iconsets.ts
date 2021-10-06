import { clear, get, set, createStore, promisifyRequest } from "idb-keyval";
import { promiseTimeout } from "../common/util/promise-timeout";
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

let toRead: Array<
  [string, (iconPath: string | undefined) => void, (e: any) => void]
> = [];

// Queue up as many icon fetches in 1 transaction
export const getIcon = (iconName: string) =>
  new Promise<string | undefined>((resolve, reject) => {
    toRead.push([iconName, resolve, reject]);

    if (toRead.length > 1) {
      return;
    }

    const readIcons = () =>
      iconStore("readonly", (store) => {
        for (const [iconName_, resolve_, reject_] of toRead) {
          promisifyRequest<string | undefined>(store.get(iconName_))
            .then((icon) => resolve_(icon))
            .catch((e) => reject_(e));
        }
        toRead = [];
      });

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

interface DeprecatedIcon {
  [key: string]: {
    removeIn: string;
    newName?: string;
  };
}

export const mdiDeprecatedIcons: DeprecatedIcon = {
  "adobe-acrobat": {
    removeIn: "2021.12",
  },
  adobe: {
    removeIn: "2021.12",
  },
  "amazon-alexa": {
    removeIn: "2021.12",
  },
  amazon: {
    removeIn: "2021.12",
  },
  "android-auto": {
    removeIn: "2021.12",
  },
  "android-debug-bridge": {
    removeIn: "2021.12",
  },
  "apple-airplay": {
    newName: "cast-variant",
    removeIn: "2021.12",
  },
  application: {
    newName: "application-outline",
    removeIn: "2021.12",
  },
  "application-cog": {
    newName: "application-cog-outline",
    removeIn: "2021.12",
  },
  "application-settings": {
    newName: "application-settings-outline",
    removeIn: "2021.12",
  },
  bandcamp: {
    removeIn: "2021.12",
  },
  battlenet: {
    removeIn: "2021.12",
  },
  blogger: {
    removeIn: "2021.12",
  },
  "bolnisi-cross": {
    newName: "cross-bolnisi",
    removeIn: "2021.12",
  },
  "boom-gate-up": {
    newName: "boom-gate-arrow-up",
    removeIn: "2021.12",
  },
  "boom-gate-up-outline": {
    newName: "boom-gate-arrow-up-outline",
    removeIn: "2021.12",
  },
  "boom-gate-down": {
    newName: "boom-gate-arrow-down",
    removeIn: "2021.12",
  },
  "boom-gate-down-outline": {
    newName: "boom-gate-arrow-down-outline",
    removeIn: "2021.12",
  },
  buddhism: {
    newName: "dharmachakra",
    removeIn: "2021.12",
  },
  buffer: {
    removeIn: "2021.12",
  },
  "cash-usd-outline": {
    removeIn: "2021.12",
  },
  "cash-usd": {
    removeIn: "2021.12",
  },
  "cellphone-android": {
    newName: "cellphone",
    removeIn: "2021.12",
  },
  "cellphone-erase": {
    newName: "cellphone-remove",
    removeIn: "2021.12",
  },
  "cellphone-iphone": {
    newName: "cellphone",
    removeIn: "2021.12",
  },
  "celtic-cross": {
    newName: "cross-celtic",
    removeIn: "2021.12",
  },
  christianity: {
    newName: "cross",
    removeIn: "2021.12",
  },
  "christianity-outline": {
    newName: "cross-outline",
    removeIn: "2021.12",
  },
  "concourse-ci": {
    removeIn: "2021.12",
  },
  "currency-usd-circle": {
    removeIn: "2021.12",
  },
  "currency-usd-circle-outline": {
    removeIn: "2021.12",
  },
  "do-not-disturb-off": {
    newName: "minus-circle-off",
    removeIn: "2021.12",
  },
  "do-not-disturb": {
    newName: "minus-circle",
    removeIn: "2021.12",
  },
  douban: {
    removeIn: "2021.12",
  },
  face: {
    newName: "face-man",
    removeIn: "2021.12",
  },
  "face-outline": {
    newName: "face-man-outline",
    removeIn: "2021.12",
  },
  "face-profile-woman": {
    newName: "face-woman-profile",
    removeIn: "2021.12",
  },
  "face-shimmer": {
    newName: "face-man-shimmer",
    removeIn: "2021.12",
  },
  "face-shimmer-outline": {
    newName: "face-man-shimmer-outline",
    removeIn: "2021.12",
  },
  "file-pdf": {
    newName: "file-pdf-box",
    removeIn: "2021.12",
  },
  "file-pdf-outline": {
    newName: "file-pdf-box",
    removeIn: "2021.12",
  },
  "file-pdf-box-outline": {
    newName: "file-pdf-box",
    removeIn: "2021.12",
  },
  "flash-circle": {
    newName: "lightning-bolt-circle",
    removeIn: "2021.12",
  },
  "floor-lamp-variant": {
    newName: "floor-lamp-torchiere-variant",
    removeIn: "2021.12",
  },
  gif: {
    newName: "file-gif-box",
    removeIn: "2021.12",
  },
  "google-photos": {
    removeIn: "2021.12",
  },
  gradient: {
    newName: "gradient-vertical",
    removeIn: "2021.12",
  },
  hand: {
    newName: "hand-front-right",
    removeIn: "2021.12",
  },
  "hand-left": {
    newName: "hand-back-left",
    removeIn: "2021.12",
  },
  "hand-right": {
    newName: "hand-back-right",
    removeIn: "2021.12",
  },
  hinduism: {
    newName: "om",
    removeIn: "2021.12",
  },
  "home-currency-usd": {
    removeIn: "2021.12",
  },
  iframe: {
    newName: "application-brackets",
    removeIn: "2021.12",
  },
  "iframe-outline": {
    newName: "application-brackets-outline",
    removeIn: "2021.12",
  },
  "iframe-array": {
    newName: "application-array",
    removeIn: "2021.12",
  },
  "iframe-array-outline": {
    newName: "application-array-outline",
    removeIn: "2021.12",
  },
  "iframe-braces": {
    newName: "application-braces",
    removeIn: "2021.12",
  },
  "iframe-braces-outline": {
    newName: "application-braces-outline",
    removeIn: "2021.12",
  },
  "iframe-parentheses": {
    newName: "application-parentheses",
    removeIn: "2021.12",
  },
  "iframe-parentheses-outline": {
    newName: "application-parentheses-outline",
    removeIn: "2021.12",
  },
  "iframe-variable": {
    newName: "application-variable",
    removeIn: "2021.12",
  },
  "iframe-variable-outline": {
    newName: "application-variable-outline",
    removeIn: "2021.12",
  },
  islam: {
    newName: "star-crescent",
    removeIn: "2021.12",
  },
  judaism: {
    newName: "star-david",
    removeIn: "2021.12",
  },
  "laptop-chromebook": {
    newName: "laptop",
    removeIn: "2021.12",
  },
  "laptop-mac": {
    newName: "laptop",
    removeIn: "2021.12",
  },
  "laptop-windows": {
    newName: "laptop",
    removeIn: "2021.12",
  },
  "microsoft-edge-legacy": {
    removeIn: "2021.12",
  },
  "microsoft-yammer": {
    removeIn: "2021.12",
  },
  "monitor-clean": {
    newName: "monitor-shimmer",
    removeIn: "2021.12",
  },
  "pdf-box": {
    newName: "file-pdf-box",
    removeIn: "2021.12",
  },
  pharmacy: {
    newName: "mortar-pestle-plus",
    removeIn: "2021.12",
  },
  "plus-one": {
    newName: "numeric-positive-1",
    removeIn: "2021.12",
  },
  "poll-box": {
    newName: "chart-box",
    removeIn: "2021.12",
  },
  "poll-box-outline": {
    newName: "chart-box-outline",
    removeIn: "2021.12",
  },
  sparkles: {
    newName: "shimmer",
    removeIn: "2021.12",
  },
  "tablet-ipad": {
    newName: "tablet",
    removeIn: "2021.12",
  },
  teach: {
    newName: "human-male-board",
    removeIn: "2021.12",
  },
  telegram: {
    removeIn: "2021.12",
  },
  "television-clean": {
    newName: "television-shimmer",
    removeIn: "2021.12",
  },
  "text-subject": {
    newName: "text-long",
    removeIn: "2021.12",
  },
  "twitter-retweet": {
    newName: "repeat-variant",
    removeIn: "2021.12",
  },
  untappd: {
    removeIn: "2021.12",
  },
  vk: {
    removeIn: "2021.12",
  },
  "voice-off": {
    newName: "account-voice-off",
    removeIn: "2021.12",
  },
  "xamarian-outline": {
    newName: "xamarian",
    removeIn: "2021.12",
  },
  xing: {
    removeIn: "2021.12",
  },
  "y-combinator": {
    removeIn: "2021.12",
  },
};
