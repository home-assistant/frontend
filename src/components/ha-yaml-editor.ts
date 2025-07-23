import type { Schema } from "js-yaml";
import { DEFAULT_SCHEMA, dump, load } from "js-yaml";
import type { CSSResultGroup, PropertyValues } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { fireEvent } from "../common/dom/fire_event";
import type { HomeAssistant } from "../types";
import { haStyle } from "../resources/styles";
import "./ha-code-editor";
import { showToast } from "../util/toast";
import { copyToClipboard } from "../common/util/copy-clipboard";
import type { HaCodeEditor } from "./ha-code-editor";
import "./ha-button";
import "./ha-alert";

const isEmpty = (obj: Record<string, unknown>): boolean => {
  if (typeof obj !== "object" || obj === null) {
    return false;
  }
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      return false;
    }
  }
  return true;
};

@customElement("ha-yaml-editor")
export class HaYamlEditor extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public value?: any;

  @property({ attribute: false }) public yamlSchema: Schema = DEFAULT_SCHEMA;

  @property({ attribute: false }) public defaultValue?: any;

  @property({ attribute: "is-valid", type: Boolean }) public isValid = true;

  @property() public label?: string;

  @property({ attribute: "auto-update", type: Boolean }) public autoUpdate =
    false;

  @property({ attribute: "read-only", type: Boolean }) public readOnly = false;

  @property({ type: Boolean, attribute: "disable-fullscreen" })
  public disableFullscreen = false;

  @property({ type: Boolean }) public required = false;

  @property({ attribute: "copy-clipboard", type: Boolean })
  public copyClipboard = false;

  @property({ attribute: "has-extra-actions", type: Boolean })
  public hasExtraActions = false;

  @property({ attribute: "show-errors", type: Boolean })
  public showErrors = true;

  @state() private _yaml = "";

  @state() private _error = "";

  @state() private _showingError = false;

  @query("ha-code-editor") _codeEditor?: HaCodeEditor;

  public setValue(value): void {
    try {
      this._yaml = !isEmpty(value)
        ? dump(value, {
            schema: this.yamlSchema,
            quotingType: '"',
            noRefs: true,
          })
        : "";
    } catch (err: any) {
      // eslint-disable-next-line no-console
      console.error(err, value);
      alert(`There was an error converting to YAML: ${err}`);
    }
  }

  protected firstUpdated(): void {
    if (this.defaultValue !== undefined) {
      this.setValue(this.defaultValue);
    }
  }

  protected willUpdate(changedProperties: PropertyValues<this>): void {
    super.willUpdate(changedProperties);
    if (this.autoUpdate && changedProperties.has("value")) {
      this.setValue(this.value);
    }
  }

  public focus(): void {
    if (this._codeEditor?.codemirror) {
      this._codeEditor?.codemirror.focus();
    }
  }

  protected render() {
    if (this._yaml === undefined) {
      return nothing;
    }
    return html`
      ${this.label
        ? html`<p>${this.label}${this.required ? " *" : ""}</p>`
        : nothing}
      <ha-code-editor
        .hass=${this.hass}
        .value=${this._yaml}
        .readOnly=${this.readOnly}
        .disableFullscreen=${this.disableFullscreen}
        mode="yaml"
        autocomplete-entities
        autocomplete-icons
        .error=${this.isValid === false}
        @value-changed=${this._onChange}
        @blur=${this._onBlur}
        dir="ltr"
      ></ha-code-editor>
      ${this._showingError
        ? html`<ha-alert alert-type="error">${this._error}</ha-alert>`
        : nothing}
      ${this.copyClipboard || this.hasExtraActions
        ? html`
            <div class="card-actions">
              ${this.copyClipboard
                ? html`
                    <ha-button @click=${this._copyYaml}>
                      ${this.hass.localize(
                        "ui.components.yaml-editor.copy_to_clipboard"
                      )}
                    </ha-button>
                  `
                : nothing}
              <slot name="extra-actions"></slot>
            </div>
          `
        : nothing}
    `;
  }

  private _onChange(ev: CustomEvent): void {
    ev.stopPropagation();
    this._yaml = ev.detail.value;
    let parsed;
    let isValid = true;
    let errorMsg;

    if (this._yaml) {
      try {
        parsed = load(this._yaml, { schema: this.yamlSchema });
      } catch (err: any) {
        // Invalid YAML
        isValid = false;
        errorMsg = `${this.hass.localize("ui.components.yaml-editor.error", { reason: err.reason })}${err.mark ? ` (${this.hass.localize("ui.components.yaml-editor.error_location", { line: err.mark.line + 1, column: err.mark.column + 1 })})` : ""}`;
      }
    } else {
      parsed = {};
    }
    this._error = errorMsg ?? "";
    if (isValid) {
      this._showingError = false;
    }

    this.value = parsed;
    this.isValid = isValid;

    fireEvent(this, "value-changed", {
      value: parsed,
      isValid,
      errorMsg,
    } as any);
  }

  private _onBlur(): void {
    if (this.showErrors && this._error) {
      this._showingError = true;
    }
  }

  get yaml() {
    return this._yaml;
  }

  private async _copyYaml(): Promise<void> {
    if (this.yaml) {
      await copyToClipboard(this.yaml);
      showToast(this, {
        message: this.hass.localize("ui.common.copied_clipboard"),
      });
    }
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        .card-actions {
          border-radius: var(
            --actions-border-radius,
            0px 0px var(--ha-card-border-radius, 12px)
              var(--ha-card-border-radius, 12px)
          );
          border: 1px solid var(--divider-color);
          padding: 5px 16px;
        }
        ha-code-editor {
          flex-grow: 1;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-yaml-editor": HaYamlEditor;
  }
}
