import { PropertyValues, ReactiveElement } from "lit";
import { customElement, property, state } from "lit/decorators";
import "../../../components/ha-svg-icon";
import { LovelaceCardConfig } from "../../../data/lovelace/config/card";
import type { HomeAssistant } from "../../../types";
import { computeCardSize } from "../common/compute-card-size";
import { createCardElement } from "../create-element/create-card-element";
import type { Lovelace, LovelaceCard, LovelaceLayoutOptions } from "../types";
import { MediaQueriesListener } from "../../../common/dom/media_query";
import {
  attachConditionMediaQueriesListeners,
  checkConditionsMet,
} from "../common/validate-condition";

@customElement("hui-card")
export class HuiCard extends ReactiveElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public lovelace!: Lovelace;

  @state() public _config?: LovelaceCardConfig;

  private _element?: LovelaceCard;

  private _listeners: MediaQueriesListener[] = [];

  protected createRenderRoot() {
    return this;
  }

  public disconnectedCallback() {
    super.disconnectedCallback();
    this._clearMediaQueries();
  }

  public connectedCallback() {
    super.connectedCallback();
    this._listenMediaQueries();
    this._updateElement();
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
      if (changedProperties.has("hass") || changedProperties.has("lovelace")) {
        this._updateElement();
      }
    }
  }

  private _clearMediaQueries() {
    this._listeners.forEach((unsub) => unsub());
    this._listeners = [];
  }

  private _listenMediaQueries() {
    this._clearMediaQueries();
    if (!this._config?.visibility) {
      return;
    }
    this._listeners = attachConditionMediaQueriesListeners(
      this._config.visibility,
      this.hass,
      (visibility) => {
        const visible = visibility || this.lovelace!.editMode;
        this._updateElement(visible);
      }
    );
  }

  private _updateElement(forceVisible?: boolean) {
    if (!this._element || !this._config?.visibility) {
      return;
    }
    const visible =
      forceVisible ??
      (this.lovelace.editMode ||
        !this._config.visibility ||
        checkConditionsMet(this._config.visibility, this.hass));

    this.style.setProperty("display", visible ? "" : "none");
    this.toggleAttribute("hidden", !visible);
    if (!visible && this._element.parentElement) {
      this.removeChild(this._element);
    } else if (visible && !this._element.parentElement) {
      this.appendChild(this._element);
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-card": HuiCard;
  }
}
