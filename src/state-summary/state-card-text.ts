import type { TemplateResult } from "lit";
import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import { stopPropagation } from "../common/dom/stop_propagation";
import { computeStateName } from "../common/entity/compute_state_name";
import "../components/entity/state-badge";
import "../components/input/ha-input";
import type { HaInput } from "../components/input/ha-input";
import { isUnavailableState, UNAVAILABLE } from "../data/entity/entity";
import type { TextEntity } from "../data/text";
import { setValue } from "../data/text";
import type { HomeAssistant } from "../types";

@customElement("state-card-text")
class StateCardText extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public stateObj!: TextEntity;

  protected render(): TemplateResult {
    return html`
      <state-badge .hass=${this.hass} .stateObj=${this.stateObj}></state-badge>
      <ha-input
        .label=${computeStateName(this.stateObj)}
        .disabled=${this.stateObj.state === UNAVAILABLE}
        .value=${this.stateObj.state}
        .minlength=${this.stateObj.attributes.min}
        .maxlength=${this.stateObj.attributes.max}
        .autoValidate=${this.stateObj.attributes.pattern}
        .pattern=${this.stateObj.attributes.pattern}
        .type=${this.stateObj.attributes.mode}
        @change=${this._valueChanged}
        @click=${stopPropagation}
        .placeholder=${this.hass.localize("ui.card.text.empty_value")}
      ></ha-input>
    `;
  }

  private _valueChanged(ev: InputEvent): void {
    const value = (ev.target as HaInput).value ?? "";

    // Filter out invalid text states
    if (value && isUnavailableState(value)) {
      (ev.target as HaInput).value = this.stateObj.state;
      return;
    }

    if (value === this.stateObj.state) {
      return;
    }
    setValue(this.hass!, this.stateObj.entity_id, value);
  }

  static styles = css`
    :host {
      display: flex;
    }

    state-badge {
      float: left;
      margin-top: 10px;
    }

    ha-input {
      width: 100%;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "state-card-text": StateCardText;
  }
}
