import { mdiClose } from "@mdi/js";
import { css, CSSResultGroup, html, LitElement, nothing } from "lit";
import { customElement, property, state, query } from "lit/decorators";
import { formatDateNumeric } from "../../../common/datetime/format_date";
import { fireEvent } from "../../../common/dom/fire_event";
import { isNavigationClick } from "../../../common/dom/is-navigation-click";
import "../../../components/ha-alert";
import "../../../components/ha-md-dialog";
import type { HaMdDialog } from "../../../components/ha-md-dialog";
import "../../../components/ha-button";
import "../../../components/ha-dialog-header";
import { domainToName } from "../../../data/integration";
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

  @query("ha-md-dialog") private _dialog?: HaMdDialog;

  public showDialog(params: RepairsIssueDialogParams): void {
    this._params = params;
    this._issue = this._params.issue;
  }

  private _dialogClosed() {
    if (this._params?.dialogClosedCallback) {
      this._params.dialogClosedCallback();
    }

    this._params = undefined;
    this._issue = undefined;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  public closeDialog() {
    this._dialog?.close();
  }

  protected render() {
    if (!this._issue) {
      return nothing;
    }

    const learnMoreUrlIsHomeAssistant =
      this._issue.learn_more_url?.startsWith("homeassistant://") || false;

    const dialogTitle =
      this.hass.localize(
        `component.${this._issue.domain}.issues.${this._issue.translation_key || this._issue.issue_id}.title`,
        this._issue.translation_placeholders || {}
      ) || this.hass!.localize("ui.panel.config.repairs.dialog.title");

    return html`
      <ha-md-dialog
        open
        @closed=${this._dialogClosed}
        aria-labelledby="dialog-repairs-issue-title"
        aria-describedby="dialog-repairs-issue-description"
      >
        <ha-dialog-header slot="headline">
          <ha-icon-button
            slot="navigationIcon"
            .label=${this.hass.localize("ui.dialogs.generic.close") ?? "Close"}
            .path=${mdiClose}
            @click=${this.closeDialog}
          ></ha-icon-button>
          <span
            slot="title"
            id="dialog-repairs-issue-title"
            .title=${dialogTitle}
            >${dialogTitle}</span
          >
        </ha-dialog-header>
        <div slot="content">
          ${this._issue.breaks_in_ha_version
            ? html`
                <ha-alert alert-type="warning">
                  ${this.hass.localize(
                    "ui.panel.config.repairs.dialog.breaks_in_version",
                    { version: this._issue.breaks_in_ha_version }
                  )}
                </ha-alert>
              `
            : ""}
          <ha-markdown
            id="dialog-repairs-issue-description"
            allowsvg
            breaks
            @click=${this._clickHandler}
            .content=${this.hass.localize(
              `component.${this._issue.domain}.issues.${
                this._issue.translation_key || this._issue.issue_id
              }.description`,
              this._issue.translation_placeholders
            ) ||
            `${this._issue.domain}: ${this._issue.translation_key || this._issue.issue_id}`}
          ></ha-markdown>
          ${this._issue.dismissed_version
            ? html`
                <br /><span class="dismissed">
                  ${this.hass.localize(
                    "ui.panel.config.repairs.dialog.ignored_in_version",
                    { version: this._issue.dismissed_version }
                  )}</span
                >
              `
            : ""}
          <div class="secondary">
            <span class=${this._issue.severity}
              >${this.hass.localize(
                `ui.panel.config.repairs.${this._issue.severity}`
              )}
            </span>
            ⸱
            ${this._issue.created
              ? formatDateNumeric(
                  new Date(this._issue.created),
                  this.hass.locale,
                  this.hass.config
                )
              : ""}
            ⸱
            ${this.hass.localize(`ui.panel.config.repairs.reported_by`, {
              integration: domainToName(this.hass.localize, this._issue.domain),
            })}
          </div>
        </div>
        <div slot="actions">
          ${this._issue.learn_more_url
            ? html`
                <a
                  .href=${learnMoreUrlIsHomeAssistant
                    ? this._issue.learn_more_url.replace(
                        "homeassistant://",
                        "/"
                      )
                    : this._issue.learn_more_url}
                  .target=${learnMoreUrlIsHomeAssistant ? "" : "_blank"}
                  @click=${learnMoreUrlIsHomeAssistant
                    ? this.closeDialog
                    : undefined}
                  slot="primaryAction"
                  rel="noopener noreferrer"
                >
                  <ha-button
                    .label=${this.hass!.localize(
                      "ui.panel.config.repairs.dialog.learn"
                    )}
                  ></ha-button>
                </a>
              `
            : ""}
          <ha-button
            slot="secondaryAction"
            .label=${this._issue!.ignored
              ? this.hass!.localize("ui.panel.config.repairs.dialog.unignore")
              : this.hass!.localize("ui.panel.config.repairs.dialog.ignore")}
            @click=${this._ignoreIssue}
          ></ha-button>
        </div>
      </ha-md-dialog>
    `;
  }

  private _ignoreIssue() {
    ignoreRepairsIssue(this.hass, this._issue!, !this._issue!.ignored);
    this.closeDialog();
  }

  private _clickHandler(ev: MouseEvent) {
    if (isNavigationClick(ev, false)) {
      this.closeDialog();
    }
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
      .secondary {
        margin-top: 8px;
        text-align: right;
        color: var(--secondary-text-color);
      }
      .error,
      .critical {
        color: var(--error-color);
      }
      .warning {
        color: var(--warning-color);
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-repairs-issue": DialogRepairsIssue;
  }
}
