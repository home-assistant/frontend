import { html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../common/dom/fire_event";
import "../../../components/ha-form/ha-form";
import type {
  HaFormSchema,
  SchemaUnion,
} from "../../../components/ha-form/types";
import type { HomeAssistant } from "../../../types";
import type { LovelaceCardEditor } from "../types";
import type { CountdownCardConfig } from "./types";

const SCHEMA = [
  { name: "title", selector: { text: {} } },
  { name: "target_date", selector: { date: {} } },
  {
    name: "entity",
    selector: {
      entity: {
        domain: ["input_datetime", "sensor"],
      },
    },
  },
  { name: "show_seconds", selector: { boolean: {} } },
  { name: "no_background", selector: { boolean: {} } },
] as const satisfies readonly HaFormSchema[];

@customElement("hui-countdown-card-editor")
export class HuiCountdownCardEditor
  extends LitElement
  implements LovelaceCardEditor
{
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: CountdownCardConfig;

  public setConfig(config: CountdownCardConfig): void {
    this._config = config;
  }

  private _computeLabel = (schema: SchemaUnion<typeof SCHEMA>): string => {
    switch (schema.name) {
      case "title":
        return "Title";
      case "target_date":
        return "Target date";
      case "entity":
        return "Date/time entity";
      case "show_seconds":
        return "Show seconds";
      case "no_background":
        return "Transparent background";
    }
  };

  private _valueChanged(ev: CustomEvent): void {
    const config = ev.detail.value as CountdownCardConfig;
    fireEvent(this, "config-changed", { config });
  }

  protected render() {
    if (!this.hass || !this._config) return nothing;

    return html`
      <ha-form
        .hass=${this.hass}
        .data=${this._config}
        .schema=${SCHEMA}
        .computeLabel=${this._computeLabel}
        @value-changed=${this._valueChanged}
      ></ha-form>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-countdown-card-editor": HuiCountdownCardEditor;
  }
}
