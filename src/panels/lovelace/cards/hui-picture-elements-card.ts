import {
  html,
  LitElement,
  TemplateResult,
  property,
  customElement,
  css,
  CSSResult,
  PropertyValues,
} from "lit-element";

import { createStyledHuiElement } from "./picture-elements/create-styled-hui-element";
import { LovelaceCard } from "../types";
import { HomeAssistant } from "../../../types";
import { LovelaceElementConfig, LovelaceElement } from "../elements/types";
import { PictureElementsCardConfig } from "./types";
import { applyThemesOnElement } from "../../../common/dom/apply_themes_on_element";
import { findEntities } from "../common/find-entites";

@customElement("hui-picture-elements-card")
class HuiPictureElementsCard extends LitElement implements LovelaceCard {
  public static getStubConfig(
    hass: HomeAssistant,
    entities: string[],
    entitiesFill: string[]
  ): PictureElementsCardConfig {
    const maxEntities = 1;
    const foundEntities = findEntities(
      hass,
      maxEntities,
      entities,
      entitiesFill,
      ["sensor", "binary_sensor"]
    );

    return {
      type: "picture-elements",
      elements: [
        {
          type: "state-badge",
          entity: foundEntities[0] || "",
          style: {
            top: "32%",
            left: "40%",
          },
        },
      ],
      image: "https://demo.home-assistant.io/stub_config/floorplan.png",
    };
  }

  @property() private _config?: PictureElementsCardConfig;

  private _hass?: HomeAssistant;

  set hass(hass: HomeAssistant) {
    this._hass = hass;
    for (const el of Array.from(
      this.shadowRoot!.querySelectorAll("#root > *")
    )) {
      const element = el as LovelaceElement;
      element.hass = this._hass;
    }
  }

  public getCardSize(): number {
    return 4;
  }

  public setConfig(config: PictureElementsCardConfig): void {
    if (!config) {
      throw new Error("Invalid Configuration");
    } else if (
      !(config.image || config.camera_image || config.state_image) ||
      (config.state_image && !config.entity)
    ) {
      throw new Error("Invalid Configuration: image required");
    } else if (!Array.isArray(config.elements)) {
      throw new Error("Invalid Configuration: elements required");
    }

    this._config = config;
  }

  protected updated(changedProps: PropertyValues): void {
    super.updated(changedProps);
    if (!this._config || !this._hass) {
      return;
    }
    const oldHass = changedProps.get("hass") as HomeAssistant | undefined;
    const oldConfig = changedProps.get("_config") as
      | PictureElementsCardConfig
      | undefined;

    if (
      !oldHass ||
      !oldConfig ||
      oldHass.themes !== this.hass.themes ||
      oldConfig.theme !== this._config.theme
    ) {
      applyThemesOnElement(this, this._hass.themes, this._config.theme);
    }
  }

  protected render(): TemplateResult {
    if (!this._config) {
      return html``;
    }

    return html`
      <ha-card .header="${this._config.title}">
        <div id="root">
          <hui-image
            .hass=${this._hass}
            .image=${this._config.image}
            .stateImage=${this._config.state_image}
            .stateFilter=${this._config.state_filter}
            .cameraImage=${this._config.camera_image}
            .cameraView=${this._config.camera_view}
            .entity=${this._config.entity}
            .aspectRatio=${this._config.aspect_ratio}
          ></hui-image>
          ${this._config.elements.map(
            (elementConfig: LovelaceElementConfig) => {
              const element = createStyledHuiElement(elementConfig);
              element.hass = this._hass;

              return element;
            }
          )}
        </div>
      </ha-card>
    `;
  }

  static get styles(): CSSResult {
    return css`
      #root {
        position: relative;
      }

      .element {
        position: absolute;
        transform: translate(-50%, -50%);
      }

      ha-card {
        overflow: hidden;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-picture-elements-card": HuiPictureElementsCard;
  }
}
