import "@polymer/iron-icon/iron-icon";
import { get, Store } from "idb-keyval";
import {
  customElement,
  LitElement,
  property,
  PropertyValues,
  html,
  TemplateResult,
} from "lit-element";
import "./ha-svg-icon";
import { debounce } from "../common/util/debounce";
import { iconMetadata } from "../resources/icon-metadata";
import { IconMetadata } from "../types";

interface Icons {
  [key: string]: string;
}

interface Chunks {
  [key: string]: { icons: Promise<Icons>; cached: boolean };
}

const iconStore = new Store("hass-icon-db", "mdi-icon-store");
const chunks: Chunks = {};
const MDI_PREFIXES = ["mdi", "hass", "hassio"];

const findIconChunk = (icon): string => {
  let lastChunk: IconMetadata;
  for (const chunk of iconMetadata) {
    if (chunk.start !== undefined && icon < chunk.start) {
      break;
    }
    lastChunk = chunk;
  }
  return lastChunk!.file;
};

@customElement("ha-icon")
export class HaIcon extends LitElement {
  @property() public icon?: string;

  @property() private _path?: string;

  @property() private _noMdi = false;

  private _debouncedWriteCache = debounce(() => {
    // We do a batch opening the store just once, for (considerable) performance
    iconStore._withIDBStore("readwrite", async (store) => {
      for (const part of Object.values(chunks)) {
        if (part.cached) {
          continue;
        }
        part.cached = true;
        // eslint-disable-next-line no-await-in-loop
        const icons = await part.icons;
        Object.entries(icons).forEach(([name, path]) => {
          store.put(path, name);
        });
      }
    });
  }, 2000);

  protected updated(changedProps: PropertyValues) {
    if (changedProps.has("icon")) {
      this._loadIcon();
    }
  }

  protected render(): TemplateResult {
    if (!this.icon) {
      return html``;
    }
    if (this._noMdi) {
      return html`<iron-icon .icon=${this.icon}></iron-icon>`;
    }
    return html`<ha-svg-icon .path=${this._path}></ha-svg-icon>`;
  }

  private async _loadIcon() {
    if (!this.icon) {
      return;
    }
    const icon = this.icon.split(":", 2);
    if (!MDI_PREFIXES.includes(icon[0])) {
      this._noMdi = true;
      return;
    }

    this._noMdi = false;

    const iconName = icon[1];
    const cachedPath: string = await get(iconName, iconStore);
    if (cachedPath) {
      this._path = cachedPath;
      return;
    }
    const chunk = findIconChunk(iconName);

    if (chunk in chunks) {
      this._setPath(chunks[chunk].icons, iconName);
      return;
    }
    const iconPromise = fetch(`/static/mdi/${chunk}.json`).then((response) =>
      response.json()
    );
    chunks[chunk] = {
      icons: iconPromise,
      cached: false,
    };
    this._setPath(iconPromise, iconName);
    this._debouncedWriteCache();
  }

  private async _setPath(promise: Promise<Icons>, iconName: string) {
    const iconPack = await promise;
    this._path = iconPack[iconName];
  }
}
declare global {
  interface HTMLElementTagNameMap {
    "ha-icon": HaIcon;
  }
}
