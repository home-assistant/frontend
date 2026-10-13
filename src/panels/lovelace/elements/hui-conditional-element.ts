import type { PropertyValues } from "lit";
import { ReactiveElement } from "lit";
import { customElement, property, state } from "lit/decorators";
import type { HomeAssistant } from "../../../types";
import { ConditionalListenerMixin } from "../../../mixins/conditional-listener-mixin";
import { createStyledHuiElement } from "../cards/picture-elements/create-styled-hui-element";
import { validateConditionalConfig } from "../common/validate-condition";
import type { LovelacePictureElementEditor } from "../types";
import type {
  ConditionalElementConfig,
  LovelaceElement,
  LovelaceElementConfig,
} from "./types";

@customElement("hui-conditional-element")
class HuiConditionalElement
  extends ConditionalListenerMixin<ConditionalElementConfig>(ReactiveElement)
  implements LovelaceElement
{
  public static async getConfigElement(): Promise<LovelacePictureElementEditor> {
    await import("../editor/config-elements/elements/hui-conditional-element-editor");
    return document.createElement("hui-conditional-element-editor");
  }

  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() protected _config?: ConditionalElementConfig;

  private _elements: LovelaceElement[] = [];

  protected createRenderRoot() {
    return this;
  }

  public setConfig(config: ConditionalElementConfig): void {
    if (
      !config.conditions ||
      !Array.isArray(config.conditions) ||
      !config.elements ||
      !Array.isArray(config.elements) ||
      !validateConditionalConfig(config.conditions)
    ) {
      throw new Error("Invalid configuration");
    }

    this._elements.forEach((el) => el.parentElement?.removeChild(el));
    this._elements = [];

    config.elements.forEach((elementConfig: LovelaceElementConfig) => {
      this._elements.push(createStyledHuiElement(elementConfig));
    });

    this._config = config;
  }

  public connectedCallback() {
    super.connectedCallback();
    this._updateVisibility();
  }

  protected setupConditionalListeners() {
    if (!this._config) {
      return;
    }

    super.setupConditionalListeners(this._config.conditions);
  }

  protected update(changed: PropertyValues): void {
    super.update(changed);

    if (changed.has("_config") || changed.has("hass")) {
      this.setupConditionalListeners();
      this._updateVisibility();
    }
  }

  protected _updateVisibility() {
    if (!this.hass || !this._config) {
      return;
    }

    const visible = this._conditionsVisible();

    this._elements.forEach((el) => {
      if (visible) {
        el.hass = this.hass;
        if (!el.parentElement) {
          this.appendChild(el);
        }
      } else if (el.parentElement) {
        this.removeChild(el);
      }
    });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-conditional-element": HuiConditionalElement;
  }
}
