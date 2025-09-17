import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../common/dom/fire_event";
import { stopPropagation } from "../../common/dom/stop_propagation";
import { computeStateName } from "../../common/entity/compute_state_name";
import {
  computeEntityDisplayName,
  ENTITY_NAME_PRESETS,
} from "../../panels/lovelace/common/entity/compute-display-name";
import type { HomeAssistant } from "../../types";
import "../ha-list-item";
import "../ha-select";
import type { HaSelect } from "../ha-select";
import "../ha-textfield";

interface Option {
  label: string;
  description: string;
  value: string;
}

@customElement("ha-entity-name-picker")
export class HaEntityNamePicker extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public entityId?: string;

  @property() public value?: string;

  @property() public label?: string;

  @property({ type: Boolean }) public required = false;

  @property({ type: Boolean, reflect: true }) public disabled = false;

  @state({ attribute: false }) public showCustom = false;

  private _getOptions = memoizeOne((entityId?: string) => {
    if (!entityId) {
      return [];
    }
    const options = ENTITY_NAME_PRESETS.map<Option>((preset) => ({
      label: preset
        .split("_")
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" "),
      value: preset,
      description: computeEntityDisplayName(
        this.hass,
        this.hass.states[entityId],
        preset
      ),
    }));
    options.push({ label: "Custom", value: "custom", description: "" });
    return options;
  });

  private _isValidOption(value: string | undefined, options: Option[]) {
    if (value === undefined) {
      return false;
    }
    return options.some((option) => option.value === value);
  }

  protected render() {
    const options = this._getOptions(this.entityId);

    const value = this._isValidOption(this.value, options)
      ? this.value
      : "custom";

    const stateObj = this.entityId
      ? this.hass.states[this.entityId]
      : undefined;
    return html`
      <ha-select
        .label=${this.label}
        .value=${value}
        .required=${this.required}
        .disabled=${this.disabled}
        @selected=${this._changed}
        @closed=${stopPropagation}
        fixedMenuPosition
        naturalMenuWidth
      >
        ${options.map(
          (option) => html`
            <ha-list-item
              .value=${option.value}
              .twoline=${!!option.description}
            >
              <span>${option.label}</span>
              ${option.description
                ? html`<span slot="secondary">${option.description}</span>`
                : nothing}
            </ha-list-item>
          `
        )}
      </ha-select>
      ${this.showCustom
        ? html`
            <ha-textfield
              .value=${this.value || ""}
              .placeholder=${stateObj ? computeStateName(stateObj) : ""}
              .disabled=${this.disabled}
              @input=${this._customChanged}
              .required=${this.required}
            ></ha-textfield>
          `
        : nothing}
    `;
  }

  static styles = css`
    :host {
      display: flex;
      flex-direction: row;
      gap: 8px;
    }
    ha-select {
      flex: 1;
    }
    ha-textfield {
      flex: 1;
    }
  `;

  private _changed(ev): void {
    const target = ev.currentTarget as HaSelect;
    if (target.value === "" || target.value === this.value) {
      return;
    }

    if (target.value === "custom") {
      this.showCustom = true;
      this.value = "";
      fireEvent(this, "value-changed", { value: "" });
      return;
    }

    this.showCustom = false;
    this.value = target.value;
    fireEvent(this, "value-changed", { value: this.value });
  }

  private _customChanged(ev): void {
    const target = ev.currentTarget as HTMLInputElement;
    if (target.value === this.value) {
      return;
    }
    this.value = target.value;
    fireEvent(this, "value-changed", { value: this.value });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-entity-name-picker": HaEntityNamePicker;
  }
}
