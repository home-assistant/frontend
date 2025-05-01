import { mdiGestureTap, mdiTextShort } from "@mdi/js";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import {
  array,
  assert,
  assign,
  boolean,
  enums,
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
import {
  DEFAULT_CONFIG,
  DISPLAY_TYPES,
  migrateLegacyEntityBadgeConfig,
} from "../../badges/hui-entity-badge";
import type { EntityBadgeConfig } from "../../badges/types";
import type { LovelaceBadgeEditor } from "../../types";
import "../hui-sub-element-editor";
import { actionConfigStruct } from "../structs/action-struct";
import { baseLovelaceBadgeConfig } from "../structs/base-badge-struct";
import { configElementStyle } from "./config-elements-style";
import "./hui-card-features-editor";

const badgeConfigStruct = assign(
  baseLovelaceBadgeConfig,
  object({
    entity: optional(string()),
    display_type: optional(enums(DISPLAY_TYPES)),
    name: optional(string()),
    icon: optional(string()),
    state_content: optional(union([string(), array(string())])),
    color: optional(string()),
    show_name: optional(boolean()),
    show_state: optional(boolean()),
    show_icon: optional(boolean()),
    show_entity_picture: optional(boolean()),
    tap_action: optional(actionConfigStruct),
    hold_action: optional(actionConfigStruct),
    double_tap_action: optional(actionConfigStruct),
    image: optional(string()), // For old badge config support
  })
);

@customElement("hui-entity-badge-editor")
export class HuiEntityBadgeEditor
  extends LitElement
  implements LovelaceBadgeEditor
{
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: EntityBadgeConfig;

  public setConfig(config: EntityBadgeConfig): void {
    assert(config, badgeConfigStruct);
    this._config = {
      ...DEFAULT_CONFIG,
      ...migrateLegacyEntityBadgeConfig(config),
    };
  }

  private _schema = memoizeOne(
    (localize: LocalizeFunc) =>
      [
        { name: "entity", selector: { entity: {} } },
        {
          name: "content",
          type: "expandable",
          flatten: true,
          iconPath: mdiTextShort,
          schema: [
            {
              name: "",
              type: "grid",
              schema: [
                {
                  name: "name",
                  selector: {
                    text: {},
                  },
                },
                {
                  name: "color",
                  selector: {
                    ui_color: {
                      default_color: "state",
                      include_state: true,
                    },
                  },
                },
                {
                  name: "icon",
                  selector: {
                    icon: {},
                  },
                  context: { icon_entity: "entity" },
                },
                {
                  name: "show_entity_picture",
                  selector: {
                    boolean: {},
                  },
                },
              ],
            },
            {
              name: "displayed_elements",
              selector: {
                select: {
                  mode: "list",
                  multiple: true,
                  options: [
                    {
                      value: "name",
                      label: localize(
                        `ui.panel.lovelace.editor.badge.entity.displayed_elements_options.name`
                      ),
                    },
                    {
                      value: "state",
                      label: localize(
                        `ui.panel.lovelace.editor.badge.entity.displayed_elements_options.state`
                      ),
                    },
                    {
                      value: "icon",
                      label: localize(
                        `ui.panel.lovelace.editor.badge.entity.displayed_elements_options.icon`
                      ),
                    },
                  ],
                },
              },
            },
            {
              name: "state_content",
              selector: {
                ui_state_content: {
                  allow_name: true,
                },
              },
              context: {
                filter_entity: "entity",
              },
            },
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
      ] as const satisfies readonly HaFormSchema[]
  );

  _displayedElements = memoizeOne((config: EntityBadgeConfig) => {
    const elements: string[] = [];
    if (config.show_name) {
      elements.push("name");
    }
    if (config.show_state) {
      elements.push("state");
    }
    if (config.show_icon) {
      elements.push("icon");
    }
    return elements;
  });

  protected render() {
    if (!this.hass || !this._config) {
      return nothing;
    }

    const schema = this._schema(this.hass!.localize);

    const data = {
      ...this._config,
      displayed_elements: this._displayedElements(this._config),
    };

    return html`
      <ha-form
        .hass=${this.hass}
        .data=${data}
        .schema=${schema}
        .computeLabel=${this._computeLabelCallback}
        .computeHelper=${this._computeHelperCallback}
        @value-changed=${this._valueChanged}
      ></ha-form>
    `;
  }

  private _valueChanged(ev: CustomEvent): void {
    ev.stopPropagation();
    if (!this._config || !this.hass) {
      return;
    }

    const config = { ...ev.detail.value } as EntityBadgeConfig;

    if (!config.state_content) {
      delete config.state_content;
    }

    if (config.displayed_elements) {
      config.show_name = config.displayed_elements.includes("name");
      config.show_state = config.displayed_elements.includes("state");
      config.show_icon = config.displayed_elements.includes("icon");
      delete config.displayed_elements;
    }

    fireEvent(this, "config-changed", { config });
  }

  private _computeLabelCallback = (
    schema: SchemaUnion<ReturnType<typeof this._schema>>
  ) => {
    switch (schema.name) {
      case "color":
      case "state_content":
      case "show_entity_picture":
      case "displayed_elements":
        return this.hass!.localize(
          `ui.panel.lovelace.editor.badge.entity.${schema.name}`
        );
      default:
        return this.hass!.localize(
          `ui.panel.lovelace.editor.card.generic.${schema.name}`
        );
    }
  };

  private _computeHelperCallback = (
    schema: SchemaUnion<ReturnType<typeof this._schema>>
  ) => {
    switch (schema.name) {
      case "color":
        return this.hass!.localize(
          `ui.panel.lovelace.editor.badge.entity.${schema.name}_helper`
        );
      default:
        return undefined;
    }
  };

  static get styles() {
    return [
      configElementStyle,
      css`
        .container {
          display: flex;
          flex-direction: column;
        }
        ha-form {
          display: block;
          margin-bottom: 24px;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-entity-badge-editor": HuiEntityBadgeEditor;
  }
}
