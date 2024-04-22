import { mdiPlus } from "@mdi/js";
import { CSSResultGroup, css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import { fireEvent } from "../../../../../common/dom/fire_event";
import "../../../../../components/ha-textfield";
import { Action, ParallelAction } from "../../../../../data/script";
import { haStyle } from "../../../../../resources/styles";
import type { HomeAssistant, ItemPath } from "../../../../../types";
import "../ha-automation-action";
import type { ActionElement } from "../ha-automation-action-row";
import { HaSequenceAction } from "./ha-automation-action-sequence";

@customElement("ha-automation-action-parallel")
export class HaParallelAction extends LitElement implements ActionElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public disabled = false;

  @property({ attribute: false }) public path?: ItemPath;

  @property({ attribute: false }) public action!: ParallelAction;

  public static get defaultConfig() {
    return {
      parallel: [],
    };
  }

  protected render() {
    const action = this.action;

    return html`
      <ha-automation-action
        .path=${[...(this.path ?? []), "parallel"]}
        .actions=${action.parallel}
        .disabled=${this.disabled}
        @value-changed=${this._actionsChanged}
        .hass=${this.hass}
      ></ha-automation-action>
      <ha-button
        slot="automationExtraButtons"
        outlined
        .disabled=${this.disabled}
        .label=${this.hass.localize(
          "ui.panel.config.automation.editor.actions.type.parallel.add_sequence"
        )}
        @click=${this._addSequenceAction}
      >
        <ha-svg-icon .path=${mdiPlus} slot="icon"></ha-svg-icon>
      </ha-button>
    `;
  }

  private _addSequenceAction() {
    const actions = this.action.parallel.concat({
      ...HaSequenceAction.defaultConfig,
    });

    fireEvent(this, "value-changed", {
      value: {
        ...this.action,
        parallel: actions,
      },
    });
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
    return [
      haStyle,
      css`
        .buttons {
          padding-top: 16px;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-automation-action-parallel": HaParallelAction;
  }
}
