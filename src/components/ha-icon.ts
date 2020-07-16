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

const mdiRenameMapping = {
  "account-badge": "badge-account",
  "account-badge-alert": "badge-account-alert",
  "account-badge-alert-outline": "badge-account-alert-outline",
  "account-badge-horizontal": "badge-account-horizontal",
  "account-badge-horizontal-outline": "badge-account-horizontal-outline",
  "account-badge-outline": "badge-account-outline",
  "account-card-details": "card-account-details",
  "account-card-details-outline": "card-account-details-outline",
  airplay: "apple-airplay",
  artist: "account-music",
  "artist-outline": "account-music-outline",
  audiobook: "book-music",
  azure: "microsoft-azure",
  "azure-devops": "microsoft-azure-devops",
  bible: "book-cross",
  bowl: "bowl-mix",
  "calendar-repeat": "calendar-sync",
  "calendar-repeat-outline": "calendar-sync-outline",
  "camcorder-box": "video-box",
  "camcorder-box-off": "video-box-off",
  "cellphone-settings-variant": "cellphone-cog",
  "chart-snakey": "chart-sankey",
  "chart-snakey-variant": "chart-sankey-variant",
  coin: "currency-usd-circle",
  "coin-outline": "currency-usd-circle-outline",
  "coins-outline": "circle-multiple-outline",
  "contact-mail": "card-account-mail",
  "contact-mail-outline": "card-account-mail-outline",
  "contact-phone": "card-account-phone",
  "contact-phone-outline": "card-account-phone-outline",
  cowboy: "account-cowboy-hat",
  "database-refresh": "database-sync",
  dictionary: "book-alphabet",
  edge: "microsoft-edge",
  "edge-legacy": "microsoft-edge-legacy",
  "file-document-box": "text-box",
  "file-document-box-check-outline": "text-box-check-outline",
  "file-document-box-minus": "text-box-minus",
  "file-document-box-minus-outline": "text-box-minus-outline",
  "file-document-box-multiple": "text-box-multiple",
  "file-document-box-multiple-outline": "text-box-multiple-outline",
  "file-document-box-outline": "text-box-outline",
  "file-document-box-plus": "text-box-plus",
  "file-document-box-plus-outline": "text-box-plus-outline",
  "file-document-box-remove": "text-box-remove",
  "file-document-box-remove-outline": "text-box-remove-outline",
  "file-document-box-search": "text-box-search",
  "file-document-box-search-outline": "text-box-search-outline",
  "file-settings-variant": "file-cog",
  "file-settings-variant-outline": "file-cog-outline",
  "folder-settings-variant": "folder-cog",
  "folder-settings-variant-outline": "folder-cog-outline",
  "github-circle": "github",
  "google-adwords": "google-ads",
  hackernews: "y-combinator",
  hotel: "bed",
  "image-filter": "image-multiple-outline",
  "internet-explorer": "microsoft-internet-explorer",
  json: "code-json",
  kotlin: "language-kotlin",
  "library-books": "filmstrip-box",
  "library-movie": "filmstrip-box-multiple",
  "library-music": "music-box-multiple",
  "library-music-outline": "music-box-multiple-outline",
  "library-video": "play-box-multiple",
  markdown: "language-markdown",
  "markdown-outline": "language-markdown-outline",
  "message-settings-variant": "message-cog",
  "message-settings-variant-outline": "message-cog-outline",
  "microsoft-dynamics": "microsoft-dynamics-365",
  "network-router": "router-network",
  office: "microsoft-office",
  onedrive: "microsoft-onedrive",
  onenote: "microsoft-onenote",
  outlook: "microsoft-outlook",
  playstation: "sony-playstation",
  "periodic-table-co": "molecule-co",
  "periodic-table-co2": "molecule-co2",
  pot: "pot-steam",
  ruby: "language-ruby",
  sailing: "sail-boat",
  settings: "cog",
  "settings-box": "cog-box",
  "settings-outline": "cog-outline",
  "settings-transfer": "cog-transfer",
  "settings-transfer-outline": "cog-transfer-outline",
  "shield-refresh": "shield-sync",
  "shield-refresh-outline": "shield-sync-outline",
  "sort-alphabetical": "sort-alphabetical-variant",
  "sort-alphabetical-ascending": "sort-alphabetical-ascending-variant",
  "sort-alphabetical-descending": "sort-alphabetical-descending-variant",
  "sort-numeric": "sort-numeric-variant",
  "star-half": "star-half-full",
  storefront: "storefront-outline",
  timer: "timer-outline",
  "timer-off": "timer-off-outline",
  towing: "tow-truck",
  voice: "account-voice",
  "wall-sconce-variant": "wall-sconce-round-variant",
  wii: "nintendo-wii",
  wiiu: "nintendo-wiiu",
  windows: "microsoft-windows",
  "windows-classic": "microsoft-windows-classic",
  worker: "account-hard-hat",
  xbox: "microsoft-xbox",
  "xbox-controller": "microsoft-xbox-controller",
  "xbox-controller-battery-alert": "microsoft-xbox-controller-battery-alert",
  "xbox-controller-battery-charging":
    "microsoft-xbox-controller-battery-charging",
  "xbox-controller-battery-empty": "microsoft-xbox-controller-battery-empty",
  "xbox-controller-battery-full": "microsoft-xbox-controller-battery-full",
  "xbox-controller-battery-low": "microsoft-xbox-controller-battery-low",
  "xbox-controller-battery-medium": "microsoft-xbox-controller-battery-medium",
  "xbox-controller-battery-unknown":
    "microsoft-xbox-controller-battery-unknown",
  "xbox-controller-menu": "microsoft-xbox-controller-menu",
  "xbox-controller-off": "microsoft-xbox-controller-off",
  "xbox-controller-view": "microsoft-xbox-controller-view",
  yammer: "microsoft-yammer",
  "youtube-creator-studio": "youtube-studio",
  "selection-mutliple": "selection-multiple",
  textarea: "form-textarea",
  textbox: "form-textbox",
  "textbox-lock": "form-textbox-lock",
  "textbox-password": "form-textbox-password",
  "syllabary-katakana-half-width": "syllabary-katakana-halfwidth",
  "visual-studio-code": "microsoft-visual-studio-code",
  "visual-studio": "microsoft-visual-studio",
};

const mdiRemovedIcons = new Set([
  "accusoft",
  "amazon-drive",
  "android-head",
  "basecamp",
  "beats",
  "behance",
  "blackberry",
  "cisco-webex",
  "disqus-outline",
  "dribbble",
  "dribbble-box",
  "etsy",
  "eventbrite",
  "facebook-box",
  "flattr",
  "flickr",
  "foursquare",
  "github-box",
  "github-face",
  "glassdoor",
  "google-adwords",
  "google-pages",
  "google-physical-web",
  "google-plus-box",
  "houzz",
  "houzz-box",
  "instapaper",
  "itunes",
  "language-python-text",
  "lastfm",
  "linkedin-box",
  "lyft",
  "mail-ru",
  "mastodon-variant",
  "medium",
  "meetup",
  "mixcloud",
  "nfc-off",
  "npm-variant",
  "npm-variant-outline",
  "paypal",
  "periscope",
  "pinterest-box",
  "pocket",
  "quicktime",
  "shopify",
  "slackware",
  "square-inc",
  "square-inc-cash",
  "steam-box",
  "strava",
  "tor",
  "tumblr",
  "tumblr-box",
  "tumblr-reblog",
  "twitter-box",
  "twitter-circle",
  "uber",
  "venmo",
  "vk-box",
  "vk-circle",
  "wunderlist",
  "xda",
  "xing-box",
  "xing-circle",
  "yelp",
]);

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

    if (iconName in mdiRenameMapping) {
      iconName = mdiRenameMapping[iconName];
      const message = `Icon ${iconPrefix}:${origIconName} was renamed to ${iconPrefix}:${iconName}, please change your config, it will be removed in version 0.115.`;
      // eslint-disable-next-line no-console
      console.warn(message);
      fireEvent(this, "write_log", {
        level: "warning",
        message,
      });
    } else if (mdiRemovedIcons.has(iconName)) {
      const message = `Icon ${this.icon} was removed from MDI, please replace this icon with an other icon in your config, it will be removed in version 0.115.`;
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
