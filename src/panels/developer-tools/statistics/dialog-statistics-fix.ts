import type { CSSResultGroup } from "lit";
import { html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../common/dom/fire_event";
import "../../../components/ha-button";
import "../../../components/ha-dialog";
import "../../../components/ha-spinner";
import { clearStatistics, getStatisticLabel } from "../../../data/recorder";
import { haStyle, haStyleDialog } from "../../../resources/styles";
import type { HomeAssistant } from "../../../types";
import { documentationUrl } from "../../../util/documentation-url";
import { showAlertDialog } from "../../lovelace/custom-card-helpers";
import type { DialogStatisticsFixParams } from "./show-dialog-statistics-fix";

@customElement("dialog-statistics-fix")
export class DialogStatisticsFix extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _params?: DialogStatisticsFixParams;

  @state() private _clearing = false;

  public showDialog(params: DialogStatisticsFixParams): void {
    this._params = params;
  }

  public closeDialog(): void {
    this._cancel();
  }

  private _closeDialog(): void {
    this._params = undefined;
    this._clearing = false;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  protected render() {
    if (!this._params) {
      return nothing;
    }

    const issue = this._params.issue;

    return html`
      <ha-dialog
        open
        scrimClickAction
        escapeKeyAction
        @closed=${this._closeDialog}
        .heading=${this.hass.localize(
          `ui.panel.developer-tools.tabs.statistics.fix_issue.${issue.type}.title`
        )}
      >
        <p>
          ${this.hass.localize(
            `ui.panel.developer-tools.tabs.statistics.fix_issue.${issue.type}.info_text_1`,
            {
              name: getStatisticLabel(
                this.hass,
                issue.data.statistic_id,
                undefined
              ),
              statistic_id: issue.data.statistic_id,
              ...(issue.type === "mean_type_changed"
                ? {
                    metadata_mean_type: this.hass.localize(
                      `ui.panel.developer-tools.tabs.statistics.mean_type.${issue.data.metadata_mean_type}`
                    ),
                    state_mean_type: this.hass.localize(
                      `ui.panel.developer-tools.tabs.statistics.mean_type.${issue.data.state_mean_type}`
                    ),
                  }
                : {}),
            }
          )}<br /><br />
          ${this.hass.localize(
            `ui.panel.developer-tools.tabs.statistics.fix_issue.${issue.type}.info_text_2`,
            { statistic_id: issue.data.statistic_id }
          )}
          ${issue.type === "mean_type_changed"
            ? html`<br /><br />
                ${this.hass.localize(
                  "ui.panel.developer-tools.tabs.statistics.fix_issue.mean_type_changed.info_text_3",
                  { statistic_id: issue.data.statistic_id }
                )}`
            : issue.type === "entity_not_recorded"
              ? html`<br /><br />
                  <a
                    href=${documentationUrl(
                      this.hass,
                      "/integrations/recorder/#configure-filter"
                    )}
                    target="_blank"
                    rel="noreferrer noopener"
                  >
                    ${this.hass.localize(
                      "ui.panel.developer-tools.tabs.statistics.fix_issue.entity_not_recorded.info_text_3_link"
                    )}</a
                  >`
              : issue.type === "entity_no_longer_recorded"
                ? html`<a
                      href=${documentationUrl(
                        this.hass,
                        "/integrations/recorder/#configure-filter"
                      )}
                      target="_blank"
                      rel="noreferrer noopener"
                    >
                      ${this.hass.localize(
                        "ui.panel.developer-tools.tabs.statistics.fix_issue.entity_no_longer_recorded.info_text_3_link"
                      )}</a
                    ><br /><br />
                    ${this.hass.localize(
                      "ui.panel.developer-tools.tabs.statistics.fix_issue.entity_no_longer_recorded.info_text_4"
                    )}`
                : issue.type === "state_class_removed"
                  ? html`<ul>
                        <li>
                          ${this.hass.localize(
                            "ui.panel.developer-tools.tabs.statistics.fix_issue.state_class_removed.info_text_3"
                          )}
                        </li>
                        <li>
                          ${this.hass.localize(
                            "ui.panel.developer-tools.tabs.statistics.fix_issue.state_class_removed.info_text_4"
                          )}
                          <a
                            href="https://developers.home-assistant.io/docs/core/entity/sensor/#long-term-statistics"
                            target="_blank"
                            rel="noreferrer noopener"
                          >
                            ${this.hass.localize(
                              "ui.panel.developer-tools.tabs.statistics.fix_issue.state_class_removed.info_text_4_link"
                            )}</a
                          >
                        </li>
                        <li>
                          ${this.hass.localize(
                            "ui.panel.developer-tools.tabs.statistics.fix_issue.state_class_removed.info_text_5"
                          )}
                        </li>
                      </ul>
                      ${this.hass.localize(
                        "ui.panel.developer-tools.tabs.statistics.fix_issue.state_class_removed.info_text_6",
                        { statistic_id: issue.data.statistic_id }
                      )}`
                  : nothing}
        </p>

        ${issue.type !== "entity_not_recorded"
          ? html`<ha-button
                appearance="plain"
                slot="primaryAction"
                @click=${this._cancel}
              >
                ${this.hass.localize("ui.common.close")}
              </ha-button>
              <ha-button
                slot="primaryAction"
                @click=${this._clearStatistics}
                variants="danger"
                .disabled=${this._clearing}
                .loading=${this._clearing}
              >
                ${this.hass.localize("ui.common.delete")}
              </ha-button>`
          : html`<ha-button slot="primaryAction" @click=${this._cancel}>
              ${this.hass.localize("ui.common.ok")}
            </ha-button>`}
      </ha-dialog>
    `;
  }

  private _cancel(): void {
    this._params?.cancelCallback!();
    this._closeDialog();
  }

  private async _clearStatistics(): Promise<void> {
    this._clearing = true;
    try {
      await clearStatistics(this.hass, [this._params!.issue.data.statistic_id]);
    } catch (err: any) {
      await showAlertDialog(this, {
        title:
          err.code === "timeout"
            ? this.hass.localize(
                "ui.panel.developer-tools.tabs.statistics.fix_issue.clearing_timeout_title"
              )
            : this.hass.localize(
                "ui.panel.developer-tools.tabs.statistics.fix_issue.clearing_failed"
              ),
        text:
          err.code === "timeout"
            ? this.hass.localize(
                "ui.panel.developer-tools.tabs.statistics.fix_issue.clearing_timeout_text"
              )
            : err.message,
      });
    } finally {
      this._clearing = false;
      this._params?.fixedCallback!();
      this._closeDialog();
    }
  }

  static get styles(): CSSResultGroup {
    return [haStyle, haStyleDialog];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-statistics-fix": DialogStatisticsFix;
  }
}
