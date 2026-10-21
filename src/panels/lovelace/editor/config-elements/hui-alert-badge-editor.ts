import { html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { assert, assign, boolean, object, optional, string } from "superstruct";
import { fireEvent } from "../../../../common/dom/fire_event";
import { ALERT_DOMAINS } from "../../../../common/entity/alert_active";
import type { LocalizeFunc } from "../../../../common/translations/localize";
import "../../../../components/ha-form/ha-form";
import type {
  HaFormSchema,
  SchemaUnion,
} from "../../../../components/ha-form/types";
import type { HomeAssistant, ValueChangedEvent } from "../../../../types";
import type { AlertBadgeConfig } from "../../badges/types";
import { ALERT_BADGE_DEFAULT_CONFIG } from "../../badges/hui-alert-badge";
import type { LovelaceBadgeEditor } from "../../types";
import { actionConfigStruct } from "../structs/action-struct";
import { baseLovelaceBadgeConfig } from "../structs/base-badge-struct";
import { entityNameStruct } from "../structs/entity-name-struct";
import { alertBadgeContentSchema, alertSchema } from "./alert-schema";
import {
  badgeContentConfigFromForm,
  badgeContentFormData,
} from "./content-schema";
import { entityInteractionsSchema } from "./interactions-schema";

const badgeConfigStruct = assign(
  baseLovelaceBadgeConfig,
  object({
    entity: optional(string()),
    name: optional(entityNameStruct),
    icon: optional(string()),
    alert_color: optional(string()),
    clear_color: optional(string()),
    pulse: optional(boolean()),
    show_name: optional(boolean()),
    show_state: optional(boolean()),
    show_icon: optional(boolean()),
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
    this._config = { ...ALERT_BADGE_DEFAULT_CONFIG, ...config };
  }

  private _schema = memoizeOne(
    (localize: LocalizeFunc) =>
      [
        {
          name: "entity",
          required: true,
          selector: { entity: { filter: { domain: ALERT_DOMAINS } } },
        },
        alertSchema(),
        alertBadgeContentSchema(localize),
        entityInteractionsSchema(),
      ] as const satisfies readonly HaFormSchema[]
  );

  private _formData = memoizeOne(badgeContentFormData<AlertBadgeConfig>);

  protected render() {
    if (!this.hass || !this._config) {
      return nothing;
    }

    return html`
      <ha-form
        .hass=${this.hass}
        .data=${this._formData(this._config)}
        .schema=${this._schema(this.hass.localize)}
        .computeLabel=${this._computeLabelCallback}
        .computeHelper=${this._computeHelperCallback}
        @value-changed=${this._valueChanged}
      ></ha-form>
    `;
  }

  private _valueChanged(ev: ValueChangedEvent<AlertBadgeConfig>): void {
    ev.stopPropagation();

    const config = badgeContentConfigFromForm(ev.detail.value);

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
