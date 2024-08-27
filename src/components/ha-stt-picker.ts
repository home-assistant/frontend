import {
  css,
  CSSResultGroup,
  html,
  LitElement,
  nothing,
  PropertyValues,
} from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../common/dom/fire_event";
import { stopPropagation } from "../common/dom/stop_propagation";
import { computeStateName } from "../common/entity/compute_state_name";
import { debounce } from "../common/util/debounce";
import { listSTTEngines, STTEngine } from "../data/stt";
import { HomeAssistant } from "../types";
import "./ha-list-item";
import "./ha-select";
import type { HaSelect } from "./ha-select";
import { computeDomain } from "../common/entity/compute_domain";

const NONE = "__NONE_OPTION__";

@customElement("ha-stt-picker")
export class HaSTTPicker extends LitElement {
  @property() public value?: string;

  @property() public label?: string;

  @property() public language?: string;

  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean, reflect: true }) public disabled = false;

  @property({ type: Boolean }) public required = false;

  @state() _engines?: STTEngine[];

  protected render() {
    if (!this._engines) {
      return nothing;
    }

    let value = this.value;
    if (!value && this.required) {
      for (const entity of Object.values(this.hass.entities)) {
        if (
          entity.platform === "cloud" &&
          computeDomain(entity.entity_id) === "stt"
        ) {
          value = entity.entity_id;
          break;
        }
      }

      if (!value) {
        for (const sttEngine of this._engines) {
          if (sttEngine?.supported_languages?.length !== 0) {
            value = sttEngine.engine_id;
            break;
          }
        }
      }
    }
    if (!value) {
      value = NONE;
    }

    return html`
      <ha-select
        .label=${this.label ||
        this.hass!.localize("ui.components.stt-picker.stt")}
        .value=${value}
        .required=${this.required}
        .disabled=${this.disabled}
        @selected=${this._changed}
        @closed=${stopPropagation}
        fixedMenuPosition
        naturalMenuWidth
      >
        ${!this.required
          ? html`<ha-list-item .value=${NONE}>
              ${this.hass!.localize("ui.components.stt-picker.none")}
            </ha-list-item>`
          : nothing}
        ${this._engines.map((engine) => {
          if (engine.deprecated && engine.engine_id !== value) {
            return nothing;
          }
          let label: string;
          if (engine.engine_id.includes(".")) {
            const stateObj = this.hass!.states[engine.engine_id];
            label = stateObj ? computeStateName(stateObj) : engine.engine_id;
          } else {
            label = engine.name || engine.engine_id;
          }
          return html`<ha-list-item
            .value=${engine.engine_id}
            .disabled=${engine.supported_languages?.length === 0}
          >
            ${label}
          </ha-list-item>`;
        })}
      </ha-select>
    `;
  }

  protected willUpdate(changedProperties: PropertyValues<this>): void {
    super.willUpdate(changedProperties);
    if (!this.hasUpdated) {
      this._updateEngines();
    } else if (changedProperties.has("language")) {
      this._debouncedUpdateEngines();
    }
  }

  private _debouncedUpdateEngines = debounce(() => this._updateEngines(), 500);

  private async _updateEngines() {
    this._engines = (
      await listSTTEngines(
        this.hass,
        this.language,
        this.hass.config.country || undefined
      )
    ).providers;

    if (!this.value) {
      return;
    }

    const selectedEngine = this._engines.find(
      (engine) => engine.engine_id === this.value
    );

    fireEvent(this, "supported-languages-changed", {
      value: selectedEngine?.supported_languages,
    });

    if (!selectedEngine || selectedEngine.supported_languages?.length === 0) {
      this.value = undefined;
      fireEvent(this, "value-changed", { value: this.value });
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
      (this.value === undefined && target.value === NONE)
    ) {
      return;
    }
    this.value = target.value === NONE ? undefined : target.value;
    fireEvent(this, "value-changed", { value: this.value });
    fireEvent(this, "supported-languages-changed", {
      value: this._engines!.find((engine) => engine.engine_id === this.value)
        ?.supported_languages,
    });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-stt-picker": HaSTTPicker;
  }
}
