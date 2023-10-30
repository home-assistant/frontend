import { html, LitElement, nothing, css } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { HassEntity } from "home-assistant-js-websocket";
import { mdiGestureTap, mdiPalette } from "@mdi/js";
import { fireEvent } from "../../../../common/dom/fire_event";
import "../../../../components/ha-form/ha-form";
import type {
  HaFormSchema,
  SchemaUnion,
} from "../../../../components/ha-form/types";
import type { HomeAssistant } from "../../../../types";
import {
  EntityTileFeatureConfig,
  LovelaceTileFeatureContext,
} from "../../tile-features/types";
import type { LovelaceTileFeatureEditor } from "../../types";
import { LocalizeFunc } from "../../../../common/translations/localize";
import { formatEntityAttributeNameFunc } from "../../../../common/translations/entity-state";
import { HIDDEN_ATTRIBUTES } from "./hui-tile-card-editor";
import { ensureArray } from "../../../../common/array/ensure-array";
import { configElementStyle } from "./config-elements-style";

@customElement("hui-entity-tile-feature-editor")
export class HuiEntityTileFeatureEditor
  extends LitElement
  implements LovelaceTileFeatureEditor
{
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ attribute: false }) public context?: LovelaceTileFeatureContext;

  @state() private _config?: EntityTileFeatureConfig;

  public setConfig(config: EntityTileFeatureConfig): void {
    this._config = config;
  }

  private _schema = memoizeOne(
    (
      localize: LocalizeFunc,
      formatEntityAttributeName: formatEntityAttributeNameFunc,
      stateObj: HassEntity | undefined,
      hideState: boolean
    ) =>
      [
        {
          name: "entity",
          selector: {
            entity: {},
          },
        },
        {
          name: "",
          type: "expandable",
          iconPath: mdiPalette,
          title: localize(`ui.panel.lovelace.editor.card.tile.appearance`),
          schema: [
            {
              name: "",
              type: "grid",
              schema: [
                { name: "name", selector: { text: {} } },
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
                    ui_color: {},
                  },
                },
                {
                  name: "show_entity_picture",
                  selector: {
                    boolean: {},
                  },
                },
                {
                  name: "hide_state",
                  selector: {
                    boolean: {},
                  },
                },
              ],
            },
            ...(!hideState
              ? ([
                  {
                    name: "state_content",
                    selector: {
                      select: {
                        mode: "dropdown",
                        reorder: true,
                        custom_value: true,
                        multiple: true,
                        options: [
                          {
                            label: localize(
                              `ui.panel.lovelace.editor.card.tile.state_content_options.state`
                            ),
                            value: "state",
                          },
                          {
                            label: localize(
                              `ui.panel.lovelace.editor.card.tile.state_content_options.last-changed`
                            ),
                            value: "last-changed",
                          },
                          ...Object.keys(stateObj?.attributes ?? {})
                            .filter((a) => !HIDDEN_ATTRIBUTES.includes(a))
                            .map((attribute) => ({
                              value: attribute,
                              label: formatEntityAttributeName(
                                stateObj!,
                                attribute
                              ),
                            })),
                        ],
                      },
                    },
                  },
                ] as const satisfies readonly HaFormSchema[])
              : []),
          ],
        },
        {
          name: "",
          type: "expandable",
          title: localize(`ui.panel.lovelace.editor.card.tile.actions`),
          iconPath: mdiGestureTap,
          schema: [
            {
              name: "icon_tap_action",
              selector: {
                ui_action: {},
              },
            },
          ],
        },
      ] as const
  );

  protected render() {
    if (!this.hass || !this._config) {
      return nothing;
    }

    const stateObj = this.hass.states[this._config.entity ?? ""] as
      | HassEntity
      | undefined;

    const schema = this._schema(
      this.hass!.localize,
      this.hass.formatEntityAttributeName,
      stateObj,
      this._config.hide_state ?? false
    );

    const data = {
      ...this._config,
      state_content: ensureArray(this._config.state_content),
    };

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

    const config = ev.detail.value as EntityTileFeatureConfig;

    if (config.hide_state) {
      delete config.state_content;
    }

    if (config.state_content) {
      if (config.state_content.length === 0) {
        delete config.state_content;
      } else if (config.state_content.length === 1) {
        config.state_content = config.state_content[0];
      }
    }

    fireEvent(this, "config-changed", { config: ev.detail.value });
  }

  private _computeLabelCallback = (
    schema: SchemaUnion<ReturnType<typeof this._schema>>
  ) => {
    switch (schema.name) {
      case "entity":
      case "color":
      case "icon_tap_action":
      case "show_entity_picture":
      case "hide_state":
      case "state_content":
        return this.hass!.localize(
          `ui.panel.lovelace.editor.card.tile.${schema.name}`
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
    "hui-entity-tile-feature-editor": HuiEntityTileFeatureEditor;
  }
}
