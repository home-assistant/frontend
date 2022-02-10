import "../../../../../components/ha-form/ha-form";
import { css, html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../../../common/dom/fire_event";
import type { HassTrigger } from "../../../../../data/automation";
import type { HomeAssistant } from "../../../../../types";
import { HaFormSchema } from "../../../../../components/ha-form/types";

@customElement("ha-automation-trigger-homeassistant")
export class HaHassTrigger extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public trigger!: HassTrigger;

  @state() private _schema?: HaFormSchema[];

  public static get defaultConfig() {
    return {
      event: "start" as HassTrigger["event"],
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
            "start",
            this.hass.localize(
              "ui.panel.config.automation.editor.triggers.type.homeassistant.start"
            ),
          ],
          [
            "shutdown",
            this.hass.localize(
              "ui.panel.config.automation.editor.triggers.type.homeassistant.shutdown"
            ),
          ],
        ],
      },
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
    Object.keys(newTrigger).forEach((key) =>
      newTrigger[key] === undefined || newTrigger[key] === ""
        ? delete newTrigger[key]
        : {}
    );
    fireEvent(this, "value-changed", { value: newTrigger });
  }

  private _computeLabelCallback(schema: HaFormSchema): string {
    return this.hass.localize(
      `ui.panel.config.automation.editor.triggers.type.geo_location.${schema.name}`
    );
  }

  static styles = css`
    label {
      display: flex;
      align-items: center;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-automation-trigger-homeassistant": HaHassTrigger;
  }
}
