import { css, CSSResultGroup, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../common/dom/fire_event";
import { nestedArrayMove } from "../../../common/util/array-move";
import "../../../components/ha-alert";
import "../../../components/ha-blueprint-picker";
import "../../../components/ha-card";
import "../../../components/ha-circular-progress";
import "../../../components/ha-markdown";
import "../../../components/ha-selector/ha-selector";
import "../../../components/ha-settings-row";
import {
  BlueprintOrError,
  Blueprints,
  fetchBlueprints,
} from "../../../data/blueprint";
import { BlueprintScriptConfig } from "../../../data/script";
import { haStyle } from "../../../resources/styles";
import { HomeAssistant } from "../../../types";
import "../ha-config-section";
import { ReorderModeMixin } from "../../../state/reorder-mode-mixin";

@customElement("blueprint-script-editor")
export class HaBlueprintScriptEditor extends ReorderModeMixin(LitElement) {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public isWide = false;

  @property({ reflect: true, type: Boolean }) public narrow!: boolean;

  @property({ type: Boolean }) public disabled = false;

  @property({ attribute: false }) public config!: BlueprintScriptConfig;

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
      ${this.disabled
        ? html`<ha-alert alert-type="warning">
            ${this.hass.localize("ui.panel.config.script.editor.read_only")}
            <mwc-button slot="action" @click=${this._duplicate}>
              ${this.hass.localize("ui.panel.config.script.editor.migrate")}
            </mwc-button>
          </ha-alert>`
        : ""}
      ${this._renderReorderModeAlert()}
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
                    .disabled=${this.disabled}
                    @value-changed=${this._blueprintChanged}
                  ></ha-blueprint-picker>
                `
              : this.hass.localize(
                  "ui.panel.config.automation.editor.blueprint.no_blueprints"
                )
            : html`<ha-circular-progress indeterminate></ha-circular-progress>`}
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
                    ([key, value]) => {
                      const selector = value?.selector ?? { text: undefined };
                      const type = Object.keys(selector)[0];
                      const enhancedSelector = [
                        "action",
                        "condition",
                        "trigger",
                      ].includes(type)
                        ? {
                            [type]: {
                              ...selector[type],
                              path: [key],
                            },
                          }
                        : selector;

                      return html`<ha-settings-row .narrow=${this.narrow}>
                        <span slot="heading">${value?.name || key}</span>
                        <ha-markdown
                          slot="description"
                          class="card-content"
                          breaks
                          .content=${value?.description}
                        ></ha-markdown>
                        ${html`<ha-selector
                          .hass=${this.hass}
                          .selector=${enhancedSelector}
                          .key=${key}
                          .disabled=${this.disabled}
                          .required=${value?.default === undefined}
                          .placeholder=${value?.default}
                          .value=${this.config.use_blueprint.input &&
                          key in this.config.use_blueprint.input
                            ? this.config.use_blueprint.input[key]
                            : value?.default}
                          @value-changed=${this._inputChanged}
                          @item-moved=${this._itemMoved}
                        ></ha-selector>`}
                      </ha-settings-row>`;
                    }
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

  private _renderReorderModeAlert() {
    if (!this._reorderMode.active) {
      return nothing;
    }
    return html`
      <ha-alert
        class="re-order"
        alert-type="info"
        .title=${this.hass.localize(
          "ui.panel.config.automation.editor.re_order_mode.title"
        )}
      >
        ${this.hass.localize(
          "ui.panel.config.automation.editor.re_order_mode.description_all"
        )}
        <ha-button slot="action" @click=${this._exitReOrderMode}>
          ${this.hass.localize(
            "ui.panel.config.automation.editor.re_order_mode.exit"
          )}
        </ha-button>
      </ha-alert>
    `;
  }

  private async _exitReOrderMode() {
    this._reorderMode.exit();
  }

  private async _getBlueprints() {
    this._blueprints = await fetchBlueprints(this.hass, "script");
  }

  private _blueprintChanged(ev) {
    ev.stopPropagation();
    if (this.config.use_blueprint.path === ev.detail.value) {
      return;
    }
    fireEvent(this, "value-changed", {
      value: {
        ...this.config,
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
    const value = ev.detail ? ev.detail.value : target.value;
    if (
      (this.config.use_blueprint.input &&
        this.config.use_blueprint.input[key] === value) ||
      (!this.config.use_blueprint.input && value === "")
    ) {
      return;
    }
    const input = { ...this.config.use_blueprint.input, [key]: value };

    fireEvent(this, "value-changed", {
      value: {
        ...this.config,
        use_blueprint: {
          ...this.config.use_blueprint,
          input,
        },
      },
    });
  }

  private _itemMoved(ev) {
    ev.stopPropagation();
    const { oldIndex, newIndex, oldPath, newPath } = ev.detail;

    const input = nestedArrayMove(
      this.config.use_blueprint.input,
      oldIndex,
      newIndex,
      oldPath,
      newPath
    );

    fireEvent(this, "value-changed", {
      value: {
        ...this.config,
        use_blueprint: {
          ...this.config.use_blueprint,
          input,
        },
      },
    });
  }

  private _duplicate() {
    fireEvent(this, "duplicate");
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        :host {
          display: block;
        }
        ha-card.blueprint {
          margin: 0 auto;
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
        ha-textfield,
        ha-blueprint-picker {
          display: block;
        }
        h3 {
          margin: 16px;
        }
        .introduction {
          margin-top: 0;
          margin-bottom: 12px;
        }
        .introduction a {
          color: var(--primary-color);
        }
        p {
          margin-bottom: 0;
        }
        .description {
          margin-bottom: 16px;
        }
        ha-settings-row {
          --paper-time-input-justify-content: flex-end;
          --settings-row-content-width: 100%;
          --settings-row-prefix-display: contents;
          border-top: 1px solid var(--divider-color);
        }
        ha-alert {
          margin-bottom: 16px;
          display: block;
        }
        ha-alert.re-order {
          border-radius: var(--ha-card-border-radius, 12px);
          overflow: hidden;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "blueprint-script-editor": HaBlueprintScriptEditor;
  }
}
