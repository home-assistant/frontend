import "@material/mwc-button";
import { mdiCodeBraces, mdiListBoxOutline } from "@mdi/js";
import {
  css,
  CSSResultGroup,
  html,
  LitElement,
  nothing,
  PropertyValues,
  TemplateResult,
} from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../common/dom/fire_event";
import "../../../components/ha-form/ha-form";
import "../../../components/ha-icon-button";
import "../../../components/ha-icon-button-prev";
import "../../../components/ha-yaml-editor";
import "../../../components/ha-alert";
import type { HomeAssistant } from "../../../types";
import type { LovelaceConfigForm } from "../types";
import type { EditSubFormEvent } from "./types";
import { handleStructError } from "../../../common/structs/handle-errors";

declare global {
  interface HASSDomEvents {
    "go-back": undefined;
    "edit-sub-form": EditSubFormEvent;
  }
}

@customElement("hui-sub-form-editor")
export class HuiSubFormEditor<T = any> extends LitElement {
  public hass!: HomeAssistant;

  @property() public label?: string;

  @property({ attribute: false }) public data!: T;

  public schema!: LovelaceConfigForm["schema"];

  public assertConfig?: (config: T) => void;

  public computeLabel?: LovelaceConfigForm["computeLabel"];

  public computeHelper?: LovelaceConfigForm["computeHelper"];

  @state() public _yamlMode = false;

  @state() private _errors?: string[];

  @state() private _warnings?: string[];

  protected render(): TemplateResult {
    const uiAvailable = !this.hasWarning && !this.hasError;

    return html`
      <div class="header">
        <div class="back-title">
          <ha-icon-button-prev
            .label=${this.hass!.localize("ui.common.back")}
            @click=${this._goBack}
          ></ha-icon-button-prev>
          <span slot="title">${this.label}</span>
        </div>
        <ha-icon-button
          class="gui-mode-button"
          @click=${this._toggleMode}
          .disabled=${!uiAvailable}
          .label=${this.hass!.localize(
            this._yamlMode
              ? "ui.panel.lovelace.editor.edit_card.show_visual_editor"
              : "ui.panel.lovelace.editor.edit_card.show_code_editor"
          )}
          .path=${this._yamlMode ? mdiListBoxOutline : mdiCodeBraces}
        ></ha-icon-button>
      </div>
      ${this._yamlMode
        ? html`
            <ha-yaml-editor
              .hass=${this.hass}
              .defaultValue=${this.data}
              @value-changed=${this._valueChanged}
            ></ha-yaml-editor>
          `
        : html`
            <ha-form
              .hass=${this.hass}
              .schema=${this.schema}
              .computeLabel=${this.computeLabel}
              .computeHelper=${this.computeHelper}
              .data=${this.data}
              @value-changed=${this._valueChanged}
            >
            </ha-form>
          `}
      ${this.hasError
        ? html`
            <ha-alert alert-type="error">
              ${this.hass.localize("ui.errors.config.error_detected")}:
              <br />
              <ul>
                ${this._errors!.map((error) => html`<li>${error}</li>`)}
              </ul>
            </ha-alert>
          `
        : nothing}
      ${this.hasWarning
        ? html`
            <ha-alert
              alert-type="warning"
              .title="${this.hass.localize(
                "ui.errors.config.editor_not_supported"
              )}:"
            >
              ${this._warnings!.length > 0 && this._warnings![0] !== undefined
                ? html`
                    <ul>
                      ${this._warnings!.map(
                        (warning) => html`<li>${warning}</li>`
                      )}
                    </ul>
                  `
                : nothing}
              ${this.hass.localize("ui.errors.config.edit_in_yaml_supported")}
            </ha-alert>
          `
        : nothing}
    `;
  }

  protected willUpdate(changedProperties: PropertyValues<this>) {
    if (changedProperties.has("data")) {
      if (this.assertConfig) {
        try {
          this.assertConfig(this.data);
          this._warnings = undefined;
          this._errors = undefined;
        } catch (err: any) {
          const msgs = handleStructError(this.hass, err);
          this._warnings = msgs.warnings ?? [err.message];
          this._errors = msgs.errors || undefined;
          this._yamlMode = true;
        }
      }
    }
  }

  public get hasWarning(): boolean {
    return this._warnings !== undefined && this._warnings.length > 0;
  }

  public get hasError(): boolean {
    return this._errors !== undefined && this._errors.length > 0;
  }

  private _goBack(): void {
    fireEvent(this, "go-back");
  }

  private _toggleMode(): void {
    this._yamlMode = !this._yamlMode;
  }

  private _valueChanged(ev: CustomEvent): void {
    ev.stopPropagation();
    const value = (ev.detail.value ?? (ev.target as any).value ?? {}) as T;
    fireEvent(this, "value-changed", { value });
  }

  static get styles(): CSSResultGroup {
    return css`
      .header {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .back-title {
        display: flex;
        align-items: center;
        font-size: 18px;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-sub-form-editor": HuiSubFormEditor;
  }
}
