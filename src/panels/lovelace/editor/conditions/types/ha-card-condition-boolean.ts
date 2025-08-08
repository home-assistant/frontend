import { LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import type { HomeAssistant } from "../../../../../types";
import type { BooleanCondition } from "../../../common/validate-condition";
import "../ha-card-conditions-editor";
import { GUISupportError } from "../../gui-support-error";

@customElement("ha-card-condition-boolean")
export class HaCardConditionBoolean extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public condition!: BooleanCondition;

  @property({ type: Boolean }) public disabled = false;

  public static get defaultConfig(): BooleanCondition {
    return {
      condition: "boolean",
      values: [],
    };
  }

  protected static validateUIConfig(_: BooleanCondition, hass: HomeAssistant) {
    throw new GUISupportError(
      hass.localize(
        "ui.panel.lovelace.editor.condition-editor.condition.boolean.label"
      )
    );
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-card-condition-boolean": HaCardConditionBoolean;
  }
}
