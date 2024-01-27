import { html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { assert, assign, object, optional, string } from "superstruct";
import { fireEvent } from "../../../../common/dom/fire_event";
import { SchemaUnion } from "../../../../components/ha-form/types";
import "../../../../components/ha-theme-picker";
import { HomeAssistant } from "../../../../types";
import { PictureCardConfig } from "../../cards/types";
import "../../components/hui-action-editor";
import { LovelaceCardEditor } from "../../types";
import { actionConfigStruct } from "../structs/action-struct";
import { baseLovelaceCardConfig } from "../structs/base-card-struct";

const cardConfigStruct = assign(
  baseLovelaceCardConfig,
  object({
    image: optional(string()),
    image_entity: optional(string()),
    tap_action: optional(actionConfigStruct),
    hold_action: optional(actionConfigStruct),
    theme: optional(string()),
    alt_text: optional(string()),
  })
);

const SCHEMA = [
  { name: "image", selector: { text: {} } },
  { name: "image_entity", selector: { entity: { domain: "image" } } },
  { name: "alt_text", selector: { text: {} } },
  { name: "theme", selector: { theme: {} } },
  {
    name: "tap_action",
    selector: { ui_action: {} },
  },
  {
    name: "hold_action",
    selector: { ui_action: {} },
  },
] as const;

@customElement("hui-picture-card-editor")
export class HuiPictureCardEditor
  extends LitElement
  implements LovelaceCardEditor
{
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: PictureCardConfig;

  public setConfig(config: PictureCardConfig): void {
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
    switch (schema.name) {
      case "theme":
        return `${this.hass!.localize(
          "ui.panel.lovelace.editor.card.generic.theme"
        )} (${this.hass!.localize(
          "ui.panel.lovelace.editor.card.config.optional"
        )})`;
      default:
        return (
          this.hass!.localize(
            `ui.panel.lovelace.editor.card.picture-card.${schema.name}`
          ) ||
          this.hass!.localize(
            `ui.panel.lovelace.editor.card.generic.${schema.name}`
          )
        );
    }
  };
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-picture-card-editor": HuiPictureCardEditor;
  }
}
