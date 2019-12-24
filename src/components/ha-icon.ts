import "@polymer/iron-icon/iron-icon";
import { get, Store } from "idb-keyval";
import {
  css,
  CSSResult,
  customElement,
  LitElement,
  property,
  PropertyValues,
  svg,
} from "lit-element";

const iconStore = new Store("hass-icon-db", "mdi-icon-store");
const partPromise = {};

@customElement("ha-icon")
export class HaIcon extends LitElement {
  @property() public icon?: string;
  @property() public path?: string;

  protected updated(changedProps: PropertyValues) {
    if (changedProps.has("icon")) {
      this._loadIcon();
    }
  }

  protected render() {
    if (!this.path) {
      return;
    }
    return svg`
    <svg 
      viewBox="0 0 24 24" 
      preserveAspectRatio="xMidYMid meet"
      focusable="false">
      <g>
        <path d=${this.path}></path>
      </g>
    </svg>`;
  }

  private async _loadIcon() {
    if (!this.icon) {
      return;
    }
    const iconName = this.icon.replace("mdi:", "").replace("hass:", "");
    const cachedPath: string = await get(iconName, iconStore);
    if (cachedPath) {
      this.path = cachedPath;
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
    this.path = iconPack[iconName];
    if (cache) {
      // We do a batch opening the store just once, for (considerable) performance
      iconStore._withIDBStore("readwrite", (store) => {
        Object.entries(iconPack).forEach(([name, path]) => {
          store.put(path, name);
        });
      });
    }
  }

  static get styles(): CSSResult {
    return css`
      :host {
        display: var(--layout-inline_-_display);
        -ms-flex-align: var(--layout-center-center_-_-ms-flex-align);
        -webkit-align-items: var(--layout-center-center_-_-webkit-align-items);
        align-items: var(--layout-center-center_-_align-items);
        -ms-flex-pack: var(--layout-center-center_-_-ms-flex-pack);
        -webkit-justify-content: var(
          --layout-center-center_-_-webkit-justify-content
        );
        justify-content: var(--layout-center-center_-_justify-content);
        position: relative;
        vertical-align: middle;
        fill: var(--iron-icon-fill-color, currentcolor);
        stroke: var(--iron-icon-stroke-color, none);
        width: var(--iron-icon-width, 24px);
        height: var(--iron-icon-height, 24px);
      }

      svg {
        width: 100%;
        height: 100%;
        pointer-events: none;
        display: block;
      }
    `;
  }
}
declare global {
  interface HTMLElementTagNameMap {
    "ha-icon": HaIcon;
  }
}
