import "@material/mwc-button/mwc-button";
import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../common/dom/fire_event";
import { createCloseHeading } from "../../../components/ha-dialog";
import "../../../components/ha-markdown";
import type { RepairsIssue } from "../../../data/repairs";
import { haStyleDialog } from "../../../resources/styles";
import type { HomeAssistant } from "../../../types";
import type { RepairsIssueDialogParams } from "./show-repair-issue-dialog";

@customElement("dialog-repairs-issue")
class DialogRepairsIssue extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _issue?: RepairsIssue;

  @state() private _params?: RepairsIssueDialogParams;

  public showDialog(params: RepairsIssueDialogParams): void {
    this._params = params;
    this._issue = this._params.issue;
  }

  public closeDialog() {
    this._params = undefined;
    this._issue = undefined;
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
        .hideActions=${!this._issue.learn_more_url}
        .heading=${createCloseHeading(
          this.hass,
          this.hass.localize(
            `component.${this._issue.domain}.issues.${
              this._issue.translation_key || this._issue.issue_id
            }.title`
          ) || this.hass!.localize("ui.panel.config.repairs.dialog.title")
        )}
      >
        <div>
          <ha-markdown
            allowsvg
            breaks
            .content=${this.hass.localize(
              `component.${this._issue.domain}.issues.${
                this._issue.translation_key || this._issue.issue_id
              }.description`,
              this._issue.translation_placeholders
            )}
          ></ha-markdown>

          ${this._issue.breaks_in_ha_version
            ? html`
                <br />This will no longer work as of the
                ${this._issue.breaks_in_ha_version} release of Home Assistant.
              `
            : ""}
          <br />The issue is ${this._issue.severity} severity.<br />We can not
          automatically repair this issue for you.
          ${this._issue.dismissed_version
            ? html`
                <br />This issue has been dismissed in version
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
