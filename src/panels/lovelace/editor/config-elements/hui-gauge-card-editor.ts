import "@polymer/paper-input/paper-input";
import { mdiClose } from "@mdi/js";
import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators";
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
import { computeRTLDirection } from "../../../../common/util/compute_rtl";
import "../../../../components/ha-formfield";
import "../../../../components/ha-switch";
import { HomeAssistant } from "../../../../types";
import { GaugeCardConfig } from "../../cards/types";
import "../../components/hui-entity-editor";
import "../../components/hui-theme-select-editor";
import { LovelaceCardEditor } from "../../types";
import { baseLovelaceCardConfig } from "../structs/base-card-struct";
import { EditorTarget, EntitiesEditorEvent } from "../types";
import { configElementStyle } from "./config-elements-style";

const gaugeSegmentStruct = object({
  from: number(),
  color: string(),
});

const cardConfigStruct = assign(
  baseLovelaceCardConfig,
  object({
    name: optional(string()),
    entity: optional(string()),
    unit: optional(string()),
    min: optional(number()),
    max: optional(number()),
    severity: optional(object()),
    theme: optional(string()),
    needle: optional(boolean()),
    segments: optional(array(gaugeSegmentStruct)),
  })
);

const includeDomains = ["counter", "input_number", "number", "sensor"];

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

  get _name(): string {
    return this._config!.name || "";
  }

  get _entity(): string {
    return this._config!.entity || "";
  }

  get _unit(): string {
    return this._config!.unit || "";
  }

  get _theme(): string {
    return this._config!.theme || "";
  }

  get _min(): number {
    return this._config!.min || 0;
  }

  get _max(): number {
    return this._config!.max || 100;
  }

  protected render(): TemplateResult {
    if (!this.hass || !this._config) {
      return html``;
    }

    return html`
      <div class="card-config">
        <ha-entity-picker
          .label="${this.hass.localize(
            "ui.panel.lovelace.editor.card.generic.entity"
          )} (${this.hass.localize(
            "ui.panel.lovelace.editor.card.config.required"
          )})"
          .hass=${this.hass}
          .value=${this._entity}
          .configValue=${"entity"}
          .includeDomains=${includeDomains}
          @change=${this._valueChanged}
          allow-custom-entity
        ></ha-entity-picker>
        <paper-input
          .label="${this.hass.localize(
            "ui.panel.lovelace.editor.card.generic.name"
          )} (${this.hass.localize(
            "ui.panel.lovelace.editor.card.config.optional"
          )})"
          .value=${this._name}
          .configValue=${"name"}
          @value-changed=${this._valueChanged}
        ></paper-input>
        <paper-input
          .label="${this.hass.localize(
            "ui.panel.lovelace.editor.card.generic.unit"
          )} (${this.hass.localize(
            "ui.panel.lovelace.editor.card.config.optional"
          )})"
          .value=${this._unit}
          .configValue=${"unit"}
          @value-changed=${this._valueChanged}
        ></paper-input>
        <hui-theme-select-editor
          .hass=${this.hass}
          .value=${this._theme}
          .configValue=${"theme"}
          @value-changed=${this._valueChanged}
        ></hui-theme-select-editor>
        <paper-input
          type="number"
          .label="${this.hass.localize(
            "ui.panel.lovelace.editor.card.generic.minimum"
          )} (${this.hass.localize(
            "ui.panel.lovelace.editor.card.config.optional"
          )})"
          .value=${this._min}
          .configValue=${"min"}
          @value-changed=${this._valueChanged}
        ></paper-input>
        <paper-input
          type="number"
          .label="${this.hass.localize(
            "ui.panel.lovelace.editor.card.generic.maximum"
          )} (${this.hass.localize(
            "ui.panel.lovelace.editor.card.config.optional"
          )})"
          .value=${this._max}
          .configValue=${"max"}
          @value-changed=${this._valueChanged}
        ></paper-input>
        <ha-formfield
          .label=${this.hass.localize(
            "ui.panel.lovelace.editor.card.gauge.needle_gauge"
          )}
          .dir=${computeRTLDirection(this.hass)}
        >
          <ha-switch
            .checked=${this._config!.needle !== undefined}
            @change=${this._toggleNeedle}
          ></ha-switch
        ></ha-formfield>

        ${
          // display warning if old format is used
          this._config!.severity === undefined
            ? ""
            : html` <ha-alert alert-type="warning"
                  >${this.hass.localize(
                    "ui.panel.lovelace.editor.card.gauge.migrate_info"
                  )}
                </ha-alert>
                <mwc-button @click=${this._migrateConfig}
                  >${this.hass.localize(
                    "ui.panel.lovelace.editor.card.gauge.migrate_button"
                  )}</mwc-button
                >`
        }

        <h3>
          ${`${this.hass.localize(
            "ui.panel.lovelace.editor.card.gauge.colors"
          )} (${this.hass.localize(
            "ui.panel.lovelace.editor.card.config.optional"
          )})`}
        </h3>

        <div class="actions">
          <mwc-button
            @click=${this._addRow}
            .label=${this.hass.localize(
              "ui.panel.lovelace.editor.card.gauge.add_segment"
            )}
          ></mwc-button>

          <mwc-button
            @click=${this._sortRows}
            .label=${this.hass.localize(
              "ui.panel.lovelace.editor.card.gauge.sort_segments"
            )}
            title=${this.hass.localize(
              "ui.panel.lovelace.editor.card.gauge.sort_info"
            )}
          ></mwc-button>
        </div>

        <div class="segments">
          ${
            // display all defined segments
            this._config!.segments?.map(
              (segment, index) => html`<div class="segment">
                <paper-input
                  type="number"
                  .label="${this.hass!.localize(
                    "ui.panel.lovelace.editor.card.gauge.segments.from"
                  )} (${this.hass!.localize(
                    "ui.panel.lovelace.editor.card.config.optional"
                  )})"
                  .index=${index}
                  .value=${segment.from?.toString()}
                  .configValue=${"from"}
                  @change=${this._editRow}
                ></paper-input>
                <paper-input
                  type="color"
                  class="colorPicker"
                  .label="${this.hass!.localize(
                    "ui.panel.lovelace.editor.card.gauge.segments.color"
                  )} (${this.hass!.localize(
                    "ui.panel.lovelace.editor.card.config.required"
                  )})"
                  .index=${index}
                  .value=${segment.color}
                  .configValue=${"color"}
                  @change=${this._editRow}
                ></paper-input>
                <ha-icon-button
                  .label=${this.hass!.localize(
                    "ui.panel.lovelace.editor.card.gauge.segments.color"
                  )}
                  .path=${mdiClose}
                  class="remove-icon"
                  .index=${index}
                  @click=${this._removeRow}
                ></ha-icon-button>
              </div>`
            )
          }
        </div>
      </div>
    `;
  }

  static get styles(): CSSResultGroup {
    return [
      configElementStyle,
      css`
        .colorPicker {
          flex-grow: 1;
          margin-left: 4px;
        }
        .segment {
          display: flex;
          flex-direction: row;
          align-items: flex-end;
        }
        .remove-icon {
          color: var(--secondary-text-color);
        }
        .actions {
          display: flex;
          justify-content: space-between;
        }
      `,
    ];
  }

  private _toggleNeedle(ev: EntitiesEditorEvent): void {
    if (!this._config || !this.hass) {
      return;
    }
    if ((ev.target as EditorTarget).checked) {
      this._config = {
        ...this._config,
        needle: true,
      };
    } else {
      this._config = { ...this._config };
      delete this._config.needle;
    }
    fireEvent(this, "config-changed", { config: this._config });
  }

  private _removeRow(ev: EntitiesEditorEvent): void {
    if (!this._config || !this.hass) {
      return;
    }

    const target = ev.target as EditorTarget;
    const newSegments = this._config!.segments?.concat();
    newSegments?.splice(target.index!, 1);

    if (newSegments?.length === 0) {
      this._config = { ...this._config };
      delete this._config.segments;
    } else {
      this._config = { ...this._config, segments: newSegments };
    }

    fireEvent(this, "config-changed", { config: this._config });
  }

  private _editRow(ev: EntitiesEditorEvent): void {
    if (!this._config || !this.hass) {
      return;
    }

    const target = ev.target as EditorTarget;
    const newSegments = this._config!.segments?.concat();

    switch (target.configValue) {
      case "from":
        newSegments![target.index!] = {
          ...newSegments![target.index!],
          from: Number(target.value),
        };
        break;
      case "color":
        newSegments![target.index!] = {
          ...newSegments![target.index!],
          color: target.value || "",
        };
        break;
    }

    this._config = {
      ...this._config,
      segments: newSegments,
    };

    fireEvent(this, "config-changed", { config: this._config });
  }

  private _addRow(): void {
    if (!this._config || !this.hass) {
      return;
    }

    this._config = {
      ...this._config,
      segments: (this._config!.segments || []).concat([
        { from: 0, color: "#000000" },
      ]),
    };

    fireEvent(this, "config-changed", { config: this._config });
  }

  private _sortRows(): void {
    if (!this._config || !this.hass) {
      return;
    }

    this._config = {
      ...this._config,
      segments: this._config!.segments?.concat().sort(
        (a, b) => a.from - b.from
      ),
    };

    fireEvent(this, "config-changed", { config: this._config });
  }

  private _valueChanged(ev: EntitiesEditorEvent): void {
    if (!this._config || !this.hass) {
      return;
    }
    const target = ev.target! as EditorTarget;

    if (target.configValue) {
      if (
        target.value === "" ||
        (target.type === "number" && isNaN(Number(target.value)))
      ) {
        this._config = { ...this._config };
        delete this._config[target.configValue!];
      } else {
        let value: any = target.value;
        if (target.type === "number") {
          value = Number(value);
        }
        this._config = { ...this._config, [target.configValue!]: value };
      }
    }
    fireEvent(this, "config-changed", { config: this._config });
  }

  /**
   * Migrates the old "severity"-based config to the new config format
   */
  private _migrateConfig(): void {
    if (!this._config || !this.hass || !this._config.severity) {
      return;
    }

    this._config = {
      ...this._config,
      segments: (this._config.segments || []).concat([
        { from: this._config!.severity!.red || 0, color: "#db4437" },
        { from: this._config!.severity!.yellow || 0, color: "#ffa600" },
        { from: this._config!.severity!.green || 0, color: "#43a047" },
      ]),
    };
    delete this._config.severity;

    fireEvent(this, "config-changed", { config: this._config });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-gauge-card-editor": HuiGaugeCardEditor;
  }
}
