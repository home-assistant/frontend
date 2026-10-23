import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { consumeLocalize } from "../../../../common/decorators/consume-context-entry";
import { fireEvent } from "../../../../common/dom/fire_event";
import type { LocalizeFunc } from "../../../../common/translations/localize";
import "../../../../components/ha-entity-type-picker";
import "../../../../components/ha-form/ha-form";
import type {
  HaFormSchema,
  SchemaUnion,
} from "../../../../components/ha-form/types";
import { parseEntityType } from "../../../../data/entity/entity_type";
import type { EntitySelectorFilter } from "../../../../data/selector";
import type { HomeAssistant, ValueChangedEvent } from "../../../../types";
import type { LovelaceStrategyEditor } from "../types";
import {
  ENTITIES_SECTION_GROUPS,
  type EntitiesSectionStrategyConfig,
} from "./entities-section-strategy";

const TITLE_SCHEMA = [
  { name: "title", selector: { text: {} } },
] as const satisfies readonly HaFormSchema[];

const computeEntityFilters = (
  types: string[] | undefined
): EntitySelectorFilter[] | undefined =>
  types?.map((key) => {
    const { domain, deviceClass } = parseEntityType(key);
    if (!deviceClass) {
      return { domain };
    }
    return { domain, device_class: deviceClass };
  });

@customElement("hui-entities-section-strategy-editor")
export class HuiEntitiesSectionStrategyEditor
  extends LitElement
  implements LovelaceStrategyEditor
{
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() @consumeLocalize() private _localize!: LocalizeFunc;

  @state() private _config?: EntitiesSectionStrategyConfig;

  public setConfig(config: EntitiesSectionStrategyConfig): void {
    this._config = config;
  }

  private _schema = memoizeOne(
    (
      localize: LocalizeFunc,
      types: string[] | undefined,
      includeConfigAndDiagnostic: boolean
    ) =>
      [
        {
          name: "include_config_and_diagnostic",
          selector: { boolean: {} },
        },
        {
          name: "target",
          required: true,
          selector: {
            target: {
              entity: computeEntityFilters(types),
              primary_entities_only: !includeConfigAndDiagnostic,
            },
          },
        },
        {
          name: "name",
          selector: {
            entity_name: {
              allow_custom: false,
            },
          },
        },
        {
          name: "group_by",
          required: true,
          selector: {
            select: {
              mode: "dropdown",
              options: ENTITIES_SECTION_GROUPS.map((group) => ({
                value: group,
                label: localize(
                  `ui.panel.lovelace.editor.strategy.entities.group_by_options.${group}`
                ),
              })),
            },
          },
        },
      ] as const satisfies readonly HaFormSchema[]
  );

  protected render() {
    if (!this._config) return nothing;

    return html`
      <ha-form
        .hass=${this.hass}
        .data=${this._config}
        .schema=${TITLE_SCHEMA}
        .computeLabel=${this._computeLabel}
        @value-changed=${this._valueChanged}
      ></ha-form>
      <ha-entity-type-picker
        .label=${this._localize(
          "ui.panel.lovelace.editor.strategy.entities.entity_types"
        )}
        .value=${this._config.entity_types}
        @value-changed=${this._typesChanged}
      ></ha-entity-type-picker>
      <ha-form
        .hass=${this.hass}
        .data=${{ group_by: "none", ...this._config }}
        .schema=${this._schema(
          this._localize,
          this._config.entity_types,
          Boolean(this._config.include_config_and_diagnostic)
        )}
        .computeLabel=${this._computeLabel}
        .computeHelper=${this._computeHelper}
        @value-changed=${this._valueChanged}
      ></ha-form>
    `;
  }

  private _computeLabel = (
    schema:
      | SchemaUnion<typeof TITLE_SCHEMA>
      | SchemaUnion<ReturnType<typeof this._schema>>
  ) =>
    this._localize(`ui.panel.lovelace.editor.strategy.entities.${schema.name}`);

  private _computeHelper = (
    schema: SchemaUnion<ReturnType<typeof this._schema>>
  ) =>
    schema.name === "include_config_and_diagnostic"
      ? this._localize(
          `ui.panel.lovelace.editor.strategy.entities.${schema.name}_helper`
        )
      : "";

  private _typesChanged(ev: ValueChangedEvent<string[]>) {
    ev.stopPropagation();
    const config = { ...this._config! };
    if (ev.detail.value.length) {
      config.entity_types = ev.detail.value;
    } else {
      delete config.entity_types;
    }
    fireEvent(this, "config-changed", { config });
  }

  private _valueChanged(ev: ValueChangedEvent<EntitiesSectionStrategyConfig>) {
    ev.stopPropagation();
    const config = { ...this._config, ...ev.detail.value };
    if (config.group_by === "none") {
      delete config.group_by;
    }
    fireEvent(this, "config-changed", { config });
  }

  static styles = css`
    ha-entity-type-picker {
      margin: var(--ha-space-6) 0;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-entities-section-strategy-editor": HuiEntitiesSectionStrategyEditor;
  }
}
