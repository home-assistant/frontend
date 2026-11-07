import { mdiGestureTap } from "@mdi/js";
import type { CSSResultGroup } from "lit";
import { html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import {
  assert,
  assign,
  boolean,
  object,
  optional,
  string,
  union,
} from "superstruct";
import { fireEvent } from "../../../../common/dom/fire_event";
import type { LocalizeFunc } from "../../../../common/translations/localize";
import "../../../../components/ha-form/ha-form";
import type {
  HaFormSchema,
  SchemaUnion,
} from "../../../../components/ha-form/types";
import type { HomeAssistant } from "../../../../types";
import { getEntityDefaultButtonAction } from "../../cards/hui-button-card";
import type { ButtonCardConfig } from "../../cards/types";
import type { LovelaceCardEditor } from "../../types";
import { ACTION_RELATED_CONTEXT } from "../../components/hui-action-editor";
import { actionConfigStruct } from "../structs/action-struct";
import { baseLovelaceCardConfig } from "../structs/base-card-struct";
import { entityNameStruct } from "../structs/entity-name-struct";
import { configElementStyle } from "./config-elements-style";

const cardConfigStruct = assign(
  baseLovelaceCardConfig,
  object({
    entity: optional(string()),
    name: optional(entityNameStruct),
    show_name: optional(boolean()),
    icon: optional(string()),
    show_icon: optional(boolean()),
    icon_height: optional(string()),
    image: optional(union([string(), object()])),
    tap_action: optional(actionConfigStruct),
    hold_action: optional(actionConfigStruct),
    double_tap_action: optional(actionConfigStruct),
    theme: optional(string()),
    show_state: optional(boolean()),
    state_color: optional(boolean()),
    color: optional(string()),
  })
);

@customElement("hui-button-card-editor")
export class HuiButtonCardEditor
  extends LitElement
  implements LovelaceCardEditor
{
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: ButtonCardConfig;

  public setConfig(config: ButtonCardConfig): void {
    assert(config, cardConfigStruct);

    // Migrate state_color to color
    if (config.state_color !== undefined) {
      config = {
        ...config,
        color: config.state_color ? undefined : "none",
      };
      delete config.state_color;

      fireEvent(this, "config-changed", { config: config });
      return;
    }

    this._config = config;
  }

  private _schema = memoizeOne(
    (localize: LocalizeFunc, entityId: string | undefined) =>
      [
        { name: "entity", selector: { entity: {} } },
        {
          name: "name",
          selector: {
            entity_name: {},
          },
          context: { entity: "entity" },
        },
        {
          name: "",
          type: "grid",
          schema: [
            {
              name: "icon",
              selector: {
                icon: {},
              },
              context: {
                icon_entity: "entity",
              },
            },
            { name: "icon_height", selector: { text: { suffix: "px" } } },
            {
              name: "color",
              selector: {
                ui_color: {
                  default_color: "state",
                  include_state: true,
                  include_none: true,
                },
              },
            },
            { name: "theme", selector: { theme: {} } },
          ],
        },
        {
          name: "image",
          selector: {
            media: {
              accept: ["image/*"] as string[],
              image_upload: true,
              hide_content_type: true,
              content_id_helper: localize(
                "ui.panel.lovelace.editor.card.picture.content_id_helper"
              ),
            },
          },
        },
        {
          name: "",
          type: "grid",
          column_min_width: "100px",
          schema: [
            { name: "show_name", selector: { boolean: {} } },
            { name: "show_state", selector: { boolean: {} } },
            { name: "show_icon", selector: { boolean: {} } },
          ],
        },
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
                  default_action: getEntityDefaultButtonAction(entityId),
                },
              },
              context: ACTION_RELATED_CONTEXT,
            },
            {
              name: "hold_action",
              selector: {
                ui_action: {
                  default_action: "more-info",
                },
              },
              context: ACTION_RELATED_CONTEXT,
            },
            {
              name: "",
              type: "optional_actions",
              flatten: true,
              schema: [
                {
                  name: "double_tap_action",
                  selector: {
                    ui_action: {
                      default_action: "none",
                    },
                  },
                  context: ACTION_RELATED_CONTEXT,
                },
              ],
            },
          ],
        },
      ] as const satisfies readonly HaFormSchema[]
  );

  protected render() {
    if (!this.hass || !this._config) {
      return nothing;
    }

    const schema = this._schema(this.hass.localize, this._config.entity);

    return html`
      <ha-form
        .hass=${this.hass}
        .data=${this._processData(this._config)}
        .schema=${schema}
        .computeLabel=${this._computeLabelCallback}
        .computeHelper=${this._computeHelperCallback}
        @value-changed=${this._valueChanged}
      ></ha-form>
    `;
  }

  private _processData = memoizeOne((config: ButtonCardConfig) => {
    const data: any = {
      show_name: true,
      show_icon: true,
      ...config,
      ...(typeof config.image === "string"
        ? { image: { media_content_id: config.image } }
        : {}),
    };

    if (data.icon_height?.includes("px")) {
      data.icon_height = String(parseFloat(data.icon_height));
    }

    return data;
  });

  private _valueChanged(ev: CustomEvent): void {
    const config = { ...ev.detail.value };

    if (config.icon_height && !config.icon_height.endsWith("px")) {
      config.icon_height += "px";
    }

    if (
      config.image &&
      typeof config.image === "object" &&
      !config.image.media_content_id
    ) {
      delete config.image;
    }

    fireEvent(this, "config-changed", { config });
  }

  private _computeHelperCallback = (
    schema: SchemaUnion<ReturnType<typeof this._schema>>
  ) => {
    switch (schema.name) {
      case "tap_action":
      case "hold_action":
        return this.hass!.localize(
          "ui.panel.lovelace.editor.card.button.default_action_help"
        );
      default:
        return undefined;
    }
  };

  private _computeLabelCallback = (
    schema: SchemaUnion<ReturnType<typeof this._schema>>
  ) => {
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
    "hui-button-card-editor": HuiButtonCardEditor;
  }
}
