import type { PropertyValues, TemplateResult } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { ifDefined } from "lit/directives/if-defined";
import { applyThemesOnElement } from "../../../common/dom/apply_themes_on_element";
import { computeDomain } from "../../../common/entity/compute_domain";
import { computeStateName } from "../../../common/entity/compute_state_name";
import "../../../components/ha-card";
import type { CameraEntity } from "../../../data/camera";
import type { ImageEntity } from "../../../data/image";
import { computeImageUrl } from "../../../data/image";
import type { ActionHandlerEvent } from "../../../data/lovelace/action_handler";
import type { PersonEntity } from "../../../data/person";
import type { HomeAssistant } from "../../../types";
import { actionHandler } from "../common/directives/action-handler-directive";
import { findEntities } from "../common/find-entities";
import { handleAction } from "../common/handle-action";
import { hasAction } from "../common/has-action";
import { hasConfigOrEntityChanged } from "../common/has-changed";
import "../components/hui-image";
import { createEntityNotFoundWarning } from "../components/hui-warning";
import type { LovelaceCard, LovelaceCardEditor } from "../types";
import type { PictureEntityCardConfig } from "./types";

export const STUB_IMAGE =
  "https://demo.home-assistant.io/stub_config/bedroom.png";

@customElement("hui-picture-entity-card")
class HuiPictureEntityCard extends LitElement implements LovelaceCard {
  public static async getConfigElement(): Promise<LovelaceCardEditor> {
    await import("../editor/config-elements/hui-picture-entity-card-editor");
    return document.createElement("hui-picture-entity-card-editor");
  }

  public static getStubConfig(
    hass: HomeAssistant,
    entities: string[],
    entitiesFallback: string[]
  ): PictureEntityCardConfig {
    const maxEntities = 1;
    const foundEntities = findEntities(
      hass,
      maxEntities,
      entities,
      entitiesFallback,
      ["light", "switch"]
    );

    return {
      type: "picture-entity",
      entity: foundEntities[0] || "",
      image: STUB_IMAGE,
    };
  }

  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ attribute: false }) public layout?: string;

  @state() private _config?: PictureEntityCardConfig;

  public getCardSize(): number {
    return 3;
  }

  public setConfig(config: PictureEntityCardConfig): void {
    if (!config || !config.entity) {
      throw new Error("Entity must be specified");
    }

    if (
      !["camera", "image", "person"].includes(computeDomain(config.entity)) &&
      !config.image &&
      !config.state_image &&
      !config.camera_image
    ) {
      throw new Error("No image source configured");
    }

    this._config = {
      show_name: true,
      show_state: true,
      tap_action: { action: "more-info" },
      ...config,
    };
  }

  protected shouldUpdate(changedProps: PropertyValues): boolean {
    return hasConfigOrEntityChanged(this, changedProps);
  }

  protected updated(changedProps: PropertyValues): void {
    super.updated(changedProps);
    if (!this._config || !this.hass) {
      return;
    }
    const oldHass = changedProps.get("hass") as HomeAssistant | undefined;
    const oldConfig = changedProps.get("_config") as
      | PictureEntityCardConfig
      | undefined;

    if (
      !oldHass ||
      !oldConfig ||
      oldHass.themes !== this.hass.themes ||
      oldConfig.theme !== this._config.theme
    ) {
      applyThemesOnElement(this, this.hass.themes, this._config.theme);
    }
  }

  protected render() {
    if (!this._config || !this.hass) {
      return nothing;
    }

    const stateObj: CameraEntity | ImageEntity | PersonEntity | undefined =
      this.hass.states[this._config.entity];

    if (!stateObj) {
      return html`
        <hui-warning .hass=${this.hass}>
          ${createEntityNotFoundWarning(this.hass, this._config.entity)}
        </hui-warning>
      `;
    }

    const name = this._config.name || computeStateName(stateObj);
    const entityState = this.hass.formatEntityState(stateObj);

    let footer: TemplateResult | string = "";
    if (this._config.show_name && this._config.show_state) {
      footer = html`
        <div class="footer both">
          <div>${name}</div>
          <div>${entityState}</div>
        </div>
      `;
    } else if (this._config.show_name) {
      footer = html`<div class="footer single">${name}</div>`;
    } else if (this._config.show_state) {
      footer = html`<div class="footer single">${entityState}</div>`;
    }

    const domain: string = computeDomain(this._config.entity);
    let image: string | undefined = this._config.image;
    if (!image) {
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

    const ignoreAspectRatio =
      this.layout === "grid" &&
      typeof this._config.grid_options?.rows === "number";

    return html`
      <ha-card>
        <div
          class="image-container"
          @action=${this._handleAction}
          .actionHandler=${actionHandler({
            hasHold: hasAction(this._config!.hold_action),
            hasDoubleClick: hasAction(this._config!.double_tap_action),
          })}
          tabindex=${ifDefined(
            hasAction(this._config.tap_action) || this._config.entity
              ? "0"
              : undefined
          )}
          role=${ifDefined(
            hasAction(this._config.tap_action) || this._config.entity
              ? "0"
              : undefined
          )}
        >
          <hui-image
            .hass=${this.hass}
            .image=${image}
            .stateImage=${this._config.state_image}
            .stateFilter=${this._config.state_filter}
            .cameraImage=${domain === "camera"
              ? this._config.entity
              : this._config.camera_image}
            .cameraView=${this._config.camera_view}
            .entity=${this._config.entity}
            .aspectRatio=${ignoreAspectRatio
              ? undefined
              : this._config.aspect_ratio}
            .fitMode=${this._config.fit_mode}
          ></hui-image>
        </div>
        ${footer}
      </ha-card>
    `;
  }

  static styles = css`
    ha-card {
      min-height: 75px;
      overflow: hidden;
      position: relative;
      height: 100%;
      box-sizing: border-box;
    }

    .image-container {
      height: 100%;
      cursor: pointer;
    }

    hui-image {
      cursor: pointer;
      pointer-events: none;
      height: 100%;
    }

    .footer {
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;

      position: absolute;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: var(
        --ha-picture-card-background-color,
        rgba(0, 0, 0, 0.3)
      );
      padding: 16px;
      font-size: var(--ha-font-size-l);
      line-height: 16px;
      color: var(--ha-picture-card-text-color, white);
      pointer-events: none;
    }

    .both {
      display: flex;
      justify-content: space-between;
    }

    .single {
      text-align: center;
    }
  `;

  private _handleAction(ev: ActionHandlerEvent) {
    handleAction(this, this.hass!, this._config!, ev.detail.action!);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-picture-entity-card": HuiPictureEntityCard;
  }
}
