import { mdiClose, mdiOpenInNew } from "@mdi/js";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { fireEvent } from "../../../common/dom/fire_event";
import "../../../components/ha-alert";
import "../../../components/ha-button";
import "../../../components/ha-code-editor";
import "../../../components/ha-dialog";
import "../../../components/ha-dialog-header";
import "../../../components/ha-expansion-panel";
import "../../../components/ha-markdown";
import "../../../components/ha-spinner";
import "../../../components/ha-textfield";
import type { HaTextField } from "../../../components/ha-textfield";
import type { BlueprintImportResult } from "../../../data/blueprint";
import { importBlueprint, saveBlueprint } from "../../../data/blueprint";
import { haStyleDialog } from "../../../resources/styles";
import type { HomeAssistant } from "../../../types";

@customElement("ha-dialog-import-blueprint")
class DialogImportBlueprint extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean, reflect: true }) public large = false;

  @state() private _params?;

  @state() private _importing = false;

  @state() private _saving = false;

  @state() private _error?: string;

  @state() private _result?: BlueprintImportResult;

  @state() private _url?: string;

  @query("#input") private _input?: HaTextField;

  public showDialog(params): void {
    this._params = params;
    this._error = undefined;
    this._url = this._params.url;
    this.large = false;
  }

  public closeDialog(): void {
    this._error = undefined;
    this._result = undefined;
    this._params = undefined;
    this._url = undefined;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  protected render() {
    if (!this._params) {
      return nothing;
    }
    const heading = this.hass.localize("ui.panel.config.blueprint.add.header");
    return html`
      <ha-dialog open .heading=${heading} @closed=${this.closeDialog}>
        <ha-dialog-header slot="heading">
          <ha-icon-button
            slot="navigationIcon"
            dialogAction="cancel"
            .label=${this.hass.localize("ui.common.close")}
            .path=${mdiClose}
          ></ha-icon-button>
          <span slot="title" @click=${this._enlarge}> ${heading} </span>
        </ha-dialog-header>
        <div>
          ${this._error ? html` <div class="error">${this._error}</div> ` : ""}
          ${this._result
            ? html`${this.hass.localize(
                  "ui.panel.config.blueprint.add.import_header",
                  {
                    name: html`<b>${this._result.blueprint.metadata.name}</b>`,
                    domain: this._result.blueprint.metadata.domain,
                  }
                )}
                <br />
                <ha-markdown
                  breaks
                  .content=${this._result.blueprint.metadata.description}
                ></ha-markdown>
                ${this._result.validation_errors
                  ? html`
                      <p class="error">
                        ${this.hass.localize(
                          "ui.panel.config.blueprint.add.unsupported_blueprint"
                        )}
                      </p>
                      <ul class="error">
                        ${this._result.validation_errors.map(
                          (error) => html`<li>${error}</li>`
                        )}
                      </ul>
                    `
                  : html`
                      <ha-textfield
                        id="input"
                        .value=${this._result.suggested_filename || ""}
                        .label=${this.hass.localize(
                          "ui.panel.config.blueprint.add.file_name"
                        )}
                      ></ha-textfield>
                    `}
                <ha-expansion-panel
                  .header=${this.hass.localize(
                    "ui.panel.config.blueprint.add.raw_blueprint"
                  )}
                >
                  <ha-code-editor
                    mode="yaml"
                    .value=${this._result.raw_data}
                    read-only
                    dir="ltr"
                  ></ha-code-editor>
                </ha-expansion-panel>
                ${this._result?.exists
                  ? html`
                      <ha-alert
                        alert-type="warning"
                        .title=${this.hass.localize(
                          "ui.panel.config.blueprint.add.override_title"
                        )}
                      >
                        ${this.hass.localize(
                          "ui.panel.config.blueprint.add.override_description"
                        )}
                      </ha-alert>
                    `
                  : nothing} `
            : html`
                <p>
                  ${this.hass.localize(
                    "ui.panel.config.blueprint.add.import_introduction"
                  )}
                </p>
                <ha-button
                  size="small"
                  appearance="plain"
                  href="https://www.home-assistant.io/get-blueprints"
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  ${this.hass.localize(
                    "ui.panel.config.blueprint.add.community_forums"
                  )}
                  <ha-svg-icon slot="end" .path=${mdiOpenInNew}></ha-svg-icon>
                </ha-button>
                <ha-textfield
                  id="input"
                  .label=${this.hass.localize(
                    "ui.panel.config.blueprint.add.url"
                  )}
                  .value=${this._url || ""}
                  dialogInitialFocus
                ></ha-textfield>
              `}
        </div>
        <ha-button
          appearance="plain"
          slot="primaryAction"
          @click=${this.closeDialog}
          .disabled=${this._saving}
        >
          ${this.hass.localize("ui.common.cancel")}
        </ha-button>
        ${!this._result
          ? html`
              <ha-button
                slot="primaryAction"
                @click=${this._import}
                .disabled=${this._importing}
                .loading=${this._importing}
                .ariaLabel=${this.hass.localize(
                  `ui.panel.config.blueprint.add.${this._importing ? "importing" : "import_btn"}`
                )}
              >
                ${this.hass.localize(
                  "ui.panel.config.blueprint.add.import_btn"
                )}
              </ha-button>
            `
          : html`
              <ha-button
                slot="primaryAction"
                @click=${this._save}
                .disabled=${this._saving || !!this._result.validation_errors}
                .loading=${this._saving}
                .ariaLabel=${this.hass.localize(
                  `ui.panel.config.blueprint.add.${this._saving ? "saving" : this._result.exists ? "save_btn_override" : "save_btn"}`
                )}
              >
                ${this._result.exists
                  ? this.hass.localize(
                      "ui.panel.config.blueprint.add.save_btn_override"
                    )
                  : this.hass.localize(
                      "ui.panel.config.blueprint.add.save_btn"
                    )}
              </ha-button>
            `}
      </ha-dialog>
    `;
  }

  private _enlarge() {
    this.large = !this.large;
  }

  private async _import() {
    this._url = undefined;
    this._importing = true;
    this._error = undefined;
    try {
      const url = this._input?.value;
      if (!url) {
        this._error = this.hass.localize(
          "ui.panel.config.blueprint.add.error_no_url"
        );
        return;
      }
      this._result = await importBlueprint(this.hass, url);
    } catch (err: any) {
      this._error = err.message;
    } finally {
      this._importing = false;
    }
  }

  private async _save() {
    this._saving = true;
    try {
      const filename = this._input?.value;
      if (!filename) {
        return;
      }
      await saveBlueprint(
        this.hass,
        this._result!.blueprint.metadata.domain,
        filename,
        this._result!.raw_data,
        this._result!.blueprint.metadata.source_url,
        this._result!.exists
      );
      this._params.importedCallback();
      this.closeDialog();
    } catch (err: any) {
      this._error = err.message;
    } finally {
      this._saving = false;
    }
  }

  static styles = [
    haStyleDialog,
    css`
      p {
        margin-top: 0;
        margin-bottom: 8px;
      }
      ha-textfield {
        display: block;
        margin-top: 24px;
      }
      a {
        text-decoration: none;
      }
      a ha-svg-icon {
        --mdc-icon-size: 16px;
      }
      :host([large]) ha-dialog {
        --mdc-dialog-min-width: 90vw;
        --mdc-dialog-max-width: 90vw;
      }
      ha-expansion-panel {
        --expansion-panel-content-padding: 0px;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-dialog-import-blueprint": DialogImportBlueprint;
  }
}
