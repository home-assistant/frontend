import type { PropertyValues } from "lit";
import { ReactiveElement } from "lit";
import { customElement, property } from "lit/decorators";
import { fireEvent } from "../../../common/dom/fire_event";
import "../../../components/ha-svg-icon";
import type { LovelaceCardConfig } from "../../../data/lovelace/config/card";
import type { HomeAssistant } from "../../../types";
import { ConditionalListenerMixin } from "../../../mixins/conditional-listener-mixin";
import { migrateLayoutToGridOptions } from "../common/compute-card-grid-size";
import { computeCardSize } from "../common/compute-card-size";
import { getConfigEntityId } from "../common/get-config-entity-id";
import { TemplateResolver } from "../common/template-resolver";
import { checkConditionsMet } from "../common/validate-condition";
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
export class HuiCard extends ConditionalListenerMixin<LovelaceCardConfig>(
  ReactiveElement
) {
  @property({ type: Boolean }) public preview = false;

  @property({ attribute: false }) public config?: LovelaceCardConfig;

  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ attribute: false }) public layout?: string;

  private _elementConfig?: LovelaceCardConfig;

  // Resolves any Jinja templates in the card config before it reaches the inner
  // card element. Zero-cost pass-through when the config has no templates.
  private _resolver = new TemplateResolver(this, () =>
    this._applyResolvedConfig()
  );

  // The config with templates resolved (falls back to the raw config when there
  // is nothing to resolve). Only ever fed to the inner element, never surfaced
  // to the editor, so raw templates can never be lost.
  private get _effectiveConfig(): LovelaceCardConfig | undefined {
    return (this._resolver.resolvedConfig ?? this.config) as
      LovelaceCardConfig | undefined;
  }

  public load() {
    if (!this.config) {
      throw new Error("Cannot build card without config");
    }
    // Feeding the resolver drives `_applyResolvedConfig`, which builds the inner
    // element as soon as the (possibly templated) config is ready.
    this._resolver.setInput(this.config, this.hass, this.preview);
  }

  private _element?: LovelaceCard;

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

  protected _updateElement(config: LovelaceCardConfig) {
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
    // Rebuild when the type changed, or in preview mode for a real config edit.
    // A template value tick in preview only re-runs setConfig, so editing the
    // dashboard while entities change state does not thrash the element.
    const typeChanged = config.type !== this._elementConfig?.type;
    const previewEdit = this.preview && !this._resolver.updatedFromValues;
    if (typeChanged || previewEdit) {
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
