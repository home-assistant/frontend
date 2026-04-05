import type { HassEntity } from "home-assistant-js-websocket";
import type { CSSResultGroup, PropertyValues, TemplateResult } from "lit";
import { css, html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators";
import { stopPropagation } from "../common/dom/stop_propagation";
import "../components/entity/state-info";
import "../components/input/ha-input";
import type { HaInput } from "../components/input/ha-input";
import { haStyle } from "../resources/styles";
import type { HomeAssistant } from "../types";

@customElement("state-card-input_text")
class StateCardInputText extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public stateObj!: HassEntity;

  @property({ attribute: "in-dialog", type: Boolean }) public inDialog = false;

  @state() public value = "";

  protected render(): TemplateResult {
    return html`
      <div class="horizontal justified layout">
        <state-info
          .hass=${this.hass}
          .stateObj=${this.stateObj}
          .inDialog=${this.inDialog}
        ></state-info
        ><ha-input
          .minlength=${this.stateObj.attributes.min}
          .maxlength=${this.stateObj.attributes.max}
          .value=${this.value}
          .pattern=${this.stateObj.attributes.pattern}
          .type=${this.stateObj.attributes.mode}
          @input=${this._onInput}
          @change=${this._selectedValueChanged}
          @click=${stopPropagation}
          .placeholder=${this.hass.localize("ui.card.text.empty_value")}
        >
        </ha-input>
      </div>
    `;
  }

  protected willUpdate(changedProp: PropertyValues): void {
    super.willUpdate(changedProp);
    if (changedProp.has("stateObj")) {
      this.value = this.stateObj.state;
    }
  }

  private _onInput(ev: InputEvent) {
    this.value = (ev.target as HaInput).value ?? "";
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

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        ha-input {
          margin-left: var(--ha-space-4);
          margin-inline-start: var(--ha-space-4);
          margin-inline-end: initial;
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
