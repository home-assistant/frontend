import { mdiListBox } from "@mdi/js";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import {
  any,
  array,
  assert,
  assign,
  boolean,
  object,
  optional,
  string,
} from "superstruct";
import type { HASSDomEvent } from "../../../../common/dom/fire_event";
import { fireEvent } from "../../../../common/dom/fire_event";
import "../../../../components/ha-expansion-panel";
import "../../../../components/ha-form/ha-form";
import type {
  HaFormSchema,
  SchemaUnion,
} from "../../../../components/ha-form/types";
import "../../../../components/ha-svg-icon";
import type { HomeAssistant } from "../../../../types";
import type {
  LovelaceCardFeatureConfig,
  LovelaceCardFeatureContext,
} from "../../card-features/types";
import type { HumidifierCardConfig } from "../../cards/types";
import type { LovelaceCardEditor } from "../../types";
import { baseLovelaceCardConfig } from "../structs/base-card-struct";
import type { EditDetailElementEvent, EditSubElementEvent } from "../types";
import { configElementStyle } from "./config-elements-style";
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
    show_current_as_primary: optional(boolean()),
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
  {
    name: "show_current_as_primary",
    selector: {
      boolean: {},
    },
  },
] as const satisfies readonly HaFormSchema[];

@customElement("hui-humidifier-card-editor")
export class HuiHumidifierCardEditor
  extends LitElement
  implements LovelaceCardEditor
{
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: HumidifierCardConfig;

  public setConfig(config: HumidifierCardConfig): void {
    assert(config, cardConfigStruct);
    this._config = config;
  }

  protected render() {
    if (!this.hass || !this._config) {
      return nothing;
    }

    const entityId = this._config!.entity;
    const stateObj = entityId ? this.hass!.states[entityId] : undefined;

    return html`
      <ha-form
        .hass=${this.hass}
        .data=${this._config}
        .schema=${SCHEMA}
        .computeLabel=${this._computeLabelCallback}
        @value-changed=${this._valueChanged}
      ></ha-form>
      <ha-expansion-panel outlined>
        <ha-svg-icon slot="leading-icon" .path=${mdiListBox}></ha-svg-icon>
        <h3 slot="header">
          ${this.hass!.localize(
            "ui.panel.lovelace.editor.card.generic.features"
          )}
        </h3>
        <div class="content">
          <hui-card-features-editor
            .hass=${this.hass}
            .stateObj=${stateObj}
            .featuresTypes=${COMPATIBLE_FEATURES_TYPES}
            .features=${this._config!.features ?? []}
            @features-changed=${this._featuresChanged}
            @edit-detail-element=${this._editDetailElement}
          ></hui-card-features-editor>
        </div>
      </ha-expansion-panel>
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

  private _editDetailElement(ev: HASSDomEvent<EditDetailElementEvent>): void {
    const index = ev.detail.subElementConfig.index;
    const config = this._config!.features![index!];

    fireEvent(this, "edit-sub-element", {
      config: config,
      saveConfig: (newConfig) => this._updateFeature(index!, newConfig),
      context: {
        entity_id: this._config!.entity,
      },
      type: "feature",
    } as EditSubElementEvent<
      LovelaceCardFeatureConfig,
      LovelaceCardFeatureContext
    >);
  }

  private _updateFeature(index: number, feature: LovelaceCardFeatureConfig) {
    const features = this._config!.features!.concat();
    features[index] = feature;
    const config = { ...this._config!, features };
    fireEvent(this, "config-changed", {
      config: config,
    });
  }

  private _computeLabelCallback = (schema: SchemaUnion<typeof SCHEMA>) => {
    if (schema.name === "show_current_as_primary") {
      return this.hass!.localize(
        "ui.panel.lovelace.editor.card.humidifier.show_current_as_primary"
      );
    }

    return this.hass!.localize(
      `ui.panel.lovelace.editor.card.generic.${schema.name}`
    );
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
    "hui-humidifier-card-editor": HuiHumidifierCardEditor;
  }
}
