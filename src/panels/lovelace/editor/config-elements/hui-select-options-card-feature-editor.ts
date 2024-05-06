import { HassEntity } from "home-assistant-js-websocket";
import { html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../../../common/dom/fire_event";
import { FormatEntityStateFunc } from "../../../../common/translations/entity-state";
import "../../../../components/ha-form/ha-form";
import type {
  HaFormSchema,
  SchemaUnion,
} from "../../../../components/ha-form/types";
import type { HomeAssistant } from "../../../../types";
import {
  LovelaceCardFeatureContext,
  SelectOptionsCardFeatureConfig,
} from "../../card-features/types";
import type { LovelaceCardFeatureEditor } from "../../types";

type SelectOptionsCardFeatureData = SelectOptionsCardFeatureConfig & {
  customize_options: boolean;
};

@customElement("hui-select-options-card-feature-editor")
export class HuiSelectOptionsCardFeatureEditor
  extends LitElement
  implements LovelaceCardFeatureEditor
{
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ attribute: false }) public context?: LovelaceCardFeatureContext;

  @state() private _config?: SelectOptionsCardFeatureConfig;

  public setConfig(config: SelectOptionsCardFeatureConfig): void {
    this._config = config;
  }

  private _schema = memoizeOne(
    (
      formatEntityState: FormatEntityStateFunc,
      stateObj: HassEntity | undefined,
      customizeOptions: boolean
    ) =>
      [
        {
          name: "customize_options",
          selector: {
            boolean: {},
          },
        },
        ...(customizeOptions
          ? ([
              {
                name: "options",
                selector: {
                  select: {
                    multiple: true,
                    reorder: true,
                    options:
                      stateObj?.attributes.options?.map((option) => ({
                        value: option,
                        label: formatEntityState(stateObj, option),
                      })) || [],
                  },
                },
              },
            ] as const satisfies readonly HaFormSchema[])
          : []),
      ] as const satisfies readonly HaFormSchema[]
  );

  protected render() {
    if (!this.hass || !this._config) {
      return nothing;
    }

    const stateObj = this.context?.entity_id
      ? this.hass.states[this.context?.entity_id]
      : undefined;

    const data: SelectOptionsCardFeatureData = {
      ...this._config,
      customize_options: this._config.options !== undefined,
    };

    const schema = this._schema(
      this.hass.formatEntityState,
      stateObj,
      data.customize_options
    );

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
    const { customize_options, ...config } = ev.detail
      .value as SelectOptionsCardFeatureData;

    const stateObj = this.context?.entity_id
      ? this.hass!.states[this.context?.entity_id]
      : undefined;

    if (customize_options && !config.options) {
      config.options = stateObj?.attributes.options || [];
    }
    if (!customize_options && config.options) {
      delete config.options;
    }

    fireEvent(this, "config-changed", { config: config });
  }

  private _computeLabelCallback = (
    schema: SchemaUnion<ReturnType<typeof this._schema>>
  ) => {
    switch (schema.name) {
      case "options":
      case "customize_options":
        return this.hass!.localize(
          `ui.panel.lovelace.editor.features.types.select-options.${schema.name}`
        );
      default:
        return "";
    }
  };
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-select-options-card-feature-editor": HuiSelectOptionsCardFeatureEditor;
  }
}
