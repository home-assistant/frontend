import type { HassConfig } from "home-assistant-js-websocket";
import type { PropertyValues } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, query, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { ifDefined } from "lit/directives/if-defined";
import { live } from "lit/directives/live";
import { consume } from "../../../common/decorators/consume";
import {
  consumeEntityRegistryEntry,
  consumeEntityState,
  consumeLocalize,
} from "../../../common/decorators/consume-context-entry";
import { transform } from "../../../common/decorators/transform";
import { applyThemesOnElement } from "../../../common/dom/apply_themes_on_element";
import { fireEvent } from "../../../common/dom/fire_event";
import type { LocalizeFunc } from "../../../common/translations/localize";
import { computeDomain } from "../../../common/entity/compute_domain";
import "../../../components/ha-card";
import {
  apiContext,
  configContext,
  connectionContext,
  formattersContext,
  uiContext,
} from "../../../data/context";
import type { EntityRegistryDisplayEntry } from "../../../data/entity/entity_registry";
import type { ImageEntity } from "../../../data/image";
import { computeImageUrl } from "../../../data/image";
import type { ActionHandlerEvent } from "../../../data/lovelace/action_handler";
import type { Themes } from "../../../data/ws-themes";
import type {
  HomeAssistantApi,
  HomeAssistantConfig,
  HomeAssistantConnection,
  HomeAssistantFormatters,
  HomeAssistantUI,
} from "../../../types";
import { actionHandler } from "../common/directives/action-handler-directive";
import { hasAction, hasAnyAction } from "../common/has-action";
import { createEntityNotFoundWarning } from "../components/hui-warning";
import type { LovelaceCard, LovelaceCardEditor } from "../types";
import type { PictureCardConfig } from "./types";
import type { PersonEntity } from "../../../data/person";
import {
  isMediaSourceContentId,
  resolveMediaSource,
  isStreamingMedia,
} from "../../../data/media_source";

@customElement("hui-picture-card")
export class HuiPictureCard extends LitElement implements LovelaceCard {
  public static async getConfigElement(): Promise<LovelaceCardEditor> {
    await import("../editor/config-elements/hui-picture-card-editor");
    return document.createElement("hui-picture-card-editor");
  }

  public static getStubConfig(): PictureCardConfig {
    return {
      type: "picture",
      image: "https://demo.home-assistant.io/stub_config/t-shirt-promo.png",
    };
  }

  @state() private _config?: PictureCardConfig;

  @state() private _resolvedImage?: string;

  @state()
  @consumeEntityState({ entityIdPath: ["_config", "image_entity"] })
  private _stateObj?: ImageEntity | PersonEntity;

  @state()
  @consumeEntityRegistryEntry({ entityIdPath: ["_config", "image_entity"] })
  _entity?: EntityRegistryDisplayEntry;

  @state()
  @consumeLocalize()
  private _localize!: LocalizeFunc;

  @state()
  @consume({ context: formattersContext, subscribe: true })
  private _formatters!: HomeAssistantFormatters;

  @state()
  @consume({ context: configContext, subscribe: true })
  @transform<HomeAssistantConfig, HassConfig>({
    transformer: ({ config }) => config,
  })
  private _hassConfig!: HassConfig;

  @state()
  @consume({ context: connectionContext, subscribe: true })
  @transform<HomeAssistantConnection, HomeAssistantConnection["hassUrl"]>({
    transformer: ({ hassUrl }) => hassUrl,
  })
  private _hassUrl!: HomeAssistantConnection["hassUrl"];

  @state()
  @consume({ context: uiContext, subscribe: true })
  @transform<HomeAssistantUI, Themes>({
    transformer: ({ themes }) => themes,
  })
  private _themes!: Themes;

  @state()
  @consume({ context: apiContext, subscribe: true })
  private _api?: HomeAssistantApi;

  private _resolvingImage?: string;

  private _reconnectImg = false;

  @query("img") private _img?: HTMLImageElement;

  public disconnectedCallback() {
    super.disconnectedCallback();
    if (isStreamingMedia(this._img?.getAttribute("src") || "")) {
      this._reconnectImg = true;
      this._img?.removeAttribute("src");
    }
  }

  public connectedCallback() {
    super.connectedCallback();
    if (this._reconnectImg) {
      this.requestUpdate();
    }
  }

  public getCardSize(): number {
    return 5;
  }

  public setConfig(config: PictureCardConfig): void {
    if (!config || (!config.image && !config.image_entity)) {
      throw new Error("Image required");
    }

    if (config.image_entity) {
      this._config = {
        tap_action: { action: "more-info" },
        ...config,
      };
    } else {
      this._config = {
        tap_action: { action: "none" },
        ...config,
      };
    }
  }

  protected willUpdate(changedProps: PropertyValues) {
    super.willUpdate(changedProps);

    if (!this._config) {
      return;
    }
    if (this.isConnected) {
      this._reconnectImg = false;
    }

    const imageChanged =
      changedProps.has("_config") &&
      changedProps.get("_config")?.image !== this._config?.image;

    const image =
      (typeof this._config?.image === "object" &&
        this._config.image.media_content_id) ||
      (this._config.image as string | undefined);
    if (typeof image === "string" && isMediaSourceContentId(image)) {
      if (this._api && this._resolvingImage !== image) {
        this._resolvingImage = image;
        this._resolvedImage = undefined;
        resolveMediaSource(this._api, image).then(
          (result) => {
            if (this._resolvingImage === image) {
              this._resolvedImage = result.url;
            }
          },
          () => {
            // Let a later update retry the same image
            if (this._resolvingImage === image) {
              this._resolvingImage = undefined;
            }
          }
        );
      }
    } else if (imageChanged) {
      this._resolvingImage = undefined;
      this._resolvedImage = image;
    }
  }

  protected updated(changedProps: PropertyValues): void {
    super.updated(changedProps);
    if (!this._config || !this._themes) {
      return;
    }
    const oldThemes = changedProps.get("_themes") as Themes | undefined;
    const oldConfig = changedProps.get("_config") as
      PictureCardConfig | undefined;

    if (
      !oldThemes ||
      !oldConfig ||
      oldThemes !== this._themes ||
      oldConfig.theme !== this._config.theme
    ) {
      applyThemesOnElement(this, this._themes, this._config.theme);
    }
  }

  protected render() {
    if (!this._config) {
      return nothing;
    }

    const stateObj = this._stateObj;

    if (this._config.image_entity && !stateObj) {
      return html`<hui-warning>
        ${createEntityNotFoundWarning(this._localize, this._hassConfig)}
      </hui-warning>`;
    }

    let image: string | undefined = this._resolvedImage;
    if (this._config.image_entity) {
      const domain: string = computeDomain(this._config.image_entity);
      switch (domain) {
        case "image":
          image = computeImageUrl(stateObj as ImageEntity);
          break;
        case "person":
          if ((stateObj as PersonEntity).attributes.entity_picture) {
            image = (stateObj as PersonEntity).attributes.entity_picture;
          }
          break;
      }
    }

    if (image === undefined) {
      // Bail if we're waiting for our image to be resolved from the media-source.
      return nothing;
    }

    const clickable = Boolean(
      (this._config.image_entity && !this._config.tap_action) ||
      hasAnyAction(this._config)
    );

    return html`
      <ha-card
        @action=${this._handleAction}
        .actionHandler=${actionHandler({
          hasHold: hasAction(this._config!.hold_action),
          hasDoubleClick: hasAction(this._config!.double_tap_action),
        })}
        tabindex=${ifDefined(
          hasAction(this._config.tap_action) || this._config.image_entity
            ? "0"
            : undefined
        )}
        class=${classMap({
          clickable,
        })}
      >
        <img
          alt=${ifDefined(
            this._config.alt_text ||
              (stateObj
                ? this._formatters.formatEntityName(stateObj)
                : undefined)
          )}
          src=${this._reconnectImg ? nothing : live(this._hassUrl(image))}
        />
      </ha-card>
    `;
  }

  static styles = css`
    ha-card {
      overflow: hidden;
      height: 100%;
    }

    ha-card.clickable {
      cursor: pointer;
    }

    img {
      display: block;
      width: 100%;
    }
  `;

  private _handleAction(ev: ActionHandlerEvent) {
    fireEvent(this, "hass-action", {
      config: this._config!,
      action: ev.detail.action,
    });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-picture-card": HuiPictureCard;
  }
}
