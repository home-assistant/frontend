import { html, LitElement, nothing, css } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { assert, assign, object, optional, string } from "superstruct";
import { fireEvent } from "../../../../common/dom/fire_event";
import type { LocalizeFunc } from "../../../../common/translations/localize";
import "../../../../components/ha-form/ha-form";
import type {
  HaFormSchema,
  SchemaUnion,
} from "../../../../components/ha-form/types";
import type { HomeAssistant } from "../../../../types";
import type { EnergyBreakdownUsageCardConfig } from "../../cards/types";
import type { LovelaceCardEditor } from "../../types";
import { baseLovelaceCardConfig } from "../structs/base-card-struct";
import { configElementStyle } from "./config-elements-style";

const cardConfigStruct = assign(
  baseLovelaceCardConfig,
  object({
    power_entity: optional(string()),
    power_icon: optional(string()),
  })
);

@customElement("hui-energy-breakdown-usage-card-editor")
export class HuiEnergyBreakdownUsageCardEditor
  extends LitElement
  implements LovelaceCardEditor
{
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: EnergyBreakdownUsageCardConfig;

  private _schema = memoizeOne(
    (_localize: LocalizeFunc) =>
      [
        {
          name: "power_entity",
          selector: {
            entity: {
              filter: [{ domain: "sensor", device_class: "power" }],
            },
          },
        },
        {
          name: "power_icon",
          selector: {
            icon: {},
          },
        },
      ] as const satisfies readonly HaFormSchema[]
  );

  public setConfig(config: EnergyBreakdownUsageCardConfig): void {
    assert(config, cardConfigStruct);

    this._config = {
      ...config,
    };
  }

  protected render() {
    if (!this.hass || !this._config) {
      return nothing;
    }

    const schema = this._schema(this.hass.localize);

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

  private _valueChanged(ev: CustomEvent): void {
    const newConfig = ev.detail.value as EnergyBreakdownUsageCardConfig;

    const config: EnergyBreakdownUsageCardConfig = {
      ...newConfig,
      type: "energy-breakdown-usage",
    };

    fireEvent(this, "config-changed", { config });
  }

  private _computeHelperCallback = (
    schema: SchemaUnion<ReturnType<typeof this._schema>>
  ): string | undefined => {
    switch (schema.name) {
      default:
        return this.hass!.localize(
          `ui.panel.lovelace.editor.card.energy-breakdown-usage.${schema.name}_helper`
        );
    }
  };

  private _computeLabelCallback = (
    schema: SchemaUnion<ReturnType<typeof this._schema>>
  ) => {
    switch (schema.name) {
      case "power_entity":
        return this.hass!.localize(
          "ui.panel.lovelace.editor.card.generic.entity"
        );
      case "power_icon":
        return this.hass!.localize(
          "ui.panel.lovelace.editor.card.generic.icon"
        );
      default:
        return undefined;
    }
  };

  static get styles() {
    return [
      configElementStyle,
      css`
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
    "hui-energy-breakdown-usage-card-editor": HuiEnergyBreakdownUsageCardEditor;
  }
}
