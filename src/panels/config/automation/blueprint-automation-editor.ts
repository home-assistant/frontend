import "@material/mwc-button/mwc-button";
import { HassEntity } from "home-assistant-js-websocket";
import { css, CSSResultGroup, html, LitElement, PropertyValues } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../common/dom/fire_event";
import "../../../components/ha-blueprint-picker";
import "../../../components/ha-card";
import "../../../components/ha-circular-progress";
import "../../../components/ha-markdown";
import "../../../components/ha-selector/ha-selector";
import "../../../components/ha-settings-row";
import "../../../components/ha-textfield";
import { BlueprintAutomationConfig } from "../../../data/automation";
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

  @state() private _showDescription = false;

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

  protected willUpdate(changedProps: PropertyValues): void {
    super.willUpdate(changedProps);
    if (
      !this._showDescription &&
      changedProps.has("config") &&
      this.config.description
    ) {
      this._showDescription = true;
    }
  }

  protected render() {
    const blueprint = this._blueprint;
    return html`
      <ha-config-section vertical .isWide=${this.isWide}>
        <span slot="introduction">
          ${this.hass.localize(
            "ui.panel.config.automation.editor.introduction"
          )}
        </span>
        <ha-card outlined>
          <div class="card-content">
            ${this._showDescription
              ? html`
                  <ha-textarea
                    .label=${this.hass.localize(
                      "ui.panel.config.automation.editor.description.label"
                    )}
                    .placeholder=${this.hass.localize(
                      "ui.panel.config.automation.editor.description.placeholder"
                    )}
                    name="description"
                    autogrow
                    .value=${this.config.description || ""}
                    @change=${this._valueChanged}
                  ></ha-textarea>
                `
              : html`
                  <div class="link-button-row">
                    <button class="link" @click=${this._addDescription}>
                      ${this.hass.localize(
                        "ui.panel.config.automation.editor.description.add"
                      )}
                    </button>
                  </div>
                `}
          </div>
        </ha-card>
      </ha-config-section>

      <ha-card
        outlined
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
                        <ha-markdown
                          slot="description"
                          class="card-content"
                          breaks
                          .content=${value?.description}
                        ></ha-markdown>
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
                          : html`<ha-textfield
                              .key=${key}
                              required
                              .value=${(this.config.use_blueprint.input &&
                                this.config.use_blueprint.input[key]) ??
                              value?.default}
                              @input=${this._inputChanged}
                            ></ha-textfield>`}
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
    const value = ev.detail?.value || target.value;
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
    const newVal = target.value;
    if ((this.config![name] || "") === newVal) {
      return;
    }
    fireEvent(this, "value-changed", {
      value: { ...this.config!, [name]: newVal },
    });
  }

  private _addDescription() {
    this._showDescription = true;
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
        .link-button-row {
          padding: 14px;
        }
        .blueprint-picker-container {
          padding: 0 16px 16px;
        }
        ha-textarea,
        ha-textfield,
        ha-blueprint-picker {
          display: block;
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
        ha-settings-row {
          --paper-time-input-justify-content: flex-end;
          --settings-row-content-width: 100%;
          --settings-row-prefix-display: contents;
          border-top: 1px solid var(--divider-color);
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
