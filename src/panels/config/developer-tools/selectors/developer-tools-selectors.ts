import { mdiContentCopy } from "@mdi/js";
import type { CSSResultGroup, TemplateResult } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { dump } from "js-yaml";
import { copyToClipboard } from "../../../../common/util/copy-clipboard";
import "../../../../components/ha-alert";
import "../../../../components/ha-button";
import "../../../../components/ha-card";
import "../../../../components/ha-icon-button";
import "../../../../components/ha-md-list";
import "../../../../components/ha-md-list-item";
import "../../../../components/ha-select";
import "../../../../components/ha-switch";
import "../../../../components/ha-yaml-editor";
import "../../../../components/ha-selector/ha-selector";
import type { Selector } from "../../../../data/selector";
import { haStyle } from "../../../../resources/styles";
import type { HomeAssistant } from "../../../../types";
import { showToast } from "../../../../util/toast";
import type { SelectorKey } from "./presets";
import {
  SELECTOR_OPTIONS,
  SELECTOR_PRESETS,
  formatSelectorName,
  getInitialConfig,
  getVariants,
} from "./presets";

const formatYaml = (value: unknown): string => {
  if (value === undefined) {
    return "";
  }
  try {
    return dump(value, { quotingType: '"', noRefs: true, lineWidth: 100 });
  } catch (_err) {
    return String(value);
  }
};

@customElement("developer-tools-selectors")
class DeveloperToolsSelectors extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public narrow = false;

  @state() private _type: SelectorKey = "select";

  @state() private _variantId: string =
    getVariants("select")[0]?.id ?? "default";

  @state() private _config: Record<string, unknown> =
    getInitialConfig("select");

  @state() private _configValid = true;

  @state() private _value: unknown;

  @state() private _label = true;

  @state() private _helper = false;

  @state() private _required = false;

  @state() private _disabled = false;

  protected render(): TemplateResult {
    const selector = { [this._type]: this._config } as unknown as Selector;
    const configYaml = formatYaml(selector).trimEnd();
    const variants = getVariants(this._type);
    const showVariants = variants.length > 1;
    const variantOptions = variants.map((v) => ({
      value: v.id,
      label: v.name,
    }));
    return html`
      <div class="content">
        <ha-card header=${this._localizeTitle()}>
          <div class="card-content">
            <p class="description">
              ${this.hass.localize(
                "ui.panel.config.developer-tools.tabs.selectors.description"
              )}
            </p>

            <div class="grid">
              <div class="config-pane">
                <ha-select
                  .label=${this.hass.localize(
                    "ui.panel.config.developer-tools.tabs.selectors.selector_type"
                  )}
                  .value=${this._type}
                  .options=${SELECTOR_OPTIONS}
                  @selected=${this._typeSelected}
                ></ha-select>
                ${showVariants
                  ? html`
                      <ha-select
                        .label=${this.hass.localize(
                          "ui.panel.config.developer-tools.tabs.selectors.preset"
                        )}
                        .value=${this._variantId}
                        .options=${variantOptions}
                        @selected=${this._variantSelected}
                      ></ha-select>
                    `
                  : nothing}

                <ha-md-list class="toggles">
                  <ha-md-list-item>
                    <span slot="headline">Label</span>
                    <span slot="supporting-text"
                      >Pass the selector type as the field label.</span
                    >
                    <ha-switch
                      slot="end"
                      .name=${"label"}
                      .checked=${this._label}
                      @change=${this._toggleChanged}
                    ></ha-switch>
                  </ha-md-list-item>
                  <ha-md-list-item>
                    <span slot="headline">Helper</span>
                    <span slot="supporting-text"
                      >Show a helper text below the field.</span
                    >
                    <ha-switch
                      slot="end"
                      .name=${"helper"}
                      .checked=${this._helper}
                      @change=${this._toggleChanged}
                    ></ha-switch>
                  </ha-md-list-item>
                  <ha-md-list-item>
                    <span slot="headline">Required</span>
                    <span slot="supporting-text"
                      >Mark the selector as required.</span
                    >
                    <ha-switch
                      slot="end"
                      .name=${"required"}
                      .checked=${this._required}
                      @change=${this._toggleChanged}
                    ></ha-switch>
                  </ha-md-list-item>
                  <ha-md-list-item>
                    <span slot="headline">Disabled</span>
                    <span slot="supporting-text"
                      >Render the selector in its disabled state.</span
                    >
                    <ha-switch
                      slot="end"
                      .name=${"disabled"}
                      .checked=${this._disabled}
                      @change=${this._toggleChanged}
                    ></ha-switch>
                  </ha-md-list-item>
                </ha-md-list>

                <div class="field">
                  <div class="field-label">
                    ${this.hass.localize(
                      "ui.panel.config.developer-tools.tabs.selectors.configuration"
                    )}
                  </div>
                  <ha-yaml-editor
                    .hass=${this.hass}
                    .value=${this._config}
                    @value-changed=${this._configChanged}
                  ></ha-yaml-editor>
                </div>

                <div class="actions">
                  <ha-button @click=${this._resetConfig} appearance="plain">
                    ${this.hass.localize(
                      "ui.panel.config.developer-tools.tabs.selectors.reset_config"
                    )}
                  </ha-button>
                  <ha-button @click=${this._resetValue} appearance="plain">
                    ${this.hass.localize(
                      "ui.panel.config.developer-tools.tabs.selectors.reset_value"
                    )}
                  </ha-button>
                </div>
              </div>

              <div class="preview-pane">
                <div class="field">
                  <div class="field-label">
                    ${this.hass.localize(
                      "ui.panel.config.developer-tools.tabs.selectors.preview"
                    )}
                  </div>
                  <div class="preview">
                    ${this._configValid
                      ? html`
                          <ha-selector
                            .hass=${this.hass}
                            .narrow=${this.narrow}
                            .selector=${selector}
                            .value=${this._value}
                            .label=${this._label
                              ? formatSelectorName(this._type)
                              : undefined}
                            .helper=${this._helper
                              ? "Example helper text"
                              : undefined}
                            .required=${this._required}
                            .disabled=${this._disabled}
                            @value-changed=${this._valueChanged}
                          ></ha-selector>
                        `
                      : html`
                          <ha-alert alert-type="warning">
                            ${this.hass.localize(
                              "ui.panel.config.developer-tools.tabs.selectors.invalid_config"
                            )}
                          </ha-alert>
                        `}
                  </div>
                </div>

                <div class="field">
                  <div class="field-header">
                    <div class="field-label">
                      ${this.hass.localize(
                        "ui.panel.config.developer-tools.tabs.selectors.configuration_used"
                      )}
                    </div>
                    <ha-icon-button
                      .label=${this.hass.localize(
                        "ui.panel.config.developer-tools.tabs.selectors.copy_configuration"
                      )}
                      .path=${mdiContentCopy}
                      .disabled=${!this._configValid}
                      @click=${this._copyConfig}
                    ></ha-icon-button>
                  </div>
                  <pre class="value">${configYaml || nothing}</pre>
                </div>

                <div class="field">
                  <div class="field-label">
                    ${this.hass.localize(
                      "ui.panel.config.developer-tools.tabs.selectors.value"
                    )}
                  </div>
                  <pre class="value">${this._renderValue()}</pre>
                </div>
              </div>
            </div>
          </div>
        </ha-card>
      </div>
    `;
  }

  private async _copyConfig() {
    const selector = { [this._type]: this._config };
    const yaml = formatYaml(selector).trimEnd();
    if (!yaml) {
      return;
    }
    await copyToClipboard(yaml);
    showToast(this, {
      message: this.hass.localize("ui.common.copied_clipboard"),
    });
  }

  private _renderValue() {
    if (this._value === undefined || this._value === null) {
      return html`<span class="muted"
        >${this.hass.localize(
          "ui.panel.config.developer-tools.tabs.selectors.no_value"
        )}</span
      >`;
    }
    const yaml = formatYaml(this._value).trimEnd();
    return yaml || nothing;
  }

  private _localizeTitle() {
    return this.hass.localize(
      "ui.panel.config.developer-tools.tabs.selectors.title"
    );
  }

  private _typeSelected(ev: CustomEvent<{ value: string | undefined }>) {
    ev.stopPropagation();
    const newType = ev.detail?.value as SelectorKey | undefined;
    if (!newType || newType === this._type) {
      return;
    }
    this._type = newType;
    const variants = getVariants(newType);
    this._variantId = variants[0]?.id ?? "default";
    this._config = { ...(variants[0]?.config ?? {}) };
    this._configValid = true;
    this._value = undefined;
  }

  private _variantSelected(ev: CustomEvent<{ value: string | undefined }>) {
    ev.stopPropagation();
    const newVariantId = ev.detail?.value;
    if (!newVariantId || newVariantId === this._variantId) {
      return;
    }
    const variant = getVariants(this._type).find((v) => v.id === newVariantId);
    if (!variant) {
      return;
    }
    this._variantId = newVariantId;
    this._config = { ...variant.config };
    this._configValid = true;
    this._value = undefined;
  }

  private _configChanged(ev: CustomEvent) {
    ev.stopPropagation();
    const { value, isValid } = ev.detail as {
      value: Record<string, unknown>;
      isValid: boolean;
    };
    this._configValid = isValid;
    if (!isValid) {
      return;
    }
    this._config = value ?? {};
  }

  private _valueChanged(ev: CustomEvent) {
    ev.stopPropagation();
    this._value = ev.detail?.value;
  }

  private _toggleChanged(ev: Event) {
    const target = ev.target as HTMLInputElement & { name: string };
    const key = `_${target.name}` as
      | "_label"
      | "_helper"
      | "_required"
      | "_disabled";
    this[key] = target.checked;
  }

  private _resetConfig() {
    const variant = getVariants(this._type).find(
      (v) => v.id === this._variantId
    );
    this._config = {
      ...(variant?.config ?? SELECTOR_PRESETS[this._type] ?? {}),
    };
    this._configValid = true;
  }

  private _resetValue() {
    this._value = undefined;
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        :host {
          display: block;
        }
        .content {
          padding: var(--ha-space-4);
          max-width: 1400px;
          margin: 0 auto;
        }
        .description {
          margin-top: 0;
          color: var(--secondary-text-color);
        }
        .grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: var(--ha-space-5);
        }
        @media (max-width: 870px) {
          .grid {
            grid-template-columns: 1fr;
          }
        }
        .config-pane,
        .preview-pane {
          display: flex;
          flex-direction: column;
          gap: var(--ha-space-4);
          min-width: 0;
        }
        ha-select {
          width: 100%;
        }
        .toggles {
          padding: 0;
          background: none;
          border: 1px solid var(--divider-color);
          border-radius: var(--ha-border-radius-md, 8px);
          overflow: hidden;
        }
        .field {
          display: flex;
          flex-direction: column;
          gap: var(--ha-space-2);
          min-width: 0;
        }
        .field-label {
          font-weight: var(--ha-font-weight-medium);
          color: var(--secondary-text-color);
          font-size: var(--ha-font-size-s);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .field-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: var(--ha-space-2);
        }
        .field-header .field-label {
          flex: 1;
        }
        .field-header ha-icon-button {
          --mdc-icon-button-size: 32px;
          --mdc-icon-size: 18px;
          color: var(--secondary-text-color);
        }
        .preview {
          padding: var(--ha-space-3);
          border: 1px solid var(--divider-color);
          border-radius: var(--ha-border-radius-md, 8px);
          background: var(--card-background-color);
          min-height: 56px;
        }
        .value {
          padding: var(--ha-space-3);
          border: 1px solid var(--divider-color);
          border-radius: var(--ha-border-radius-md, 8px);
          background: var(
            --code-editor-background-color,
            var(--primary-background-color)
          );
          font-family: var(--ha-font-family-code);
          font-size: var(--ha-font-size-s);
          white-space: pre-wrap;
          word-break: break-word;
          margin: 0;
          overflow: auto;
          max-height: 400px;
        }
        .muted {
          color: var(--secondary-text-color);
          font-style: italic;
        }
        .actions {
          display: flex;
          gap: var(--ha-space-2);
          flex-wrap: wrap;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "developer-tools-selectors": DeveloperToolsSelectors;
  }
}
