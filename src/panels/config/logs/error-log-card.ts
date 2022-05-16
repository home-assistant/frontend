import "@material/mwc-button";
import "@material/mwc-list/mwc-list-item";
import { mdiRefresh } from "@mdi/js";
import {
  css,
  CSSResultGroup,
  html,
  LitElement,
  PropertyValues,
  TemplateResult,
} from "lit";
import { customElement, property, state } from "lit/decorators";
import { isComponentLoaded } from "../../../common/config/is_component_loaded";
import "../../../components/ha-alert";
import "../../../components/ha-ansi-to-html";
import "../../../components/ha-card";
import "../../../components/ha-icon-button";
import "../../../components/ha-select";
import { fetchErrorLog } from "../../../data/error_log";
import { extractApiErrorMessage } from "../../../data/hassio/common";
import { fetchHassioLogs } from "../../../data/hassio/supervisor";
import { HomeAssistant } from "../../../types";
import { debounce } from "../../../common/util/debounce";

@customElement("error-log-card")
class ErrorLogCard extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public filter = "";

  @property() public provider!: string;

  @property({ type: Boolean, attribute: true }) public show = false;

  @state() private _isLogLoaded = false;

  @state() private _logHTML?: TemplateResult[] | TemplateResult | string;

  @state() private _error?: string;

  protected render(): TemplateResult {
    return html`
      <div class="error-log-intro">
        ${this._error
          ? html`<ha-alert alert-type="error">${this._error}</ha-alert>`
          : ""}
        ${this._logHTML
          ? html`
              <ha-card outlined>
                <div class="header">
                  <h2>
                    ${this.hass.localize("ui.panel.config.logs.full_logs")}
                  </h2>
                  <ha-icon-button
                    .path=${mdiRefresh}
                    @click=${this._refresh}
                    .label=${this.hass.localize("ui.common.refresh")}
                  ></ha-icon-button>
                </div>
                <div class="card-content error-log">${this._logHTML}</div>
              </ha-card>
            `
          : ""}
        ${!this._logHTML
          ? html`
              <mwc-button raised @click=${this._refreshLogs}>
                ${this.hass.localize("ui.panel.config.logs.load_logs")}
              </mwc-button>
            `
          : ""}
      </div>
    `;
  }

  private _debounceSearch = debounce(
    () => (this._isLogLoaded ? this._refreshLogs() : this._debounceSearch()),
    150,
    false
  );

  protected firstUpdated(changedProps: PropertyValues) {
    super.firstUpdated(changedProps);

    if (this.hass?.config.safe_mode || this.show) {
      this.hass.loadFragmentTranslation("config");
      this._refreshLogs();
    }
  }

  protected updated(changedProps) {
    super.updated(changedProps);

    if (changedProps.has("provider")) {
      this._logHTML = undefined;
    }

    if (
      (changedProps.has("show") && this.show) ||
      (changedProps.has("provider") && this.show)
    ) {
      this._refreshLogs();
      return;
    }

    if (changedProps.has("filter")) {
      this._debounceSearch();
    }
  }

  private async _refresh(ev: CustomEvent): Promise<void> {
    const button = ev.currentTarget as any;
    button.progress = true;

    await this._refreshLogs();
    button.progress = false;
  }

  private async _refreshLogs(): Promise<void> {
    this._logHTML = this.hass.localize("ui.panel.config.logs.loading_log");
    let log: string;

    if (this.provider !== "core" && isComponentLoaded(this.hass, "hassio")) {
      try {
        log = await fetchHassioLogs(this.hass, this.provider);
        if (this.filter) {
          log = log
            .split("\n")
            .filter((entry) =>
              entry.toLowerCase().includes(this.filter.toLowerCase())
            )
            .join("\n");
        }
        if (!log) {
          this._logHTML = this.hass.localize("ui.panel.config.logs.no_errors");
          return;
        }
        this._logHTML = html`<ha-ansi-to-html .content=${log}>
        </ha-ansi-to-html>`;
        this._isLogLoaded = true;
        return;
      } catch (err: any) {
        this._error = this.hass.localize(
          "ui.panel.config.logs.failed_get_logs",
          "provider",
          this.provider,
          "error",
          extractApiErrorMessage(err)
        );
        return;
      }
    } else {
      log = await fetchErrorLog(this.hass!);
    }

    this._isLogLoaded = true;

    const split = log && log.split("\n");

    this._logHTML = split
      ? (this.filter
          ? split.filter((entry) => {
              if (this.filter) {
                return entry.toLowerCase().includes(this.filter.toLowerCase());
              }
              return entry;
            })
          : split
        ).map((entry) => {
          if (entry.includes("INFO"))
            return html`<div class="info">${entry}</div>`;

          if (entry.includes("WARNING"))
            return html`<div class="warning">${entry}</div>`;

          if (
            entry.includes("ERROR") ||
            entry.includes("FATAL") ||
            entry.includes("CRITICAL")
          )
            return html`<div class="error">${entry}</div>`;

          return html`<div>${entry}</div>`;
        })
      : this.hass.localize("ui.panel.config.logs.no_errors");
  }

  static styles: CSSResultGroup = css`
    .error-log-intro {
      text-align: center;
      margin: 16px;
    }

    .header {
      display: flex;
      justify-content: space-between;
      padding: 16px;
    }

    ha-select {
      display: block;
      max-width: 500px;
      width: 100%;
    }

    ha-icon-button {
      float: right;
    }

    .error-log {
      font-family: var(--code-font-family, monospace);
      clear: both;
      text-align: left;
      padding-top: 12px;
    }

    .error-log > div {
      overflow: auto;
      overflow-wrap: break-word;
    }

    .error-log > div:hover {
      background-color: var(--secondary-background-color);
    }

    .error {
      color: var(--error-color);
    }

    .warning {
      color: var(--warning-color);
    }

    mwc-button {
      direction: var(--direction);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "error-log-card": ErrorLogCard;
  }
}
