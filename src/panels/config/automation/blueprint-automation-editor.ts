import {
  css,
  CSSResult,
  customElement,
  internalProperty,
  LitElement,
  property,
} from "lit-element";
import { html } from "lit-html";
import {
  BlueprintAutomationConfig,
  triggerAutomation,
} from "../../../data/automation";
import { HomeAssistant } from "../../../types";
import "../ha-config-section";
import "../../../components/ha-card";
import "@polymer/paper-input/paper-textarea";
import "@polymer/paper-dropdown-menu/paper-dropdown-menu-light";
import "../../../components/entity/ha-entity-toggle";
import "@material/mwc-button/mwc-button";
import "./trigger/ha-automation-trigger";
import "./condition/ha-automation-condition";
import "./action/ha-automation-action";
import { fireEvent } from "../../../common/dom/fire_event";
import { haStyle } from "../../../resources/styles";
import { HassEntity } from "home-assistant-js-websocket";
import { navigate } from "../../../common/navigate";
import {
  BlueprintOrError,
  Blueprints,
  fetchBlueprints,
} from "../../../data/blueprint";
import "../../../components/ha-blueprint-picker";
import "../../../components/ha-circular-progress";
import "../../../components/ha-selector/ha-selector";

@customElement("blueprint-automation-editor")
export class HaBlueprintAutomationEditor extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public isWide!: boolean;

  @property() public narrow!: boolean;

  @property() public config!: BlueprintAutomationConfig;

  @property() public stateObj?: HassEntity;

  @internalProperty() private _blueprints?: Blueprints;

  protected firstUpdated(changedProps) {
    super.firstUpdated(changedProps);
    this._getBlueprints();
  }

  private get _blueprint(): BlueprintOrError | undefined {
    if (!this._blueprints) {
      return undefined;
    }
    return this._blueprints[this.config.use_blueprint.path];
  }

  protected render() {
    const blueprint = this._blueprint;
    return html`<ha-config-section .isWide=${this.isWide}>
        ${!this.narrow
          ? html` <span slot="header">${this.config.alias}</span> `
          : ""}
        <span slot="introduction">
          ${this.hass.localize(
            "ui.panel.config.automation.editor.introduction"
          )}
        </span>
        <ha-card>
          <div class="card-content">
            <paper-input
              .label=${this.hass.localize(
                "ui.panel.config.automation.editor.alias"
              )}
              name="alias"
              .value=${this.config.alias}
              @value-changed=${this._valueChanged}
            >
            </paper-input>
            <paper-textarea
              .label=${this.hass.localize(
                "ui.panel.config.automation.editor.description.label"
              )}
              .placeholder=${this.hass.localize(
                "ui.panel.config.automation.editor.description.placeholder"
              )}
              name="description"
              .value=${this.config.description}
              @value-changed=${this._valueChanged}
            ></paper-textarea>
          </div>
          ${this.stateObj
            ? html`
                <div class="card-actions layout horizontal justified center">
                  <div class="layout horizontal center">
                    <ha-entity-toggle
                      .hass=${this.hass}
                      .stateObj=${this.stateObj!}
                    ></ha-entity-toggle>
                    ${this.hass.localize(
                      "ui.panel.config.automation.editor.enable_disable"
                    )}
                  </div>
                  <mwc-button
                    @click=${this._excuteAutomation}
                    .stateObj=${this.stateObj}
                  >
                    ${this.hass.localize("ui.card.automation.trigger")}
                  </mwc-button>
                </div>
              `
            : ""}
        </ha-card>
      </ha-config-section>

      <ha-config-section .isWide=${this.isWide}>
        <span slot="header"
          >${this.hass.localize(
            "ui.panel.config.automation.editor.blueprint.header"
          )}</span
        >
        <ha-card>
          <div class="card-content">
            <div class="blueprint-picker-container">
              ${this._blueprints
                ? Object.keys(this._blueprints).length
                  ? html`
                      <ha-blueprint-picker
                        .hass=${this.hass}
                        .label=${this.hass.localize(
                          "ui.panel.config.automation.editor.blueprint.blueprint_to_use"
                        )}
                        .blueprints=${this._blueprints}
                        .value=${this.config.use_blueprint.path}
                        @value-changed=${this._blueprintChanged}
                      ></ha-blueprint-picker>
                    `
                  : this.hass.localize(
                      "ui.panel.config.automation.editor.blueprint.no_blueprints"
                    )
                : html`<ha-circular-progress active></ha-circular-progress>`}
              <mwc-button @click=${this._navigateBlueprints}>
                ${this.hass.localize(
                  "ui.panel.config.automation.editor.blueprint.manage_blueprints"
                )}
              </mwc-button>
            </div>

            ${this.config.use_blueprint.path
              ? blueprint && "error" in blueprint
                ? html`<p class="warning">
                    There is an error in this Blueprint: ${blueprint.error}
                  </p>`
                : blueprint?.metadata?.input &&
                  Object.keys(blueprint.metadata.input).length
                ? html`<h3>
                      ${this.hass.localize(
                        "ui.panel.config.automation.editor.blueprint.inputs"
                      )}
                    </h3>
                    ${Object.entries(blueprint.metadata.input).map(
                      ([key, value]) =>
                        html`<div>
                          ${value?.description}
                          ${value?.selector
                            ? html`<ha-selector
                                .hass=${this.hass}
                                .selector=${value.selector}
                                .key=${key}
                                .label=${value?.name || key}
                                .value=${this.config.use_blueprint.input &&
                                this.config.use_blueprint.input[key]}
                                @value-changed=${this._inputChanged}
                              ></ha-selector>`
                            : html`<paper-input
                                .key=${key}
                                .label=${value?.name || key}
                                .value=${this.config.use_blueprint.input &&
                                this.config.use_blueprint.input[key]}
                                @value-changed=${this._inputChanged}
                              ></paper-input>`}
                        </div>`
                    )}`
                : this.hass.localize(
                    "ui.panel.config.automation.editor.blueprint.no_inputs"
                  )
              : ""}
          </div>
        </ha-card>
      </ha-config-section>`;
  }

  private async _getBlueprints() {
    this._blueprints = await fetchBlueprints(this.hass, "automation");
  }

  private _excuteAutomation(ev: Event) {
    triggerAutomation(this.hass, (ev.target as any).stateObj.entity_id);
  }

  private _blueprintChanged(ev) {
    ev.stopPropagation();
    if (this.config.use_blueprint.path === ev.detail.value) {
      return;
    }
    fireEvent(this, "value-changed", {
      value: {
        ...this.config!,
        use_blueprint: {
          path: ev.detail.value,
        },
      },
    });
  }

  private _inputChanged(ev) {
    ev.stopPropagation();
    const target = ev.target as any;
    const key = target.key;
    const value = ev.detail.value;
    if (
      (this.config.use_blueprint.input &&
        this.config.use_blueprint.input[key] === value) ||
      (!this.config.use_blueprint.input && value === "")
    ) {
      return;
    }
    fireEvent(this, "value-changed", {
      value: {
        ...this.config!,
        use_blueprint: {
          ...this.config.use_blueprint,
          input: { ...this.config.use_blueprint.input, [key]: value },
        },
      },
    });
  }

  private _valueChanged(ev: CustomEvent) {
    ev.stopPropagation();
    const target = ev.target as any;
    const name = target.name;
    if (!name) {
      return;
    }
    let newVal = ev.detail.value;
    if (target.type === "number") {
      newVal = Number(newVal);
    }
    if ((this.config![name] || "") === newVal) {
      return;
    }
    fireEvent(this, "value-changed", {
      value: { ...this.config!, [name]: newVal },
    });
  }

  private _navigateBlueprints() {
    navigate(this, "/config/blueprint");
  }

  static get styles(): CSSResult[] {
    return [
      haStyle,
      css`
        ha-card {
          overflow: hidden;
        }
        .errors {
          padding: 20px;
          font-weight: bold;
          color: var(--error-color);
        }
        .content {
          padding-bottom: 20px;
        }
        .blueprint-picker-container {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        h3 {
          margin-top: 16px;
        }
        span[slot="introduction"] a {
          color: var(--primary-color);
        }
        p {
          margin-bottom: 0;
        }
        ha-entity-toggle {
          margin-right: 8px;
        }
        mwc-fab {
          position: relative;
          bottom: calc(-80px - env(safe-area-inset-bottom));
          transition: bottom 0.3s;
        }
        mwc-fab.dirty {
          bottom: 0;
        }
        .selected_menu_item {
          color: var(--primary-color);
        }
        li[role="separator"] {
          border-bottom-color: var(--divider-color);
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "blueprint-automation-editor": HaBlueprintAutomationEditor;
  }
}
