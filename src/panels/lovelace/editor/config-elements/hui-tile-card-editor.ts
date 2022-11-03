import { mdiGestureTap, mdiPalette } from "@mdi/js";
import { HassEntity } from "home-assistant-js-websocket";
import { css, html, LitElement, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import {
  any,
  array,
  assert,
  assign,
  boolean,
  object,
  optional,
  string,
} from "superstruct";
import { THEME_COLORS } from "../../../../common/color/compute-color";
import { fireEvent, HASSDomEvent } from "../../../../common/dom/fire_event";
import { computeDomain } from "../../../../common/entity/compute_domain";
import { domainIcon } from "../../../../common/entity/domain_icon";
import { capitalizeFirstLetter } from "../../../../common/string/capitalize-first-letter";
import "../../../../components/ha-form/ha-form";
import type { SchemaUnion } from "../../../../components/ha-form/types";
import type { HomeAssistant } from "../../../../types";
import type { TileCardConfig } from "../../cards/types";
import { LovelaceTileControlConfig } from "../../tile-control/types";
import type { LovelaceCardEditor } from "../../types";
import "../hui-sub-element-editor";
import { actionConfigStruct } from "../structs/action-struct";
import { baseLovelaceCardConfig } from "../structs/base-card-struct";
import { EditSubElementEvent, SubElementEditorConfig } from "../types";
import { configElementStyle } from "./config-elements-style";
import "./hui-tile-card-controls-editor";

const cardConfigStruct = assign(
  baseLovelaceCardConfig,
  object({
    entity: optional(string()),
    name: optional(string()),
    icon: optional(string()),
    color: optional(string()),
    show_entity_picture: optional(boolean()),
    tap_action: optional(actionConfigStruct),
    icon_tap_action: optional(actionConfigStruct),
    controls: optional(array(any())),
  })
);

@customElement("hui-tile-card-editor")
export class HuiTileCardEditor
  extends LitElement
  implements LovelaceCardEditor
{
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: TileCardConfig;

  @state() private _subElementEditorConfig?: SubElementEditorConfig;

  public setConfig(config: TileCardConfig): void {
    assert(config, cardConfigStruct);
    this._config = config;
  }

  private _schema = memoizeOne(
    (entity: string, icon?: string, stateObj?: HassEntity) =>
      [
        { name: "entity", selector: { entity: {} } },
        {
          name: "",
          type: "expandable",
          iconPath: mdiPalette,
          title: this.hass!.localize(
            `ui.panel.lovelace.editor.card.tile.appearance`
          ),
          schema: [
            {
              name: "",
              type: "grid",
              schema: [
                { name: "name", selector: { text: {} } },
                {
                  name: "icon",
                  selector: {
                    icon: {
                      placeholder: icon || stateObj?.attributes.icon,
                      fallbackPath:
                        !icon && !stateObj?.attributes.icon && stateObj
                          ? domainIcon(computeDomain(entity), stateObj)
                          : undefined,
                    },
                  },
                },
                {
                  name: "color",
                  selector: {
                    select: {
                      options: [
                        {
                          label: this.hass!.localize(
                            `ui.panel.lovelace.editor.card.tile.default_color`
                          ),
                          value: "default",
                        },
                        ...Array.from(THEME_COLORS).map((color) => ({
                          label: capitalizeFirstLetter(color),
                          value: color,
                        })),
                      ],
                    },
                  },
                },
                {
                  name: "show_entity_picture",
                  selector: {
                    boolean: {},
                  },
                },
              ] as const,
            },
          ] as const,
        },
        {
          name: "",
          type: "expandable",
          title: this.hass!.localize(
            `ui.panel.lovelace.editor.card.tile.actions`
          ),
          iconPath: mdiGestureTap,
          schema: [
            {
              name: "tap_action",
              selector: {
                "ui-action": {},
              },
            },
            {
              name: "icon_tap_action",
              selector: {
                "ui-action": {},
              },
            },
          ] as const,
        },
      ] as const
  );

  protected render(): TemplateResult {
    if (!this.hass || !this._config) {
      return html``;
    }

    const stateObj = this.hass.states[this._config.entity ?? ""] as
      | HassEntity
      | undefined;

    const schema = this._schema(
      this._config.entity,
      this._config.icon,
      stateObj
    );

    const data = {
      color: "default",
      ...this._config,
    };

    if (this._subElementEditorConfig) {
      return html`
        <hui-sub-element-editor
          .hass=${this.hass}
          .config=${this._subElementEditorConfig}
          @go-back=${this._goBack}
          @config-changed=${this.subElementChanged}
        >
        </hui-sub-element-editor>
      `;
    }

    return html`
      <ha-form
        .hass=${this.hass}
        .data=${data}
        .schema=${schema}
        .computeLabel=${this._computeLabelCallback}
        @value-changed=${this._valueChanged}
      ></ha-form>
      <hui-tile-card-controls-editor
        .hass=${this.hass}
        .stateObj=${stateObj}
        .controls=${this._config!.controls ?? []}
        @controls-changed=${this._controlsChanged}
        @edit-detail-element=${this._editDetailElement}
      ></hui-tile-card-controls-editor>
    `;
  }

  private _valueChanged(ev: CustomEvent): void {
    ev.stopPropagation();
    if (!this._config || !this.hass) {
      return;
    }

    const config: TileCardConfig = {
      controls: this._config.controls,
      ...ev.detail.value,
    };
    if (ev.detail.value.color === "default") {
      config.color = undefined;
    }
    fireEvent(this, "config-changed", { config });
  }

  private _controlsChanged(ev: CustomEvent) {
    ev.stopPropagation();
    if (!this._config || !this.hass) {
      return;
    }

    const controls = ev.detail.controls as LovelaceTileControlConfig[];
    const config: TileCardConfig = {
      ...this._config,
      controls,
    };

    if (controls.length === 0) {
      delete config.controls;
    }

    fireEvent(this, "config-changed", { config });
  }

  private subElementChanged(ev: CustomEvent): void {
    ev.stopPropagation();
    if (!this._config || !this.hass) {
      return;
    }

    const value = ev.detail.config;

    const newConfigControls = this._config.controls!.concat();
    if (!value) {
      newConfigControls.splice(this._subElementEditorConfig!.index!, 1);
      this._goBack();
    } else {
      newConfigControls[this._subElementEditorConfig!.index!] = value;
    }

    this._config = { ...this._config!, controls: newConfigControls };

    this._subElementEditorConfig = {
      ...this._subElementEditorConfig!,
      elementConfig: value,
    };

    fireEvent(this, "config-changed", { config: this._config });
  }

  private _editDetailElement(ev: HASSDomEvent<EditSubElementEvent>): void {
    this._subElementEditorConfig = ev.detail.subElementConfig;
  }

  private _goBack(): void {
    this._subElementEditorConfig = undefined;
  }

  private _computeLabelCallback = (
    schema: SchemaUnion<ReturnType<typeof this._schema>>
  ) => {
    switch (schema.name) {
      case "color":
      case "icon_tap_action":
      case "show_entity_picture":
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
    "hui-tile-card-editor": HuiTileCardEditor;
  }
}
