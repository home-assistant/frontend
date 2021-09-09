import "@polymer/iron-icon/iron-icon";
import {
  css,
  CSSResultGroup,
  html,
  LitElement,
  PropertyValues,
  TemplateResult,
} from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../common/dom/fire_event";
import { debounce } from "../common/util/debounce";
import { CustomIcon, customIconsets } from "../data/custom_iconsets";
import {
  checkCacheVersion,
  Chunks,
  findIconChunk,
  getIcon,
  Icons,
  MDI_PREFIXES,
  writeCache,
} from "../data/iconsets";
import "./ha-svg-icon";

interface DeprecatedIcon {
  [key: string]: {
    removeIn: string;
    newName?: string;
  };
}

const mdiDeprecatedIcons: DeprecatedIcon = {
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

const chunks: Chunks = {};

checkCacheVersion();

const debouncedWriteCache = debounce(() => writeCache(chunks), 2000);

const cachedIcons: Record<string, string> = {};

@customElement("ha-icon")
export class HaIcon extends LitElement {
  @property() public icon?: string;

  @state() private _path?: string;

  @state() private _viewBox?;

  @state() private _legacy = false;

  public willUpdate(changedProps: PropertyValues) {
    super.willUpdate(changedProps);
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
      // iOS Safari sometimes doesn't open the DB
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

  static get styles(): CSSResultGroup {
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
