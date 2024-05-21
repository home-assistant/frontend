import { PropertyValues, ReactiveElement } from "lit";
import { customElement, property, state } from "lit/decorators";
import "../../../components/ha-svg-icon";
import { LovelaceCardConfig } from "../../../data/lovelace/config/card";
import type { HomeAssistant } from "../../../types";
import { computeCardSize } from "../common/compute-card-size";
import { createCardElement } from "../create-element/create-card-element";
import type { Lovelace, LovelaceCard, LovelaceLayoutOptions } from "../types";

@customElement("hui-card")
export class HuiCard extends ReactiveElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public lovelace!: Lovelace;

  @state() public _config?: LovelaceCardConfig;

  private _element?: LovelaceCard;

  protected createRenderRoot() {
    return this;
  }

  public getCardSize(): number | Promise<number> {
    if (this._element) {
      const size = computeCardSize(this._element);
      return size;
    }
    return 1;
  }

  public getLayoutOptions(): LovelaceLayoutOptions {
    const configOptions = this._config?.layout_options ?? {};
    if (this._element) {
      const cardOptions = this._element.getLayoutOptions?.() ?? {};
      return {
        ...cardOptions,
        ...configOptions,
      };
    }
    return configOptions;
  }

  public setConfig(config: LovelaceCardConfig): void {
    if (this._config === config) {
      return;
    }
    this._config = config;
    this._element = createCardElement(config);
    this._element.hass = this.hass;
    this._element.editMode = this.lovelace.editMode;

    while (this.lastChild) {
      this.removeChild(this.lastChild);
    }
    this.appendChild(this._element!);
  }

  protected update(changedProperties: PropertyValues<typeof this>) {
    super.update(changedProperties);

    if (this._element) {
      if (changedProperties.has("hass")) {
        this._element.hass = this.hass;
      }
      if (changedProperties.has("lovelace")) {
        this._element.editMode = this.lovelace.editMode;
      }
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-card": HuiCard;
  }
}
