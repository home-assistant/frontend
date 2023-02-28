import "@material/mwc-button";
import { mdiOpenInNew } from "@mdi/js";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { fireEvent } from "../../../common/dom/fire_event";
import "../../../components/ha-circular-progress";
import { createCloseHeading } from "../../../components/ha-dialog";
import "../../../components/ha-expansion-panel";
import "../../../components/ha-markdown";
import "../../../components/ha-textfield";
import type { HaTextField } from "../../../components/ha-textfield";
import {
  BlueprintImportResult,
  importBlueprint,
  saveBlueprint,
} from "../../../data/blueprint";
import { haStyleDialog } from "../../../resources/styles";
import type { HomeAssistant } from "../../../types";

@customElement("ha-dialog-import-blueprint")
class DialogImportBlueprint extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

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
    return html`
      <ha-dialog
        open
        @closed=${this.closeDialog}
        .heading=${createCloseHeading(
          this.hass,
          this.hass.localize("ui.panel.config.blueprint.add.header")
        )}
      >
        <div>
          ${this._error ? html` <div class="error">${this._error}</div> ` : ""}
          ${this._result
            ? html`${this.hass.localize(
                  "ui.panel.config.blueprint.add.import_header",
                  "name",
                  html`<b>${this._result.blueprint.metadata.name}</b>`,
                  "domain",
                  this._result.blueprint.metadata.domain
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
                  <pre>${this._result.raw_data}</pre>
                </ha-expansion-panel>`
            : html`
                <p>
                  ${this.hass.localize(
                    "ui.panel.config.blueprint.add.import_introduction"
                  )}
                </p>
                <a
                  href="https://www.home-assistant.io/get-blueprints"
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  ${this.hass.localize(
                    "ui.panel.config.blueprint.add.community_forums"
                  )}
                  <ha-svg-icon .path=${mdiOpenInNew}></ha-svg-icon>
                </a>
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
        <mwc-button
          slot="primaryAction"
          @click=${this.closeDialog}
          .disabled=${this._saving}
        >
          ${this.hass.localize("ui.common.cancel")}
        </mwc-button>
        ${!this._result
          ? html`
              <mwc-button
                slot="primaryAction"
                @click=${this._import}
                .disabled=${this._importing}
              >
                ${this._importing
                  ? html`<ha-circular-progress
                      active
                      size="small"
                      .title=${this.hass.localize(
                        "ui.panel.config.blueprint.add.importing"
                      )}
                    ></ha-circular-progress>`
                  : ""}
                ${this.hass.localize(
                  "ui.panel.config.blueprint.add.import_btn"
                )}
              </mwc-button>
            `
          : html`
              <mwc-button
                slot="primaryAction"
                @click=${this._save}
                .disabled=${this._saving || this._result.validation_errors}
              >
                ${this._saving
                  ? html`<ha-circular-progress
                      active
                      size="small"
                      .title=${this.hass.localize(
                        "ui.panel.config.blueprint.add.saving"
                      )}
                    ></ha-circular-progress>`
                  : ""}
                ${this.hass.localize("ui.panel.config.blueprint.add.save_btn")}
              </mwc-button>
            `}
      </ha-dialog>
    `;
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
        this._result!.blueprint.metadata.source_url
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
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-dialog-import-blueprint": DialogImportBlueprint;
  }
}
