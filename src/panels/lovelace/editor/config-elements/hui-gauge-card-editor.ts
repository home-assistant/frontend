import { mdiGestureTap } from "@mdi/js";
import { html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import {
  array,
  assert,
  assign,
  boolean,
  number,
  object,
  optional,
  string,
} from "superstruct";
import { fireEvent } from "../../../../common/dom/fire_event";
import "../../../../components/ha-form/ha-form";
import type { SchemaUnion } from "../../../../components/ha-form/types";
import { NON_NUMERIC_ATTRIBUTES } from "../../../../data/entity/entity_attributes";
import type { UiColorExtraOption } from "../../../../data/selector";
import type { LocalizeFunc } from "../../../../common/translations/localize";
import type { HomeAssistant } from "../../../../types";
import {
  DEFAULT_MAX,
  DEFAULT_MIN,
  severityMap,
} from "../../cards/hui-gauge-card";
import type { GaugeCardConfig, GaugeSegment } from "../../cards/types";
import {
  ACTION_RELATED_CONTEXT,
  type UiAction,
  supportedActions,
} from "../../components/hui-action-editor";
import type { LovelaceCardEditor } from "../../types";
import { actionConfigStruct } from "../structs/action-struct";
import { baseLovelaceCardConfig } from "../structs/base-card-struct";
import { entityNameStruct } from "../structs/entity-name-struct";

const TAP_ACTIONS: UiAction[] = [
  "more-info",
  "navigate",
  "url",
  "perform-action",
  "assist",
  "none",
];

type GaugeColorMode = "color" | "severity" | "segments";

const gaugeSegmentStruct = object({
  from: number(),
  color: string(),
  label: optional(string()),
});

const cardConfigStruct = assign(
  baseLovelaceCardConfig,
  object({
    name: optional(entityNameStruct),
    entity: optional(string()),
    attribute: optional(string()),
    unit: optional(string()),
    min: optional(number()),
    max: optional(number()),
    severity: optional(object()),
    color: optional(string()),
    theme: optional(string()),
    needle: optional(boolean()),
    segments: optional(array(gaugeSegmentStruct)),
    tap_action: optional(supportedActions(actionConfigStruct, TAP_ACTIONS)),
    hold_action: optional(supportedActions(actionConfigStruct, TAP_ACTIONS)),
    double_tap_action: optional(
      supportedActions(actionConfigStruct, TAP_ACTIONS)
    ),
  })
);

@customElement("hui-gauge-card-editor")
export class HuiGaugeCardEditor
  extends LitElement
  implements LovelaceCardEditor
{
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: GaugeCardConfig;

  public setConfig(config: GaugeCardConfig): void {
    assert(config, cardConfigStruct);
    this._config = config;
  }

  private _schema = memoizeOne(
    (localize: LocalizeFunc, entityId?: string) =>
      [
        {
          name: "entity",
          selector: {
            entity: {
              domain: ["counter", "input_number", "number", "sensor"],
            },
          },
        },
        {
          name: "attribute",
          selector: {
            attribute: {
              entity_id: entityId,
              hide_attributes: NON_NUMERIC_ATTRIBUTES,
            },
          },
        },
        {
          name: "name",
          selector: {
            entity_name: {},
          },
          context: { entity: "entity" },
        },
        { name: "unit", selector: { text: {} } },
        { name: "theme", selector: { theme: {} } },
        {
          name: "",
          type: "grid",
          schema: [
            {
              name: "min",
              default: DEFAULT_MIN,
              selector: { number: { mode: "box", step: "any" } },
            },
            {
              name: "max",
              default: DEFAULT_MAX,
              selector: { number: { mode: "box", step: "any" } },
            },
          ],
        },
        {
          name: "",
          type: "grid",
          schema: [
            { name: "needle", selector: { boolean: {} } },
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
          ],
        },
        {
          name: "color",
          visible: { field: "color_mode", value: "color" },
          selector: {
            ui_color: {
              default_color: "default",
              extra_options: [
                {
                  value: "default",
                  label: localize(
                    "ui.panel.lovelace.editor.card.gauge.color_default"
                  ),
                  display_color: severityMap.normal,
                },
              ] as UiColorExtraOption[],
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
                  actions: TAP_ACTIONS,
                  default_action: "more-info",
                },
              },
              context: ACTION_RELATED_CONTEXT,
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
                      actions: TAP_ACTIONS,
                      default_action: "none" as const,
                    },
                  },
                  context: ACTION_RELATED_CONTEXT,
                })
              ),
            },
          ],
        },
      ] as const
  );

  protected render() {
    if (!this.hass || !this._config) {
      return nothing;
    }

    const schema = this._schema(this.hass.localize, this._config!.entity);
    const data = {
      color_mode: this._colorMode(this._config!),
      ...this._config,
      segments: this._sortSegments(this._config!.segments),
    };

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

  private _sortSegments = memoizeOne(
    (segments?: GaugeSegment[]) =>
      segments && [...segments].sort((a, b) => a.from - b.from)
  );

  private _colorMode(config: GaugeCardConfig): GaugeColorMode {
    if (config.segments) {
      return "segments";
    }
    if (config.severity) {
      return "severity";
    }
    return "color";
  }

  private _valueChanged(ev: CustomEvent): void {
    let config = ev.detail.value;
    const colorMode: GaugeColorMode = config.color_mode;

    if (colorMode === "severity") {
      config = {
        ...config,
        severity: {
          green: config.green || config.severity?.green || 0,
          yellow: config.yellow || config.severity?.yellow || 0,
          red: config.red || config.severity?.red || 0,
        },
      };
    } else {
      delete config.severity;
    }

    if (colorMode === "segments") {
      config.segments = this._sortSegments(config.segments ?? []);
    } else {
      delete config.segments;
    }

    if (colorMode !== "color") {
      delete config.color;
    }

    delete config.color_mode;
    delete config.green;
    delete config.yellow;
    delete config.red;

    fireEvent(this, "config-changed", { config });
  }

  private _computeLabelCallback = (
    schema: SchemaUnion<ReturnType<typeof this._schema>>
  ) => {
    switch (schema.name) {
      case "name":
        return this.hass!.localize(
          "ui.panel.lovelace.editor.card.generic.name"
        );
      case "entity":
        return `${this.hass!.localize(
          "ui.panel.lovelace.editor.card.generic.entity"
        )} (${this.hass!.localize(
          "ui.panel.lovelace.editor.card.config.required"
        )})`;
      case "max":
        return this.hass!.localize(
          "ui.panel.lovelace.editor.card.generic.maximum"
        );
      case "min":
        return this.hass!.localize(
          "ui.panel.lovelace.editor.card.generic.minimum"
        );
      case "color_mode":
        return this.hass!.localize(
          "ui.panel.lovelace.editor.card.gauge.color_mode"
        );
      case "color":
        return this.hass!.localize(
          "ui.panel.lovelace.editor.card.generic.color"
        );
      case "segments":
        return this.hass!.localize(
          "ui.panel.lovelace.editor.card.gauge.segments"
        );
      case "needle":
        return this.hass!.localize(
          "ui.panel.lovelace.editor.card.gauge.needle_gauge"
        );
      case "theme":
        return `${this.hass!.localize(
          "ui.panel.lovelace.editor.card.generic.theme"
        )} (${this.hass!.localize(
          "ui.panel.lovelace.editor.card.config.optional"
        )})`;
      case "unit":
        return this.hass!.localize(
          "ui.panel.lovelace.editor.card.generic.unit"
        );
      case "interactions":
        return this.hass!.localize(
          "ui.panel.lovelace.editor.card.generic.interactions"
        );
      case "tap_action":
      case "hold_action":
      case "double_tap_action":
        return `${this.hass!.localize(
          `ui.panel.lovelace.editor.card.generic.${schema.name}`
        )} (${this.hass!.localize(
          "ui.panel.lovelace.editor.card.config.optional"
        )})`;
      case "attribute":
        return this.hass!.localize(
          "ui.panel.lovelace.editor.card.generic.attribute"
        );
      default:
        // "green" | "yellow" | "red"
        return this.hass!.localize(
          `ui.panel.lovelace.editor.card.gauge.severity.${schema.name}`
        );
    }
  };
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-gauge-card-editor": HuiGaugeCardEditor;
  }
}
