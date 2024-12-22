import { PropertyValues, ReactiveElement } from "lit";
import { customElement, property } from "lit/decorators";
import { LovelaceSectionElement } from "../../../../data/lovelace";
import { LovelaceSectionConfig } from "../../../../data/lovelace/config/section";
import { HomeAssistant } from "../../../../types";
import { createSectionElement } from "../../create-element/create-section-element";
import { createErrorSectionConfig } from "../../sections/hui-error-section";
import { LovelaceConfig } from "../../../../data/lovelace/config/types";

@customElement("hui-section-preview")
export class HuiSectionPreview extends ReactiveElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ attribute: false }) public lovelace?: LovelaceConfig;

  @property({ attribute: false }) public config?: LovelaceSectionConfig;

  private _element?: LovelaceSectionElement;

  private get _error() {
    return this._element?.tagName === "HUI-ERROR-SECTION";
  }

  constructor() {
    super();
    this.addEventListener("ll-rebuild", () => {
      this._cleanup();
      if (this.config) {
        this._createSection(this.config);
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
        | LovelaceSectionConfig;

      if (!this.config) {
        this._cleanup();
        return;
      }

      if (!this.config.type) {
        this._createSection(createErrorSectionConfig("No section type found"));
        return;
      }

      if (!this._element) {
        this._createSection(this.config);
        return;
      }

      // in case the element was an error element we always want to recreate it
      if (!this._error && oldConfig && this.config.type === oldConfig.type) {
        try {
          this._element.setConfig(this.config);
        } catch (err: any) {
          this._createSection(createErrorSectionConfig(err.message));
        }
      } else {
        this._createSection(this.config);
      }
    }

    if (changedProperties.has("hass")) {
      if (this._element) {
        this._element.hass = this.hass;
      }
    }
  }

  private _createSection(configValue: LovelaceSectionConfig): void {
    this._cleanup();
    this._element = createSectionElement(configValue) as LovelaceSectionElement;

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
    "hui-section-preview": HuiSectionPreview;
  }
}
