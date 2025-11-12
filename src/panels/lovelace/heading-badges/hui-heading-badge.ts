import type { PropertyValues } from "lit";
import { ReactiveElement } from "lit";
import { customElement, property } from "lit/decorators";
import { fireEvent } from "../../../common/dom/fire_event";
import "../../../components/ha-svg-icon";
import type { HomeAssistant } from "../../../types";
import { ConditionalListenerMixin } from "../../../mixins/conditional-listener-mixin";
import { checkConditionsMet } from "../common/validate-condition";
import { createHeadingBadgeElement } from "../create-element/create-heading-badge-element";
import type { LovelaceHeadingBadge } from "../types";
import type { LovelaceHeadingBadgeConfig } from "./types";

declare global {
  interface HASSDomEvents {
    "heading-badge-visibility-changed": { value: boolean };
    "heading-badge-updated": undefined;
  }
}

@customElement("hui-heading-badge")
export class HuiHeadingBadge extends ConditionalListenerMixin<LovelaceHeadingBadgeConfig>(
  ReactiveElement
) {
  @property({ type: Boolean }) public preview = false;

  @property({ attribute: false }) public config?: LovelaceHeadingBadgeConfig;

  @property({ attribute: false }) public hass?: HomeAssistant;

  private _elementConfig?: LovelaceHeadingBadgeConfig;

  public load() {
    if (!this.config) {
      throw new Error("Cannot build heading badge without config");
    }
    this._loadElement(this.config);
  }

  private _element?: LovelaceHeadingBadge;

  protected createRenderRoot() {
    return this;
  }

  public disconnectedCallback() {
    super.disconnectedCallback();
  }

  public connectedCallback() {
    super.connectedCallback();
    this._updateVisibility();
  }

  protected _updateElement(config: LovelaceHeadingBadgeConfig) {
    if (!this._element) {
      return;
    }
    this._element.setConfig(config);
    this._elementConfig = config;
    fireEvent(this, "heading-badge-updated");
  }

  private _loadElement(config: LovelaceHeadingBadgeConfig) {
    this._element = createHeadingBadgeElement(config);
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
        fireEvent(this, "heading-badge-updated");
      },
      { once: true }
    );
    this._element.addEventListener(
      "ll-rebuild",
      (ev: Event) => {
        ev.stopPropagation();
        this._loadElement(config);
        fireEvent(this, "heading-badge-updated");
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
        } catch (_e: any) {
          this._element = undefined;
          this._elementConfig = undefined;
        }
      }
    }

    if (changedProps.has("hass") || changedProps.has("preview")) {
      this._updateVisibility();
    }
  }

  protected _updateVisibility(conditionsMet?: boolean) {
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
      conditionsMet ??
      (!this.config?.visibility ||
        checkConditionsMet(this.config.visibility, this.hass));
    this._setElementVisibility(visible);
  }

  private _setElementVisibility(visible: boolean) {
    if (!this._element) return;

    if (this.hidden !== !visible) {
      this.style.setProperty("display", visible ? "" : "none");
      this.toggleAttribute("hidden", !visible);
      fireEvent(this, "heading-badge-visibility-changed", { value: visible });
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
    "hui-heading-badge": HuiHeadingBadge;
  }
}
