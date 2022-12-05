import { html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import { fireEvent } from "../../../../../common/dom/fire_event";
import "../../../../../components/ha-form/ha-form";
import type { SchemaUnion } from "../../../../../components/ha-form/types";
import type { TimePatternTrigger } from "../../../../../data/automation";
import type { HomeAssistant } from "../../../../../types";
import type { TriggerElement } from "../ha-automation-trigger-row";

const SCHEMA = [
  { name: "hours", selector: { text: {} } },
  { name: "minutes", selector: { text: {} } },
  { name: "seconds", selector: { text: {} } },
] as const;

@customElement("ha-automation-trigger-time_pattern")
export class HaTimePatternTrigger extends LitElement implements TriggerElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public trigger!: TimePatternTrigger;

  @property({ type: Boolean }) public disabled = false;

  public static get defaultConfig() {
    return {};
  }

  protected render() {
    return html`
      <ha-form
        .hass=${this.hass}
        .schema=${SCHEMA}
        .data=${this.trigger}
        .disabled=${this.disabled}
        .computeLabel=${this._computeLabelCallback}
        @value-changed=${this._valueChanged}
      ></ha-form>
    `;
  }

  private _valueChanged(ev: CustomEvent): void {
    ev.stopPropagation();
    const newTrigger = ev.detail.value;
    fireEvent(this, "value-changed", { value: newTrigger });
  }

  private _computeLabelCallback = (
    schema: SchemaUnion<typeof SCHEMA>
  ): string =>
    this.hass.localize(
      `ui.panel.config.automation.editor.triggers.type.time_pattern.${schema.name}`
    );
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-automation-trigger-time_pattern": HaTimePatternTrigger;
  }
}
