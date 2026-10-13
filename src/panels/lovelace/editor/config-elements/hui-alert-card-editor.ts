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
import type { LocalizeFunc } from "../../../../common/translations/localize";
import "../../../../components/ha-form/ha-form";
import type {
  HaFormSchema,
  SchemaUnion,
} from "../../../../components/ha-form/types";
import { stateContentHasTimestamp } from "../../../../state-display/state-display";
import type { HomeAssistant, ValueChangedEvent } from "../../../../types";
import type { AlertCardConfig } from "../../cards/types";
import { timeFormatConfigStruct } from "../../components/types";
import type { LovelaceCardEditor } from "../../types";
import { actionConfigStruct } from "../structs/action-struct";
import { baseLovelaceCardConfig } from "../structs/base-card-struct";
import { entityNameStruct } from "../structs/entity-name-struct";
import { alertSchema } from "./alert-schema";
import {
  tileContentConfigFromForm,
  tileContentFormData,
  tileContentSchema,
} from "./content-schema";
import { tileInteractionsSchema } from "./interactions-schema";

const cardConfigStruct = assign(
  baseLovelaceCardConfig,
  object({
    entity: optional(string()),
    name: optional(entityNameStruct),
    icon: optional(string()),
    alert_color: optional(string()),
    clear_color: optional(string()),
    pulse: optional(boolean()),
    show_entity_picture: optional(boolean()),
    hide_state: optional(boolean()),
    state_content: optional(union([string(), array(string())])),
    time_format: optional(timeFormatConfigStruct),
    vertical: optional(boolean()),
    tap_action: optional(actionConfigStruct),
    hold_action: optional(actionConfigStruct),
    double_tap_action: optional(actionConfigStruct),
    icon_tap_action: optional(actionConfigStruct),
    icon_hold_action: optional(actionConfigStruct),
    icon_double_tap_action: optional(actionConfigStruct),
  })
);

@customElement("hui-alert-card-editor")
export class HuiAlertCardEditor
  extends LitElement
  implements LovelaceCardEditor
{
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: AlertCardConfig;

  public setConfig(config: AlertCardConfig): void {
    assert(config, cardConfigStruct);
    this._config = config;
  }

  private _schema = memoizeOne(
    (
      localize: LocalizeFunc,
      entityId: string | undefined,
      showTimeFormat: boolean
    ) =>
      [
        {
          name: "entity",
          required: true,
          selector: { entity: { filter: { domain: ALERT_DOMAINS } } },
        },
        alertSchema(),
        tileContentSchema(localize, showTimeFormat, false),
        tileInteractionsSchema(entityId),
      ] as const satisfies readonly HaFormSchema[]
  );

  protected render() {
    if (!this.hass || !this._config) {
      return nothing;
    }

    const entityId = this._config.entity;

    const schema = this._schema(
      this.hass.localize,
      entityId,
      !this._config.hide_state &&
        Boolean(this._config.state_content) &&
        stateContentHasTimestamp(
          entityId,
          this.hass.states[entityId],
          this._config.state_content
        )
    );

    return html`
      <ha-form
        .hass=${this.hass}
        .data=${tileContentFormData(this._config)}
        .schema=${schema}
        .computeLabel=${this._computeLabelCallback}
        .computeHelper=${this._computeHelperCallback}
        @value-changed=${this._valueChanged}
      ></ha-form>
    `;
  }

  private _valueChanged(ev: ValueChangedEvent<AlertCardConfig>): void {
    ev.stopPropagation();

    const config = tileContentConfigFromForm(ev.detail.value);

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
      case "icon_tap_action":
      case "icon_hold_action":
      case "icon_double_tap_action":
      case "show_entity_picture":
      case "hide_state":
      case "state_content":
      case "content_layout":
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
    "hui-alert-card-editor": HuiAlertCardEditor;
  }
}
