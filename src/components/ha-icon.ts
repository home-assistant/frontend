import "@polymer/iron-icon/iron-icon";
import {
  customElement,
  LitElement,
  property,
  internalProperty,
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
import { fireEvent } from "../common/dom/fire_event";

interface DeprecatedIcon {
  [key: string]: {
    removeIn: string;
    newName?: string;
  };
}

const mdiDeprecatedIcons: DeprecatedIcon = {
  scooter: { removeIn: "117", newName: "human-scooter" },
};

const chunks: Chunks = {};

checkCacheVersion();

const debouncedWriteCache = debounce(() => writeCache(chunks), 2000);

const cachedIcons: { [key: string]: string } = {};

@customElement("ha-icon")
export class HaIcon extends LitElement {
  @property() public icon?: string;

  @internalProperty() private _path?: string;

  @internalProperty() private _viewBox?;

  @internalProperty() private _legacy = false;

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
    const [iconPrefix, origIconName] = this.icon.split(":", 2);

    let iconName = origIconName;

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

    if (iconName in mdiDeprecatedIcons) {
      const deprecatedIcon = mdiDeprecatedIcons[iconName];
      let message: string;

      if (deprecatedIcon.newName) {
        message = `Icon ${iconPrefix}:${iconName} was renamed to ${iconPrefix}:${deprecatedIcon.newName}, please change your config, it will be removed in version ${deprecatedIcon.removeIn}.`;
        iconName = deprecatedIcon.newName!;
      } else {
        message = `Icon ${iconPrefix}:${iconName} was removed from MDI, please replace this icon with an other icon in your config, it will be removed in version ${deprecatedIcon.removeIn}.`;
      }
      // eslint-disable-next-line no-console
      console.warn(message);
      fireEvent(this, "write_log", {
        level: "warning",
        message,
      });
    }

    if (iconName in cachedIcons) {
      this._path = cachedIcons[iconName];
      return;
    }

    let databaseIcon: string | undefined;
    try {
      databaseIcon = await getIcon(iconName);
    } catch (_err) {
      // Firefox in private mode doesn't support IDB
      databaseIcon = undefined;
    }

    if (databaseIcon) {
      this._path = databaseIcon;
      cachedIcons[iconName] = databaseIcon;
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
    cachedIcons[iconName] = iconPack[iconName];
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
