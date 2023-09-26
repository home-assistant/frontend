import { consume } from "@lit-labs/context";
import { mdiDelete, mdiPlus } from "@mdi/js";
import { CSSResultGroup, LitElement, PropertyValues, css, html } from "lit";
import { customElement, property, state } from "lit/decorators";
import { ensureArray } from "../../../../../common/array/ensure-array";
import { fireEvent } from "../../../../../common/dom/fire_event";
import "../../../../../components/ha-button";
import "../../../../../components/ha-icon-button";
import { Condition } from "../../../../../data/automation";
import { Action, ChooseAction } from "../../../../../data/script";
import { haStyle } from "../../../../../resources/styles";
import { HomeAssistant } from "../../../../../types";
import { ActionElement } from "../ha-automation-action-row";
import { describeCondition } from "../../../../../data/automation_i18n";
import { fullEntitiesContext } from "../../../../../data/context";
import { EntityRegistryEntry } from "../../../../../data/entity_registry";

@customElement("ha-automation-action-choose")
export class HaChooseAction extends LitElement implements ActionElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public disabled = false;

  @property() public action!: ChooseAction;

  @property({ type: Boolean }) public reOrderMode = false;

  @state() private _showDefault = false;

  @state() private expandedUpdateFlag = false;

  @state()
  @consume({ context: fullEntitiesContext, subscribe: true })
  _entityReg!: EntityRegistryEntry[];

  public static get defaultConfig() {
    return { choose: [{ conditions: [], sequence: [] }] };
  }

  protected willUpdate(changedProperties: PropertyValues) {
    if (!changedProperties.has("action")) {
      return;
    }

    const oldCnt =
      changedProperties.get("action") === undefined ||
      changedProperties.get("action").choose === undefined
        ? 0
        : ensureArray(changedProperties.get("action").choose).length;
    const newCnt = this.action.choose
      ? ensureArray(this.action.choose).length
      : 0;
    if (newCnt === oldCnt + 1) {
      this.expand(newCnt - 1);
    }
  }

  private expand(i: number) {
    this.updateComplete.then(() => {
      this.shadowRoot!.querySelectorAll("ha-expansion-panel")[i].expanded =
        true;
      this.expandedUpdateFlag = !this.expandedUpdateFlag;
    });
  }

  private isExpanded(i: number) {
    const nodes = this.shadowRoot!.querySelectorAll("ha-expansion-panel");
    if (nodes[i]) {
      return nodes[i].expanded;
    }
    return false;
  }

  private _expandedChanged() {
    this.expandedUpdateFlag = !this.expandedUpdateFlag;
  }

  private _getDescription(option, idx: number) {
    if (option.alias) {
      return option.alias;
    }
    if (this.isExpanded(idx)) {
      return "";
    }
    const conditions = ensureArray(option.conditions);
    if (!conditions || conditions.length === 0) {
      return this.hass.localize(
        "ui.panel.config.automation.editor.actions.type.choose.no_conditions"
      );
    }
    let str = "";
    if (typeof conditions[0] === "string") {
      str += conditions[0];
    } else {
      str += describeCondition(conditions[0], this.hass, this._entityReg);
    }
    if (conditions.length > 1) {
      str += this.hass.localize(
        "ui.panel.config.automation.editor.actions.type.choose.option_description_additional",
        "numberOfAdditionalConditions",
        conditions.length - 1
      );
    }
    return str;
  }

  protected render() {
    const action = this.action;

    return html`
      ${(action.choose ? ensureArray(action.choose) : []).map(
        (option, idx) =>
          html`<ha-card>
            <ha-expansion-panel
              leftChevron
              @expanded-changed=${this._expandedChanged}
            >
              <h3 slot="header">
                ${this.hass.localize(
                  "ui.panel.config.automation.editor.actions.type.choose.option",
                  "number",
                  idx + 1
                )}:
                ${this._getDescription(option, idx)}
              </h3>

              <ha-icon-button
                slot="icons"
                .idx=${idx}
                .disabled=${this.disabled}
                @click=${this._removeOption}
                .label=${this.hass.localize(
                  "ui.panel.config.automation.editor.actions.type.choose.remove_option"
                )}
                .path=${mdiDelete}
              ></ha-icon-button>
              <div class="card-content">
                <h4>
                  ${this.hass.localize(
                    "ui.panel.config.automation.editor.actions.type.choose.conditions"
                  )}:
                </h4>
                <ha-automation-condition
                  nested
                  .conditions=${ensureArray<string | Condition>(
                    option.conditions
                  )}
                  .reOrderMode=${this.reOrderMode}
                  .disabled=${this.disabled}
                  .hass=${this.hass}
                  .idx=${idx}
                  @value-changed=${this._conditionChanged}
                ></ha-automation-condition>
                <h4>
                  ${this.hass.localize(
                    "ui.panel.config.automation.editor.actions.type.choose.sequence"
                  )}:
                </h4>
                <ha-automation-action
                  nested
                  .actions=${ensureArray(option.sequence) || []}
                  .reOrderMode=${this.reOrderMode}
                  .disabled=${this.disabled}
                  .hass=${this.hass}
                  .idx=${idx}
                  @value-changed=${this._actionChanged}
                ></ha-automation-action>
              </div>
            </ha-expansion-panel>
          </ha-card>`
      )}
      <ha-button
        outlined
        .label=${this.hass.localize(
          "ui.panel.config.automation.editor.actions.type.choose.add_option"
        )}
        .disabled=${this.disabled}
        @click=${this._addOption}
      >
        <ha-svg-icon .path=${mdiPlus} slot="icon"></ha-svg-icon>
      </ha-button>
      ${this._showDefault || action.default
        ? html`
            <h2>
              ${this.hass.localize(
                "ui.panel.config.automation.editor.actions.type.choose.default"
              )}:
            </h2>
            <ha-automation-action
              nested
              .actions=${ensureArray(action.default) || []}
              .reOrderMode=${this.reOrderMode}
              .disabled=${this.disabled}
              @value-changed=${this._defaultChanged}
              .hass=${this.hass}
            ></ha-automation-action>
          `
        : html`<div class="link-button-row">
            <button
              class="link"
              @click=${this._addDefault}
              .disabled=${this.disabled}
            >
              ${this.hass.localize(
                "ui.panel.config.automation.editor.actions.type.choose.add_default"
              )}
            </button>
          </div>`}
    `;
  }

  private _addDefault() {
    this._showDefault = true;
  }

  private _conditionChanged(ev: CustomEvent) {
    ev.stopPropagation();
    const value = ev.detail.value as Condition[];
    const index = (ev.target as any).idx;
    const choose = this.action.choose
      ? [...ensureArray(this.action.choose)]
      : [];
    choose[index].conditions = value;
    fireEvent(this, "value-changed", {
      value: { ...this.action, choose },
    });
  }

  private _actionChanged(ev: CustomEvent) {
    ev.stopPropagation();
    const value = ev.detail.value as Action[];
    const index = (ev.target as any).idx;
    const choose = this.action.choose
      ? [...ensureArray(this.action.choose)]
      : [];
    choose[index].sequence = value;
    fireEvent(this, "value-changed", {
      value: { ...this.action, choose },
    });
  }

  private _addOption() {
    const choose = this.action.choose
      ? [...ensureArray(this.action.choose)]
      : [];
    choose.push({ conditions: [], sequence: [] });
    fireEvent(this, "value-changed", {
      value: { ...this.action, choose },
    });
  }

  private _removeOption(ev: CustomEvent) {
    const index = (ev.currentTarget as any).idx;
    const choose = this.action.choose
      ? [...ensureArray(this.action.choose)]
      : [];
    choose.splice(index, 1);
    fireEvent(this, "value-changed", {
      value: { ...this.action, choose },
    });
  }

  private _defaultChanged(ev: CustomEvent) {
    ev.stopPropagation();
    const value = ev.detail.value as Action[];
    fireEvent(this, "value-changed", {
      value: {
        ...this.action,
        default: value,
      },
    });
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        ha-card {
          margin: 0 0 16px 0;
        }
        .add-card mwc-button {
          display: block;
          text-align: center;
        }
        ha-expansion-panel {
          --expansion-panel-summary-padding: 0 0 0 8px;
          --expansion-panel-content-padding: 0;
        }
        h3 {
          margin: 0;
          font-size: inherit;
          font-weight: inherit;
        }
        ha-icon-button {
          position: absolute;
          right: 0;
          inset-inline-start: initial;
          inset-inline-end: 0;
          direction: var(--direction);
        }
        ha-svg-icon {
          height: 20px;
        }
        .link-button-row {
          padding: 14px 14px 0 14px;
        }
        .card-content {
          padding: 0 16px 16px 16px;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-automation-action-choose": HaChooseAction;
  }
}
