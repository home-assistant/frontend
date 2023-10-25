import "@material/mwc-button/mwc-button";
import { mdiHelpCircle } from "@mdi/js";
import { CSSResultGroup, LitElement, css, html, nothing } from "lit";
import { customElement, property, query } from "lit/decorators";
import { fireEvent } from "../../../common/dom/fire_event";
import "../../../components/ha-card";
import "../../../components/ha-icon-button";
import { Action, Fields, ScriptConfig } from "../../../data/script";
import { haStyle } from "../../../resources/styles";
import type { HomeAssistant } from "../../../types";
import { documentationUrl } from "../../../util/documentation-url";
import "../automation/action/ha-automation-action";
import "./ha-script-fields";
import type HaScriptFields from "./ha-script-fields";

@customElement("manual-script-editor")
export class HaManualScriptEditor extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public isWide!: boolean;

  @property({ type: Boolean }) public narrow!: boolean;

  @property({ type: Boolean }) public disabled = false;

  @property({ attribute: false }) public config!: ScriptConfig;

  @query("ha-script-fields")
  private _scriptFields?: HaScriptFields;

  private _openFields = false;

  public addFields() {
    this._openFields = true;
    fireEvent(this, "value-changed", {
      value: {
        ...this.config,
        fields: {
          [this.hass.localize("ui.panel.config.script.editor.field.field") ||
          "field"]: {
            selector: {
              text: null,
            },
          },
        },
      },
    });
  }

  protected updated(changedProps) {
    if (this._openFields && changedProps.has("config")) {
      this._openFields = false;
      this._scriptFields?.updateComplete.then(
        () => this._scriptFields?.focusLastField()
      );
    }
  }

  protected render() {
    return html`
      ${this.disabled
        ? html`<ha-alert alert-type="warning">
            ${this.hass.localize("ui.panel.config.script.editor.read_only")}
            <mwc-button slot="action" @click=${this._duplicate}>
              ${this.hass.localize("ui.panel.config.script.editor.migrate")}
            </mwc-button>
          </ha-alert>`
        : ""}
      ${this.config.fields
        ? html`<div class="header">
              <h2 id="fields-heading" class="name">
                ${this.hass.localize(
                  "ui.panel.config.script.editor.field.fields"
                )}
              </h2>
              <a
                href=${documentationUrl(
                  this.hass,
                  "/integrations/script/#fields"
                )}
                target="_blank"
                rel="noreferrer"
              >
                <ha-icon-button
                  .path=${mdiHelpCircle}
                  .label=${this.hass.localize(
                    "ui.panel.config.script.editor.field.link_help_fields"
                  )}
                ></ha-icon-button>
              </a>
            </div>

            <ha-script-fields
              role="region"
              aria-labelledby="fields-heading"
              .fields=${this.config.fields}
              @value-changed=${this._fieldsChanged}
              .hass=${this.hass}
              .disabled=${this.disabled}
            ></ha-script-fields>`
        : nothing}

      <div class="header">
        <h2 id="sequence-heading" class="name">
          ${this.hass.localize("ui.panel.config.script.editor.sequence")}
        </h2>
        <a
          href=${documentationUrl(this.hass, "/docs/scripts/")}
          target="_blank"
          rel="noreferrer"
        >
          <ha-icon-button
            .path=${mdiHelpCircle}
            .label=${this.hass.localize(
              "ui.panel.config.script.editor.link_available_actions"
            )}
          ></ha-icon-button>
        </a>
      </div>

      <ha-automation-action
        role="region"
        aria-labelledby="sequence-heading"
        .actions=${this.config.sequence}
        @value-changed=${this._sequenceChanged}
        .hass=${this.hass}
        .narrow=${this.narrow}
        .disabled=${this.disabled}
      ></ha-automation-action>
    `;
  }

  private _fieldsChanged(ev: CustomEvent): void {
    ev.stopPropagation();
    fireEvent(this, "value-changed", {
      value: { ...this.config!, fields: ev.detail.value as Fields },
    });
  }

  private _sequenceChanged(ev: CustomEvent): void {
    ev.stopPropagation();
    fireEvent(this, "value-changed", {
      value: { ...this.config!, sequence: ev.detail.value as Action[] },
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
        ha-card {
          overflow: hidden;
        }
        .description {
          margin: 0;
        }
        p {
          margin-bottom: 0;
        }
        .header {
          display: flex;
          align-items: center;
        }
        .header:first-child {
          margin-top: -16px;
        }
        .header .name {
          font-size: 20px;
          font-weight: 400;
          flex: 1;
        }
        .header a {
          color: var(--secondary-text-color);
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "manual-script-editor": HaManualScriptEditor;
  }
}
