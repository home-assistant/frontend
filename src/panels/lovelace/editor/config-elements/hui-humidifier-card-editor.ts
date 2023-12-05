import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import {
  any,
  array,
  assert,
  assign,
  object,
  optional,
  string,
} from "superstruct";
import { HASSDomEvent, fireEvent } from "../../../../common/dom/fire_event";
import "../../../../components/ha-form/ha-form";
import type { SchemaUnion } from "../../../../components/ha-form/types";
import type { HomeAssistant } from "../../../../types";
import {
  LovelaceCardFeatureConfig,
  LovelaceCardFeatureContext,
} from "../../card-features/types";
import type { HumidifierCardConfig } from "../../cards/types";
import type { LovelaceCardEditor } from "../../types";
import "../hui-sub-element-editor";
import { baseLovelaceCardConfig } from "../structs/base-card-struct";
import { EditSubElementEvent, SubElementEditorConfig } from "../types";
import "./hui-card-features-editor";
import type { FeatureType } from "./hui-card-features-editor";

const COMPATIBLE_FEATURES_TYPES: FeatureType[] = [
  "humidifier-modes",
  "humidifier-toggle",
];

const cardConfigStruct = assign(
  baseLovelaceCardConfig,
  object({
    entity: optional(string()),
    name: optional(string()),
    theme: optional(string()),
    features: optional(array(any())),
  })
);

const SCHEMA = [
  {
    name: "entity",
    required: true,
    selector: { entity: { domain: "humidifier" } },
  },
  {
    type: "grid",
    name: "",
    schema: [
      { name: "name", selector: { text: {} } },
      { name: "theme", selector: { theme: {} } },
    ],
  },
] as const;

@customElement("hui-humidifier-card-editor")
export class HuiHumidifierCardEditor
  extends LitElement
  implements LovelaceCardEditor
{
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: HumidifierCardConfig;

  @state() private _subElementEditorConfig?: SubElementEditorConfig;

  public setConfig(config: HumidifierCardConfig): void {
    assert(config, cardConfigStruct);
    this._config = config;
  }

  private _context = memoizeOne(
    (entity_id?: string): LovelaceCardFeatureContext => ({ entity_id })
  );

  protected render() {
    if (!this.hass || !this._config) {
      return nothing;
    }

    const stateObj = this._config.entity
      ? this.hass.states[this._config.entity]
      : undefined;

    if (this._subElementEditorConfig) {
      return html`
        <hui-sub-element-editor
          .hass=${this.hass}
          .config=${this._subElementEditorConfig}
          .context=${this._context(this._config.entity)}
          @go-back=${this._goBack}
          @config-changed=${this.subElementChanged}
        >
        </hui-sub-element-editor>
      `;
    }

    return html`
      <ha-form
        .hass=${this.hass}
        .data=${this._config}
        .schema=${SCHEMA}
        .computeLabel=${this._computeLabelCallback}
        @value-changed=${this._valueChanged}
      ></ha-form>
      <hui-card-features-editor
        .hass=${this.hass}
        .stateObj=${stateObj}
        .featuresTypes=${COMPATIBLE_FEATURES_TYPES}
        .features=${this._config!.features ?? []}
        @features-changed=${this._featuresChanged}
        @edit-detail-element=${this._editDetailElement}
      ></hui-card-features-editor>
    `;
  }

  private _valueChanged(ev: CustomEvent): void {
    fireEvent(this, "config-changed", { config: ev.detail.value });
  }

  private _featuresChanged(ev: CustomEvent) {
    ev.stopPropagation();
    if (!this._config || !this.hass) {
      return;
    }

    const features = ev.detail.features as LovelaceCardFeatureConfig[];
    const config: HumidifierCardConfig = {
      ...this._config,
      features,
    };

    if (features.length === 0) {
      delete config.features;
    }

    fireEvent(this, "config-changed", { config });
  }

  private subElementChanged(ev: CustomEvent): void {
    ev.stopPropagation();
    if (!this._config || !this.hass) {
      return;
    }

    const value = ev.detail.config;

    const newConfigFeatures = this._config!.features
      ? [...this._config!.features]
      : [];

    if (!value) {
      newConfigFeatures.splice(this._subElementEditorConfig!.index!, 1);
      this._goBack();
    } else {
      newConfigFeatures[this._subElementEditorConfig!.index!] = value;
    }

    this._config = { ...this._config!, features: newConfigFeatures };

    this._subElementEditorConfig = {
      ...this._subElementEditorConfig!,
      elementConfig: value,
    };

    fireEvent(this, "config-changed", { config: this._config });
  }

  private _editDetailElement(ev: HASSDomEvent<EditSubElementEvent>): void {
    this._subElementEditorConfig = ev.detail.subElementConfig;
  }

  private _goBack(): void {
    this._subElementEditorConfig = undefined;
  }

  private _computeLabelCallback = (schema: SchemaUnion<typeof SCHEMA>) => {
    if (schema.name === "entity") {
      return this.hass!.localize(
        "ui.panel.lovelace.editor.card.generic.entity"
      );
    }

    if (schema.name === "theme") {
      return `${this.hass!.localize(
        "ui.panel.lovelace.editor.card.generic.theme"
      )} (${this.hass!.localize(
        "ui.panel.lovelace.editor.card.config.optional"
      )})`;
    }

    return this.hass!.localize(
      `ui.panel.lovelace.editor.card.generic.${schema.name}`
    );
  };

  static get styles() {
    return css`
      ha-form {
        display: block;
        margin-bottom: 24px;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-humidifier-card-editor": HuiHumidifierCardEditor;
  }
}
