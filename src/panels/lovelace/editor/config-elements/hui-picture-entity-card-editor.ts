import { CSSResultGroup, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { assert, assign, boolean, object, optional, string } from "superstruct";
import { fireEvent } from "../../../../common/dom/fire_event";
import "../../../../components/ha-form/ha-form";
import type { SchemaUnion } from "../../../../components/ha-form/types";
import type { HomeAssistant } from "../../../../types";
import type { PictureEntityCardConfig } from "../../cards/types";
import type { LovelaceCardEditor } from "../../types";
import { actionConfigStruct } from "../structs/action-struct";
import { baseLovelaceCardConfig } from "../structs/base-card-struct";
import { configElementStyle } from "./config-elements-style";

const cardConfigStruct = assign(
  baseLovelaceCardConfig,
  object({
    entity: optional(string()),
    image: optional(string()),
    name: optional(string()),
    camera_image: optional(string()),
    camera_view: optional(string()),
    aspect_ratio: optional(string()),
    tap_action: optional(actionConfigStruct),
    hold_action: optional(actionConfigStruct),
    show_name: optional(boolean()),
    show_state: optional(boolean()),
    theme: optional(string()),
    fit_mode: optional(string()),
  })
);

const SCHEMA = [
  { name: "entity", required: true, selector: { entity: {} } },
  { name: "name", selector: { text: {} } },
  { name: "image", selector: { text: {} } },
  { name: "camera_image", selector: { entity: { domain: "camera" } } },
  {
    name: "",
    type: "grid",
    schema: [
      {
        name: "camera_view",
        selector: { select: { options: ["auto", "live"] } },
      },
      { name: "aspect_ratio", selector: { text: {} } },
    ],
  },
  {
    name: "",
    type: "grid",
    schema: [
      {
        name: "show_name",
        selector: { boolean: {} },
      },
      {
        name: "show_state",
        selector: { boolean: {} },
      },
    ],
  },
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

@customElement("hui-picture-entity-card-editor")
export class HuiPictureEntityCardEditor
  extends LitElement
  implements LovelaceCardEditor
{
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: PictureEntityCardConfig;

  public setConfig(config: PictureEntityCardConfig): void {
    assert(config, cardConfigStruct);
    this._config = config;
  }

  protected render() {
    if (!this.hass || !this._config) {
      return nothing;
    }

    const data = {
      show_state: true,
      show_name: true,
      camera_view: "auto",
      ...this._config,
    };

    return html`
      <ha-form
        .hass=${this.hass}
        .data=${data}
        .schema=${SCHEMA}
        .computeLabel=${this._computeLabelCallback}
        @value-changed=${this._valueChanged}
      ></ha-form>
      </div>
    `;
  }

  private _valueChanged(ev: CustomEvent): void {
    fireEvent(this, "config-changed", { config: ev.detail.value });
  }

  private _computeLabelCallback = (schema: SchemaUnion<typeof SCHEMA>) => {
    switch (schema.name) {
      case "theme":
      case "tap_action":
      case "hold_action":
        return `${this.hass!.localize(
          `ui.panel.lovelace.editor.card.generic.${schema.name}`
        )} (${this.hass!.localize(
          "ui.panel.lovelace.editor.card.config.optional"
        )})`;
      default:
        return this.hass!.localize(
          `ui.panel.lovelace.editor.card.generic.${schema.name}`
        );
    }
  };

  static styles: CSSResultGroup = configElementStyle;
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-picture-entity-card-editor": HuiPictureEntityCardEditor;
  }
}
