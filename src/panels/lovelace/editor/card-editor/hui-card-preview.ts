import { PropertyValues, ReactiveElement } from "lit";
import { property } from "lit/decorators";
import { computeRTL } from "../../../../common/util/compute_rtl";
import { LovelaceCardConfig } from "../../../../data/lovelace";
import { HomeAssistant } from "../../../../types";
import { createCardElement } from "../../create-element/create-card-element";
import { createErrorCardConfig } from "../../create-element/create-element-base";
import { LovelaceCard } from "../../types";

export class HuiCardPreview extends ReactiveElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property() public config?: LovelaceCardConfig;

  private _element?: LovelaceCard;

  private get _error() {
    return this._element?.tagName === "HUI-ERROR-CARD";
  }

  constructor() {
    super();
    this.addEventListener("ll-rebuild", () => {
      this._cleanup();
      if (this.config) {
        this._createCard(this.config);
      }
    });
  }

  protected createRenderRoot() {
    return this;
  }

  protected update(changedProperties: PropertyValues) {
    super.update(changedProperties);

    if (changedProperties.has("config")) {
      const oldConfig = changedProperties.get("config") as
        | undefined
        | LovelaceCardConfig;

      if (!this.config) {
        this._cleanup();
        return;
      }

      if (!this.config.type) {
        this._createCard(
          createErrorCardConfig("No card type found", this.config)
        );
        return;
      }

      if (!this._element) {
        this._createCard(this.config);
        return;
      }

      // in case the element was an error element we always want to recreate it
      if (!this._error && oldConfig && this.config.type === oldConfig.type) {
        try {
          this._element.setConfig(this.config);
        } catch (err: any) {
          this._createCard(createErrorCardConfig(err.message, this.config));
        }
      } else {
        this._createCard(this.config);
      }
    }

    if (changedProperties.has("hass")) {
      const oldHass = changedProperties.get("hass") as
        | HomeAssistant
        | undefined;
      if (!oldHass || oldHass.language !== this.hass!.language) {
        this.style.direction = computeRTL(this.hass!) ? "rtl" : "ltr";
      }

      if (this._element) {
        this._element.hass = this.hass;
      }
    }
  }

  private _createCard(configValue: LovelaceCardConfig): void {
    this._cleanup();
    this._element = createCardElement(configValue);

    this._element.editMode = true;

    if (this.hass) {
      this._element!.hass = this.hass;
    }

    this.appendChild(this._element!);
  }

  private _cleanup() {
    if (!this._element) {
      return;
    }
    this.removeChild(this._element);
    this._element = undefined;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-card-preview": HuiCardPreview;
  }
}

customElements.define("hui-card-preview", HuiCardPreview);
