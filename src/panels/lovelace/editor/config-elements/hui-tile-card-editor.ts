import { mdiGestureTap, mdiPalette } from "@mdi/js";
import { HassEntity } from "home-assistant-js-websocket";
import { css, html, LitElement, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { assert, assign, boolean, object, optional, string } from "superstruct";
import { THEME_COLORS } from "../../../../common/color/compute-color";
import { fireEvent } from "../../../../common/dom/fire_event";
import { computeDomain } from "../../../../common/entity/compute_domain";
import { domainIcon } from "../../../../common/entity/domain_icon";
import { capitalizeFirstLetter } from "../../../../common/string/capitalize-first-letter";
import "../../../../components/ha-form/ha-form";
import type { SchemaUnion } from "../../../../components/ha-form/types";
import type { HomeAssistant } from "../../../../types";
import type { TileCardConfig } from "../../cards/types";
import type { LovelaceCardEditor } from "../../types";
import { actionConfigStruct } from "../structs/action-struct";
import { baseLovelaceCardConfig } from "../structs/base-card-struct";

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
  })
);

@customElement("hui-tile-card-editor")
export class HuiTileCardEditor
  extends LitElement
  implements LovelaceCardEditor
{
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: TileCardConfig;

  public setConfig(config: TileCardConfig): void {
    assert(config, cardConfigStruct);
    this._config = config;
  }

  private _schema = memoizeOne(
    (entity: string, icon?: string, entityState?: HassEntity) =>
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
                      placeholder: icon || entityState?.attributes.icon,
                      fallbackPath:
                        !icon && !entityState?.attributes.icon && entityState
                          ? domainIcon(computeDomain(entity), entityState)
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

    const entity = this.hass.states[this._config.entity ?? ""] as
      | HassEntity
      | undefined;

    const schema = this._schema(this._config.entity, this._config.icon, entity);

    const data = {
      color: "default",
      ...this._config,
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
    const config = {
      ...ev.detail.value,
    };
    if (ev.detail.value.color === "default") {
      config.color = undefined;
    }
    fireEvent(this, "config-changed", { config });
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
    return css`
      .container {
        display: flex;
        flex-direction: column;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-tile-card-editor": HuiTileCardEditor;
  }
}
