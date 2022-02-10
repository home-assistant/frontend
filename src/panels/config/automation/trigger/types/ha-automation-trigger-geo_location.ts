import "../../../../../components/ha-form/ha-form";
import { css, html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../../../common/dom/fire_event";
import "../../../../../components/entity/ha-entity-picker";
import { HaFormSchema } from "../../../../../components/ha-form/types";
import type { GeoLocationTrigger } from "../../../../../data/automation";
import type { HomeAssistant } from "../../../../../types";

@customElement("ha-automation-trigger-geo_location")
export class HaGeolocationTrigger extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public trigger!: GeoLocationTrigger;

  @state() private _schema?: HaFormSchema;

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
    const { source, zone, event } = this.trigger;

    return html`
      <ha-form
        .schema=${this._schema}
        .data=${this.trigger}
        .hass=${this.hass}
        .computeLabel=${this._computeLabelCallback}
        @value-changed=${this._valueChanged}
      ></ha-form>
      <paper-input
        .label=${this.hass.localize(
          "ui.panel.config.automation.editor.triggers.type.geo_location.source"
        )}
        name="source"
        .value=${source}
        @value-changed=${this._valueChanged}
      ></paper-input>
      <ha-entity-picker
        .label=${this.hass.localize(
          "ui.panel.config.automation.editor.triggers.type.geo_location.zone"
        )}
        .value=${zone}
        .hass=${this.hass}
        allow-custom-entity
      ></ha-entity-picker>
      <label>
        ${this.hass.localize(
          "ui.panel.config.automation.editor.triggers.type.geo_location.event"
        )}
        <ha-formfield
          .label=${this.hass.localize(
            "ui.panel.config.automation.editor.triggers.type.geo_location.enter"
          )}
        >
          <ha-radio
            name="event"
            value="enter"
            .checked=${event === "enter"}
          ></ha-radio>
        </ha-formfield>
        <ha-formfield
          .label=${this.hass.localize(
            "ui.panel.config.automation.editor.triggers.type.geo_location.leave"
          )}
        >
          <ha-radio
            name="event"
            value="leave"
            .checked=${event === "leave"}
          ></ha-radio>
        </ha-formfield>
      </label>
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
    "ha-automation-trigger-geo_location": HaGeolocationTrigger;
  }
}
