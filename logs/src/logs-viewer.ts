import {
  mdiArrowCollapseDown,
  mdiChevronDown,
  mdiCircle,
  mdiDownload,
  mdiRefresh,
  mdiWrap,
  mdiWrapDisabled,
} from "@mdi/js";
import type { CSSResultGroup } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
// eslint-disable-next-line import/extensions
import { IntersectionController } from "@lit-labs/observers/intersection-controller.js";
import "../../src/components/ha-ansi-to-html";
import type { HaAnsiToHtml } from "../../src/components/ha-ansi-to-html";
import "../../src/components/ha-button";
import "../../src/components/ha-button-menu";
import "../../src/components/ha-card";
import "../../src/components/ha-icon-button";
import "../../src/components/ha-list-item";
import "../../src/components/ha-spinner";
import "../../src/components/ha-svg-icon";

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

  @state() private _loading = false;

  @state() private _wrapLines = true;

  @state() private _error?: string;

  @state() private _newLogsIndicator?: boolean;

  @query(".error-log") private _logElement?: HTMLElement;

  @query("#scroll-top-marker") private _scrollTopMarkerElement?: HTMLElement;

  @query("#scroll-bottom-marker")
  private _scrollBottomMarkerElement?: HTMLElement;

  @query("ha-ansi-to-html") private _ansiToHtmlElement?: HaAnsiToHtml;

  @state() private _scrolledToBottomController =
    new IntersectionController<boolean>(this, {
      callback(this: IntersectionController<boolean>, entries) {
        return entries[0].isIntersecting;
      },
    });

  @state() private _scrolledToTopController =
    new IntersectionController<boolean>(this, {});

  private _ws: WebSocket | null = null;

  private _apiUrl = `http://${window.location.hostname}:5642`;

  private async _fetchLogs(): Promise<void> {
    if (!this._selectedLogProvider) {
      return;
    }

    this._loading = true;
    this._error = undefined;

    // Stop any existing websocket
    this._stopFollowing();

    // Clear existing logs
    this._ansiToHtmlElement?.clear();

    try {
      // First, fetch the latest logs
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

      const logText = data.output || "";

      // Parse and display initial logs
      if (logText.trim()) {
        this._ansiToHtmlElement?.parseTextToColoredPre(logText);

        // Add divider line
        this._ansiToHtmlElement?.parseLineToColoredPre(
          "--- Live logs start here ---"
        );
      }

      this._loading = false;

      // Scroll to bottom after loading
      this._scrollToBottom();

      // Start streaming
      this._startFollowing();
    } catch (err) {
      this._error = `Error loading logs: ${err}`;
      this._loading = false;
      // eslint-disable-next-line
      console.error("Error fetching logs:", err);
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
        .map(([key]) => ({
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
      // eslint-disable-next-line
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

  protected firstUpdated() {
    this._scrolledToBottomController.observe(this._scrollBottomMarkerElement!);
    this._scrolledToTopController.observe(this._scrollTopMarkerElement!);
  }

  protected updated() {
    if (this._newLogsIndicator && this._scrolledToBottomController.value) {
      this._newLogsIndicator = false;
    }
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

  private _scrollToBottom(): void {
    if (this._logElement) {
      this._newLogsIndicator = false;
      this._logElement.scrollTo(0, this._logElement.scrollHeight);
    }
  }

  private _startFollowing() {
    if (!this._selectedLogProvider) {
      return;
    }

    this._stopFollowing();
    this._error = undefined;

    const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${wsProtocol}//${window.location.hostname}:5642/api/logs/${this._selectedLogProvider}/follow`;

    try {
      this._ws = new WebSocket(wsUrl);

      this._ws.onopen = () => {
        // eslint-disable-next-line
        console.log("WebSocket connected");
      };

      this._ws.onmessage = (event) => {
        const scrolledToBottom = this._scrolledToBottomController.value;

        // Add the new line to the display
        this._ansiToHtmlElement?.parseLineToColoredPre(event.data);

        // Auto-scroll if user is at bottom
        if (scrolledToBottom && this._logElement) {
          this._scrollToBottom();
        } else {
          this._newLogsIndicator = true;
        }
      };

      this._ws.onerror = (error) => {
        // eslint-disable-next-line
        console.error("WebSocket error:", error);
        this._error = "WebSocket connection error";
      };

      this._ws.onclose = () => {
        // eslint-disable-next-line
        console.log("WebSocket disconnected");
      };
    } catch (err) {
      this._error = `Failed to start following logs: ${err}`;
      // eslint-disable-next-line
      console.error("Error starting WebSocket:", err);
    }
  }

  private _stopFollowing() {
    if (this._ws) {
      this._ws.close();
      this._ws = null;
    }
  }

  private _downloadLogs() {
    if (!this._selectedLogProvider || !this._ansiToHtmlElement) {
      return;
    }

    // Get the text content from the logs
    const logText =
      this._ansiToHtmlElement.shadowRoot?.querySelector("pre")?.textContent ||
      "";

    if (!logText.trim()) {
      return;
    }

    // Create blob from log text
    const blob = new Blob([logText], { type: "text/plain" });
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
                    .disabled=${!this._ansiToHtmlElement}
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
              <div class="card-content error-log">
                <div id="scroll-top-marker"></div>
                ${this._loading
                  ? html`<div>Loading logs...</div>`
                  : this._error
                    ? html`<div class="error">${this._error}</div>`
                    : nothing}
                <ha-ansi-to-html
                  ?wrap-disabled=${!this._wrapLines}
                ></ha-ansi-to-html>
                <div id="scroll-bottom-marker"></div>
              </div>
              <ha-button
                class="new-logs-indicator ${classMap({
                  visible:
                    (this._newLogsIndicator &&
                      !this._scrolledToBottomController.value) ||
                    false,
                })}"
                size="small"
                appearance="filled"
                @click=${this._scrollToBottom}
              >
                <ha-svg-icon
                  .path=${mdiArrowCollapseDown}
                  slot="start"
                ></ha-svg-icon>
                Scroll down
                <ha-svg-icon
                  .path=${mdiArrowCollapseDown}
                  slot="end"
                ></ha-svg-icon>
              </ha-button>
              ${this._ws && !this._error
                ? html`<div class="live-indicator">
                    <ha-svg-icon .path=${mdiCircle}></ha-svg-icon>
                    Live
                  </div>`
                : nothing}
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
      padding: var(--ha-space-2) var(--ha-space-4);
      display: flex;
      justify-content: flex-end;
      gap: var(--ha-space-2);
    }

    .content {
      direction: ltr;
    }

    .error-log-intro {
      text-align: center;
      margin: 0 var(--ha-space-4);
    }

    ha-card {
      padding-top: var(--ha-space-2);
      position: relative;
    }

    .header {
      display: flex;
      justify-content: space-between;
      padding: 0 var(--ha-space-4);
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
      position: relative;
      font-family: var(--ha-font-family-code);
      clear: both;
      text-align: start;
      padding-top: var(--ha-space-4);
      padding-bottom: var(--ha-space-4);
      overflow-y: scroll;
      min-height: var(--error-log-card-height, calc(100vh - 244px));
      max-height: var(--error-log-card-height, calc(100vh - 244px));
      border-top: 1px solid var(--divider-color);
      direction: ltr;
    }

    .error-log > div {
      padding: 0 var(--ha-space-4);
      overflow: auto;
    }

    .error {
      color: var(--error-color);
      padding: var(--ha-space-4);
    }

    .new-logs-indicator {
      overflow: hidden;
      position: absolute;
      bottom: var(--ha-space-1);
      left: var(--ha-space-1);
      height: 0;
      transition: height 0.4s ease-out;
    }

    .new-logs-indicator.visible {
      height: 32px;
    }

    @keyframes breathe {
      from {
        opacity: 0.8;
      }
      to {
        opacity: 0;
      }
    }

    .live-indicator {
      position: absolute;
      bottom: 0;
      inset-inline-end: var(--ha-space-4);
      border-top-right-radius: var(--ha-space-2);
      border-top-left-radius: var(--ha-space-2);
      background-color: var(--primary-color);
      color: var(--text-primary-color);
      padding: var(--ha-space-1) var(--ha-space-2);
      opacity: 0.8;
    }

    .live-indicator ha-svg-icon {
      animation: breathe 1s cubic-bezier(0.5, 0, 1, 1) infinite alternate;
      height: 14px;
      width: 14px;
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
