import "../components/ha-textfield";
import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property } from "lit/decorators";
import { computeStateName } from "../common/entity/compute_state_name";
import { stopPropagation } from "../common/dom/stop_propagation";
import "../components/entity/state-badge";
import { isUnavailableState, UNAVAILABLE } from "../data/entity";
import { TextEntity, setValue } from "../data/text";
import type { HomeAssistant } from "../types";

@customElement("state-card-text")
class StateCardText extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public stateObj!: TextEntity;

  protected render(): TemplateResult {
    return html`
      <state-badge .stateObj=${this.stateObj}></state-badge>
      <ha-textfield
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
        placeholder=${this.hass.localize("ui.card.text.emtpy_value")}
      ></ha-textfield>
    `;
  }

  private _valueChanged(ev): void {
    const value = ev.target.value;

    // Filter out invalid text states
    if (value && isUnavailableState(value)) {
      ev.target.value = this.stateObj.state;
      return;
    }

    if (value === this.stateObj.state) {
      return;
    }
    setValue(this.hass!, this.stateObj.entity_id, value);
  }

  static get styles(): CSSResultGroup {
    return css`
      :host {
        display: flex;
      }

      state-badge {
        float: left;
        margin-top: 10px;
      }

      ha-textfield {
        width: 100%;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "state-card-text": StateCardText;
  }
}
