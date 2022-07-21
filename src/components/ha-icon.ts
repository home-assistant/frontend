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
import { CustomIcon, customIcons } from "../data/custom_icons";
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
  "android-messages": {
    newName: "message-text",
    removeIn: "2022.10",
  },
  "book-variant-multiple": {
    newName: "bookmark-box-multiple",
    removeIn: "2022.10",
  },
  "desktop-mac": {
    newName: "monitor",
    removeIn: "2022.10",
  },
  "desktop-mac-dashboard": {
    newName: "monitor-dashboard",
    removeIn: "2022.10",
  },
  discord: {
    removeIn: "2022.10",
  },
  "diving-scuba": {
    newName: "diving-scuba-mask",
    removeIn: "2022.10",
  },
  "email-send": {
    newName: "email-arrow-right",
    removeIn: "2022.10",
  },
  "email-send-outline": {
    newName: "email-arrow-right-outline",
    removeIn: "2022.10",
  },
  "email-receive": {
    newName: "email-arrow-left",
    removeIn: "2022.10",
  },
  "email-receive-outline": {
    newName: "email-arrow-left-outline",
    removeIn: "2022.10",
  },
  "format-textdirection-r-to-l": {
    newName: "format-pilcrow-arrow-left",
    removeIn: "2022.10",
  },
  "format-textdirection-l-to-r": {
    newName: "format-pilcrow-arrow-right",
    removeIn: "2022.10",
  },
  "google-controller": {
    newName: "controller",
    removeIn: "2022.10",
  },
  "google-controller-off": {
    newName: "controller-off",
    removeIn: "2022.10",
  },
  "google-home": {
    removeIn: "2022.10",
  },
  lecturn: {
    newName: "lectern",
    removeIn: "2022.10",
  },
  receipt: {
    newName: "receipt-text",
    removeIn: "2022.10",
  },
  "receipt-outline": {
    newName: "receipt-text-outline",
    removeIn: "2022.10",
  },
  "tablet-android": {
    newName: "tablet",
    removeIn: "2022.10",
  },
  "text-to-speech": {
    newName: "microphone-message",
    removeIn: "2022.10",
  },
  "text-to-speech-off": {
    newName: "microphone-message-off",
    removeIn: "2022.10",
  },
  "timeline-help": {
    newName: "timeline-question",
    removeIn: "2022.10",
  },
  "timeline-help-outline": {
    newName: "timeline-question-outline",
    removeIn: "2022.10",
  },
  "vector-point": {
    newName: "vector-point-select",
    removeIn: "2022.10",
  },
};

const chunks: Chunks = {};

// Supervisor doesn't use icons, and should not update/downgrade the icon DB.
if (!__SUPERVISOR__) {
  checkCacheVersion();
}

const debouncedWriteCache = debounce(() => writeCache(chunks), 2000);

const cachedIcons: Record<string, string> = {};

@customElement("ha-icon")
export class HaIcon extends LitElement {
  @property() public icon?: string;

  @state() private _path?: string;

  @state() private _viewBox?: string;

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
    const requestedIcon = this.icon;
    const [iconPrefix, origIconName] = this.icon.split(":", 2);

    let iconName = origIconName;

    if (!iconPrefix || !iconName) {
      return;
    }

    if (!MDI_PREFIXES.includes(iconPrefix)) {
      if (iconPrefix in customIcons) {
        const customIcon = customIcons[iconPrefix];
        if (customIcon && typeof customIcon.getIcon === "function") {
          this._setCustomPath(customIcon.getIcon(iconName), requestedIcon);
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
      if (this.icon === requestedIcon) {
        this._path = databaseIcon;
      }
      cachedIcons[iconName] = databaseIcon;
      return;
    }
    const chunk = findIconChunk(iconName);

    if (chunk in chunks) {
      this._setPath(chunks[chunk], iconName, requestedIcon);
      return;
    }

    const iconPromise = fetch(`/static/mdi/${chunk}.json`).then((response) =>
      response.json()
    );
    chunks[chunk] = iconPromise;
    this._setPath(iconPromise, iconName, requestedIcon);
    debouncedWriteCache();
  }

  private async _setCustomPath(
    promise: Promise<CustomIcon>,
    requestedIcon: string
  ) {
    const icon = await promise;
    if (this.icon !== requestedIcon) {
      return;
    }
    this._path = icon.path;
    this._viewBox = icon.viewBox;
  }

  private async _setPath(
    promise: Promise<Icons>,
    iconName: string,
    requestedIcon: string
  ) {
    const iconPack = await promise;
    if (this.icon === requestedIcon) {
      this._path = iconPack[iconName];
    }
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
