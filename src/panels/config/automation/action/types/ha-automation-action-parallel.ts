import { css, CSSResultGroup, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import { mdiDelete, mdiPlus } from "@mdi/js";
import { fireEvent } from "../../../../../common/dom/fire_event";
import "../../../../../components/ha-textfield";
import { Action, ParallelAction } from "../../../../../data/script";
import { haStyle } from "../../../../../resources/styles";
import type { HomeAssistant, ItemPath } from "../../../../../types";
import "../ha-automation-action";
import type { ActionElement } from "../ha-automation-action-row";
import { ensureArray } from "../../../../../common/array/ensure-array";

@customElement("ha-automation-action-parallel")
export class HaParallelAction extends LitElement implements ActionElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public disabled = false;

  @property({ attribute: false }) public path?: ItemPath;

  @property({ attribute: false }) public action!: ParallelAction;

  public static get defaultConfig() {
    return {
      parallel: [{ sequence: [] }],
    };
  }

  protected render() {
    const action = this.action;

    action.parallel = (action.parallel ? ensureArray(action.parallel) : []).map(
      (sequenceAction) =>
        sequenceAction.sequence
          ? sequenceAction
          : { sequence: [sequenceAction] }
    );

    return html`
      ${action.parallel.map(
        (sequence, idx) =>
          html`<ha-card>
            <ha-icon-button
              .idx=${idx}
              .disabled=${this.disabled}
              @click=${this._removeSequence}
              .label=${this.hass.localize(
                "ui.panel.config.automation.editor.actions.type.parallel.remove_sequence"
              )}
              .path=${mdiDelete}
            ></ha-icon-button>
            <div class="card-content">
              <h2>
                ${this.hass.localize(
                  "ui.panel.config.automation.editor.actions.type.parallel.sequence"
                )}:
              </h2>
              <ha-automation-action
                nested
                .actions=${ensureArray(sequence.sequence) || []}
                .path=${[...(this.path ?? []), "parallel"]}
                .disabled=${this.disabled}
                @value-changed=${this._actionChanged}
                .hass=${this.hass}
                .idx=${idx}
              ></ha-automation-action>
            </div>
          </ha-card>`
      )}
      <mwc-button
        outlined
        .label=${this.hass.localize(
          "ui.panel.config.automation.editor.actions.type.parallel.add_sequence"
        )}
        .disabled=${this.disabled}
        @click=${this._addSequence}
      >
        <ha-svg-icon .path=${mdiPlus} slot="icon"></ha-svg-icon>
      </mwc-button>
    `;
  }

  private _actionChanged(ev: CustomEvent) {
    ev.stopPropagation();
    const value = ev.detail.value as Action[];
    const index = (ev.target as any).idx;
    const parallel = this.action.parallel
      ? [...ensureArray(this.action.parallel)]
      : [];
    parallel[index].sequence = value;
    fireEvent(this, "value-changed", {
      value: { ...this.action, parallel },
    });
  }

  private _addSequence() {
    const parallel = this.action.parallel
      ? [...ensureArray(this.action.parallel)]
      : [];
    parallel.push({ sequence: [] });
    fireEvent(this, "value-changed", {
      value: { ...this.action, parallel },
    });
  }

  private _removeSequence(ev: CustomEvent) {
    const index = (ev.currentTarget as any).idx;
    const parallel = this.action.parallel
      ? [...ensureArray(this.action.parallel)]
      : [];
    parallel.splice(index, 1);
    fireEvent(this, "value-changed", {
      value: { ...this.action, parallel },
    });
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        ha-card {
          margin: 16px 0;
        }
        .add-card mwc-button {
          display: block;
          text-align: center;
        }
        ha-icon-button {
          position: absolute;
          right: 0;
          padding: 4px;
        }
        ha-svg-icon {
          height: 20px;
        }
        .link-button-row {
          padding: 14px;
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
