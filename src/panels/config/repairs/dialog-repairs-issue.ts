import "@material/mwc-button/mwc-button";
import { css, CSSResultGroup, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { formatDateNumeric } from "../../../common/datetime/format_date";
import { fireEvent } from "../../../common/dom/fire_event";
import { isNavigationClick } from "../../../common/dom/is-navigation-click";
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

  protected render() {
    if (!this._issue) {
      return nothing;
    }

    const learnMoreUrlIsHomeAssistant =
      this._issue.learn_more_url?.startsWith("homeassistant://") || false;

    return html`
      <ha-dialog
        open
        @closed=${this.closeDialog}
        scrimClickAction
        escapeKeyAction
        .heading=${createCloseHeading(
          this.hass,
          this.hass.localize(
            `component.${this._issue.domain}.issues.${
              this._issue.translation_key || this._issue.issue_id
            }.title`,
            this._issue.translation_placeholders || {}
          ) || this.hass!.localize("ui.panel.config.repairs.dialog.title")
        )}
      >
        <div>
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
            allowsvg
            breaks
            @click=${this._clickHandler}
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
            -
            ${this._issue.created
              ? formatDateNumeric(
                  new Date(this._issue.created),
                  this.hass.locale,
                  this.hass.config
                )
              : ""}
          </div>
        </div>
        ${this._issue.learn_more_url
          ? html`
              <a
                .href=${learnMoreUrlIsHomeAssistant
                  ? this._issue.learn_more_url.replace("homeassistant://", "/")
                  : this._issue.learn_more_url}
                .target=${learnMoreUrlIsHomeAssistant ? "" : "_blank"}
                @click=${learnMoreUrlIsHomeAssistant
                  ? this.closeDialog
                  : undefined}
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
