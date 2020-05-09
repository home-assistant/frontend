import "@polymer/iron-icon/iron-icon";
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
import { customIconsets, CustomIcon } from "../data/custom_iconsets";
import {
  Chunks,
  MDI_PREFIXES,
  getIcon,
  findIconChunk,
  Icons,
  checkCacheVersion,
  writeCache,
} from "../data/iconsets";
import { debounce } from "../common/util/debounce";

const chunks: Chunks = {};

checkCacheVersion();

const debouncedWriteCache = debounce(() => writeCache(chunks), 2000);

@customElement("ha-icon")
export class HaIcon extends LitElement {
  @property() public icon?: string;

  @property() private _path?: string;

  @property() private _viewBox?;

  @property() private _legacy = false;

  protected updated(changedProps: PropertyValues) {
    if (changedProps.has("icon")) {
      this._path = undefined;
      this._viewBox = undefined;
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

    if (!iconPrefix || !iconName) {
      return;
    }

    if (!MDI_PREFIXES.includes(iconPrefix)) {
      if (iconPrefix in customIconsets) {
        const customIconset = customIconsets[iconPrefix];
        if (customIconset) {
          this._setCustomPath(customIconset(iconName));
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

  private async _setCustomPath(promise: Promise<CustomIcon>) {
    const icon = await promise;
    this._path = icon.path;
    this._viewBox = icon.viewBox;
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
