import type { PropertyValues } from "lit";
import { ReactiveElement } from "lit";
import { customElement, property } from "lit/decorators";
import { fireEvent } from "../../../common/dom/fire_event";
import "../../../components/ha-svg-icon";
import type { HomeAssistant } from "../../../types";
import { ConditionalListenerMixin } from "../../../mixins/conditional-listener-mixin";
import { TemplateResolver } from "../common/template-resolver";
import { checkConditionsMet } from "../common/validate-condition";
import { createHeadingBadgeElement } from "../create-element/create-heading-badge-element";
import type { LovelaceHeadingBadge } from "../types";
import type { LovelaceHeadingBadgeConfig } from "./types";
import { getConfigEntityId } from "../common/get-config-entity-id";

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

  // Resolves any Jinja templates in the config before it reaches the inner
  // heading badge element. Zero-cost pass-through when there are no templates.
  private _resolver = new TemplateResolver(this, () =>
    this._applyResolvedConfig()
  );

  private get _effectiveConfig(): LovelaceHeadingBadgeConfig | undefined {
    return (this._resolver.resolvedConfig ?? this.config) as
      LovelaceHeadingBadgeConfig | undefined;
  }

  public load() {
    if (!this.config) {
      throw new Error("Cannot build heading badge without config");
    }
    this._resolver.setInput(this.config, this.hass, this.preview);
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

  protected willUpdate(changedProps: PropertyValues<this>): void {
    super.willUpdate(changedProps);

    if (
      changedProps.has("config") ||
      changedProps.has("hass") ||
      changedProps.has("preview")
    ) {
      // Drives `_applyResolvedConfig`, which builds/updates the inner element.
      this._resolver.setInput(this.config, this.hass, this.preview);
    }

    if (changedProps.has("config")) {
      this._conditionContext = {
        ...this._conditionContext,
        entity_id: this._effectiveConfig
          ? getConfigEntityId(this._effectiveConfig)
          : undefined,
      };
    }
  }

  // Called by the template resolver whenever the resolved config changes (and
  // synchronously from `setInput`). Owns building vs updating the inner element.
  private _applyResolvedConfig() {
    if (!this._resolver.ready) {
      return;
    }
    const config = this._effectiveConfig;
    if (!config) {
      return;
    }
    if (!this._element) {
      this._loadElement(config);
      return;
    }
    if (config === this._elementConfig) {
      return;
    }
    const typeChanged = config.type !== this._elementConfig?.type;
    if (typeChanged) {
      this._loadElement(config);
    } else {
      this._updateElement(config);
    }
  }

  protected update(changedProps: PropertyValues<this>) {
    super.update(changedProps);

    if (this._element) {
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
        checkConditionsMet(
          this.config.visibility,
          this.hass,
          this._conditionContext
        ));
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
