import "@material/mwc-button/mwc-button";
import "@polymer/paper-dropdown-menu/paper-dropdown-menu-light";
import "@polymer/paper-input/paper-textarea";
import { HassEntity } from "home-assistant-js-websocket";
import { css, CSSResultGroup, html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../common/dom/fire_event";
import "../../../components/entity/ha-entity-toggle";
import "../../../components/ha-blueprint-picker";
import "../../../components/ha-card";
import "../../../components/ha-circular-progress";
import "../../../components/ha-markdown";
import "../../../components/ha-selector/ha-selector";
import "../../../components/ha-settings-row";
import {
  BlueprintAutomationConfig,
  triggerAutomationActions,
} from "../../../data/automation";
import {
  BlueprintOrError,
  Blueprints,
  fetchBlueprints,
} from "../../../data/blueprint";
import { haStyle } from "../../../resources/styles";
import { HomeAssistant } from "../../../types";
import "../ha-config-section";

@customElement("blueprint-automation-editor")
export class HaBlueprintAutomationEditor extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public isWide!: boolean;

  @property({ reflect: true, type: Boolean }) public narrow!: boolean;

  @property() public config!: BlueprintAutomationConfig;

  @property() public stateObj?: HassEntity;

  @state() private _blueprints?: Blueprints;

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
    return html`
      <ha-config-section vertical .isWide=${this.isWide}>
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
                  <div>
                    <a href="/config/automation/trace/${this.config.id}">
                      <mwc-button>
                        ${this.hass.localize(
                          "ui.panel.config.automation.editor.show_trace"
                        )}
                      </mwc-button>
                    </a>
                    <mwc-button
                      @click=${this._runActions}
                      .stateObj=${this.stateObj}
                    >
                      ${this.hass.localize("ui.card.automation.trigger")}
                    </mwc-button>
                  </div>
                </div>
              `
            : ""}
        </ha-card>
      </ha-config-section>

      <ha-card
        class="blueprint"
        .header=${this.hass.localize(
          "ui.panel.config.automation.editor.blueprint.header"
        )}
      >
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
        </div>

        ${this.config.use_blueprint.path
          ? blueprint && "error" in blueprint
            ? html`<p class="warning padding">
                There is an error in this Blueprint: ${blueprint.error}
              </p>`
            : html`${blueprint?.metadata.description
                ? html`<ha-markdown
                    class="card-content"
                    breaks
                    .content=${blueprint.metadata.description}
                  ></ha-markdown>`
                : ""}
              ${blueprint?.metadata?.input &&
              Object.keys(blueprint.metadata.input).length
                ? Object.entries(blueprint.metadata.input).map(
                    ([key, value]) =>
                      html`<ha-settings-row .narrow=${this.narrow}>
                        <span slot="heading">${value?.name || key}</span>
                        <span slot="description">${value?.description}</span>
                        ${value?.selector
                          ? html`<ha-selector
                              .hass=${this.hass}
                              .selector=${value.selector}
                              .key=${key}
                              .value=${(this.config.use_blueprint.input &&
                                this.config.use_blueprint.input[key]) ??
                              value?.default}
                              @value-changed=${this._inputChanged}
                            ></ha-selector>`
                          : html`<paper-input
                              .key=${key}
                              required
                              .value=${(this.config.use_blueprint.input &&
                                this.config.use_blueprint.input[key]) ??
                              value?.default}
                              @value-changed=${this._inputChanged}
                              no-label-float
                            ></paper-input>`}
                      </ha-settings-row>`
                  )
                : html`<p class="padding">
                    ${this.hass.localize(
                      "ui.panel.config.automation.editor.blueprint.no_inputs"
                    )}
                  </p>`}`
          : ""}
      </ha-card>
    `;
  }

  private async _getBlueprints() {
    this._blueprints = await fetchBlueprints(this.hass, "automation");
  }

  private _runActions(ev: Event) {
    triggerAutomationActions(this.hass, (ev.target as any).stateObj.entity_id);
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
    const input = { ...this.config.use_blueprint.input, [key]: value };

    if (value === "" || value === undefined) {
      delete input[key];
    }

    fireEvent(this, "value-changed", {
      value: {
        ...this.config!,
        use_blueprint: {
          ...this.config.use_blueprint,
          input,
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
    const newVal = ev.detail.value;
    if ((this.config![name] || "") === newVal) {
      return;
    }
    fireEvent(this, "value-changed", {
      value: { ...this.config!, [name]: newVal },
    });
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        ha-card.blueprint {
          max-width: 1040px;
          margin: 24px auto;
        }
        .padding {
          padding: 16px;
        }
        .blueprint-picker-container {
          padding: 0 16px 16px;
        }
        h3 {
          margin: 16px;
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
        ha-settings-row {
          --paper-time-input-justify-content: flex-end;
          border-top: 1px solid var(--divider-color);
        }
        :host(:not([narrow])) ha-settings-row paper-input {
          width: 60%;
        }
        :host(:not([narrow])) ha-settings-row ha-selector {
          width: 60%;
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
