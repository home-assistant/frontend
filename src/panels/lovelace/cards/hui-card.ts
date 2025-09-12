import type { PropertyValues } from "lit";
import { ReactiveElement } from "lit";
import { customElement, property } from "lit/decorators";
import { fireEvent } from "../../../common/dom/fire_event";
import type { MediaQueriesListener } from "../../../common/dom/media_query";
import "../../../components/ha-svg-icon";
import type { LovelaceCardConfig } from "../../../data/lovelace/config/card";
import type { HomeAssistant } from "../../../types";
import { migrateLayoutToGridOptions } from "../common/compute-card-grid-size";
import { computeCardSize } from "../common/compute-card-size";
import {
  attachConditionMediaQueriesListeners,
  checkConditionsMet,
} from "../common/validate-condition";
import { tryCreateCardElement } from "../create-element/create-card-element";
import { createErrorCardElement } from "../create-element/create-element-base";
import type { LovelaceCard, LovelaceGridOptions } from "../types";

declare global {
  interface HASSDomEvents {
    "card-visibility-changed": { value: boolean };
    "card-updated": undefined;
  }
}

@customElement("hui-card")
export class HuiCard extends ReactiveElement {
  @property({ type: Boolean }) public preview = false;

  @property({ attribute: false }) public config?: LovelaceCardConfig;

  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ attribute: false }) public layout?: string;

  private _elementConfig?: LovelaceCardConfig;

  public load() {
    if (!this.config) {
      throw new Error("Cannot build card without config");
    }
    this._loadElement(this.config);
  }

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

  public getGridOptions(): LovelaceGridOptions {
    const elementOptions = this.getElementGridOptions();
    const configOptions = this.getConfigGridOptions();
    const mergedConfig = {
      ...elementOptions,
      ...configOptions,
    };

    // If the element has fixed rows or columns, we use the values from the element
    if (elementOptions.fixed_rows) {
      mergedConfig.rows = elementOptions.rows;
      delete mergedConfig.min_rows;
      delete mergedConfig.max_rows;
    }
    if (elementOptions.fixed_columns) {
      mergedConfig.columns = elementOptions.columns;
      delete mergedConfig.min_columns;
      delete mergedConfig.max_columns;
    }
    return mergedConfig;
  }

  // options provided by the element
  public getElementGridOptions(): LovelaceGridOptions {
    if (!this._element) return {};

    if (this._element.getGridOptions) {
      const options = this._element.getGridOptions();
      // Some custom cards might return undefined, so we ensure we return an object
      return options || {};
    }
    if (this._element.getLayoutOptions) {
      // Disabled for now to avoid spamming the console, need to be re-enabled when hui-card performance are fixed

      // console.warn(
      //   `This card (${this.config?.type}) is using "getLayoutOptions" and it is deprecated, contact the developer to suggest to use "getGridOptions" instead`
      // );
      const options = migrateLayoutToGridOptions(
        this._element.getLayoutOptions()
      );
      return options;
    }
    return {};
  }

  // options provided by the config
  public getConfigGridOptions(): LovelaceGridOptions {
    if (this.config?.grid_options) {
      return this.config.grid_options;
    }
    if (this.config?.layout_options) {
      return migrateLayoutToGridOptions(this.config.layout_options);
    }
    return {};
  }

  private _updateElement(config: LovelaceCardConfig) {
    if (!this._element) {
      return;
    }
    this._element.setConfig(config);
    this._elementConfig = config;
    fireEvent(this, "card-updated");
  }

  private _loadElement(config: LovelaceCardConfig) {
    try {
      this._element = tryCreateCardElement(config);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : undefined;
      this._element = createErrorCardElement({
        type: "error",
        message: errorMessage,
      });
    }
    this._elementConfig = config;
    if (this.hass) {
      this._element.hass = this.hass;
    }
    this._element.layout = this.layout;
    this._element.preview = this.preview;
    // For backwards compatibility
    (this._element as any).editMode = this.preview;
    // Update element when the visibility of the card changes (e.g. conditional card or filter card)
    this._element.addEventListener("card-visibility-changed", (ev: Event) => {
      ev.stopPropagation();
      this._updateVisibility();
    });
    this._element.addEventListener(
      "ll-upgrade",
      (ev: Event) => {
        ev.stopPropagation();
        if (this.hass) {
          this._element!.hass = this.hass;
        }
        fireEvent(this, "card-updated");
      },
      { once: true }
    );
    this._element.addEventListener(
      "ll-rebuild",
      (ev: Event) => {
        ev.stopPropagation();
        this._loadElement(config);
        fireEvent(this, "card-updated");
      },
      { once: true }
    );
    while (this.lastChild) {
      this.removeChild(this.lastChild);
    }
    this._updateVisibility();
  }

  protected willUpdate(changedProps: PropertyValues<typeof this>): void {
    super.willUpdate(changedProps);

    if (!this._element) {
      this.load();
    }
  }

  protected update(changedProps: PropertyValues<typeof this>) {
    super.update(changedProps);

    if (this._element) {
      if (changedProps.has("config")) {
        const elementConfig = this._elementConfig;
        if (this.config !== elementConfig && this.config) {
          const typeChanged =
            this.config?.type !== elementConfig?.type || this.preview;
          // Rebuild the card if the type of the card has changed or if we are in preview mode
          if (typeChanged || this.preview) {
            this._loadElement(this.config);
          } else {
            this._updateElement(this.config);
          }
        }
      }
      if (changedProps.has("hass")) {
        try {
          if (this.hass) {
            this._element.hass = this.hass;
          }
        } catch (e: any) {
          // eslint-disable-next-line no-console
          console.error(this.config?.type, e);
          this._loadElement({ type: "error" });
        }
      }
      if (changedProps.has("preview")) {
        try {
          this._element.preview = this.preview;
          // For backwards compatibility
          (this._element as any).editMode = this.preview;
          if (this.hasUpdated) {
            fireEvent(this, "card-updated");
          }
        } catch (e: any) {
          // eslint-disable-next-line no-console
          console.error(this.config?.type, e);
          this._loadElement({ type: "error" });
        }
      }
      if (changedProps.has("layout")) {
        try {
          this._element.layout = this.layout;
          // For backwards compatibility
          (this._element as any).isPanel = this.layout === "panel";
        } catch (e: any) {
          // eslint-disable-next-line no-console
          console.error(this.config?.type, e);
          this._loadElement({ type: "error" });
        }
      }
    }

    if (changedProps.has("hass") || changedProps.has("preview")) {
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

  private _updateVisibility(ignoreConditions?: boolean) {
    if (!this._element || !this.hass) {
      return;
    }

    if (this._element.hidden) {
      this._setElementVisibility(false);
      return;
    }

    if (this.preview) {
      this._setElementVisibility(true);
      return;
    }

    if (this.config?.hidden) {
      this._setElementVisibility(false);
      return;
    }

    const visible =
      ignoreConditions ||
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

    if (this._element.connectedWhileHidden === true) {
      if (!this._element.parentElement) {
        this.appendChild(this._element);
      }
    } else if (!visible && this._element.parentElement) {
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
