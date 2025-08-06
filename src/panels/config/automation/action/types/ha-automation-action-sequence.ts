import type { CSSResultGroup } from "lit";
import { html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import { fireEvent } from "../../../../../common/dom/fire_event";
import "../../../../../components/ha-textfield";
import type { Action, SequenceAction } from "../../../../../data/script";
import { haStyle } from "../../../../../resources/styles";
import type { HomeAssistant } from "../../../../../types";
import "../ha-automation-action";
import type { ActionElement } from "../ha-automation-action-row";

@customElement("ha-automation-action-sequence")
export class HaSequenceAction extends LitElement implements ActionElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public disabled = false;

  @property({ type: Boolean }) public narrow = false;

  @property({ attribute: false }) public action!: SequenceAction;

  @property({ type: Boolean }) public indent = false;

  public static get defaultConfig(): SequenceAction {
    return {
      sequence: [],
    };
  }

  protected render() {
    const { action } = this;

    return html`
      <ha-automation-action
        .actions=${action.sequence}
        .narrow=${this.narrow}
        .disabled=${this.disabled}
        @value-changed=${this._actionsChanged}
        .hass=${this.hass}
        .optionsInSidebar=${this.indent}
      ></ha-automation-action>
    `;
  }

  private _actionsChanged(ev: CustomEvent) {
    ev.stopPropagation();
    const value = ev.detail.value as Action[];
    fireEvent(this, "value-changed", {
      value: {
        ...this.action,
        sequence: value,
      },
    });
  }

  static get styles(): CSSResultGroup {
    return haStyle;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-automation-action-sequence": HaSequenceAction;
  }
}
