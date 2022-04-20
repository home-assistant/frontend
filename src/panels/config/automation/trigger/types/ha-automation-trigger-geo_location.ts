import "../../../../../components/ha-form/ha-form";
import { html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../../../../common/dom/fire_event";
import { HaFormSchema } from "../../../../../components/ha-form/types";
import type { GeoLocationTrigger } from "../../../../../data/automation";
import type { HomeAssistant } from "../../../../../types";
import type { LocalizeFunc } from "../../../../../common/translations/localize";

@customElement("ha-automation-trigger-geo_location")
export class HaGeolocationTrigger extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public trigger!: GeoLocationTrigger;

  private _schema = memoizeOne((localize: LocalizeFunc) => [
    { name: "source", selector: { text: {} } },
    { name: "zone", selector: { entity: { domain: "zone" } } },
    {
      name: "event",
      type: "select",
      required: true,
      options: [
        [
          "enter",
          localize(
            "ui.panel.config.automation.editor.triggers.type.geo_location.enter"
          ),
        ],
        [
          "leave",
          localize(
            "ui.panel.config.automation.editor.triggers.type.geo_location.leave"
          ),
        ],
      ],
    },
  ]);

  public static get defaultConfig() {
    return {
      source: "",
      zone: "",
      event: "enter" as GeoLocationTrigger["event"],
    };
  }

  protected render() {
    return html`
      <ha-form
        .schema=${this._schema(this.hass.localize)}
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

  private _computeLabelCallback = (schema: HaFormSchema): string =>
    this.hass.localize(
      `ui.panel.config.automation.editor.triggers.type.geo_location.${schema.name}`
    );
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-automation-trigger-geo_location": HaGeolocationTrigger;
  }
}
