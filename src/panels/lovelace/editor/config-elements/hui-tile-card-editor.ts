import { mdiGestureTap, mdiListBox, mdiPalette } from "@mdi/js";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import {
  any,
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
import type { HASSDomEvent } from "../../../../common/dom/fire_event";
import { fireEvent } from "../../../../common/dom/fire_event";
import type { LocalizeFunc } from "../../../../common/translations/localize";
import "../../../../components/ha-expansion-panel";
import "../../../../components/ha-form/ha-form";
import type {
  HaFormSchema,
  SchemaUnion,
} from "../../../../components/ha-form/types";
import "../../../../components/ha-svg-icon";
import type { HomeAssistant } from "../../../../types";
import type {
  LovelaceCardFeatureConfig,
  LovelaceCardFeatureContext,
} from "../../card-features/types";
import { getEntityDefaultTileIconAction } from "../../cards/hui-tile-card";
import type { TileCardConfig } from "../../cards/types";
import type { LovelaceCardEditor } from "../../types";
import { actionConfigStruct } from "../structs/action-struct";
import { baseLovelaceCardConfig } from "../structs/base-card-struct";
import type { EditDetailElementEvent, EditSubElementEvent } from "../types";
import { configElementStyle } from "./config-elements-style";
import "./hui-card-features-editor";

const cardConfigStruct = assign(
  baseLovelaceCardConfig,
  object({
    entity: optional(string()),
    name: optional(string()),
    icon: optional(string()),
    hide_state: optional(boolean()),
    state_content: optional(union([string(), array(string())])),
    color: optional(string()),
    show_entity_picture: optional(boolean()),
    vertical: optional(boolean()),
    tap_action: optional(actionConfigStruct),
    hold_action: optional(actionConfigStruct),
    double_tap_action: optional(actionConfigStruct),
    icon_tap_action: optional(actionConfigStruct),
    icon_hold_action: optional(actionConfigStruct),
    icon_double_tap_action: optional(actionConfigStruct),
    features: optional(array(any())),
    features_position: optional(enums(["bottom", "inline"])),
  })
);

const ADVANCED_ACTIONS = [
  "hold_action",
  "icon_hold_action",
  "double_tap_action",
  "icon_double_tap_action",
] as const;

type AdvancedActions = (typeof ADVANCED_ACTIONS)[number];

@customElement("hui-tile-card-editor")
export class HuiTileCardEditor
  extends LitElement
  implements LovelaceCardEditor
{
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: TileCardConfig;

  @state() private _displayActions?: AdvancedActions[];

  public setConfig(config: TileCardConfig): void {
    assert(config, cardConfigStruct);
    this._config = config;

    if (this._displayActions) return;
    this._setDisplayActions(config);
  }

  private _setDisplayActions(config: TileCardConfig) {
    this._displayActions = ADVANCED_ACTIONS.filter(
      (action) => action in config
    );
  }

  private _resetConfiguredActions() {
    this._displayActions = undefined;
  }

  connectedCallback(): void {
    super.connectedCallback();
    if (this._config) {
      this._setDisplayActions(this._config);
    }
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this._resetConfiguredActions();
  }

  private _featuresSchema = memoizeOne(
    (localize: LocalizeFunc) =>
      [
        {
          name: "features_position",
          required: true,
          selector: {
            select: {
              mode: "dropdown",
              options: ["bottom", "inline"].map((value) => ({
                label: localize(
                  `ui.panel.lovelace.editor.card.tile.features_position_options.${value}`
                ),
                value,
              })),
            },
          },
        },
      ] as const satisfies readonly HaFormSchema[]
  );

  private _schema = memoizeOne(
    (
      entityId: string | undefined,
      hideState: boolean,
      displayActions: AdvancedActions[] = []
    ) =>
      [
        { name: "entity", selector: { entity: {} } },
        {
          name: "appearance",
          flatten: true,
          type: "expandable",
          iconPath: mdiPalette,
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
                    ui_color: {
                      default_color: "state",
                      include_state: true,
                    },
                  },
                },
                {
                  name: "show_entity_picture",
                  selector: {
                    boolean: {},
                  },
                },
                {
                  name: "vertical",
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
                      ui_state_content: {},
                    },
                    context: {
                      filter_entity: "entity",
                    },
                  },
                ] as const satisfies readonly HaFormSchema[])
              : []),
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
              name: "icon_tap_action",
              selector: {
                ui_action: {
                  default_action: entityId
                    ? getEntityDefaultTileIconAction(entityId)
                    : "more-info",
                },
              },
            },
            ...displayActions.map((action) => ({
              name: action,
              selector: {
                ui_action: {
                  default_action: "none" as const,
                },
              },
            })),
          ],
        },
      ] as const satisfies readonly HaFormSchema[]
  );

  protected render() {
    if (!this.hass || !this._config) {
      return nothing;
    }

    const entityId = this._config!.entity;
    const stateObj = entityId ? this.hass!.states[entityId] : undefined;

    const schema = this._schema(
      entityId,
      this._config.hide_state ?? false,
      this._displayActions
    );

    const featureSchema = this._featuresSchema(this.hass.localize);

    const data = { ...this._config };

    if (!data.features_position) {
      data.features_position = "bottom";
    }

    return html`
      <ha-form
        .hass=${this.hass}
        .data=${data}
        .schema=${schema}
        .computeLabel=${this._computeLabelCallback}
        .computeHelper=${this._computeHelperCallback}
        @value-changed=${this._valueChanged}
      ></ha-form>
      <ha-expansion-panel outlined>
        <h3 slot="header">
          <ha-svg-icon .path=${mdiListBox}></ha-svg-icon>
          ${this.hass!.localize(
            "ui.panel.lovelace.editor.card.generic.features"
          )}
        </h3>
        <div class="content">
          <ha-form
            class="features-form"
            .hass=${this.hass}
            .data=${data}
            .schema=${featureSchema}
            .computeLabel=${this._computeLabelCallback}
            .computeHelper=${this._computeHelperCallback}
            @value-changed=${this._valueChanged}
          >
          </ha-form>
          ${this._config.vertical
            ? html`
                <p class="info">
                  ${this.hass!.localize(
                    "ui.panel.lovelace.editor.card.tile.features_position_vertical_info"
                  )}
                </p>
              `
            : this._config.features_position === "inline"
              ? html`
                  <p class="info">
                    ${this.hass!.localize(
                      "ui.panel.lovelace.editor.card.tile.features_position_inline_limitation_info"
                    )}
                  </p>
                `
              : nothing}
          <hui-card-features-editor
            .hass=${this.hass}
            .stateObj=${stateObj}
            .features=${this._config!.features ?? []}
            @features-changed=${this._featuresChanged}
            @edit-detail-element=${this._editDetailElement}
          ></hui-card-features-editor>
        </div>
      </ha-expansion-panel>
    `;
  }

  private _valueChanged(ev: CustomEvent): void {
    ev.stopPropagation();
    if (!this._config || !this.hass) {
      return;
    }

    const newConfig = ev.detail.value as TileCardConfig;

    const config: TileCardConfig = {
      features: this._config.features,
      ...newConfig,
    };

    if (config.hide_state) {
      delete config.state_content;
    }

    if (!config.state_content) {
      delete config.state_content;
    }

    fireEvent(this, "config-changed", { config });
  }

  private _featuresChanged(ev: CustomEvent) {
    ev.stopPropagation();
    if (!this._config || !this.hass) {
      return;
    }

    const features = ev.detail.features as LovelaceCardFeatureConfig[];
    const config: TileCardConfig = {
      ...this._config,
      features,
    };

    if (features.length === 0) {
      delete config.features;
    }

    fireEvent(this, "config-changed", { config });
  }

  private _editDetailElement(ev: HASSDomEvent<EditDetailElementEvent>): void {
    const index = ev.detail.subElementConfig.index;
    const config = this._config!.features![index!];

    fireEvent(this, "edit-sub-element", {
      config: config,
      saveConfig: (newConfig) => this._updateFeature(index!, newConfig),
      context: {
        entity_id: this._config!.entity,
      },
      type: "feature",
    } as EditSubElementEvent<
      LovelaceCardFeatureConfig,
      LovelaceCardFeatureContext
    >);
  }

  private _updateFeature(index: number, feature: LovelaceCardFeatureConfig) {
    const features = this._config!.features!.concat();
    features[index] = feature;
    const config = { ...this._config!, features };
    fireEvent(this, "config-changed", {
      config: config,
    });
  }

  private _computeLabelCallback = (
    schema:
      | SchemaUnion<ReturnType<typeof this._schema>>
      | SchemaUnion<ReturnType<typeof this._featuresSchema>>
  ) => {
    switch (schema.name) {
      case "color":
      case "icon_tap_action":
      case "icon_hold_action":
      case "icon_double_tap_action":
      case "show_entity_picture":
      case "vertical":
      case "hide_state":
      case "state_content":
      case "appearance":
      case "interactions":
      case "features_position":
        return this.hass!.localize(
          `ui.panel.lovelace.editor.card.tile.${schema.name}`
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
          `ui.panel.lovelace.editor.card.tile.${schema.name}_helper`
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
        .info {
          color: var(--secondary-text-color);
          margin-top: 0;
          margin-bottom: 8px;
        }
        .features-form {
          margin-bottom: 8px;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-tile-card-editor": HuiTileCardEditor;
  }
}
