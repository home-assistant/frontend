import {
  css,
  CSSResultGroup,
  html,
  LitElement,
  PropertyValueMap,
  TemplateResult,
} from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../common/dom/fire_event";
import { stopPropagation } from "../common/dom/stop_propagation";
import { computeStateName } from "../common/entity/compute_state_name";
import { listSTTEngines, STTEngine } from "../data/stt";
import { HomeAssistant } from "../types";
import "./ha-list-item";
import "./ha-select";
import type { HaSelect } from "./ha-select";

const DEFAULT = "default_engine_option";

@customElement("ha-stt-picker")
export class HaSTTPicker extends LitElement {
  @property() public value?: string;

  @property() public label?: string;

  @property() public language?: string;

  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean, reflect: true }) public disabled = false;

  @property({ type: Boolean }) public required = false;

  @state() _engines: STTEngine[] = [];

  protected render(): TemplateResult {
    return html`
      <ha-select
        .label=${this.label ||
        this.hass!.localize("ui.components.stt-picker.stt")}
        .value=${this.value}
        .required=${this.required}
        .disabled=${this.disabled}
        @selected=${this._changed}
        @closed=${stopPropagation}
        fixedMenuPosition
        naturalMenuWidth
      >
        <ha-list-item .value=${DEFAULT} .selected=${this.value === undefined}>
          ${this.hass!.localize("ui.components.stt-picker.default")}
        </ha-list-item>
        ${this._engines.map((engine) => {
          const stateObj = this.hass!.states[engine.engine_id];
          return html`<ha-list-item
            .value=${engine.engine_id}
            .disabled=${engine.language_supported === false}
          >
            ${stateObj ? computeStateName(stateObj) : engine.engine_id}
          </ha-list-item>`;
        })}
      </ha-select>
    `;
  }

  protected willUpdate(
    changedProperties: PropertyValueMap<any> | Map<PropertyKey, unknown>
  ): void {
    super.willUpdate(changedProperties);
    if (!this.hasUpdated || changedProperties.has("language")) {
      listSTTEngines(this.hass, this.language).then((engines) => {
        this._engines = engines.providers;
      });
    }
  }

  static get styles(): CSSResultGroup {
    return css`
      ha-select {
        width: 100%;
      }
    `;
  }

  private _changed(ev): void {
    const target = ev.target as HaSelect;
    if (
      !this.hass ||
      target.value === "" ||
      target.value === this.value ||
      (this.value === undefined && target.value === DEFAULT)
    ) {
      return;
    }
    this.value = target.value === DEFAULT ? undefined : target.value;
    if (target.value === DEFAULT) {
      setTimeout(() => target.select(0), 0);
    }
    fireEvent(this, "value-changed", { value: this.value });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-stt-picker": HaSTTPicker;
  }
}
