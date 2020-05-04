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

const iconStore = new Store("hass-icon-db", "mdi-icon-store");
const partPromise = {};
const MDI_PREFIXES = ["mdi", "hass", "hassio"];

@customElement("ha-icon")
export class HaIcon extends LitElement {
  @property() public icon?: string;

  @property() private _path?: string;

  @property() private _noMdi = false;

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
    const part = iconName[0];
    if (part in partPromise) {
      this._setPath(partPromise[part], iconName);
      return;
    }
    partPromise[part] = fetch(`/static/mdi/${part}.json`).then((response) =>
      response.json()
    );
    this._setPath(partPromise[part], iconName, true);
  }

  private async _setPath(
    promise: Promise<object>,
    iconName: string,
    cache = false
  ) {
    const iconPack = await promise;
    this._path = iconPack[iconName];
    if (cache) {
      // We do a batch opening the store just once, for (considerable) performance
      iconStore._withIDBStore("readwrite", (store) => {
        Object.entries(iconPack).forEach(([name, path]) => {
          store.put(path, name);
        });
      });
    }
  }
}
declare global {
  interface HTMLElementTagNameMap {
    "ha-icon": HaIcon;
  }
}
