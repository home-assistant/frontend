import { mdiOpenInNew } from "@mdi/js";
import type { CSSResultGroup } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../common/dom/fire_event";
import { isNavigationClick } from "../../../common/dom/is-navigation-click";
import "../../../components/ha-alert";
import "../../../components/ha-wa-dialog";
import "../../../components/ha-button";
import "../../../components/ha-svg-icon";
import "../../../components/ha-dialog-footer";
import "./dialog-repairs-issue-subtitle";
import "../../../components/ha-markdown";
import type { RepairsIssue } from "../../../data/repairs";
import { ignoreRepairsIssue } from "../../../data/repairs";
import { haStyleDialog } from "../../../resources/styles";
import type { HomeAssistant } from "../../../types";
import type { RepairsIssueDialogParams } from "./show-repair-issue-dialog";

@customElement("dialog-repairs-issue")
class DialogRepairsIssue extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _issue?: RepairsIssue;

  @state() private _params?: RepairsIssueDialogParams;

  @state() private _open = false;

  public showDialog(params: RepairsIssueDialogParams): void {
    this._params = params;
    this._issue = this._params.issue;
    this._open = true;
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
    this._open = false;
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
      <ha-wa-dialog
        .hass=${this.hass}
        .open=${this._open}
        header-title=${dialogTitle}
        @closed=${this._dialogClosed}
      >
        <dialog-repairs-issue-subtitle
          slot="headerSubtitle"
          .hass=${this.hass}
          .issue=${this._issue}
        ></dialog-repairs-issue-subtitle>
        <div class="dialog-content">
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
            allow-svg
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
        </div>
        <ha-dialog-footer slot="footer">
          <ha-button
            slot="secondaryAction"
            appearance="plain"
            @click=${this._ignoreIssue}
          >
            ${this._issue!.ignored
              ? this.hass!.localize("ui.panel.config.repairs.dialog.unignore")
              : this.hass!.localize("ui.panel.config.repairs.dialog.ignore")}
          </ha-button>
          ${this._issue.learn_more_url
            ? html`
                <ha-button
                  slot="primaryAction"
                  appearance="filled"
                  rel="noopener noreferrer"
                  href=${learnMoreUrlIsHomeAssistant
                    ? this._issue.learn_more_url.replace(
                        "homeassistant://",
                        "/"
                      )
                    : this._issue.learn_more_url}
                  .target=${learnMoreUrlIsHomeAssistant ? "" : "_blank"}
                  @click=${learnMoreUrlIsHomeAssistant
                    ? this.closeDialog
                    : undefined}
                >
                  ${this.hass!.localize("ui.panel.config.repairs.dialog.learn")}
                  <ha-svg-icon slot="end" .path=${mdiOpenInNew}></ha-svg-icon>
                </ha-button>
              `
            : ""}
        </ha-dialog-footer>
      </ha-wa-dialog>
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
      .dialog-content {
        padding-top: 0;
      }
      ha-alert {
        margin-bottom: 16px;
        display: block;
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
