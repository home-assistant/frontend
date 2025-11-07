import {
  mdiChevronDown,
  mdiDownload,
  mdiPause,
  mdiPlay,
  mdiRefresh,
  mdiWrap,
  mdiWrapDisabled,
} from "@mdi/js";
import type { CSSResultGroup } from "lit";
import { LitElement, css, html } from "lit";
import { customElement, property, state } from "lit/decorators";
import "../../src/components/ha-button";
import "../../src/components/ha-button-menu";
import "../../src/components/ha-card";
import "../../src/components/ha-icon-button";
import "../../src/components/ha-list-item";
import "../../src/components/ha-spinner";

// Data types
interface LogProvider {
  key: string;
  name: string;
}

@customElement("logs-viewer")
export class LogsViewer extends LitElement {
  @property({ type: Boolean }) public narrow = false;

  @state() private _selectedLogProvider?: string;

  @state() private _logProviders: LogProvider[] = [];

  @state() private _logText = "";

  @state() private _loading = false;

  @state() private _wrapLines = true;

  @state() private _following = false;

  @state() private _error?: string;

  private _ws: WebSocket | null = null;

  private _apiUrl = `http://${window.location.hostname}:5642`;

  private async _fetchLogs(): Promise<void> {
    if (!this._selectedLogProvider) {
      return;
    }

    this._loading = true;
    this._error = undefined;

    try {
      const response = await fetch(
        `${this._apiUrl}/api/logs/${this._selectedLogProvider}`
      );
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (data.error) {
        throw new Error(data.error);
      }

      this._logText = data.output || "";
    } catch (err) {
      this._error = `Error loading logs: ${err}`;
      this._logText = "";
      console.error("Error fetching logs:", err);
    } finally {
      this._loading = false;
    }
  }

  private async _fetchLogProviders(): Promise<void> {
    try {
      const response = await fetch(`${this._apiUrl}/api/logs`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const providers = await response.json();

      // Define the order (matching backend registration order)
      const order = ["core", "supervisor", "host", "audio", "dns", "multicast"];

      // Convert object to array of providers, filter out health endpoint, and sort
      this._logProviders = Object.entries(providers)
        .filter(([key]) => key !== "health")
        .map(([key, value]) => ({
          key,
          name: key.charAt(0).toUpperCase() + key.slice(1),
        }))
        .sort((a, b) => order.indexOf(a.key) - order.indexOf(b.key));

      // Set default provider once loaded
      if (this._logProviders.length > 0 && !this._selectedLogProvider) {
        this._selectedLogProvider = this._logProviders[0].key;
        await this._fetchLogs();
      }
    } catch (err) {
      this._error = `Failed to load log providers: ${err}`;
      console.error("Error fetching log providers:", err);
    }
  }

  connectedCallback() {
    super.connectedCallback();
    this._fetchLogProviders();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._stopFollowing();
  }

  private _selectProvider(ev: Event) {
    const target = ev.currentTarget as any;
    this._selectedLogProvider = target.provider;
    if (this._following) {
      this._stopFollowing();
      this._startFollowing();
    } else {
      this._fetchLogs();
    }
  }

  private _refresh() {
    if (this._following) {
      this._stopFollowing();
      this._startFollowing();
    } else {
      this._fetchLogs();
    }
  }

  private _toggleLineWrap() {
    this._wrapLines = !this._wrapLines;
  }

  private _toggleFollow() {
    if (this._following) {
      this._stopFollowing();
    } else {
      this._startFollowing();
    }
  }

  private _startFollowing() {
    if (!this._selectedLogProvider) {
      return;
    }

    this._stopFollowing();
    this._following = true;
    this._logText = "";
    this._error = undefined;

    const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${wsProtocol}//${window.location.hostname}:5642/api/logs/${this._selectedLogProvider}/follow`;

    try {
      this._ws = new WebSocket(wsUrl);

      this._ws.onopen = () => {
        console.log("WebSocket connected");
      };

      this._ws.onmessage = (event) => {
        this._logText += event.data + "\n";
        // Auto-scroll to bottom
        this.requestUpdate().then(() => {
          const logElement = this.shadowRoot?.querySelector(".error-log");
          if (logElement) {
            logElement.scrollTop = logElement.scrollHeight;
          }
        });
      };

      this._ws.onerror = (error) => {
        console.error("WebSocket error:", error);
        this._error = "WebSocket connection error";
      };

      this._ws.onclose = () => {
        console.log("WebSocket disconnected");
        if (this._following) {
          this._following = false;
        }
      };
    } catch (err) {
      this._error = `Failed to start following logs: ${err}`;
      this._following = false;
      console.error("Error starting WebSocket:", err);
    }
  }

  private _stopFollowing() {
    if (this._ws) {
      this._ws.close();
      this._ws = null;
    }
    this._following = false;
  }

  private _downloadLogs() {
    if (!this._selectedLogProvider || !this._logText) {
      return;
    }

    // Create blob from log text
    const blob = new Blob([this._logText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);

    // Create download link and trigger it
    const a = document.createElement("a");
    a.href = url;
    a.download = `${this._selectedLogProvider}-logs-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();

    // Cleanup
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  render() {
    const currentProvider = this._logProviders.find(
      (p) => p.key === this._selectedLogProvider
    );
    const hasLogs = this._logText.trim().length > 0;

    return html`
      <div class="container">
        <div class="toolbar">
          <ha-button-menu .disabled=${this._following}>
            <ha-button slot="trigger" appearance="filled" .disabled=${this._following}>
              <ha-svg-icon slot="end" .path=${mdiChevronDown}></ha-svg-icon>
              ${currentProvider?.name || "Select Provider"}
            </ha-button>
            ${this._logProviders.map(
              (provider) => html`
                <ha-list-item
                  ?selected=${provider.key === this._selectedLogProvider}
                  .provider=${provider.key}
                  @click=${this._selectProvider}
                >
                  ${provider.name}
                </ha-list-item>
              `
            )}
          </ha-button-menu>
        </div>

        <div class="content">
          <div class="error-log-intro">
            <ha-card outlined>
              <div class="header">
                <h1 class="card-header">${currentProvider?.name || "Logs"}</h1>
                <div class="action-buttons">
                  <ha-icon-button
                    .path=${this._following ? mdiPause : mdiPlay}
                    @click=${this._toggleFollow}
                    .label=${this._following ? "Stop following" : "Follow logs"}
                    .disabled=${!this._selectedLogProvider}
                  ></ha-icon-button>
                  <ha-icon-button
                    .path=${mdiDownload}
                    @click=${this._downloadLogs}
                    .label=${"Download logs"}
                    .disabled=${!this._logText}
                  ></ha-icon-button>
                  <ha-icon-button
                    .path=${this._wrapLines ? mdiWrapDisabled : mdiWrap}
                    @click=${this._toggleLineWrap}
                    .label=${this._wrapLines ? "Full width" : "Wrap lines"}
                  ></ha-icon-button>
                  <ha-icon-button
                    .path=${mdiRefresh}
                    @click=${this._refresh}
                    .label=${"Refresh"}
                    .disabled=${!this._selectedLogProvider}
                  ></ha-icon-button>
                </div>
              </div>
              <div
                class="card-content error-log ${this._wrapLines
                  ? ""
                  : "nowrap"}"
              >
                ${this._error
                  ? html`<div class="error">${this._error}</div>`
                  : this._loading
                    ? html`<div>Loading logs...</div>`
                    : !hasLogs
                      ? html`<div>No logs available${this._following ? " yet..." : ""}</div>`
                      : html`<pre>${this._logText}</pre>`}
              </div>
            </ha-card>
          </div>
        </div>
      </div>
    `;
  }

  static styles: CSSResultGroup = css`
    :host {
      display: block;
      direction: var(--direction);
    }

    .container {
      max-width: 1200px;
      margin: 0 auto;
    }

    .toolbar {
      padding: 16px;
      display: flex;
      gap: 8px;
    }

    .content {
      direction: ltr;
    }

    .error-log-intro {
      text-align: center;
      margin: 16px;
    }

    ha-card {
      padding-top: 8px;
      position: relative;
    }

    .header {
      display: flex;
      justify-content: space-between;
      padding: 0 16px;
    }

    .action-buttons {
      display: flex;
      align-items: center;
      height: 100%;
    }

    .card-header {
      color: var(--ha-card-header-color, var(--primary-text-color));
      font-family: var(--ha-card-header-font-family, inherit);
      font-size: var(--ha-card-header-font-size, var(--ha-font-size-2xl));
      letter-spacing: -0.012em;
      line-height: var(--ha-line-height-expanded);
      display: block;
      margin-block-start: 0px;
      font-weight: var(--ha-font-weight-normal);
      white-space: nowrap;
      max-width: calc(100% - 150px);
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .error-log {
      font-family: var(--code-font-family, monospace);
      clear: both;
      text-align: start;
      padding-top: 16px;
      padding-bottom: 16px;
      overflow-y: scroll;
      min-height: var(--error-log-card-height, calc(100vh - 244px));
      max-height: var(--error-log-card-height, calc(100vh - 244px));
      border-top: 1px solid var(--divider-color);
      direction: ltr;
    }

    .error-log.nowrap {
      overflow-x: scroll;
    }

    .error-log > div {
      padding: 0 16px;
      overflow: auto;
    }

    .error-log pre {
      margin: 0;
      padding: 0 16px;
      white-space: pre-wrap;
      word-wrap: break-word;
      overflow-wrap: break-word;
      font-family: inherit;
    }

    .error-log.nowrap pre {
      white-space: pre;
      word-wrap: normal;
      overflow-wrap: normal;
    }

    .error-log > div:hover {
      background-color: var(--secondary-background-color);
    }

    .error {
      color: var(--error-color);
      padding: 16px;
    }

    @media all and (max-width: 870px) {
      .error-log {
        min-height: var(--error-log-card-height, calc(100vh - 190px));
        max-height: var(--error-log-card-height, calc(100vh - 190px));
      }

      ha-button-menu {
        max-width: 50%;
      }
      ha-button {
        max-width: 100%;
      }
      ha-button::part(label) {
        overflow: hidden;
        white-space: nowrap;
      }
    }

    ha-list-item[selected] {
      color: var(--primary-color);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "logs-viewer": LogsViewer;
  }
}
