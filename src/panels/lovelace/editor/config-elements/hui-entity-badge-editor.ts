import { mdiGestureTap, mdiPalette } from "@mdi/js";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import {
  array,
  assert,
  assign,
  object,
  optional,
  string,
  union,
} from "superstruct";
import { fireEvent } from "../../../../common/dom/fire_event";
import { LocalizeFunc } from "../../../../common/translations/localize";
import "../../../../components/ha-form/ha-form";
import type {
  HaFormSchema,
  SchemaUnion,
} from "../../../../components/ha-form/types";
import type { HomeAssistant } from "../../../../types";
import { EntityBadgeConfig } from "../../badges/types";
import type { LovelaceBadgeEditor } from "../../types";
import "../hui-sub-element-editor";
import { actionConfigStruct } from "../structs/action-struct";
import { baseLovelaceCardConfig } from "../structs/base-card-struct";
import { configElementStyle } from "./config-elements-style";
import "./hui-card-features-editor";

const badgeConfigStruct = assign(
  baseLovelaceCardConfig,
  object({
    entity: optional(string()),
    icon: optional(string()),
    state_content: optional(union([string(), array(string())])),
    color: optional(string()),
    tap_action: optional(actionConfigStruct),
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
    this._config = config;
  }

  private _schema = memoizeOne(
    (localize: LocalizeFunc) =>
      [
        { name: "entity", selector: { entity: {} } },
        {
          name: "",
          type: "expandable",
          iconPath: mdiPalette,
          title: localize(`ui.panel.lovelace.editor.badge.entity.appearance`),
          schema: [
            {
              name: "",
              type: "grid",
              schema: [
                {
                  name: "icon",
                  selector: {
                    icon: {},
                  },
                  context: { icon_entity: "entity" },
                },
                {
                  name: "color",
                  selector: {
                    ui_color: { default_color: true },
                  },
                },
              ],
            },

            {
              name: "state_content",
              selector: {
                ui_state_content: {},
              },
              context: {
                filter_entity: "entity",
              },
            },
          ],
        },
        {
          name: "",
          type: "expandable",
          title: localize(`ui.panel.lovelace.editor.badge.entity.actions`),
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
          ],
        },
      ] as const satisfies readonly HaFormSchema[]
  );

  protected render() {
    if (!this.hass || !this._config) {
      return nothing;
    }

    const schema = this._schema(this.hass!.localize);

    const data = this._config;

    return html`
      <ha-form
        .hass=${this.hass}
        .data=${data}
        .schema=${schema}
        .computeLabel=${this._computeLabelCallback}
        @value-changed=${this._valueChanged}
      ></ha-form>
    `;
  }

  private _valueChanged(ev: CustomEvent): void {
    ev.stopPropagation();
    if (!this._config || !this.hass) {
      return;
    }

    const newConfig = ev.detail.value as EntityBadgeConfig;

    const config: EntityBadgeConfig = {
      ...newConfig,
    };

    if (!config.state_content) {
      delete config.state_content;
    }

    fireEvent(this, "config-changed", { config });
  }

  private _computeLabelCallback = (
    schema: SchemaUnion<ReturnType<typeof this._schema>>
  ) => {
    switch (schema.name) {
      case "color":
      case "state_content":
        return this.hass!.localize(
          `ui.panel.lovelace.editor.badge.entity.${schema.name}`
        );
      default:
        return this.hass!.localize(
          `ui.panel.lovelace.editor.card.generic.${schema.name}`
        );
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
