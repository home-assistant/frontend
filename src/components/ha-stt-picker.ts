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
    if (!this.hass || ev.target.value === "") {
      return;
    }
    this.value = ev.target.value === "remove" ? undefined : ev.target.value;
    fireEvent(this, "value-changed", { value: this.value });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-stt-picker": HaSTTPicker;
  }
}
