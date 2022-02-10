import { html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import { fireEvent } from "../../../../../common/dom/fire_event";
import { HaFormSchema } from "../../../../../components/ha-form/types";
import { TimePatternTrigger } from "../../../../../data/automation";
import { HomeAssistant } from "../../../../../types";
import { TriggerElement } from "../ha-automation-trigger-row";

@customElement("ha-automation-trigger-time_pattern")
export class HaTimePatternTrigger extends LitElement implements TriggerElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public trigger!: TimePatternTrigger;

  public static get defaultConfig() {
    return {};
  }

  protected render() {
    return html`
      <ha-form
        .hass=${this.hass}
        .schema=${[
          { name: "hours", selector: { text: {} } },
          { name: "minutes", selector: { text: {} } },
          { name: "seconds", selector: { text: {} } },
        ]}
        .data=${this.trigger}
        .computeLabel=${this._computeLabelCallback}
        @value-changed=${this._valueChanged}
      ></ha-form>
    `;
  }

  private _valueChanged(ev: CustomEvent): void {
    ev.stopPropagation();
    const newTrigger = ev.detail.value;
    Object.keys(newTrigger).forEach((key) =>
      newTrigger[key] === undefined || newTrigger[key] === ""
        ? delete newTrigger[key]
        : {}
    );
    fireEvent(this, "value-changed", { value: newTrigger });
  }

  private _computeLabelCallback(schema: HaFormSchema): string {
    return this.hass.localize(
      `ui.panel.config.automation.editor.triggers.type.time_pattern.${schema.name}`
    );
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-automation-trigger-time_pattern": HaTimePatternTrigger;
  }
}
