import { html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { assert, assign, object, optional, string } from "superstruct";
import { fireEvent } from "../../../../common/dom/fire_event";
import "../../../../components/ha-form/ha-form";
import type {
  HaFormSchema,
  SchemaUnion,
} from "../../../../components/ha-form/types";
import type { HomeAssistant } from "../../../../types";
import type { MediaControlCardConfig } from "../../cards/types";
import type { LovelaceCardEditor } from "../../types";
import { baseLovelaceCardConfig } from "../structs/base-card-struct";
import { entityNameStruct } from "../structs/entity-name-struct";
import { configElementStyle } from "./config-elements-style";

const cardConfigStruct = assign(
  baseLovelaceCardConfig,
  object({
    entity: optional(string()),
    name: optional(entityNameStruct),
    theme: optional(string()),
  })
);

const SCHEMA = [
  {
    name: "entity",
    required: true,
    selector: { entity: { domain: "media_player" } },
  },
  {
    name: "name",
    selector: {
      entity_name: {},
    },
    context: { entity: "entity" },
  },
  { name: "theme", selector: { theme: {} } },
] as const satisfies readonly HaFormSchema[];

@customElement("hui-media-control-card-editor")
export class HuiMediaControlCardEditor
  extends LitElement
  implements LovelaceCardEditor
{
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: MediaControlCardConfig;

  public setConfig(config: MediaControlCardConfig): void {
    assert(config, cardConfigStruct);
    this._config = config;
  }

  protected render() {
    if (!this.hass || !this._config) {
      return nothing;
    }

    return html`
      <ha-form
        .hass=${this.hass}
        .data=${this._config}
        .schema=${SCHEMA}
        .computeLabel=${this._computeLabelCallback}
        @value-changed=${this._valueChanged}
      ></ha-form>
    `;
  }

  private _valueChanged(ev: CustomEvent): void {
    fireEvent(this, "config-changed", { config: ev.detail.value });
  }

  private _computeLabelCallback = (schema: SchemaUnion<typeof SCHEMA>) => {
    if (schema.name === "theme") {
      return `${this.hass!.localize(
        "ui.panel.lovelace.editor.card.generic.theme"
      )} (${this.hass!.localize(
        "ui.panel.lovelace.editor.card.config.optional"
      )})`;
    }
    return this.hass!.localize(
      `ui.panel.lovelace.editor.card.generic.${schema.name}`
    );
  };

  static styles = configElementStyle;
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-media-control-card-editor": HuiMediaControlCardEditor;
  }
}
