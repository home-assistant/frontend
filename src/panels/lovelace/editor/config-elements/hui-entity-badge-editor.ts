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
import type { HomeAssistant, ValueChangedEvent } from "../../../../types";
import {
  DEFAULT_CONFIG,
  DISPLAY_TYPES,
  migrateLegacyEntityBadgeConfig,
} from "../../badges/hui-entity-badge";
import type { EntityBadgeConfig } from "../../badges/types";
import type { LovelaceBadgeEditor } from "../../types";
import { actionConfigStruct } from "../structs/action-struct";
import { baseLovelaceBadgeConfig } from "../structs/base-badge-struct";
import { entityNameStruct } from "../structs/entity-name-struct";
import { configElementStyle } from "./config-elements-style";
import {
  badgeContentConfigFromForm,
  badgeContentFormData,
  badgeContentSchema,
} from "./content-schema";
import { entityInteractionsSchema } from "./interactions-schema";
import { stateContentHasTimestamp } from "../../../../state-display/state-display";
import { timeFormatConfigStruct } from "../../components/types";

const badgeConfigStruct = assign(
  baseLovelaceBadgeConfig,
  object({
    entity: optional(string()),
    display_type: optional(enums(DISPLAY_TYPES)),
    name: optional(entityNameStruct),
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
    time_format: optional(timeFormatConfigStruct),
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
    (localize: LocalizeFunc, showTimeFormat: boolean) =>
      [
        { name: "entity", selector: { entity: {} } },
        badgeContentSchema(localize, showTimeFormat),
        entityInteractionsSchema(),
      ] as const satisfies readonly HaFormSchema[]
  );

  private _formData = memoizeOne(badgeContentFormData<EntityBadgeConfig>);

  protected render() {
    if (!this.hass || !this._config) {
      return nothing;
    }

    const entityId = this._config!.entity;

    const showTimeFormat =
      !!entityId &&
      stateContentHasTimestamp(
        entityId,
        this.hass.states[entityId],
        this._config.state_content
      );

    const schema = this._schema(this.hass!.localize, showTimeFormat);

    const data = this._formData(this._config);

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

  private _valueChanged(ev: ValueChangedEvent<EntityBadgeConfig>): void {
    ev.stopPropagation();
    if (!this._config || !this.hass) {
      return;
    }

    const config = badgeContentConfigFromForm(ev.detail.value);

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
