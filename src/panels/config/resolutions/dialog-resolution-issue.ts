import "@material/mwc-button/mwc-button";
import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators";
import { createCloseHeading } from "../../../components/ha-dialog";
import type { ResolutionIssue } from "../../../data/resolutions";
import { haStyleDialog } from "../../../resources/styles";
import type { HomeAssistant } from "../../../types";
import type { ResolutionIssueDialogParams } from "./show-resolution-issue-dialog";

@customElement("dialog-resolution-issue")
class DialogResolutionIssue extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _issue!: ResolutionIssue;

  @state() private _params?: ResolutionIssueDialogParams;

  @state() private _submitting = false;

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
          ${this._issue.learn_more_url
            ? html`<a href=${this._issue.learn_more_url}>Learn more</a>`
            : ""}
          ${this._issue.dismissed_version
            ? html`
                This issue has been dismissed in version
                ${this._issue.dismissed_version}.
              `
            : ""}
        </div>
        <mwc-button slot="primaryAction" .disabled=${this._submitting}>
          ${this.hass!.localize("ui.panel.config.resolutions.dialog.fix")}
        </mwc-button>
      </ha-dialog>
    `;
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
