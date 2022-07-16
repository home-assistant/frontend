import "@material/mwc-button/mwc-button";
import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators";
import "../../../components/ha-alert";
import { createCloseHeading } from "../../../components/ha-dialog";
import { fixResolutionIssue, ResolutionIssue } from "../../../data/resolutions";
import { haStyleDialog } from "../../../resources/styles";
import type { HomeAssistant } from "../../../types";
import type { ResolutionIssueDialogParams } from "./show-resolution-issue-dialog";

@customElement("dialog-resolution-issue")
class DialogResolutionIssue extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _issue!: ResolutionIssue;

  @state() private _params?: ResolutionIssueDialogParams;

  @state() private _submitting = false;

  @state() private _error?: string;

  public async showDialog(params: ResolutionIssueDialogParams): Promise<void> {
    this._params = params;
    this._issue = this._params.issue;
    await this.updateComplete;
  }

  protected render(): TemplateResult {
    if (!this._params) {
      return html``;
    }

    return html`
      <ha-dialog
        open
        @closed=${this._closeDialog}
        scrimClickAction
        escapeKeyAction
        .heading=${createCloseHeading(
          this.hass,
          this.hass!.localize("ui.panel.config.resolutions.dialog.title")
        )}
      >
        <div>
          ${this._error
            ? html`<ha-alert alert-type="error">${this._error}</ha-alert>`
            : ""}
          <h3>
            ${this.hass.localize(
              `component.${this._issue.domain}.issues.${this._issue.issue_id}.title`
            )}
          </h3>
          ${this._issue.breaks_in_ha_version
            ? html`
                This will no longer work as of the
                ${this._issue.breaks_in_ha_version} release of Home Assistant.
              `
            : ""}
          The issue is ${this._issue.severity} severity
          ${this._issue.is_fixable ? "and fixable" : "but not fixable"}.
          ${this._issue.dismissed_version
            ? html`
                This issue has been dismissed in version
                ${this._issue.dismissed_version}.
              `
            : ""}
        </div>
        ${this._issue.is_fixable
          ? html`
              <mwc-button
                slot="primaryAction"
                @click=${this._fixIssue}
                .disabled=${this._submitting}
              >
                ${this.hass!.localize("ui.panel.config.resolutions.dialog.fix")}
              </mwc-button>
            `
          : ""}
        ${this._issue.learn_more_url
          ? html`
              <a href=${this._issue.learn_more_url} target="_blank">
                <mwc-button .label=${"Learn More"}> </mwc-button>
              </a>
            `
          : ""}
      </ha-dialog>
    `;
  }

  private _fixIssue() {
    try {
      fixResolutionIssue(this.hass, this._issue);
    } catch (err: any) {
      this._error = err.body.message;
    }
  }

  private _closeDialog() {
    this._params = undefined;
  }

  static styles: CSSResultGroup = [haStyleDialog, css``];
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-resolution-issue": DialogResolutionIssue;
  }
}
