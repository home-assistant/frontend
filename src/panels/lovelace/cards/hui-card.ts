import { PropertyValueMap, PropertyValues, ReactiveElement } from "lit";
import { customElement, property } from "lit/decorators";
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
import type { LovelaceCard, LovelaceLayoutOptions } from "../types";

declare global {
  interface HASSDomEvents {
    "card-visibility-changed": { value: boolean };
    "card-updated": undefined;
  }
}

@customElement("hui-card")
export class HuiCard extends ReactiveElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ type: Boolean }) public preview = false;

  @property({ type: Boolean }) public isPanel = false;

  set config(config: LovelaceCardConfig | undefined) {
    if (!config) return;
    if (config.type !== this._config?.type) {
      this._buildElement(config);
    } else if (config !== this.config) {
      this._element?.setConfig(config);
      fireEvent(this, "card-updated");
    }
    this._config = config;
  }

  @property({ attribute: false })
  public get config() {
    return this._config;
  }

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
    const configOptions = this.config?.layout_options ?? {};
    if (this._element) {
      const cardOptions = this._element.getLayoutOptions?.() ?? {};
      return {
        ...cardOptions,
        ...configOptions,
      };
    }
    return configOptions;
  }

  public getElementLayoutOptions(): LovelaceLayoutOptions {
    return this._element?.getLayoutOptions?.() ?? {};
  }

  private _createElement(config: LovelaceCardConfig) {
    const element = createCardElement(config);
    element.hass = this.hass;
    element.preview = this.preview;
    // For backwards compatibility
    (element as any).editMode = this.preview;
    // Update element when the visibility of the card changes (e.g. conditional card or filter card)
    element.addEventListener("card-visibility-changed", (ev: Event) => {
      ev.stopPropagation();
      this._updateVisibility();
    });
    element.addEventListener(
      "ll-upgrade",
      (ev: Event) => {
        ev.stopPropagation();
        fireEvent(this, "card-updated");
      },
      { once: true }
    );
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
    this._element = this._createElement(config);

    while (this.lastChild) {
      this.removeChild(this.lastChild);
    }
    this._updateVisibility();
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
      if (changedProps.has("preview")) {
        try {
          this._element.preview = this.preview;
          // For backwards compatibility
          (this._element as any).editMode = this.preview;
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

  private _clearMediaQueries() {
    this._listeners.forEach((unsub) => unsub());
    this._listeners = [];
  }

  private _listenMediaQueries() {
    this._clearMediaQueries();
    if (!this.config?.visibility) {
      return;
    }
    const conditions = this.config.visibility;
    const hasOnlyMediaQuery =
      conditions.length === 1 &&
      conditions[0].condition === "screen" &&
      !!conditions[0].media_query;

    this._listeners = attachConditionMediaQueriesListeners(
      this.config.visibility,
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
      this._setElementVisibility(false);
      return;
    }

    const visible =
      forceVisible ||
      this.preview ||
      !this.config?.visibility ||
      checkConditionsMet(this.config.visibility, this.hass);
    this._setElementVisibility(visible);
  }

  private _setElementVisibility(visible: boolean) {
    if (!this._element) return;

    if (this.hidden !== !visible) {
      this.style.setProperty("display", visible ? "" : "none");
      this.toggleAttribute("hidden", !visible);
      fireEvent(this, "card-visibility-changed", { value: visible });
    }

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
