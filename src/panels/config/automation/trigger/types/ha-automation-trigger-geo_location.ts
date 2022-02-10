import "../../../../../components/ha-form/ha-form";
import { html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../../../common/dom/fire_event";
import { HaFormSchema } from "../../../../../components/ha-form/types";
import type { GeoLocationTrigger } from "../../../../../data/automation";
import type { HomeAssistant } from "../../../../../types";

@customElement("ha-automation-trigger-geo_location")
export class HaGeolocationTrigger extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public trigger!: GeoLocationTrigger;

  @state() private _schema?: HaFormSchema[];

  public static get defaultConfig() {
    return {
      source: "",
      zone: "",
      event: "enter" as GeoLocationTrigger["event"],
    };
  }

  protected firstUpdated(): void {
    if (!this.hass) {
      return;
    }

    this._schema = [
      { name: "source", selector: { text: {} } },
      { name: "zone", selector: { entity: { domain: "zone" } } },
      {
        name: "event",
        type: "select",
        required: true,
        options: [
          [
            "enter",
            this.hass.localize(
              "ui.panel.config.automation.editor.triggers.type.geo_location.enter"
            ),
          ],
          [
            "leave",
            this.hass.localize(
              "ui.panel.config.automation.editor.triggers.type.geo_location.leave"
            ),
          ],
        ],
      },
    ];
  }

  protected render() {
    if (!this._schema) {
      return html``;
    }

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
      `ui.panel.config.automation.editor.triggers.type.geo_location.${schema.name}`
    );
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-automation-trigger-geo_location": HaGeolocationTrigger;
  }
}
