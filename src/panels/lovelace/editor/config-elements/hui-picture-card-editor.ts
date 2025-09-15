import { mdiGestureTap } from "@mdi/js";
import { html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { assert, assign, object, optional, string, union } from "superstruct";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../../../common/dom/fire_event";
import type { SchemaUnion } from "../../../../components/ha-form/types";
import "../../../../components/ha-theme-picker";
import type { HomeAssistant } from "../../../../types";
import type { PictureCardConfig } from "../../cards/types";
import "../../components/hui-action-editor";
import type { LovelaceCardEditor } from "../../types";
import { actionConfigStruct } from "../structs/action-struct";
import { baseLovelaceCardConfig } from "../structs/base-card-struct";

const cardConfigStruct = assign(
  baseLovelaceCardConfig,
  object({
    image: optional(union([string(), object()])),
    image_entity: optional(string()),
    tap_action: optional(actionConfigStruct),
    hold_action: optional(actionConfigStruct),
    double_tap_action: optional(actionConfigStruct),
    theme: optional(string()),
    alt_text: optional(string()),
  })
);

const SCHEMA = [
  {
    name: "image",
    selector: {
      media: {
        accept: ["image/*"] as string[],
        clearable: true,
        image_upload: true,
      },
    },
  },
  {
    name: "image_entity",
    selector: { entity: { domain: ["image", "person"] } },
  },
  { name: "alt_text", selector: { text: {} } },
  { name: "theme", selector: { theme: {} } },
  {
    name: "interactions",
    type: "expandable",
    flatten: true,
    iconPath: mdiGestureTap,
    schema: [
      {
        name: "tap_action",
        selector: {
          ui_action: {
            default_action: "more-info",
          },
        },
      },
      {
        name: "",
        type: "optional_actions",
        flatten: true,
        schema: (["hold_action", "double_tap_action"] as const).map(
          (action) => ({
            name: action,
            selector: {
              ui_action: {
                default_action: "none" as const,
              },
            },
          })
        ),
      },
    ],
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
        .data=${this._processData(this._config)}
        .schema=${SCHEMA}
        .computeLabel=${this._computeLabelCallback}
        @value-changed=${this._valueChanged}
      ></ha-form>
    `;
  }

  private _processData = memoizeOne((config: PictureCardConfig) => ({
    ...config,
    ...(typeof config.image === "string"
      ? { image: { media_content_id: config.image } }
      : {}),
  }));

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
