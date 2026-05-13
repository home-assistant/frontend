import "../../../../../components/ha-form/ha-form";
import { html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../../../../common/dom/fire_event";
import type { GeoLocationTrigger } from "../../../../../data/automation";
import type { HomeAssistant } from "../../../../../types";
import type { LocalizeFunc } from "../../../../../common/translations/localize";
import type { SchemaUnion } from "../../../../../components/ha-form/types";

export const computeLabel = (
  fieldName: string,
  localize: LocalizeFunc
): string =>
  localize(
    `ui.panel.config.automation.editor.triggers.type.geo_location.${fieldName}` as any
  );

export const YAML_SCHEMA = [
  { name: "source", selector: { text: {} } },
  { name: "zone", selector: { entity: { domain: "zone" } } },
  {
    name: "event",
    type: "select" as const,
    required: true,
    options: [["enter", "enter"] as const, ["leave", "leave"] as const],
  },
] as const;

@customElement("ha-automation-trigger-geo_location")
export class HaGeolocationTrigger extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public trigger!: GeoLocationTrigger;

  @property({ type: Boolean }) public disabled = false;

  private _schema = memoizeOne(
    (localize: LocalizeFunc) =>
      [
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
      ] as const
  );

  public static get defaultConfig(): GeoLocationTrigger {
    return {
      trigger: "geo_location",
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
    schema: SchemaUnion<ReturnType<typeof this._schema>>
  ): string => computeLabel(schema.name, this.hass.localize);
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-automation-trigger-geo_location": HaGeolocationTrigger;
  }
}
