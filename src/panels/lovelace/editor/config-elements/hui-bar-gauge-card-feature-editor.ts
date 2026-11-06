import { html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../../../common/dom/fire_event";
import type { LocalizeFunc } from "../../../../common/translations/localize";
import "../../../../components/ha-form/ha-form";
import type {
  HaFormSchema,
  SchemaUnion,
} from "../../../../components/ha-form/types";
import type { HomeAssistant } from "../../../../types";
import type {
  BarGaugeCardFeatureConfig,
  LovelaceCardFeatureContext,
} from "../../card-features/types";
import type { LovelaceCardFeatureEditor } from "../../types";

type BarGaugeColorMode = "color" | "severity" | "segments";

type BarGaugeSegment = NonNullable<
  BarGaugeCardFeatureConfig["segments"]
>[number];

@customElement("hui-bar-gauge-card-feature-editor")
export class HuiBarGaugeCardFeatureEditor
  extends LitElement
  implements LovelaceCardFeatureEditor
{
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ attribute: false }) public context?: LovelaceCardFeatureContext;

  @state() private _config?: BarGaugeCardFeatureConfig;

  public setConfig(config: BarGaugeCardFeatureConfig): void {
    this._config = config;
  }

  private _schema = memoizeOne(
    (localize: LocalizeFunc) =>
      [
        {
          name: "min",
          default: 0,
          selector: { number: { mode: "box", step: "any" } },
        },
        {
          name: "max",
          default: 100,
          selector: { number: { mode: "box", step: "any" } },
        },
        {
          name: "color_mode",
          required: true,
          selector: {
            select: {
              mode: "dropdown",
              options: (["color", "severity", "segments"] as const).map(
                (mode) => ({
                  value: mode,
                  label: localize(
                    `ui.panel.lovelace.editor.card.gauge.color_mode_options.${mode}`
                  ),
                })
              ),
            },
          },
        },
        {
          name: "segments",
          visible: { field: "color_mode", value: "segments" },
          selector: {
            object: {
              multiple: true,
              reorder: false,
              fields: {
                from: {
                  label: localize(
                    "ui.panel.lovelace.editor.card.gauge.segment.from"
                  ),
                  required: true,
                  selector: { number: { mode: "box", step: "any" } },
                },
                color: {
                  label: localize(
                    "ui.panel.lovelace.editor.card.generic.color"
                  ),
                  required: true,
                  selector: { ui_color: {} },
                },
              },
            },
          },
        },
        {
          name: "severity",
          type: "grid",
          visible: { field: "color_mode", value: "severity" },
          schema: [
            {
              name: "green",
              selector: { number: { mode: "box", step: "any" } },
            },
            {
              name: "yellow",
              selector: { number: { mode: "box", step: "any" } },
            },
            {
              name: "red",
              selector: { number: { mode: "box", step: "any" } },
            },
          ],
        },
      ] as const satisfies readonly HaFormSchema[]
  );

  protected render() {
    if (!this.hass || !this._config) {
      return nothing;
    }

    const data = {
      color_mode: this._colorMode(this._config),
      ...this._config,
      segments: this._sortSegments(this._config.segments),
    };

    return html`
      <ha-form
        .hass=${this.hass}
        .data=${data}
        .schema=${this._schema(this.hass.localize)}
        .computeLabel=${this._computeLabelCallback}
        @value-changed=${this._valueChanged}
      ></ha-form>
    `;
  }

  private _sortSegments = memoizeOne(
    (segments?: BarGaugeSegment[]) =>
      segments && [...segments].sort((a, b) => a.from - b.from)
  );

  private _colorMode(config: BarGaugeCardFeatureConfig): BarGaugeColorMode {
    if (config.segments) {
      return "segments";
    }
    if (config.severity) {
      return "severity";
    }
    return "color";
  }

  private _valueChanged(ev: CustomEvent): void {
    const { color_mode, ...config } = ev.detail.value;
    const colorMode: BarGaugeColorMode = color_mode;

    if (colorMode === "severity") {
      config.severity ??= {};
    } else {
      delete config.severity;
    }

    if (colorMode === "segments") {
      config.segments = this._sortSegments(config.segments ?? []);
    } else {
      delete config.segments;
    }

    fireEvent(this, "config-changed", { config });
  }

  private _computeLabelCallback = (
    schema: SchemaUnion<ReturnType<typeof this._schema>>
  ) =>
    this.hass!.localize(
      `ui.panel.lovelace.editor.features.types.bar-gauge.${schema.name}`
    );
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-bar-gauge-card-feature-editor": HuiBarGaugeCardFeatureEditor;
  }
}
