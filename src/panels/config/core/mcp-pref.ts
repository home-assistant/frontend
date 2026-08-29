import {
  mdiCog,
  mdiContentCopy,
  mdiDotsVertical,
  mdiHelpCircleOutline,
} from "@mdi/js";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { copyToClipboard } from "../../../common/util/copy-clipboard";
import "../../../components/ha-button";
import "../../../components/ha-card";
import "../../../components/ha-dropdown";
import "../../../components/ha-dropdown-item";
import "../../../components/ha-icon-button";
import "../../../components/ha-settings-row";
import "../../../components/ha-svg-icon";
import type { ConfigEntry } from "../../../data/config_entries";
import {
  deleteConfigEntry,
  getConfigEntries,
} from "../../../data/config_entries";
import type { LLMApi } from "../../../data/llm";
import { fetchLLMApis } from "../../../data/llm";
import { showConfigFlowDialog } from "../../../dialogs/config-flow/show-dialog-config-flow";
import { showOptionsFlowDialog } from "../../../dialogs/config-flow/show-dialog-options-flow";
import {
  showAlertDialog,
  showConfirmationDialog,
} from "../../../dialogs/generic/show-dialog-box";
import type { HomeAssistant } from "../../../types";
import { brandsUrl } from "../../../util/brands-url";
import { documentationUrl } from "../../../util/documentation-url";
import { showToast } from "../../../util/toast";

const MCP_SERVER_DOMAIN = "mcp_server";

@customElement("mcp-pref")
export class MCPPref extends LitElement {
  @property({ type: Boolean, reflect: true }) public narrow = false;

  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _entry?: ConfigEntry | null;

  @state() private _apis?: LLMApi[];

  private _sortedApis = memoizeOne((apis: LLMApi[], language: string) =>
    [...apis].sort((a, b) => a.name.localeCompare(b.name, language))
  );

  protected firstUpdated() {
    this._load();
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
          <div class="header-actions">
            <ha-icon-button
              .label=${this.hass.localize(
                "ui.panel.config.cloud.account.alexa.link_learn_how_it_works"
              )}
              .path=${mdiHelpCircleOutline}
              href=${documentationUrl(this.hass, "/integrations/mcp_server/")}
              target="_blank"
              rel="noreferrer"
              class="icon-link"
            ></ha-icon-button>
            ${
              this._entry
                ? html`
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
                  `
                : nothing
            }
          </div>
        </h1>
        <div class="card-content">
          <p>${this.hass.localize("ui.panel.config.mcp.description")}</p>
          ${this._entry ? this._renderEnabled(this._entry) : nothing}
        </div>
        ${
          this._entry === null
            ? html`
                <div class="card-actions centered">
                  <ha-button appearance="filled" @click=${this._enable}>
                    ${this.hass.localize("ui.panel.config.mcp.enable")}
                  </ha-button>
                </div>
              `
            : nothing
        }
      </ha-card>
    `;
  }

  private _renderEnabled(entry: ConfigEntry) {
    return html`
      <ha-settings-row .narrow=${this.narrow}>
        <span slot="heading">
          ${this.hass.localize("ui.panel.config.mcp.your_url_header")}
        </span>
        <span slot="description">${entry.title}</span>
        <div class="row-actions">
          ${this._renderCopyButton(this._mcpUrl())}
          ${
            entry.supports_options
              ? html`
                  <ha-icon-button
                    .label=${this.hass.localize("ui.panel.config.mcp.configure")}
                    .path=${mdiCog}
                    @click=${this._configure}
                  ></ha-icon-button>
                `
              : nothing
          }
        </div>
      </ha-settings-row>
      ${
        this._apis?.length
          ? html`
              <h3>${this.hass.localize("ui.panel.config.mcp.apis_header")}</h3>
              ${this._sortedApis(this._apis, this.hass.locale.language).map(
                (api) => html`
                  <ha-settings-row .narrow=${this.narrow}>
                    <span slot="heading">${api.name}</span>
                    <div class="row-actions">
                      ${this._renderCopyButton(this._mcpUrl(api.id))}
                    </div>
                  </ha-settings-row>
                `
              )}
            `
          : nothing
      }
    `;
  }

  private _renderCopyButton(url: string) {
    return html`
      <ha-button
        appearance="plain"
        size="s"
        data-url=${url}
        @click=${this._copyUrl}
      >
        <ha-svg-icon slot="start" .path=${mdiContentCopy}></ha-svg-icon>
        ${this.hass.localize("ui.panel.config.mcp.copy_url")}
      </ha-button>
    `;
  }

  // Serve the URL for the host Home Assistant is being browsed on, which is
  // the one reachable for whoever copies it.
  private _mcpUrl(apiId?: string) {
    return `${location.origin}/api/mcp${apiId ? `/${apiId}` : ""}`;
  }

  private async _load() {
    const entries = await getConfigEntries(this.hass, {
      domain: MCP_SERVER_DOMAIN,
    });
    this._entry = entries.length ? entries[0] : null;
    if (this._entry) {
      this._apis = await fetchLLMApis(this.hass);
    }
  }

  private _enable() {
    showConfigFlowDialog(this, {
      startFlowHandler: MCP_SERVER_DOMAIN,
      dialogClosedCallback: () => {
        this._load();
      },
    });
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
      flex-direction: row;
      align-items: center;
      margin-inline-start: auto;
    }
    .header-actions .icon-link {
      color: var(--secondary-text-color);
    }
    ha-settings-row {
      padding: 0;
    }

    .row-actions {
      display: flex;
      flex-direction: row;
      align-items: center;
    }
    h3 {
      margin-bottom: 0;
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
