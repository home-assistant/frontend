import { mdiEye, mdiGestureTap } from "@mdi/js";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import {
  any,
  array,
  assert,
  object,
  optional,
  string,
  union,
} from "superstruct";
import { fireEvent } from "../../../../common/dom/fire_event";
import "../../../../components/ha-expansion-panel";
import "../../../../components/ha-form/ha-form";
import type {
  HaFormSchema,
  SchemaUnion,
} from "../../../../components/ha-form/types";
import type { HomeAssistant } from "../../../../types";
import type { HeadingEntityConfig } from "../../cards/types";
import { Condition } from "../../common/validate-condition";
import type { LovelaceGenericElementEditor } from "../../types";
import "../conditions/ha-card-conditions-editor";
import { configElementStyle } from "../config-elements/config-elements-style";
import { actionConfigStruct } from "../structs/action-struct";

const entityConfigStruct = object({
  entity: string(),
  content: optional(union([string(), array(string())])),
  icon: optional(string()),
  tap_action: optional(actionConfigStruct),
  visibility: optional(array(any())),
});

@customElement("hui-heading-entity-editor")
export class HuiHeadingEntityEditor
  extends LitElement
  implements LovelaceGenericElementEditor
{
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ type: Boolean }) public preview = false;

  @state() private _config?: HeadingEntityConfig;

  public setConfig(config: HeadingEntityConfig): void {
    assert(config, entityConfigStruct);
    this._config = config;
  }

  private _schema = memoizeOne(
    () =>
      [
        {
          name: "entity",
          selector: { entity: {} },
        },
        {
          name: "icon",
          selector: { icon: {} },
          context: { icon_entity: "entity" },
        },
        {
          name: "content",
          selector: { ui_state_content: {} },
          context: { filter_entity: "entity" },
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
                  default_action: "none",
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

    const schema = this._schema();

    const conditions = this._config.visibility ?? [];
    return html`
      <ha-form
        .hass=${this.hass}
        .data=${this._config}
        .schema=${schema}
        .computeLabel=${this._computeLabelCallback}
        @value-changed=${this._valueChanged}
      ></ha-form>
      <ha-expansion-panel outlined>
        <h3 slot="header">
          <ha-svg-icon .path=${mdiEye}></ha-svg-icon>
          ${this.hass!.localize(
            "ui.panel.lovelace.editor.card.heading.entity_config.visibility"
          )}
        </h3>
        <div class="content">
          <p class="intro">
            ${this.hass.localize(
              "ui.panel.lovelace.editor.card.heading.entity_config.visibility_explanation"
            )}
          </p>
          <ha-card-conditions-editor
            .hass=${this.hass}
            .conditions=${conditions}
            @value-changed=${this._conditionChanged}
          >
          </ha-card-conditions-editor>
        </div>
      </ha-expansion-panel>
    `;
  }

  private _valueChanged(ev: CustomEvent): void {
    ev.stopPropagation();
    if (!this._config || !this.hass) {
      return;
    }

    const config = ev.detail.value as HeadingEntityConfig;

    fireEvent(this, "config-changed", { config });
  }

  private _conditionChanged(ev: CustomEvent): void {
    ev.stopPropagation();
    if (!this._config || !this.hass) {
      return;
    }

    const conditions = ev.detail.value as Condition[];

    const newConfig: HeadingEntityConfig = {
      ...this._config,
      visibility: conditions,
    };
    if (newConfig.visibility?.length === 0) {
      delete newConfig.visibility;
    }

    fireEvent(this, "config-changed", { config: newConfig });
  }

  private _computeLabelCallback = (
    schema: SchemaUnion<ReturnType<typeof this._schema>>
  ) => {
    switch (schema.name) {
      case "content":
        return this.hass!.localize(
          `ui.panel.lovelace.editor.card.heading.entity_config.${schema.name}`
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
        .intro {
          margin: 0;
          color: var(--secondary-text-color);
          margin-bottom: 8px;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-heading-entity-editor": HuiHeadingEntityEditor;
  }
}
