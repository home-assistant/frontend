import { CSSResultGroup, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../../../../common/dom/fire_event";
import "../../../../../components/ha-textfield";
import { Action, SequenceAction } from "../../../../../data/script";
import { haStyle } from "../../../../../resources/styles";
import type { HomeAssistant, ItemPath } from "../../../../../types";
import "../ha-automation-action";
import type { ActionElement } from "../ha-automation-action-row";

@customElement("ha-automation-action-sequence")
export class HaSequenceAction extends LitElement implements ActionElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public disabled = false;

  @property({ attribute: false }) public path?: ItemPath;

  @property({ attribute: false }) public action!: SequenceAction;

  public static get defaultConfig() {
    return {
      sequence: [],
    };
  }

  private _getMemoizedPath = memoizeOne((path: ItemPath | undefined) => [
    ...(path ?? []),
    "sequence",
  ]);

  protected render() {
    const { action } = this;

    return html`
      <ha-automation-action
        .path=${this._getMemoizedPath(this.path)}
        .actions=${action.sequence}
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
