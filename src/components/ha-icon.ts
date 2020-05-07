import "@polymer/iron-icon/iron-icon";
import { get, set, clear, Store } from "idb-keyval";
import {
  customElement,
  LitElement,
  property,
  PropertyValues,
  html,
  TemplateResult,
  css,
  CSSResult,
} from "lit-element";
import "./ha-svg-icon";
import { debounce } from "../common/util/debounce";
import { iconMetadata } from "../resources/icon-metadata";
import { IconMeta } from "../types";
import { customIconsets, CustomIcons } from "../data/custom_iconsets";

interface Icons {
  [key: string]: string;
}

interface Chunks {
  [key: string]: Promise<Icons>;
}

const iconStore = new Store("hass-icon-db", "mdi-icon-store");

get("_version", iconStore).then((version) => {
  if (!version) {
    set("_version", iconMetadata.version, iconStore);
  } else if (version !== iconMetadata.version) {
    clear(iconStore).then(() =>
      set("_version", iconMetadata.version, iconStore)
    );
  }
});

const chunks: Chunks = {};
const MDI_PREFIXES = ["mdi", "hass", "hassio", "hademo"];

let toRead: Array<[string, (string) => void]> = [];

// Queue up as many icon fetches in 1 transaction
const getIcon = (iconName: string) =>
  new Promise<string>((resolve) => {
    toRead.push([iconName, resolve]);

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
      });
  });

const findIconChunk = (icon): string => {
  let lastChunk: IconMeta;
  for (const chunk of iconMetadata.parts) {
    if (chunk.start !== undefined && icon < chunk.start) {
      break;
    }
    lastChunk = chunk;
  }
  return lastChunk!.file;
};

const debouncedWriteCache = debounce(async () => {
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
}, 2000);

@customElement("ha-icon")
export class HaIcon extends LitElement {
  @property() public icon?: string;

  @property() private _path?: string;

  @property() private _viewBox = "0 0 24 24";

  @property() private _legacy = false;

  protected updated(changedProps: PropertyValues) {
    if (changedProps.has("icon")) {
      this._path = undefined;
      this._viewBox = "0 0 24 24";
      this._loadIcon();
    }
  }

  protected render(): TemplateResult {
    if (!this.icon) {
      return html``;
    }
    if (this._legacy) {
      return html`<iron-icon .icon=${this.icon}></iron-icon>`;
    }
    return html`<ha-svg-icon
      .path=${this._path}
      .viewBox=${this._viewBox}
    ></ha-svg-icon>`;
  }

  private async _loadIcon() {
    if (!this.icon) {
      return;
    }
    const [iconPrefix, iconName] = this.icon.split(":", 2);
    if (!MDI_PREFIXES.includes(iconPrefix)) {
      if (customIconsets.has(iconPrefix)) {
        const customIconset = customIconsets.get(iconPrefix);
        if (customIconset) {
          this._setCustomPath(customIconset(iconName), iconName);
        }
        return;
      }
      this._legacy = true;
      return;
    }

    this._legacy = false;

    const cachedPath: string = await getIcon(iconName);
    if (cachedPath) {
      this._path = cachedPath;
      return;
    }
    const chunk = findIconChunk(iconName);

    if (chunk in chunks) {
      this._setPath(chunks[chunk], iconName);
      return;
    }
    const iconPromise = fetch(`/static/mdi/${chunk}.json`).then((response) =>
      response.json()
    );
    chunks[chunk] = iconPromise;
    this._setPath(iconPromise, iconName);
    debouncedWriteCache();
  }

  private async _setCustomPath(
    promise: Promise<CustomIcons>,
    iconName: string
  ) {
    const iconPack = await promise;
    this._path = iconPack[iconName].path;
    this._viewBox = iconPack[iconName].viewBox || "0 0 24 24";
  }

  private async _setPath(promise: Promise<Icons>, iconName: string) {
    const iconPack = await promise;
    this._path = iconPack[iconName];
  }

  static get styles(): CSSResult {
    return css`
      :host {
        fill: currentcolor;
      }
    `;
  }
}
declare global {
  interface HTMLElementTagNameMap {
    "ha-icon": HaIcon;
  }
}
