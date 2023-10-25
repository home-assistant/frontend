import { mdiPlus } from "@mdi/js";
import { CSSResultGroup, LitElement, PropertyValues, css, html } from "lit";
import { customElement, property } from "lit/decorators";
import { fireEvent } from "../../../../common/dom/fire_event";
import { stopPropagation } from "../../../../common/dom/stop_propagation";
import "../../../../components/ha-alert";
import "../../../../components/ha-button";
import "../../../../components/ha-list-item";
import type { HaSelect } from "../../../../components/ha-select";
import "../../../../components/ha-svg-icon";
import type { HomeAssistant } from "../../../../types";
import { ICON_CONDITION } from "../../common/icon-condition";
import { Condition, LegacyCondition } from "../../common/validate-condition";
import "./ha-card-condition-editor";
import type { HaCardConditionEditor } from "./ha-card-condition-editor";
import { LovelaceConditionEditorConstructor } from "./types";
import "./types/ha-card-condition-numeric_state";
import "./types/ha-card-condition-screen";
import "./types/ha-card-condition-state";
import "./types/ha-card-condition-user";

const UI_CONDITION = [
  "numeric_state",
  "state",
  "screen",
  "user",
] as const satisfies readonly Condition["condition"][];

@customElement("ha-card-conditions-editor")
export class HaCardConditionsEditor extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public conditions!: (
    | Condition
    | LegacyCondition
  )[];

  private _focusLastConditionOnChange = false;

  protected firstUpdated() {
    // Expand the condition if there is only one
    if (this.conditions.length === 1) {
      const row = this.shadowRoot!.querySelector<HaCardConditionEditor>(
        "ha-card-condition-editor"
      )!;
      row.updateComplete.then(() => {
        row.expand();
      });
    }
  }

  protected updated(changedProperties: PropertyValues) {
    if (!changedProperties.has("conditions")) {
      return;
    }

    if (this._focusLastConditionOnChange) {
      this._focusLastConditionOnChange = false;
      const row = this.shadowRoot!.querySelector<HaCardConditionEditor>(
        "ha-card-condition-editor:last-of-type"
      )!;
      row.updateComplete.then(() => {
        row.expand();
        row.scrollIntoView();
        row.focus();
      });
    }
  }

  protected render() {
    return html`
      <div class="conditions">
        <ha-alert alert-type="info">
          ${this.hass!.localize(
            "ui.panel.lovelace.editor.condition-editor.explanation"
          )}
        </ha-alert>
        ${this.conditions.map(
          (cond, idx) => html`
            <ha-card-condition-editor
              .index=${idx}
              @value-changed=${this._conditionChanged}
              .hass=${this.hass}
              .condition=${cond}
            ></ha-card-condition-editor>
          `
        )}
        <div>
          <ha-button-menu
            @action=${this._addCondition}
            fixed
            @closed=${stopPropagation}
          >
            <ha-button
              slot="trigger"
              outlined
              .label=${this.hass.localize(
                "ui.panel.lovelace.editor.condition-editor.add"
              )}
            >
              <ha-svg-icon .path=${mdiPlus} slot="icon"></ha-svg-icon>
            </ha-button>
            ${UI_CONDITION.map(
              (condition) => html`
                <ha-list-item .value=${condition} graphic="icon">
                  ${this.hass!.localize(
                    `ui.panel.lovelace.editor.condition-editor.condition.${condition}.label`
                  ) || condition}
                  <ha-svg-icon
                    slot="graphic"
                    .path=${ICON_CONDITION[condition]}
                  ></ha-svg-icon>
                </ha-list-item>
              `
            )}
          </ha-button-menu>
        </div>
      </div>
    `;
  }

  private _addCondition(ev: CustomEvent): void {
    const condition = (ev.currentTarget as HaSelect).items[ev.detail.index]
      .value as Condition["condition"];
    const conditions = [...this.conditions];

    const elClass = customElements.get(`ha-card-condition-${condition}`) as
      | LovelaceConditionEditorConstructor
      | undefined;

    conditions.push(
      elClass?.defaultConfig
        ? { ...elClass.defaultConfig }
        : { condition: condition }
    );
    this._focusLastConditionOnChange = true;
    fireEvent(this, "value-changed", { value: conditions });
  }

  private _conditionChanged(ev: CustomEvent) {
    ev.stopPropagation();
    const conditions = [...this.conditions];
    const newValue = ev.detail.value;
    const index = (ev.target as any).index;

    if (newValue === null) {
      conditions.splice(index, 1);
    } else {
      conditions[index] = newValue;
    }

    fireEvent(this, "value-changed", { value: conditions });
  }

  static get styles(): CSSResultGroup {
    return [
      css`
        mwc-tab-bar {
          border-bottom: 1px solid var(--divider-color);
        }
        ha-alert {
          display: block;
          margin-top: 12px;
        }
        ha-card-condition-editor {
          display: block;
          margin-top: 12px;
          scroll-margin-top: 48px;
        }
        ha-button-menu {
          margin-top: 12px;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-card-conditions-editor": HaCardConditionsEditor;
  }
}
