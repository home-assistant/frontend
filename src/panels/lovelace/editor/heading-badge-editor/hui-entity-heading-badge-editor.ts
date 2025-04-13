import { mdiEye, mdiGestureTap, mdiTextShort } from "@mdi/js";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import {
  any,
  array,
  assert,
  boolean,
  object,
  optional,
  string,
  union,
} from "superstruct";
import { fireEvent } from "../../../../common/dom/fire_event";
import type { LocalizeFunc } from "../../../../common/translations/localize";
import "../../../../components/ha-expansion-panel";
import "../../../../components/ha-form/ha-form";
import type {
  HaFormSchema,
  SchemaUnion,
} from "../../../../components/ha-form/types";
import type { HomeAssistant } from "../../../../types";
import type { Condition } from "../../common/validate-condition";
import type { EntityHeadingBadgeConfig } from "../../heading-badges/types";
import type { LovelaceGenericElementEditor } from "../../types";
import "../conditions/ha-card-conditions-editor";
import { configElementStyle } from "../config-elements/config-elements-style";
import { actionConfigStruct } from "../structs/action-struct";

export const DEFAULT_CONFIG: Partial<EntityHeadingBadgeConfig> = {
  type: "entity",
  show_state: true,
  show_icon: true,
};

const entityConfigStruct = object({
  type: optional(string()),
  entity: optional(string()),
  name: optional(string()),
  icon: optional(string()),
  state_content: optional(union([string(), array(string())])),
  show_state: optional(boolean()),
  show_icon: optional(boolean()),
  color: optional(string()),
  tap_action: optional(actionConfigStruct),
  hold_action: optional(actionConfigStruct),
  double_tap_action: optional(actionConfigStruct),
  visibility: optional(array(any())),
});

type FormData = EntityHeadingBadgeConfig & {
  displayed_elements?: string[];
};

@customElement("hui-heading-entity-editor")
export class HuiHeadingEntityEditor
  extends LitElement
  implements LovelaceGenericElementEditor
{
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ type: Boolean }) public preview = false;

  @state() private _config?: EntityHeadingBadgeConfig;

  public setConfig(config: EntityHeadingBadgeConfig): void {
    assert(config, entityConfigStruct);
    this._config = {
      ...DEFAULT_CONFIG,
      ...config,
    };
  }

  private _schema = memoizeOne(
    (localize: LocalizeFunc) =>
      [
        {
          name: "entity",
          selector: { entity: {} },
        },
        {
          name: "content",
          type: "expandable",
          flatten: true,
          iconPath: mdiTextShort,
          schema: [
            {
              name: "",
              type: "grid",
              schema: [
                {
                  name: "name",
                  selector: {
                    text: {},
                  },
                },
                {
                  name: "icon",
                  selector: { icon: {} },
                  context: { icon_entity: "entity" },
                },
                {
                  name: "color",
                  selector: {
                    ui_color: {
                      default_color: "none",
                      include_state: true,
                      include_none: true,
                    },
                  },
                },
              ],
            },
            {
              name: "displayed_elements",
              selector: {
                select: {
                  mode: "list",
                  multiple: true,
                  options: [
                    {
                      value: "state",
                      label: localize(
                        `ui.panel.lovelace.editor.card.heading.entity_config.displayed_elements_options.state`
                      ),
                    },
                    {
                      value: "icon",
                      label: localize(
                        `ui.panel.lovelace.editor.card.heading.entity_config.displayed_elements_options.icon`
                      ),
                    },
                  ],
                },
              },
            },
            {
              name: "state_content",
              selector: { ui_state_content: { allow_name: true } },
              context: { filter_entity: "entity" },
            },
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
                  default_action: "none",
                },
              },
            },
            {
              name: "",
              type: "optional_actions",
              flatten: true,
              schema: (["hold_action", "double_tap_action"] as const).map(
                (action) => ({
                  name: action,
                  selector: {
                    ui_action: {
                      default_action: "none" as const,
                    },
                  },
                })
              ),
            },
          ],
        },
      ] as const satisfies readonly HaFormSchema[]
  );

  private _displayedElements = memoizeOne(
    (config: EntityHeadingBadgeConfig) => {
      const elements: string[] = [];
      if (config.show_state) elements.push("state");
      if (config.show_icon) elements.push("icon");
      return elements;
    }
  );

  protected render() {
    if (!this.hass || !this._config) {
      return nothing;
    }

    const schema = this._schema(this.hass.localize);

    const data: FormData = {
      ...this._config,
      displayed_elements: this._displayedElements(this._config),
    };

    const conditions = this._config.visibility ?? [];
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
        <ha-svg-icon slot="leading-icon" .path=${mdiEye}></ha-svg-icon>
        <h3 slot="header">
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

    const config = { ...ev.detail.value } as FormData;

    if (config.displayed_elements) {
      config.show_state = config.displayed_elements.includes("state");
      config.show_icon = config.displayed_elements.includes("icon");
      delete config.displayed_elements;
    }

    fireEvent(this, "config-changed", { config });
  }

  private _conditionChanged(ev: CustomEvent): void {
    ev.stopPropagation();
    if (!this._config || !this.hass) {
      return;
    }

    const conditions = ev.detail.value as Condition[];

    const newConfig: EntityHeadingBadgeConfig = {
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
      case "state_content":
      case "displayed_elements":
      case "color":
        return this.hass!.localize(
          `ui.panel.lovelace.editor.card.heading.entity_config.${schema.name}`
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
          `ui.panel.lovelace.editor.card.heading.entity_config.${schema.name}_helper`
        );
      case "name":
        return this.hass!.localize(
          `ui.panel.lovelace.editor.card.heading.entity_config.name_helper`
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
