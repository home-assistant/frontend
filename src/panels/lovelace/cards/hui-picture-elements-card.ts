import type { PropertyValues } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { applyThemesOnElement } from "../../../common/dom/apply_themes_on_element";
import { computeDomain } from "../../../common/entity/compute_domain";
import "../../../components/ha-card";
import type { ImageEntity } from "../../../data/image";
import { computeImageUrl } from "../../../data/image";
import type { HomeAssistant } from "../../../types";
import { findEntities } from "../common/find-entities";
import type { LovelaceElement, LovelaceElementConfig } from "../elements/types";
import type { LovelaceCard, LovelaceCardEditor } from "../types";
import { createStyledHuiElement } from "./picture-elements/create-styled-hui-element";
import type { PictureElementsCardConfig } from "./types";
import type { PersonEntity } from "../../../data/person";

@customElement("hui-picture-elements-card")
class HuiPictureElementsCard extends LitElement implements LovelaceCard {
  public static async getConfigElement(): Promise<LovelaceCardEditor> {
    await import("../editor/config-elements/hui-picture-elements-card-editor");
    return document.createElement("hui-picture-elements-card-editor");
  }

  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _elements?: LovelaceElement[];

  public static getStubConfig(
    hass: HomeAssistant,
    entities: string[],
    entitiesFallback: string[]
  ): PictureElementsCardConfig {
    const maxEntities = 1;
    const foundEntities = findEntities(
      hass,
      maxEntities,
      entities,
      entitiesFallback,
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

  @state() private _config?: PictureElementsCardConfig;

  public getCardSize(): number {
    return 4;
  }

  public setConfig(config: PictureElementsCardConfig): void {
    if (!config) {
      throw new Error("Invalid configuration");
    } else if (
      !(
        config.image ||
        config.image_entity ||
        config.camera_image ||
        config.state_image
      ) ||
      (config.state_image && !config.entity)
    ) {
      throw new Error("Image required");
    } else if (!Array.isArray(config.elements)) {
      throw new Error("Elements required");
    }

    this._config = config;

    this._elements = config.elements.map((element) => {
      const cardElement = this._createElement(element);
      return cardElement;
    });
  }

  protected updated(changedProps: PropertyValues): void {
    super.updated(changedProps);
    if (!this._config || !this.hass) {
      return;
    }

    if (this._elements && changedProps.has("hass")) {
      for (const element of this._elements) {
        element.hass = this.hass;
      }
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
      applyThemesOnElement(this, this.hass.themes, this._config.theme);
    }
  }

  private _handleImageClick(ev: MouseEvent) {
    if (!this._config) return;

    const rect = (ev.currentTarget as HTMLElement).getBoundingClientRect();
    const x = ((ev.clientX - rect.left) / rect.width) * 100;
    const y = ((ev.clientY - rect.top) / rect.height) * 100;

    this.dispatchEvent(
      new CustomEvent("picture-elements-clicked", {
        detail: { x, y },
        bubbles: true,
        composed: true,
      })
    );
  }

  protected render() {
    if (!this.hass || !this._config) {
      return nothing;
    }

    let image: string | undefined = this._config.image;
    if (this._config.image_entity) {
      const stateObj: ImageEntity | PersonEntity | undefined =
        this.hass.states[this._config.image_entity];
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

    return html`
      <ha-card .header=${this._config.title}>
        <div id="root">
          <hui-image
            .hass=${this.hass}
            .image=${image}
            .stateImage=${this._config.state_image}
            .stateFilter=${this._config.state_filter}
            .cameraImage=${this._config.camera_image}
            .cameraView=${this._config.camera_view}
            .entity=${this._config.entity}
            .aspectRatio=${this._config.aspect_ratio}
            .darkModeFilter=${this._config.dark_mode_filter}
            .darkModeImage=${this._config.dark_mode_image}
            @click=${this._handleImageClick}
          ></hui-image>
          ${this._elements}
        </div>
      </ha-card>
    `;
  }

  static styles = css`
    #root {
      position: relative;
    }

    .element {
      position: absolute;
      transform: translate(-50%, -50%);
    }

    ha-card {
      overflow: hidden;
      height: 100%;
      box-sizing: border-box;
    }
  `;

  private _createElement(
    elementConfig: LovelaceElementConfig
  ): LovelaceElement {
    const element = createStyledHuiElement(elementConfig) as LovelaceCard;
    if (this.hass) {
      element.hass = this.hass;
    }
    element.addEventListener(
      "ll-rebuild",
      (ev) => {
        ev.stopPropagation();
        this._rebuildElement(element, elementConfig);
      },
      { once: true }
    );
    return element;
  }

  private _rebuildElement(
    elToReplace: LovelaceElement,
    config: LovelaceElementConfig
  ): void {
    const newCardEl = this._createElement(config);
    if (elToReplace.parentElement) {
      elToReplace.parentElement.replaceChild(newCardEl, elToReplace);
    }
    this._elements = this._elements!.map((curCardEl) =>
      curCardEl === elToReplace ? newCardEl : curCardEl
    );
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-picture-elements-card": HuiPictureElementsCard;
  }
}
