import { mdiContentPaste, mdiPlus } from "@mdi/js";
import deepClone from "deep-clone-simple";
import type { CSSResultGroup, PropertyValues } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import { storage } from "../../../../common/decorators/storage";
import { fireEvent } from "../../../../common/dom/fire_event";
import "../../../../components/ha-button";
import "../../../../components/ha-dropdown";
import "../../../../components/ha-dropdown-item";
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
import "./types/ha-card-condition-location";
import "./types/ha-card-condition-not";
import "./types/ha-card-condition-numeric_state";
import "./types/ha-card-condition-or";
import "./types/ha-card-condition-screen";
import "./types/ha-card-condition-state";
import "./types/ha-card-condition-time";
import "./types/ha-card-condition-user";
import type { HaDropdownSelectEvent } from "../../../../components/ha-dropdown";

const UI_CONDITION = [
  "location",
  "numeric_state",
  "state",
  "screen",
  "time",
  "user",
  "and",
  "not",
  "or",
] as const satisfies readonly Condition["condition"][];

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
          <ha-dropdown @wa-select=${this._addCondition}>
            <ha-button slot="trigger" appearance="filled">
              <ha-svg-icon .path=${mdiPlus} slot="start"></ha-svg-icon>
              ${this.hass.localize(
                "ui.panel.lovelace.editor.condition-editor.add"
              )}
            </ha-button>
            ${this._clipboard
              ? html`
                  <ha-dropdown-item value="paste">
                    ${this.hass.localize(
                      "ui.panel.lovelace.editor.edit_card.paste_condition"
                    )}
                    <ha-svg-icon
                      slot="icon"
                      .path=${mdiContentPaste}
                    ></ha-svg-icon>
                  </ha-dropdown-item>
                `
              : nothing}
            ${UI_CONDITION.map(
              (condition) => html`
                <ha-dropdown-item .value=${condition}>
                  ${this.hass!.localize(
                    `ui.panel.lovelace.editor.condition-editor.condition.${condition}.label`
                  ) || condition}
                  <ha-svg-icon
                    slot="icon"
                    .path=${ICON_CONDITION[condition]}
                  ></ha-svg-icon>
                </ha-dropdown-item>
              `
            )}
          </ha-dropdown>
        </div>
      </div>
    `;
  }

  private _addCondition(ev: HaDropdownSelectEvent) {
    const condition = ev.detail.item.value as "paste" | Condition["condition"];
    const conditions = [...this.conditions];

    if (!condition || (condition === "paste" && !this._clipboard)) {
      return;
    }

    if (condition === "paste") {
      const newCondition = deepClone(this._clipboard);
      conditions.push(newCondition);
    } else {
      const elClass = customElements.get(`ha-card-condition-${condition}`) as
        | LovelaceConditionEditorConstructor
        | undefined;

      conditions.push(
        elClass?.defaultConfig ? { ...elClass.defaultConfig } : { condition }
      );
    }

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
        ha-dropdown {
          display: inline-block;
          margin-top: var(--ha-space-3);
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
