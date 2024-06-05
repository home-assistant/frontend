import { PropertyValueMap, PropertyValues, ReactiveElement } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../common/dom/fire_event";
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
import { createErrorCardConfig } from "../create-element/create-element-base";
import type { Lovelace, LovelaceCard, LovelaceLayoutOptions } from "../types";

declare global {
  interface HASSDomEvents {
    "card-visibility-changed": { value: boolean };
    "card-updated": undefined;
  }
}

@customElement("hui-card")
export class HuiCard extends ReactiveElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ attribute: false }) public lovelace?: Lovelace;

  @property({ attribute: false }) public isPanel = false;

  @state() public _visible = true;

  private _config?: LovelaceCardConfig;

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
    this._updateVisibility();
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
    if (this.hass) {
      element.hass = this.hass;
    }
    if (this.lovelace) {
      element.editMode = this.lovelace.editMode;
    }
    // Update element when the visibility of the card changes (e.g. conditional card or filter card)
    element.addEventListener("card-visibility-changed", (ev: Event) => {
      ev.stopPropagation();
      this._updateVisibility();
    });
    element.addEventListener("ll-upgraded", (ev: Event) => {
      ev.stopPropagation();
      fireEvent(this, "card-updated");
    });
    element.addEventListener(
      "ll-rebuild",
      (ev: Event) => {
        ev.stopPropagation();
        this._buildElement(config);
        fireEvent(this, "card-updated");
      },
      { once: true }
    );
    return element;
  }

  private _buildElement(config: LovelaceCardConfig) {
    this._element = this.createElement(config);

    while (this.lastChild) {
      this.removeChild(this.lastChild);
    }
    this.appendChild(this._element!);
    this._updateVisibility();
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

  protected update(changedProps: PropertyValues<typeof this>) {
    super.update(changedProps);

    if (this._element) {
      if (changedProps.has("hass")) {
        try {
          this._element.hass = this.hass;
        } catch (e: any) {
          this._buildElement(createErrorCardConfig(e.message, null));
        }
      }
      if (changedProps.has("lovelace")) {
        try {
          this._element.editMode = this.lovelace?.editMode;
        } catch (e: any) {
          this._buildElement(createErrorCardConfig(e.message, null));
        }
      }
      if (changedProps.has("isPanel")) {
        this._element.isPanel = this.isPanel;
      }
    }
  }

  protected willUpdate(
    changedProps: PropertyValueMap<any> | Map<PropertyKey, unknown>
  ): void {
    if (changedProps.has("hass") || changedProps.has("lovelace")) {
      this._updateVisibility();
    }
  }

  protected updated(changedProps: PropertyValues<typeof this>): void {
    if (!this._element) return;

    if (changedProps.has("_visible")) {
      this.style.setProperty("display", this._visible ? "" : "none");
      this.toggleAttribute("hidden", !this._visible);
      fireEvent(this, "card-visibility-changed", { value: this._visible });

      if (!this._visible && this._element.parentElement) {
        this.removeChild(this._element);
      } else if (this._visible && !this._element.parentElement) {
        this.appendChild(this._element);
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
        this._updateVisibility(hasOnlyMediaQuery && matches);
      }
    );
  }

  private _updateVisibility(forceVisible?: boolean) {
    if (!this._element || !this.hass) {
      return;
    }

    if (this._element.hidden) {
      this._visible = false;
      return;
    }

    this._visible =
      forceVisible ||
      this.lovelace?.editMode ||
      !this._config?.visibility ||
      checkConditionsMet(this._config.visibility, this.hass);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-card": HuiCard;
  }
}
