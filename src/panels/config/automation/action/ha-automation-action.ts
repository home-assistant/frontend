import { mdiPlus } from "@mdi/js";
import deepClone from "deep-clone-simple";
import "@material/mwc-button";
import { css, CSSResultGroup, html, LitElement, PropertyValues } from "lit";
import { customElement, property } from "lit/decorators";
import { fireEvent } from "../../../../common/dom/fire_event";
import "../../../../components/ha-svg-icon";
import { Action } from "../../../../data/script";
import { HomeAssistant } from "../../../../types";
import "./ha-automation-action-row";
import type HaAutomationActionRow from "./ha-automation-action-row";
import { HaDeviceAction } from "./types/ha-automation-action-device_id";

@customElement("ha-automation-action")
export default class HaAutomationAction extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public narrow = false;

  @property() public actions!: Action[];

  private _focusLastActionOnChange = false;

  protected render() {
    return html`
      ${this.actions.map(
        (action, idx) => html`
          <ha-automation-action-row
            .index=${idx}
            .totalActions=${this.actions.length}
            .action=${action}
            .narrow=${this.narrow}
            @duplicate=${this._duplicateAction}
            @move-action=${this._move}
            @value-changed=${this._actionChanged}
            .hass=${this.hass}
          ></ha-automation-action-row>
        `
      )}
      <mwc-button
        outlined
        .label=${this.hass.localize(
          "ui.panel.config.automation.editor.actions.add"
        )}
        @click=${this._addAction}
      >
        <ha-svg-icon .path=${mdiPlus} slot="icon"></ha-svg-icon>
      </mwc-button>
    `;
  }

  protected updated(changedProps: PropertyValues) {
    super.updated(changedProps);

    if (changedProps.has("actions") && this._focusLastActionOnChange) {
      this._focusLastActionOnChange = false;

      const row = this.shadowRoot!.querySelector<HaAutomationActionRow>(
        "ha-automation-action-row:last-of-type"
      )!;
      row.toggleExpanded();
      row.focus();
    }
  }

  private _addAction() {
    const actions = this.actions.concat({
      ...HaDeviceAction.defaultConfig,
    });
    this._focusLastActionOnChange = true;
    fireEvent(this, "value-changed", { value: actions });
  }

  private _move(ev: CustomEvent) {
    // Prevent possible parent action-row from also moving
    ev.stopPropagation();

    const index = (ev.target as any).index;
    const newIndex = ev.detail.direction === "up" ? index - 1 : index + 1;
    const actions = this.actions.concat();
    const action = actions.splice(index, 1)[0];
    actions.splice(newIndex, 0, action);
    fireEvent(this, "value-changed", { value: actions });
  }

  private _actionChanged(ev: CustomEvent) {
    ev.stopPropagation();
    const actions = [...this.actions];
    const newValue = ev.detail.value;
    const index = (ev.target as any).index;

    if (newValue === null) {
      actions.splice(index, 1);
    } else {
      actions[index] = newValue;
    }

    fireEvent(this, "value-changed", { value: actions });
  }

  private _duplicateAction(ev: CustomEvent) {
    ev.stopPropagation();
    const index = (ev.target as any).index;
    fireEvent(this, "value-changed", {
      value: this.actions.concat(deepClone(this.actions[index])),
    });
  }

  static get styles(): CSSResultGroup {
    return css`
      ha-automation-action-row {
        display: block;
        margin-bottom: 16px;
      }
      ha-svg-icon {
        height: 20px;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-automation-action": HaAutomationAction;
  }
}
