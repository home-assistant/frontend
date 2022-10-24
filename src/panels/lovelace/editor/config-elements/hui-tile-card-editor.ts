import { mdiGestureTap, mdiPalette } from "@mdi/js";
import { HassEntity } from "home-assistant-js-websocket";
import { css, html, LitElement, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { assert, assign, object, optional, string } from "superstruct";
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

  private _mainSchema = [{ name: "entity", selector: { entity: {} } }] as const;

  private _appareanceSchema = memoizeOne(
    (entity: string, icon?: string, entityState?: HassEntity) =>
      [
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
                  label: "Default (based on state)",
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
      ] as const
  );

  private _actionsSchema = [
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
  ] as const;

  protected render(): TemplateResult {
    if (!this.hass || !this._config) {
      return html``;
    }

    const entity = this.hass.states[this._config.entity ?? ""];

    const mainSchema = this._mainSchema;
    const appareanceSchema = this._appareanceSchema(
      this._config.entity,
      this._config.icon,
      entity
    );
    const actionsSchema = this._actionsSchema;

    const data = {
      color: "default",
      ...this._config,
    };

    return html`
      <div class="container">
        <div class="group">
          <ha-form
            .hass=${this.hass}
            .data=${data}
            .schema=${mainSchema}
            .computeLabel=${this._computeLabelCallback}
            @value-changed=${this._valueChanged}
          ></ha-form>
        </div>
        <div class="group">
          <ha-expansion-panel header="Appearence">
            <div slot="header">
              <ha-svg-icon .path=${mdiPalette}></ha-svg-icon>
              Appearence
            </div>
            <div class="content">
              <ha-form
                .hass=${this.hass}
                .data=${data}
                .schema=${appareanceSchema}
                .computeLabel=${this._computeLabelCallback}
                @value-changed=${this._valueChanged}
              ></ha-form>
            </div>
          </ha-expansion-panel>
        </div>
        <div class="group">
          <ha-expansion-panel>
            <div slot="header">
              <ha-svg-icon .path=${mdiGestureTap}></ha-svg-icon>
              Actions
            </div>
            <div class="content">
              <ha-form
                .hass=${this.hass}
                .data=${data}
                .schema=${actionsSchema}
                .computeLabel=${this._computeLabelCallback}
                @value-changed=${this._valueChanged}
              ></ha-form>
            </div>
          </ha-expansion-panel>
        </div>
      </div>
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
    schema:
      | SchemaUnion<typeof this._mainSchema>
      | SchemaUnion<ReturnType<typeof this._appareanceSchema>>
      | SchemaUnion<typeof this._actionsSchema>
  ) => {
    switch (schema.name) {
      case "color":
      case "icon_tap_action":
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
      .group:not(:last-child) {
        margin-bottom: 12px;
      }
      .content {
        padding: 8px;
      }
      ha-expansion-panel {
        --expansion-panel-summary-padding: 0 8px 0 8px;
        --expansion-panel-content-padding: 0;
        border: 1px solid var(--divider-color);
        border-radius: 6px;
      }
      ha-svg-icon {
        color: var(--secondary-text-color);
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-tile-card-editor": HuiTileCardEditor;
  }
}
