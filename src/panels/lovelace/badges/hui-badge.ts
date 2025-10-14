import type { PropertyValues } from "lit";
import { ReactiveElement } from "lit";
import { customElement, property } from "lit/decorators";
import { fireEvent } from "../../../common/dom/fire_event";
import type { MediaQueriesListener } from "../../../common/dom/media_query";
import "../../../components/ha-svg-icon";
import type { LovelaceBadgeConfig } from "../../../data/lovelace/config/badge";
import type { HomeAssistant } from "../../../types";
import {
  attachConditionMediaQueriesListeners,
  checkConditionsMet,
} from "../common/validate-condition";
import { createBadgeElement } from "../create-element/create-badge-element";
import { createErrorBadgeConfig } from "../create-element/create-element-base";
import type { LovelaceBadge } from "../types";

declare global {
  interface HASSDomEvents {
    "badge-visibility-changed": { value: boolean };
    "badge-updated": undefined;
  }
}

@customElement("hui-badge")
export class HuiBadge extends ReactiveElement {
  @property({ type: Boolean }) public preview = false;

  @property({ attribute: false }) public config?: LovelaceBadgeConfig;

  @property({ attribute: false }) public hass?: HomeAssistant;

  private _elementConfig?: LovelaceBadgeConfig;

  public load() {
    if (!this.config) {
      throw new Error("Cannot build badge without config");
    }
    this._loadElement(this.config);
  }

  private _element?: LovelaceBadge;

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

  private _updateElement(config: LovelaceBadgeConfig) {
    if (!this._element) {
      return;
    }
    this._element.setConfig(config);
    this._elementConfig = config;
    fireEvent(this, "badge-updated");
  }

  private _loadElement(config: LovelaceBadgeConfig) {
    this._element = createBadgeElement(config);
    this._elementConfig = config;
    if (this.hass) {
      this._element.hass = this.hass;
    }
    this._element.addEventListener(
      "ll-upgrade",
      (ev: Event) => {
        ev.stopPropagation();
        if (this.hass) {
          this._element!.hass = this.hass;
        }
        fireEvent(this, "badge-updated");
      },
      { once: true }
    );
    this._element.addEventListener(
      "ll-rebuild",
      (ev: Event) => {
        ev.stopPropagation();
        this._loadElement(config);
        fireEvent(this, "badge-updated");
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
          const typeChanged = this.config?.type !== elementConfig?.type;
          if (typeChanged) {
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
          this._loadElement(createErrorBadgeConfig(e.message, null));
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

    if (this.config?.disabled) {
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
      fireEvent(this, "badge-visibility-changed", { value: visible });
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
    "hui-badge": HuiBadge;
  }
}
