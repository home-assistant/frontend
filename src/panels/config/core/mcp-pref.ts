import { mdiCog, mdiContentCopy, mdiDotsVertical } from "@mdi/js";
import type { UnsubscribeFunc } from "home-assistant-js-websocket";
import type { TemplateResult } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { copyToClipboard } from "../../../common/util/copy-clipboard";
import "../../../components/ha-alert";
import "../../../components/ha-button";
import "../../../components/ha-card";
import "../../../components/ha-dropdown";
import "../../../components/ha-dropdown-item";
import "../../../components/ha-icon-button";
import "../../../components/ha-spinner";
import type { ConfigEntry } from "../../../data/config_entries";
import {
  deleteConfigEntry,
  getConfigEntries,
} from "../../../data/config_entries";
import type { ConfigFlowInProgressMessage } from "../../../data/config_flow";
import {
  createConfigFlow,
  handleConfigFlowStep,
  ignoreConfigFlow,
  localizeConfigFlowTitle,
  subscribeConfigFlowInProgress,
} from "../../../data/config_flow";
import type { DataEntryFlowProgress } from "../../../data/data_entry_flow";
import type { LLMApi } from "../../../data/llm";
import { fetchLLMApis } from "../../../data/llm";
import { showConfigFlowDialog } from "../../../dialogs/config-flow/show-dialog-config-flow";
import { showOptionsFlowDialog } from "../../../dialogs/config-flow/show-dialog-options-flow";
import {
  showAlertDialog,
  showConfirmationDialog,
} from "../../../dialogs/generic/show-dialog-box";
import { SubscribeMixin } from "../../../mixins/subscribe-mixin";
import type { HomeAssistant } from "../../../types";
import { brandsUrl } from "../../../util/brands-url";
import { documentationUrl } from "../../../util/documentation-url";
import { showToast } from "../../../util/toast";

const MCP_SERVER_DOMAIN = "mcp_server";
const MCP_DOMAIN = "mcp";

@customElement("mcp-pref")
export class MCPPref extends SubscribeMixin(LitElement) {
  @property({ type: Boolean, reflect: true }) public narrow = false;

  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _entry?: ConfigEntry | null;

  @state() private _apis?: LLMApi[];

  @state() private _error?: string;

  @state() private _enabling = false;

  @state() private _discoveredFlows: DataEntryFlowProgress[] = [];

  private _sortedApis = memoizeOne((apis: LLMApi[], language: string) =>
    [...apis].sort((a, b) => a.name.localeCompare(b.name, language))
  );

  protected firstUpdated() {
    this._load();
  }

  public hassSubscribe(): (UnsubscribeFunc | Promise<UnsubscribeFunc>)[] {
    return [
      subscribeConfigFlowInProgress(
        this.hass,
        (messages: ConfigFlowInProgressMessage[]) => {
          // The first message lists all flows in progress with type null
          let flows =
            !messages.length || messages[0].type === null
              ? []
              : this._discoveredFlows;
          for (const message of messages) {
            if (message.type === "removed") {
              flows = flows.filter((flow) => flow.flow_id !== message.flow_id);
            } else if (
              message.flow.handler === MCP_DOMAIN &&
              message.flow.context.source === "hassio"
            ) {
              flows = [...flows, message.flow];
            }
          }
          this._discoveredFlows = flows;
        }
      ),
    ];
  }

  protected render() {
    return html`
      <ha-card outlined>
        <h1 class="card-header">
          <img
            alt=""
            src=${brandsUrl(
              {
                domain: MCP_SERVER_DOMAIN,
                type: "icon",
                darkOptimized: this.hass.themes?.darkMode,
              },
              this.hass.auth.data.hassUrl
            )}
            crossorigin="anonymous"
            referrerpolicy="no-referrer"
          />${this.hass.localize("ui.panel.config.mcp.header")}
          ${
            this._entry
              ? html`
                  <div class="header-actions">
                    <ha-dropdown>
                      <ha-icon-button
                        slot="trigger"
                        .label=${this.hass.localize("ui.common.menu")}
                        .path=${mdiDotsVertical}
                      ></ha-icon-button>
                      <ha-dropdown-item
                        variant="danger"
                        @click=${this._disable}
                      >
                        ${this.hass.localize("ui.panel.config.mcp.disable")}
                      </ha-dropdown-item>
                    </ha-dropdown>
                  </div>
                `
              : nothing
          }
        </h1>
        <div class="card-content">
          <p>
            ${this.hass.localize("ui.panel.config.mcp.description", {
              documentation_link: html`<a
                href=${documentationUrl(this.hass, "/integrations/mcp_server/")}
                target="_blank"
                rel="noreferrer"
                >${this.hass.localize("ui.panel.config.mcp.documentation")}</a
              >`,
            })}
          </p>
          ${
            this._entry === undefined && this._error === undefined
              ? html`
                  <div class="loading">
                    <ha-spinner></ha-spinner>
                  </div>
                `
              : nothing
          }
          ${
            this._error !== undefined
              ? html`
                  <ha-alert
                    alert-type="error"
                    .title=${this.hass.localize("ui.panel.config.mcp.error_load")}
                  >
                    ${this._error}
                  </ha-alert>
                `
              : nothing
          }
          ${this._entry ? this._renderEnabled() : nothing}
          ${this._discoveredFlows.length ? this._renderDiscovered() : nothing}
        </div>
        ${
          this._entry === null
            ? html`
                <div class="card-actions centered">
                  <ha-button
                    appearance="filled"
                    .loading=${this._enabling}
                    .disabled=${this._enabling}
                    @click=${this._enable}
                  >
                    ${this.hass.localize("ui.panel.config.mcp.enable")}
                  </ha-button>
                </div>
              `
            : nothing
        }
      </ha-card>
    `;
  }

  private _renderEnabled() {
    return html`
      ${this._renderUrlRow(
        this.hass.localize("ui.panel.config.mcp.your_api_header"),
        this._mcpUrl(),
        html`<ha-icon-button
          .label=${this.hass.localize("ui.panel.config.mcp.configure")}
          .path=${mdiCog}
          @click=${this._configure}
        ></ha-icon-button>`
      )}
      ${
        this._apis?.length
          ? html`
              <p class="section">
                ${this.hass.localize("ui.panel.config.mcp.apis_header")}
              </p>
              ${this._sortedApis(this._apis, this.hass.locale.language).map(
                (api) => this._renderUrlRow(api.name, this._mcpUrl(api.id))
              )}
            `
          : nothing
      }
    `;
  }

  private _renderDiscovered() {
    return html`
      <p class="section">
        ${this.hass.localize("ui.panel.config.mcp.discovered_header")}
      </p>
      <p class="hint">
        ${this.hass.localize("ui.panel.config.mcp.discovered_description")}
      </p>
      ${this._discoveredFlows.map(
        (flow) => html`
          <div class="url-row">
            <div class="url-info">
              <span class="name"
                >${localizeConfigFlowTitle(this.hass.localize, flow)}</span
              >
            </div>
            <ha-button
              appearance="plain"
              data-flow-id=${flow.flow_id}
              @click=${this._ignoreFlow}
            >
              ${this.hass.localize("ui.panel.config.integrations.ignore.ignore")}
            </ha-button>
            <ha-button
              appearance="filled"
              data-flow-id=${flow.flow_id}
              @click=${this._continueFlow}
            >
              ${this.hass.localize("ui.common.add")}
            </ha-button>
          </div>
        `
      )}
    `;
  }

  private _renderUrlRow(name: string, url: string, action?: TemplateResult) {
    return html`
      <div class="url-row">
        <div class="url-info">
          <span class="name">${name}</span>
          <span class="url">${url}</span>
        </div>
        ${action}
        <ha-icon-button
          .label=${this.hass.localize("ui.panel.config.mcp.copy_url")}
          .path=${mdiContentCopy}
          data-url=${url}
          @click=${this._copyUrl}
        ></ha-icon-button>
      </div>
    `;
  }

  private _mcpUrl(apiId?: string) {
    return this.hass.hassUrl(`/api/mcp${apiId ? `/${apiId}` : ""}`);
  }

  private async _load() {
    this._error = undefined;
    try {
      const entries = await getConfigEntries(this.hass, {
        domain: MCP_SERVER_DOMAIN,
      });
      this._entry = entries.length ? entries[0] : null;
      if (this._entry) {
        this._apis = await fetchLLMApis(this.hass);
      }
    } catch (err: any) {
      this._error = err?.message || "";
    }
  }

  private async _enable() {
    this._enabling = true;
    try {
      // The config flow only asks for confirmation, so submit it directly
      let step = await createConfigFlow(this.hass, MCP_SERVER_DOMAIN);
      if (step.type === "form") {
        step = await handleConfigFlowStep(this.hass, step.flow_id, {});
      }
      if (step.type === "form") {
        showConfigFlowDialog(this, {
          continueFlowId: step.flow_id,
          dialogClosedCallback: () => {
            this._load();
          },
        });
        return;
      }
    } catch (err: any) {
      showAlertDialog(this, {
        title: this.hass.localize("ui.panel.config.mcp.error_enable"),
        text: err?.message,
      });
      return;
    } finally {
      this._enabling = false;
    }
    await this._load();
    if (this._entry) {
      this._configure();
    }
  }

  private _configure() {
    showOptionsFlowDialog(this, this._entry!, {
      dialogClosedCallback: () => {
        this._load();
      },
    });
  }

  private async _disable() {
    const confirmed = await showConfirmationDialog(this, {
      title: this.hass.localize("ui.panel.config.mcp.disable_confirm_title"),
      text: this.hass.localize("ui.panel.config.mcp.disable_confirm_text"),
      confirmText: this.hass.localize("ui.panel.config.mcp.disable"),
      destructive: true,
    });
    if (!confirmed) {
      return;
    }
    try {
      await deleteConfigEntry(this.hass, this._entry!.entry_id);
    } catch (err: any) {
      showAlertDialog(this, {
        title: this.hass.localize("ui.panel.config.mcp.error_delete_entry"),
        text: err?.message,
      });
      return;
    }
    this._entry = null;
    this._apis = undefined;
  }

  private _continueFlow(ev: Event) {
    const flowId = (ev.currentTarget as HTMLElement).dataset.flowId!;
    showConfigFlowDialog(this, { continueFlowId: flowId });
  }

  private async _ignoreFlow(ev: Event) {
    const flowId = (ev.currentTarget as HTMLElement).dataset.flowId!;
    const flow = this._discoveredFlows.find((f) => f.flow_id === flowId);
    if (!flow) {
      return;
    }
    const name = localizeConfigFlowTitle(this.hass.localize, flow);
    const confirmed = await showConfirmationDialog(this, {
      title: this.hass.localize(
        "ui.panel.config.integrations.ignore.confirm_ignore_title",
        { name }
      ),
      text: this.hass.localize(
        "ui.panel.config.integrations.ignore.confirm_ignore"
      ),
      confirmText: this.hass.localize(
        "ui.panel.config.integrations.ignore.ignore"
      ),
    });
    if (!confirmed) {
      return;
    }
    await ignoreConfigFlow(this.hass, flowId, name);
  }

  private async _copyUrl(ev: Event) {
    const url = (ev.currentTarget as HTMLElement).getAttribute("data-url")!;
    await copyToClipboard(url);
    showToast(this, {
      message: this.hass.localize("ui.common.copied_clipboard"),
    });
  }

  static styles = css`
    .card-header {
      display: flex;
      align-items: center;
    }
    .card-header img {
      max-width: 28px;
      margin-right: 16px;
      margin-inline-end: 16px;
      margin-inline-start: initial;
    }
    .header-actions {
      display: flex;
      align-items: center;
      margin-inline-start: auto;
    }
    a {
      color: var(--primary-color);
    }
    .url-row {
      display: flex;
      align-items: center;
      gap: var(--ha-space-2);
      border: 1px solid var(--divider-color);
      border-radius: var(--ha-border-radius-lg);
      padding: var(--ha-space-2) var(--ha-space-2) var(--ha-space-2)
        var(--ha-space-4);
    }
    .url-row + .url-row {
      margin-top: var(--ha-space-2);
    }
    .url-info {
      display: flex;
      flex-direction: column;
      flex: 1;
      min-width: 0;
    }
    .url {
      color: var(--secondary-text-color);
      font-size: var(--ha-font-size-s);
      word-break: break-all;
    }
    .section {
      margin: var(--ha-space-4) 0 var(--ha-space-2);
    }
    .hint {
      margin: 0 0 var(--ha-space-2);
      color: var(--secondary-text-color);
      font-size: var(--ha-font-size-s);
    }
    .loading {
      display: flex;
      justify-content: center;
      padding: var(--ha-space-6) 0;
    }
    .card-actions.centered {
      display: flex;
      justify-content: center;
      border-top: none;
      padding-top: 0;
      padding-bottom: 16px;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "mcp-pref": MCPPref;
  }
}
