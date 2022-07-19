import "@material/mwc-button/mwc-button";
import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../common/dom/fire_event";
import "../../../components/ha-alert";
import { createCloseHeading } from "../../../components/ha-dialog";
import type { RepairsIssue } from "../../../data/repairs";
import { haStyleDialog } from "../../../resources/styles";
import type { HomeAssistant } from "../../../types";
import type { RepairsIssueDialogParams } from "./show-repair-issue-dialog";

@customElement("dialog-repairs-issue")
class DialogRepairsIssue extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _issue?: RepairsIssue;

  @state() private _params?: RepairsIssueDialogParams;

  @state() private _error?: string;

  public showDialog(params: RepairsIssueDialogParams): void {
    this._params = params;
    this._issue = this._params.issue;
  }

  public closeDialog() {
    this._params = undefined;
    this._issue = undefined;
    this._error = undefined;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  protected render(): TemplateResult {
    if (!this._issue) {
      return html``;
    }

    return html`
      <ha-dialog
        open
        @closed=${this.closeDialog}
        scrimClickAction
        escapeKeyAction
        .heading=${createCloseHeading(
          this.hass,
          this.hass.localize(
            `component.${this._issue.domain}.issues.${this._issue.issue_id}.title`
          ) || this.hass!.localize("ui.panel.config.repairs.dialog.title")
        )}
      >
        <div>
          ${this._error
            ? html`<ha-alert alert-type="error">${this._error}</ha-alert>`
            : ""}
          ${this.hass.localize(
            `component.${this._issue.domain}.issues.${this._issue.issue_id}.${
              this._issue.translation_key || "description"
            }`,
            this._issue.translation_placeholders
          )}
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
        ${this._issue.learn_more_url
          ? html`
              <a
                href=${this._issue.learn_more_url}
                target="_blank"
                slot="primaryAction"
                rel="noopener noreferrer"
              >
                <mwc-button .label=${"Learn More"}></mwc-button>
              </a>
            `
          : ""}
      </ha-dialog>
    `;
  }

  static styles: CSSResultGroup = [
    haStyleDialog,
    css`
      a {
        text-decoration: none;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-repairs-issue": DialogRepairsIssue;
  }
}
