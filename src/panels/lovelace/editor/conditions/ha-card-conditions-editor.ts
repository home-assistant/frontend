import { mdiContentPaste, mdiPlus } from "@mdi/js";
import deepClone from "deep-clone-simple";
import type { CSSResultGroup, PropertyValues } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import { fireEvent } from "../../../../common/dom/fire_event";
import { stopPropagation } from "../../../../common/dom/stop_propagation";
import "../../../../components/ha-button";
import "../../../../components/ha-list-item";
import type { HaSelect } from "../../../../components/ha-select";
import "../../../../components/ha-svg-icon";
import type { HomeAssistant } from "../../../../types";
import { ICON_CONDITION } from "../../common/icon-condition";
import type {
  Condition,
  LegacyCondition,
} from "../../common/validate-condition";
import "./ha-card-condition-editor";
import type { HaCardConditionEditor } from "./ha-card-condition-editor";
import type { LovelaceConditionEditorConstructor } from "./types";
import "./types/ha-card-condition-and";
import "./types/ha-card-condition-boolean";
import "./types/ha-card-condition-location";
import "./types/ha-card-condition-not";
import "./types/ha-card-condition-numeric_state";
import "./types/ha-card-condition-or";
import "./types/ha-card-condition-screen";
import "./types/ha-card-condition-state";
import "./types/ha-card-condition-user";
import { storage } from "../../../../common/decorators/storage";

const UI_CONDITION = [
  "location",
  "numeric_state",
  "state",
  "screen",
  "user",
  "and",
  "not",
  "or",
] as const satisfies readonly Condition["condition"][];

export const PASTE_VALUE = "__paste__" as const;

@customElement("ha-card-conditions-editor")
export class HaCardConditionsEditor extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @storage({
    key: "dashboardConditionClipboard",
    state: false,
    subscribe: false,
    storage: "sessionStorage",
  })
  protected _clipboard?: Condition | LegacyCondition;

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
        ${this.conditions.map(
          (cond, idx) => html`
            <ha-card-condition-editor
              .index=${idx}
              @duplicate-condition=${this._duplicateCondition}
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
            <ha-button slot="trigger" appearance="filled">
              <ha-svg-icon .path=${mdiPlus} slot="start"></ha-svg-icon>
              ${this.hass.localize(
                "ui.panel.lovelace.editor.condition-editor.add"
              )}
            </ha-button>
            ${this._clipboard
              ? html`
                  <ha-list-item .value=${PASTE_VALUE} graphic="icon">
                    ${this.hass.localize(
                      "ui.panel.lovelace.editor.edit_card.paste_condition"
                    )}
                    <ha-svg-icon
                      slot="graphic"
                      .path=${mdiContentPaste}
                    ></ha-svg-icon>
                  </ha-list-item>
                `
              : nothing}
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
    const conditions = [...this.conditions];

    const item = (ev.currentTarget as HaSelect).items[ev.detail.index];

    if (item.value === PASTE_VALUE && this._clipboard) {
      const condition = deepClone(this._clipboard);
      conditions.push(condition);
      fireEvent(this, "value-changed", { value: conditions });
      return;
    }

    const condition = item.value as Condition["condition"];

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

  private _duplicateCondition(ev: CustomEvent) {
    const conditions = [...this.conditions];
    conditions.push(ev.detail.value);
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
