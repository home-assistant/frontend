import {
  CSSResultGroup,
  LitElement,
  PropertyValues,
  TemplateResult,
  css,
  html,
  nothing,
} from "lit";
import { customElement, property, state } from "lit/decorators";
import { ifDefined } from "lit/directives/if-defined";
import { applyThemesOnElement } from "../../../common/dom/apply_themes_on_element";
import { computeDomain } from "../../../common/entity/compute_domain";
import { computeStateName } from "../../../common/entity/compute_state_name";
import "../../../components/ha-card";
import { ImageEntity, computeImageUrl } from "../../../data/image";
import { ActionHandlerEvent } from "../../../data/lovelace";
import { HomeAssistant } from "../../../types";
import { actionHandler } from "../common/directives/action-handler-directive";
import { findEntities } from "../common/find-entities";
import { handleAction } from "../common/handle-action";
import { hasAction } from "../common/has-action";
import { hasConfigOrEntityChanged } from "../common/has-changed";
import "../components/hui-image";
import { createEntityNotFoundWarning } from "../components/hui-warning";
import { LovelaceCard, LovelaceCardEditor } from "../types";
import { PictureEntityCardConfig } from "./types";

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
      image: "https://demo.home-assistant.io/stub_config/bedroom.png",
    };
  }

  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: PictureEntityCardConfig;

  public getCardSize(): number {
    return 3;
  }

  public setConfig(config: PictureEntityCardConfig): void {
    if (!config || !config.entity) {
      throw new Error("Entity must be specified");
    }

    if (
      !["camera", "image"].includes(computeDomain(config.entity)) &&
      !config.image &&
      !config.state_image &&
      !config.camera_image
    ) {
      throw new Error("No image source configured");
    }

    this._config = { show_name: true, show_state: true, ...config };
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

    const stateObj = this.hass.states[this._config.entity];

    if (!stateObj) {
      return html`
        <hui-warning>
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

    const domain = computeDomain(this._config.entity);

    return html`
      <ha-card>
        <hui-image
          .hass=${this.hass}
          .image=${domain === "image"
            ? computeImageUrl(stateObj as ImageEntity)
            : this._config.image}
          .stateImage=${this._config.state_image}
          .stateFilter=${this._config.state_filter}
          .cameraImage=${domain === "camera"
            ? this._config.entity
            : this._config.camera_image}
          .cameraView=${this._config.camera_view}
          .entity=${this._config.entity}
          .aspectRatio=${this._config.aspect_ratio}
          .fitMode=${this._config.fit_mode}
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
        ></hui-image>
        ${footer}
      </ha-card>
    `;
  }

  static get styles(): CSSResultGroup {
    return css`
      ha-card {
        min-height: 75px;
        overflow: hidden;
        position: relative;
        height: 100%;
        box-sizing: border-box;
      }

      hui-image {
        cursor: pointer;
      }

      .footer {
        /* start paper-font-common-nowrap style */
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        /* end paper-font-common-nowrap style */

        position: absolute;
        left: 0;
        right: 0;
        bottom: 0;
        background-color: var(
          --ha-picture-card-background-color,
          rgba(0, 0, 0, 0.3)
        );
        padding: 16px;
        font-size: 16px;
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
  }

  private _handleAction(ev: ActionHandlerEvent) {
    handleAction(this, this.hass!, this._config!, ev.detail.action!);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-picture-entity-card": HuiPictureEntityCard;
  }
}
