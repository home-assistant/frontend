/* eslint-plugin-disable lit */
import type { HassEntity } from "home-assistant-js-websocket";
import {
  css,
  CSSResultGroup,
  html,
  LitElement,
  PropertyValues,
  TemplateResult,
} from "lit";
import { customElement, property, state } from "lit/decorators";
import "../components/entity/state-info";
import "../components/ha-textfield";
import { HomeAssistant } from "../types";
import { haStyle } from "../resources/styles";

@customElement("state-card-input_text")
class StateCardInputText extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public stateObj!: HassEntity;

  @property({ type: Boolean }) public inDialog = false;

  @state() public value: string = "";

  protected render(): TemplateResult {
    return html`
      <div class="horizontal justified layout">
        <state-info
          .hass=${this.hass}
          .stateObj=${this.stateObj}
          .inDialog=${this.inDialog}
        ></state-info
        ><ha-textfield
          .minlength=${this.stateObj.attributes.min}
          .maxlength=${this.stateObj.attributes.max}
          .value=${this.value}
          .auto-validate=${this.stateObj.attributes.pattern}
          .pattern=${this.stateObj.attributes.pattern}
          .type=${this.stateObj.attributes.mode}
          @input=${this._onInput}
          @change=${this._selectedValueChanged}
          @click=${this._stopPropagation}
          placeholder="(empty value)"
        >
        </ha-textfield>
      </div>
    `;
  }

  protected willUpdate(changedProp: PropertyValues): void {
    super.willUpdate(changedProp);
    if (changedProp.has("stateObj")) {
      this._stateObjectChanged(this.stateObj);
    }
  }

  private _stateObjectChanged(newVal) {
    this.value = newVal.state;
  }

  private _onInput(ev) {
    this.value = ev.target.value;
  }

  private async _selectedValueChanged() {
    if (this.value === this.stateObj.state) {
      return;
    }
    await this.hass.callService("input_text", "set_value", {
      value: this.value,
      entity_id: this.stateObj.entity_id,
    });
  }

  private _stopPropagation(ev) {
    ev.stopPropagation();
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        ha-textfield {
          margin-left: 16px;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "state-card-input_text": StateCardInputText;
  }
}
