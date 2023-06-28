import { CSSResultGroup, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import { fireEvent } from "../../../../../common/dom/fire_event";
import "../../../../../components/ha-textfield";
import { Action, ParallelAction } from "../../../../../data/script";
import { haStyle } from "../../../../../resources/styles";
import type { HomeAssistant } from "../../../../../types";
import "../ha-automation-action";
import type { ActionElement } from "../ha-automation-action-row";

@customElement("ha-automation-action-parallel")
export class HaParallelAction extends LitElement implements ActionElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public disabled = false;

  @property({ attribute: false }) public action!: ParallelAction;

  @property({ type: Boolean }) public reOrderMode = false;

  public static get defaultConfig() {
    return {
      parallel: [],
    };
  }

  protected render() {
    const action = this.action;

    return html`
      <ha-automation-action
        nested
        .actions=${action.parallel}
        .reOrderMode=${this.reOrderMode}
        .disabled=${this.disabled}
        @value-changed=${this._actionsChanged}
        .hass=${this.hass}
      ></ha-automation-action>
    `;
  }

  private _actionsChanged(ev: CustomEvent) {
    ev.stopPropagation();
    const value = ev.detail.value as Action[];
    fireEvent(this, "value-changed", {
      value: {
        ...this.action,
        parallel: value,
      },
    });
  }

  static get styles(): CSSResultGroup {
    return haStyle;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-automation-action-parallel": HaParallelAction;
  }
}
