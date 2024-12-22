import { PropertyValues, ReactiveElement } from "lit";
import { customElement, property, state } from "lit/decorators";
import { MediaQueriesListener } from "../../../common/dom/media_query";
import "../../../components/ha-svg-icon";
import { LovelaceCardConfig } from "../../../data/lovelace/config/card";
import type { HomeAssistant } from "../../../types";
import { computeCardSize } from "../common/compute-card-size";
import {
  attachConditionMediaQueriesListeners,
  checkConditionsMet,
} from "../common/validate-condition";
import { createCardElement } from "../create-element/create-card-element";
import type { Lovelace, LovelaceCard, LovelaceLayoutOptions } from "../types";

declare global {
  interface HASSDomEvents {
    "card-visibility-changed": { value: boolean };
  }
}

@customElement("hui-card")
export class HuiCard extends ReactiveElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public lovelace?: Lovelace;

  @property({ attribute: false }) public isPanel = false;

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

  // Public to make demo happy
  public createElement(config: LovelaceCardConfig) {
    const element = createCardElement(config) as LovelaceCard;
    element.hass = this.hass;
    element.editMode = this.lovelace?.editMode;
    // Update element when the visibility of the card changes (e.g. conditional card or filter card)
    element.addEventListener("card-visibility-changed", (ev) => {
      ev.stopPropagation();
      this._updateElement();
    });
    return element;
  }

  public setConfig(config: LovelaceCardConfig): void {
    if (this._config === config) {
      return;
    }
    this._config = config;
    this._element = this.createElement(config);

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
        this._element.editMode = this.lovelace?.editMode;
      }
      if (changedProperties.has("hass") || changedProperties.has("lovelace")) {
        this._updateElement();
      }
      if (changedProperties.has("isPanel")) {
        this._element.isPanel = this.isPanel;
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
    const conditions = this._config.visibility;
    const hasOnlyMediaQuery =
      conditions.length === 1 &&
      conditions[0].condition === "screen" &&
      !!conditions[0].media_query;

    this._listeners = attachConditionMediaQueriesListeners(
      this._config.visibility,
      (matches) => {
        this._updateElement(hasOnlyMediaQuery && matches);
      }
    );
  }

  private _updateElement(forceVisible?: boolean) {
    if (!this._element) {
      return;
    }

    if (this._element.hidden) {
      this.style.setProperty("display", "none");
      this.toggleAttribute("hidden", true);
      return;
    }

    const visible =
      forceVisible ||
      this.lovelace?.editMode ||
      !this._config?.visibility ||
      checkConditionsMet(this._config.visibility, this.hass);

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
