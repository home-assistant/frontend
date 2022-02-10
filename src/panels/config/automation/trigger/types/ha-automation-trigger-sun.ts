import "@polymer/paper-input/paper-input";
import { html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../../../common/dom/fire_event";
import "../../../../../components/ha-radio";
import "../../../../../components/ha-formfield";
import type { SunTrigger } from "../../../../../data/automation";
import type { HomeAssistant } from "../../../../../types";
import { TriggerElement } from "../ha-automation-trigger-row";
import { HaFormSchema } from "../../../../../components/ha-form/types";

@customElement("ha-automation-trigger-sun")
export class HaSunTrigger extends LitElement implements TriggerElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public trigger!: SunTrigger;

  @state() private _schema?: HaFormSchema[];

  public static get defaultConfig() {
    return {
      event: "sunrise" as SunTrigger["event"],
      offset: 0,
    };
  }

  protected firstUpdated(): void {
    if (!this.hass) {
      return;
    }

    this._schema = [
      {
        name: "event",
        type: "select",
        required: true,
        options: [
          [
            "sunrise",
            this.hass.localize(
              "ui.panel.config.automation.editor.triggers.type.sun.sunrise"
            ),
          ],
          [
            "sunset",
            this.hass.localize(
              "ui.panel.config.automation.editor.triggers.type.sun.sunset"
            ),
          ],
        ],
      },
      { name: "offset", selector: { text: {} } },
    ];
  }

  protected render() {
    return html`
      <ha-form
        .schema=${this._schema}
        .data=${this.trigger}
        .hass=${this.hass}
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

  private _computeLabelCallback(schema: HaFormSchema): string {
    return this.hass.localize(
      `ui.panel.config.automation.editor.triggers.type.sun.${schema.name}`
    );
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-automation-trigger-sun": HaSunTrigger;
  }
}
