import { mdiPlus } from "@mdi/js";
import { html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import { fireEvent } from "../../../../../common/dom/fire_event";
import "../../../../../components/ha-textfield";
import {
  Action,
  ManualScriptConfig,
  ParallelAction,
} from "../../../../../data/script";
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
      >
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
      </ha-automation-action>
    `;
  }

  private _addSequenceAction() {
    const currentAction = (this.action.parallel as (
      | ManualScriptConfig
      | Action
    )[]) ?? [this.action.parallel as ManualScriptConfig | Action];
    const actions = currentAction.concat({
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
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-automation-action-parallel": HaParallelAction;
  }
}
