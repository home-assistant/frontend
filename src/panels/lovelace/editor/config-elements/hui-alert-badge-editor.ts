import { mdiTextShort } from "@mdi/js";
import { html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import {
  array,
  assert,
  assign,
  boolean,
  object,
  optional,
  string,
  union,
} from "superstruct";
import { fireEvent } from "../../../../common/dom/fire_event";
import { ALERT_DOMAINS } from "../../../../common/entity/alert_active";
import "../../../../components/ha-form/ha-form";
import type {
  HaFormSchema,
  SchemaUnion,
} from "../../../../components/ha-form/types";
import { stateContentHasTimestamp } from "../../../../state-display/state-display";
import type { HomeAssistant, ValueChangedEvent } from "../../../../types";
import type { AlertBadgeConfig } from "../../badges/types";
import { timeFormatConfigStruct } from "../../components/types";
import type { LovelaceBadgeEditor } from "../../types";
import { actionConfigStruct } from "../structs/action-struct";
import { baseLovelaceBadgeConfig } from "../structs/base-badge-struct";
import { entityNameStruct } from "../structs/entity-name-struct";
import { alertSchema } from "./alert-schema";
import { badgeInteractionsSchema } from "./interactions-schema";

const badgeConfigStruct = assign(
  baseLovelaceBadgeConfig,
  object({
    entity: optional(string()),
    name: optional(entityNameStruct),
    icon: optional(string()),
    alert_color: optional(string()),
    clear_color: optional(string()),
    pulse: optional(boolean()),
    show_entity_picture: optional(boolean()),
    state_content: optional(union([string(), array(string())])),
    time_format: optional(timeFormatConfigStruct),
    tap_action: optional(actionConfigStruct),
    hold_action: optional(actionConfigStruct),
    double_tap_action: optional(actionConfigStruct),
  })
);

@customElement("hui-alert-badge-editor")
export class HuiAlertBadgeEditor
  extends LitElement
  implements LovelaceBadgeEditor
{
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: AlertBadgeConfig;

  public setConfig(config: AlertBadgeConfig): void {
    assert(config, badgeConfigStruct);
    this._config = config;
  }

  private _schema = memoizeOne(
    (showTimeFormat: boolean) =>
      [
        {
          name: "entity",
          required: true,
          selector: { entity: { filter: { domain: ALERT_DOMAINS } } },
        },
        alertSchema(),
        {
          name: "content",
          flatten: true,
          type: "expandable",
          iconPath: mdiTextShort,
          schema: [
            {
              name: "name",
              selector: { entity_name: {} },
              context: { entity: "entity" },
            },
            {
              name: "",
              type: "grid",
              schema: [
                {
                  name: "icon",
                  selector: { icon: {} },
                  context: { icon_entity: "entity" },
                },
                {
                  name: "show_entity_picture",
                  selector: { boolean: {} },
                },
              ],
            },
            {
              name: "state_content",
              selector: { ui_state_content: { allow_name: true } },
              context: { filter_entity: "entity" },
            },
            {
              name: "time_format",
              visible: showTimeFormat,
              selector: { ui_time_format: {} },
            },
          ],
        },
        badgeInteractionsSchema(),
      ] as const satisfies readonly HaFormSchema[]
  );

  protected render() {
    if (!this.hass || !this._config) {
      return nothing;
    }

    const entityId = this._config.entity;

    const schema = this._schema(
      stateContentHasTimestamp(
        entityId,
        this.hass.states[entityId],
        this._config.state_content
      )
    );

    return html`
      <ha-form
        .hass=${this.hass}
        .data=${this._config}
        .schema=${schema}
        .computeLabel=${this._computeLabelCallback}
        .computeHelper=${this._computeHelperCallback}
        @value-changed=${this._valueChanged}
      ></ha-form>
    `;
  }

  private _valueChanged(ev: ValueChangedEvent<AlertBadgeConfig>): void {
    ev.stopPropagation();

    const config = { ...ev.detail.value };

    if (!config.state_content) {
      delete config.state_content;
    }

    fireEvent(this, "config-changed", { config });
  }

  private _computeLabelCallback = (
    schema: SchemaUnion<ReturnType<typeof this._schema>>
  ) => {
    switch (schema.name) {
      case "pulse":
      case "alert_color":
      case "clear_color":
        return this.hass!.localize(
          `ui.panel.lovelace.editor.card.alert.${schema.name}`
        );
      case "alert":
        return this.hass!.localize(
          "ui.panel.lovelace.editor.card.alert.alert_section"
        );
      case "show_entity_picture":
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

  private _computeHelperCallback = (
    schema: SchemaUnion<ReturnType<typeof this._schema>>
  ) => {
    if (
      schema.name === "pulse" ||
      schema.name === "alert_color" ||
      schema.name === "clear_color"
    ) {
      return this.hass?.localize(
        `ui.panel.lovelace.editor.card.alert.${schema.name}_helper`
      );
    }

    return undefined;
  };
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-alert-badge-editor": HuiAlertBadgeEditor;
  }
}
