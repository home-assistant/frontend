import {
  mdiChevronDown,
  mdiDownload,
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

// Mock data types - replace with actual types from your data layer
interface MockLogProvider {
  key: string;
  name: string;
}

// Mock log providers - replace with actual data source
const mockLogProviders: MockLogProvider[] = [
  { key: "core", name: "Home Assistant Core" },
  { key: "supervisor", name: "Supervisor" },
  { key: "custom", name: "Custom Component" },
];

// Mock log data - replace with actual data fetching (raw text)
const mockLogText = `2025-01-07 10:30:45 ERROR (MainThread) [homeassistant.components.example] Connection timeout to device
Traceback (most recent call last):
  File "/usr/src/homeassistant/homeassistant/components/example/sensor.py", line 123, in async_update
    await self._client.connect()
TimeoutError: Connection timeout after 30 seconds

2025-01-07 10:29:12 WARNING (MainThread) [homeassistant.components.api] Slow response from API endpoint
Response time: 5.2 seconds

2025-01-07 10:28:03 INFO (MainThread) [homeassistant.core] System started successfully
Home Assistant version: 2025.1.0
Python version: 3.12.0

2025-01-07 10:27:30 DEBUG (MainThread) [homeassistant.loader] Loading integration example
2025-01-07 10:27:29 DEBUG (MainThread) [homeassistant.loader] Loading integration api`;

@customElement("logs-viewer")
export class LogsViewer extends LitElement {
  @property({ type: Boolean }) public narrow = false;

  @state() private _selectedLogProvider = "core";

  @state() private _logProviders = mockLogProviders;

  @state() private _logText = mockLogText;

  @state() private _loading = false;

  @state() private _wrapLines = true;

  // MOCK CONNECTION POINT: Replace with actual data fetching
  private async _fetchLogs(): Promise<void> {
    this._loading = true;
    // TODO: Replace with actual API call
    // Example: const logs = await fetchLogsFromApi(this._selectedLogProvider);
    // For streaming: use fetchHassioLogsFollow or fetchErrorLog
    await new Promise((resolve) => {
      setTimeout(resolve, 500);
    }); // Simulate network delay
    this._logText = mockLogText;
    this._loading = false;
  }

  // MOCK CONNECTION POINT: Replace with actual provider list fetching
  private async _fetchLogProviders(): Promise<void> {
    // TODO: Replace with actual API call to get available log providers
    // Example: const providers = await fetchAvailableProviders();
    this._logProviders = mockLogProviders;
  }

  connectedCallback() {
    super.connectedCallback();
    this._fetchLogs();
    this._fetchLogProviders();
  }

  private _selectProvider(ev: Event) {
    const target = ev.currentTarget as any;
    this._selectedLogProvider = target.provider;
    this._fetchLogs();
  }

  private _refresh() {
    this._fetchLogs();
  }

  private _toggleLineWrap() {
    this._wrapLines = !this._wrapLines;
  }

  private _downloadLogs() {
    // MOCK CONNECTION POINT: Replace with actual download implementation
    // Example: const url = await getLogDownloadUrl(this._selectedLogProvider);
    // fileDownload(url, `logs_${Date.now()}.log`);
    // eslint-disable-next-line no-console
    console.log("Download logs for", this._selectedLogProvider);
  }

  render() {
    const currentProvider = this._logProviders.find(
      (p) => p.key === this._selectedLogProvider
    );
    const hasLogs = this._logText.trim().length > 0;

    return html`
      <div class="container">
        <div class="toolbar">
          <ha-button-menu>
            <ha-button slot="trigger" appearance="filled">
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
                    .path=${mdiDownload}
                    @click=${this._downloadLogs}
                    .label=${"Download logs"}
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
                  ></ha-icon-button>
                </div>
              </div>
              <div
                class="card-content error-log ${this._wrapLines
                  ? ""
                  : "nowrap"}"
              >
                ${this._loading
                  ? html`<div>Loading logs...</div>`
                  : !hasLogs
                    ? html`<div>No logs available</div>`
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
