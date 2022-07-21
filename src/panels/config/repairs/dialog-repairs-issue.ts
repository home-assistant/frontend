import "@material/mwc-button/mwc-button";
import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../common/dom/fire_event";
import { createCloseHeading } from "../../../components/ha-dialog";
import "../../../components/ha-markdown";
import { ignoreRepairsIssue, RepairsIssue } from "../../../data/repairs";
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
    if (this._params?.dialogClosedCallback) {
      this._params.dialogClosedCallback();
    }

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
          <ha-alert
            .alertType=${this._issue.severity === "error" ||
            this._issue.severity === "critical"
              ? "error"
              : "warning"}
            .title=${this.hass.localize(
              `ui.panel.config.repairs.${this._issue.severity}`
            )}
            >${this.hass.localize(
              "ui.panel.config.repairs.dialog.alert_not_fixable"
            )}
            ${this._issue.breaks_in_ha_version
              ? this.hass.localize(
                  "ui.panel.config.repairs.dialog.breaks_in_version",
                  { version: this._issue.breaks_in_ha_version }
                )
              : ""}
          </ha-alert>
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
          ${this._issue.dismissed_version
            ? html`
                <br /><span class="dismissed">
                  ${this.hass.localize(
                    "ui.panel.config.repairs.dialog.dismissed_in_version",
                    { version: this._issue.dismissed_version }
                  )}</span
                >
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
                <mwc-button
                  .label=${this.hass!.localize(
                    "ui.panel.config.repairs.dialog.learn"
                  )}
                ></mwc-button>
              </a>
            `
          : ""}
        <mwc-button
          slot="secondaryAction"
          .label=${this._issue!.ignored
            ? this.hass!.localize("ui.panel.config.repairs.dialog.unignore")
            : this.hass!.localize("ui.panel.config.repairs.dialog.ignore")}
          @click=${this._ignoreIssue}
        ></mwc-button>
      </ha-dialog>
    `;
  }

  private _ignoreIssue() {
    ignoreRepairsIssue(this.hass, this._issue!, !this._issue!.ignored);
    this.closeDialog();
  }

  static styles: CSSResultGroup = [
    haStyleDialog,
    css`
      ha-alert {
        margin-bottom: 16px;
        display: block;
      }
      a {
        text-decoration: none;
      }
      .dismissed {
        font-style: italic;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-repairs-issue": DialogRepairsIssue;
  }
}
