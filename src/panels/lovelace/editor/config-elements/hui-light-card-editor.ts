import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators";
import { assert, object, optional, string, assign } from "superstruct";
import type { HassEntity } from "home-assistant-js-websocket";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../../../common/dom/fire_event";
import type { ActionConfig } from "../../../../data/lovelace";
import type { HomeAssistant } from "../../../../types";
import type { LightCardConfig } from "../../cards/types";
import "../../components/hui-action-editor";
import type { LovelaceCardEditor } from "../../types";
import { actionConfigStruct } from "../structs/action-struct";
import type { EditorTarget } from "../types";
import { configElementStyle } from "./config-elements-style";
import { baseLovelaceCardConfig } from "../structs/base-card-struct";
import { domainIcon } from "../../../../common/entity/domain_icon";
import { computeDomain } from "../../../../common/entity/compute_domain";
import type { SchemaUnion } from "../../../../components/ha-form/types";

const cardConfigStruct = assign(
  baseLovelaceCardConfig,
  object({
    name: optional(string()),
    entity: optional(string()),
    theme: optional(string()),
    icon: optional(string()),
    hold_action: optional(actionConfigStruct),
    double_tap_action: optional(actionConfigStruct),
  })
);

@customElement("hui-light-card-editor")
export class HuiLightCardEditor
  extends LitElement
  implements LovelaceCardEditor
{
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: LightCardConfig;

  public setConfig(config: LightCardConfig): void {
    assert(config, cardConfigStruct);
    this._config = config;
  }

  private _schema = memoizeOne(
    (entity: string, icon: string | undefined, entityState: HassEntity) =>
      [
        {
          name: "entity",
          required: true,
          selector: { entity: { domain: "light" } },
        },
        {
          type: "grid",
          name: "",
          schema: [
            { name: "name", selector: { text: {} } },
            {
              name: "icon",
              selector: {
                icon: {
                  placeholder: icon || entityState?.attributes.icon,
                  fallbackPath:
                    !icon && !entityState?.attributes.icon && entityState
                      ? domainIcon(computeDomain(entity), entityState)
                      : undefined,
                },
              },
            },
          ],
        },
        { name: "theme", selector: { theme: {} } },
      ] as const
  );

  get _hold_action(): ActionConfig {
    return this._config!.hold_action || { action: "more-info" };
  }

  get _double_tap_action(): ActionConfig | undefined {
    return this._config!.double_tap_action;
  }

  protected render(): TemplateResult {
    if (!this.hass || !this._config) {
      return html``;
    }

    const actions = [
      "more-info",
      "toggle",
      "navigate",
      "url",
      "call-service",
      "none",
    ];

    const entityState = this.hass.states[this._config.entity];
    const schema = this._schema(
      this._config.entity,
      this._config.icon,
      entityState
    );

    return html`
      <ha-form
        .hass=${this.hass}
        .data=${this._config}
        .schema=${schema}
        .computeLabel=${this._computeLabelCallback}
        @value-changed=${this._valueChanged}
      ></ha-form>
      <div class="card-config">
        <hui-action-editor
          .label="${this.hass.localize(
            "ui.panel.lovelace.editor.card.generic.hold_action"
          )} (${this.hass.localize(
            "ui.panel.lovelace.editor.card.config.optional"
          )})"
          .hass=${this.hass}
          .config=${this._hold_action}
          .actions=${actions}
          .configValue=${"hold_action"}
          @value-changed=${this._actionChanged}
        ></hui-action-editor>

        <hui-action-editor
          .label="${this.hass.localize(
            "ui.panel.lovelace.editor.card.generic.double_tap_action"
          )} (${this.hass.localize(
            "ui.panel.lovelace.editor.card.config.optional"
          )})"
          .hass=${this.hass}
          .config=${this._double_tap_action}
          .actions=${actions}
          .configValue=${"double_tap_action"}
          @value-changed=${this._actionChanged}
        ></hui-action-editor>
      </div>
    `;
  }

  private _actionChanged(ev: CustomEvent): void {
    if (!this._config || !this.hass) {
      return;
    }
    const target = ev.target! as EditorTarget;
    const value = ev.detail.value;

    if (this[`_${target.configValue}`] === value) {
      return;
    }
    if (target.configValue) {
      if (value !== false && !value) {
        this._config = { ...this._config };
        delete this._config[target.configValue!];
      } else {
        this._config = {
          ...this._config,
          [target.configValue!]: value,
        };
      }
    }
    fireEvent(this, "config-changed", { config: this._config });
  }

  private _valueChanged(ev: CustomEvent): void {
    fireEvent(this, "config-changed", { config: ev.detail.value });
  }

  private _computeLabelCallback = (
    schema: SchemaUnion<ReturnType<typeof this._schema>>
  ) => {
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

  static styles: CSSResultGroup = [
    configElementStyle,
    css`
      ha-form,
      hui-action-editor {
        display: block;
        margin-bottom: 24px;
        overflow: auto;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-light-card-editor": HuiLightCardEditor;
  }
}
