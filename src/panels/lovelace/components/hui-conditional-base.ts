import { PropertyValues, ReactiveElement } from "lit";
import { customElement, property, state } from "lit/decorators";
import { MediaQueriesListener } from "../../../common/dom/media_query";
import { deepEqual } from "../../../common/util/deep-equal";
import { HomeAssistant } from "../../../types";
import { ConditionalCardConfig } from "../cards/types";
import {
  Condition,
  checkConditionsMet,
  attachConditionMediaQueriesListeners,
  extractMediaQueries,
  validateConditionalConfig,
} from "../common/validate-condition";
import { ConditionalRowConfig, LovelaceRow } from "../entity-rows/types";
import { LovelaceCard } from "../types";

@customElement("hui-conditional-base")
export class HuiConditionalBase extends ReactiveElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ type: Boolean }) public editMode = false;

  @state() protected _config?: ConditionalCardConfig | ConditionalRowConfig;

  protected _element?: LovelaceCard | LovelaceRow;

  private _listeners: MediaQueriesListener[] = [];

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
    this._listeners.forEach((unsub) => unsub());
    this._listeners = [];
  }

  private _listenMediaQueries() {
    if (!this._config || !this.hass) {
      return;
    }

    const supportedConditions = this._config.conditions.filter(
      (c) => "condition" in c
    ) as Condition[];
    const mediaQueries = extractMediaQueries(supportedConditions);

    if (deepEqual(mediaQueries, this._mediaQueries)) return;

    this._clearMediaQueries();

    const conditions = this._config.conditions;
    const hasOnlyMediaQuery =
      conditions.length === 1 &&
      "condition" in conditions[0] &&
      conditions[0].condition === "screen" &&
      !!conditions[0].media_query;

    this._listeners = attachConditionMediaQueriesListeners(
      supportedConditions,
      (matches) => {
        if (hasOnlyMediaQuery) {
          this._setVisibility(matches);
          return;
        }
        this._updateVisibility();
      }
    );
  }

  protected update(changed: PropertyValues): void {
    super.update(changed);

    if (
      changed.has("_element") ||
      changed.has("_config") ||
      changed.has("hass") ||
      changed.has("editMode")
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
    this.toggleAttribute("hidden", !visible);
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
