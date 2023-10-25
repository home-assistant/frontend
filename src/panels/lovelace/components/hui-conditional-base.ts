import { PropertyValues, ReactiveElement } from "lit";
import { customElement, property } from "lit/decorators";
import { HomeAssistant } from "../../../types";
import { ConditionalCardConfig } from "../cards/types";
import {
  ScreenCondition,
  checkConditionsMet,
  validateConditionalConfig,
} from "../common/validate-condition";
import { ConditionalRowConfig, LovelaceRow } from "../entity-rows/types";
import { LovelaceCard } from "../types";
import { listenMediaQuery } from "../../../common/dom/media_query";
import { deepEqual } from "../../../common/util/deep-equal";

@customElement("hui-conditional-base")
export class HuiConditionalBase extends ReactiveElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property() public editMode?: boolean;

  @property() protected _config?: ConditionalCardConfig | ConditionalRowConfig;

  @property({ type: Boolean, reflect: true }) public hidden = false;

  protected _element?: LovelaceCard | LovelaceRow;

  private _mediaQueriesListeners: Array<() => void> = [];

  private _mediaQueries: string[] = [];

  protected createRenderRoot() {
    return this;
  }

  protected validateConfig(
    config: ConditionalCardConfig | ConditionalRowConfig
  ): void {
    if (!config.conditions) {
      throw new Error("No conditions configured");
    }

    if (!Array.isArray(config.conditions)) {
      throw new Error("Conditions need to be an array");
    }

    if (!validateConditionalConfig(config.conditions)) {
      throw new Error("Conditions are invalid");
    }

    if (this.lastChild) {
      this.removeChild(this.lastChild);
    }

    this._config = config;
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

  private _clearMediaQueries() {
    this._mediaQueries = [];
    while (this._mediaQueriesListeners.length) {
      this._mediaQueriesListeners.pop()!();
    }
  }

  private _listenMediaQueries() {
    if (!this._config) {
      return;
    }

    const conditions = this._config.conditions.filter(
      (c) => "condition" in c && c.condition === "screen"
    ) as ScreenCondition[];

    const mediaQueries = conditions
      .filter((c) => c.media_query)
      .map((c) => c.media_query as string);

    if (deepEqual(mediaQueries, this._mediaQueries)) return;

    this._mediaQueries = mediaQueries;
    while (this._mediaQueriesListeners.length) {
      this._mediaQueriesListeners.pop()!();
    }
    mediaQueries.forEach((query) => {
      const listener = listenMediaQuery(query, (matches) => {
        // For performance, if there is only one condition, set the visibility directly
        if (this._config!.conditions.length === 1) {
          this._setVisibility(matches);
          return;
        }
        this._updateVisibility();
      });
      this._mediaQueriesListeners.push(listener);
    });
  }

  protected update(changed: PropertyValues): void {
    super.update(changed);

    if (
      changed.has("_element") ||
      changed.has("_config") ||
      changed.has("hass")
    ) {
      this._listenMediaQueries();
      this._updateVisibility();
    }
  }

  private _updateVisibility() {
    if (!this._element || !this.hass || !this._config) {
      return;
    }

    this._element.editMode = this.editMode;

    const conditionMet = checkConditionsMet(
      this._config!.conditions,
      this.hass!
    );
    this._setVisibility(conditionMet);
  }

  private _setVisibility(conditionMet: boolean) {
    if (!this._element || !this.hass) {
      return;
    }
    const visible = this.editMode || conditionMet;
    this.hidden = !visible;
    this.style.setProperty("display", visible ? "" : "none");

    if (visible) {
      this._element.hass = this.hass;
      if (!this._element!.parentElement) {
        this.appendChild(this._element!);
      }
    } else if (this._element.parentElement) {
      this.removeChild(this._element!);
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-conditional-base": HuiConditionalBase;
  }
}
