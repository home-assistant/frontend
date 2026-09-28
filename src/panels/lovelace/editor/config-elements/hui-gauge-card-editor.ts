import {
  mdiGestureTap,
  mdiDragHorizontalVariant,
  mdiClose,
  mdiPlus,
} from "@mdi/js";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { repeat } from "lit/directives/repeat";
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
import "../../../../components/ha-sortable";
import "../../../../components/ha-icon-button";
import "../../../../components/ha-svg-icon";
import { NON_NUMERIC_ATTRIBUTES } from "../../../../data/entity/entity_attributes";
import type { HomeAssistant } from "../../../../types";
import { DEFAULT_MAX, DEFAULT_MIN } from "../../cards/hui-gauge-card";
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

const gaugeSegmentStruct = object({
  from: number(),
  to: optional(number()),
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

const segmentSchema = [
  {
    name: "",
    type: "grid",
    schema: [
      { name: "from", selector: { number: { mode: "box", step: "any" } } },
      { name: "to", selector: { number: { mode: "box", step: "any" } } },
      { name: "color", selector: { ui_color: {} } },
    ] as const,
  },
] as const;

@customElement("hui-gauge-card-editor")
export class HuiGaugeCardEditor
  extends LitElement
  implements LovelaceCardEditor
{
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: GaugeCardConfig;

  public setConfig(config: GaugeCardConfig): void {
    assert(config, cardConfigStruct);
    if (config.severity && !config.segments) {
      const segments: GaugeSegment[] = [];
      const keys = Object.keys(config.severity);
      const severityMap: Record<string, string> = {
        red: "var(--error-color)",
        green: "var(--success-color)",
        yellow: "var(--warning-color)",
      };
      const sortable = keys
        .map((key) => ({ key, value: (config.severity as any)[key] }))
        .filter((item) => item.value !== undefined && !isNaN(item.value));
      sortable.sort((a, b) => a.value - b.value);

      for (let i = 0; i < sortable.length; i++) {
        segments.push({
          from: sortable[i].value,
          to:
            i + 1 < sortable.length
              ? sortable[i + 1].value
              : (config.max ?? DEFAULT_MAX),
          color: severityMap[sortable[i].key] || "var(--info-color)",
        });
      }
      this._config = { ...config, segments };
      delete this._config.severity;
    } else {
      this._config = config;
    }
  }

  private _schema = memoizeOne(
    (entityId?: string) =>
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
        { name: "needle", selector: { boolean: {} } },
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

    const schema = this._schema(this._config.entity);

    return html`
      <ha-form
        .hass=${this.hass}
        .data=${this._config}
        .schema=${schema}
        .computeLabel=${this._computeLabelCallback}
        @value-changed=${this._valueChanged}
      ></ha-form>

      <div class="segments-editor">
        <h3>
          ${this.hass!.localize("ui.panel.lovelace.editor.card.gauge.severity.define")}
        </h3>
        <ha-sortable
          handle-selector=".handle"
          @item-moved=${this._segmentMoved}
        >
          <div class="segments">
            ${repeat(
              this._config.segments || [],
              (_, index) => index,
              (segment, index) => html`
                <div class="segment">
                  <div class="handle">
                    <ha-svg-icon
                      .path=${mdiDragHorizontalVariant}
                    ></ha-svg-icon>
                  </div>
                  <ha-form
                    .hass=${this.hass}
                    .data=${segment}
                    .schema=${segmentSchema}
                    .computeLabel=${this._computeSegmentLabelCallback}
                    .index=${index}
                    @value-changed=${this._segmentChanged}
                  ></ha-form>
                  <ha-icon-button
                    .label=${this.hass!.localize("ui.common.delete")}
                    .path=${mdiClose}
                    class="remove-icon"
                    .index=${index}
                    @click=${this._removeSegment}
                  ></ha-icon-button>
                </div>
              `
            )}
          </div>
        </ha-sortable>
        ${
          (this._config.segments?.length || 0) < 10
            ? html`
                <ha-button @click=${this._addSegment}>
                  <ha-svg-icon .path=${mdiPlus}></ha-svg-icon>
                  ${this.hass!.localize("ui.panel.lovelace.editor.card.gauge.severity.add_segment") || "Add Segment"}
                </ha-button>
              `
            : nothing
        }
      </div>
    `;
  }

  private _segmentMoved(ev: CustomEvent): void {
    ev.stopPropagation();
    const { oldIndex, newIndex } = ev.detail;

    if (oldIndex === newIndex) return;

    const segments = [...(this._config!.segments || [])];
    const [movedSegment] = segments.splice(oldIndex, 1);
    segments.splice(newIndex, 0, movedSegment);

    fireEvent(this, "config-changed", {
      config: { ...this._config!, segments },
    });
  }

  private _segmentChanged(ev: CustomEvent): void {
    ev.stopPropagation();
    const index = (ev.currentTarget as any).index;
    const segments = [...(this._config!.segments || [])];
    segments[index] = ev.detail.value;

    fireEvent(this, "config-changed", {
      config: { ...this._config!, segments },
    });
  }

  private _removeSegment(ev: Event): void {
    const index = (ev.currentTarget as any).index;
    const segments = [...(this._config!.segments || [])];
    segments.splice(index, 1);

    fireEvent(this, "config-changed", {
      config: { ...this._config!, segments },
    });
  }

  private _addSegment(): void {
    const segments = [...(this._config!.segments || [])];
    if (segments.length >= 10) return;

    segments.push({
      from: 0,
      to: this._config!.max ?? DEFAULT_MAX,
      color: "var(--info-color)",
    });

    fireEvent(this, "config-changed", {
      config: { ...this._config!, segments },
    });
  }

  private _valueChanged(ev: CustomEvent): void {
    fireEvent(this, "config-changed", { config: ev.detail.value });
  }

  private _computeSegmentLabelCallback = (
    schema: SchemaUnion<typeof segmentSchema>
  ) => {
    switch (schema.name) {
      case "from":
        return (
          this.hass!.localize(
            "ui.panel.lovelace.editor.card.generic.minimum"
          ) || "Low"
        );
      case "to":
        return (
          this.hass!.localize(
            "ui.panel.lovelace.editor.card.generic.maximum"
          ) || "High"
        );
      case "color":
        return (
          this.hass!.localize("ui.panel.lovelace.editor.card.generic.color") ||
          "Color"
        );
      default:
        return schema.name;
    }
  };

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
        return this.hass!.localize(
          `ui.panel.lovelace.editor.card.gauge.severity.${schema.name}`
        );
    }
  };

  static styles = css`
    .segments-editor {
      margin-top: 24px;
    }
    .segments-editor h3 {
      margin-bottom: 8px;
    }
    .segment {
      display: flex;
      align-items: center;
      margin-bottom: 8px;
    }
    .segment .handle {
      cursor: move;
      cursor: grab;
      padding-right: 8px;
    }
    .segment ha-form {
      flex: 1;
      --form-grid-column-count: 3;
      --form-grid-min-width: auto;
    }
    .segment .remove-icon {
      color: var(--secondary-text-color);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-gauge-card-editor": HuiGaugeCardEditor;
  }
}
