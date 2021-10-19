import "@material/mwc-list/mwc-list";
import "@material/mwc-list/mwc-radio-list-item";
import "@polymer/paper-item/paper-item";
import "@polymer/paper-listbox/paper-listbox";
import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, state } from "lit/decorators";
import { fireEvent } from "../../../../common/dom/fire_event";
import { createCloseHeading } from "../../../../components/ha-dialog";
import "../../../../components/ha-icon";
import "../../../../components/ha-paper-dropdown-menu";
import {
  fetchConfig,
  fetchDashboards,
  LovelaceConfig,
  LovelaceDashboard,
} from "../../../../data/lovelace";
import { haStyleDialog } from "../../../../resources/styles";
import { HomeAssistant } from "../../../../types";
import type { SelectViewDialogParams } from "./show-select-view-dialog";

declare global {
  interface HASSDomEvents {
    "view-selected": {
      view: number;
    };
  }
}

@customElement("hui-dialog-select-view")
export class HuiDialogSelectView extends LitElement {
  public hass!: HomeAssistant;

  @state() private _params?: SelectViewDialogParams;

  @state() private _dashboards: LovelaceDashboard[] = [];

  @state() private _urlPath?: string | null;

  @state() private _config?: LovelaceConfig;

  @state() private _selectedViewIdx = 0;

  public showDialog(params: SelectViewDialogParams): void {
    this._config = params.lovelaceConfig;
    this._urlPath = params.urlPath;
    this._params = params;
    if (this._params.allowDashboardChange) {
      this._getDashboards();
    }
  }

  public closeDialog(): void {
    this._params = undefined;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  protected render(): TemplateResult {
    if (!this._params) {
      return html``;
    }
    return html`
      <ha-dialog
        open
        @closed=${this.closeDialog}
        .heading=${createCloseHeading(
          this.hass,
          this._params.header ||
            this.hass.localize("ui.panel.lovelace.editor.select_view.header")
        )}
      >
        ${this._params.allowDashboardChange
          ? html`<ha-paper-dropdown-menu
              .label=${this.hass.localize(
                "ui.panel.lovelace.editor.select_view.dashboard_label"
              )}
              dynamic-align
              .disabled=${!this._dashboards.length}
            >
              <paper-listbox
                slot="dropdown-content"
                .selected=${this._urlPath || this.hass.defaultPanel}
                @iron-select=${this._dashboardChanged}
                attr-for-selected="url-path"
              >
                <paper-item
                  .urlPath=${"lovelace"}
                  .disabled=${(this.hass.panels.lovelace?.config as any)
                    ?.mode === "yaml"}
                >
                  Default
                </paper-item>
                ${this._dashboards.map((dashboard) => {
                  if (!this.hass.user!.is_admin && dashboard.require_admin) {
                    return "";
                  }
                  return html`
                    <paper-item
                      .disabled=${dashboard.mode !== "storage"}
                      .urlPath=${dashboard.url_path}
                      >${dashboard.title}</paper-item
                    >
                  `;
                })}
              </paper-listbox>
            </ha-paper-dropdown-menu>`
          : ""}
        ${this._config
          ? this._config.views.length > 1
            ? html`
                <mwc-list>
                  ${this._config.views.map(
                    (view, idx) => html`
                      <mwc-radio-list-item
                        graphic=${this._config?.views.some(({ icon }) => icon)
                          ? "icon"
                          : null}
                        @click=${this._viewChanged}
                        .value=${idx.toString()}
                        .selected=${this._selectedViewIdx === idx}
                      >
                        <span>${view.title}</span>
                        <ha-icon .icon=${view.icon} slot="graphic"></ha-icon>
                      </mwc-radio-list-item>
                    `
                  )}
                </mwc-list>
              `
            : ""
          : html`<div>No config found.</div>`}
        <mwc-button slot="secondaryAction" @click=${this.closeDialog}>
          ${this.hass!.localize("ui.common.cancel")}
        </mwc-button>
        <mwc-button slot="primaryAction" @click=${this._selectView}>
          ${this.hass!.localize("ui.common.move")}
        </mwc-button>
      </ha-dialog>
    `;
  }

  private async _getDashboards() {
    this._dashboards =
      this._params!.dashboards || (await fetchDashboards(this.hass));
  }

  private async _dashboardChanged(ev: CustomEvent) {
    let urlPath: string | null = ev.detail.item.urlPath;
    if (urlPath === this._urlPath) {
      return;
    }
    if (urlPath === "lovelace") {
      urlPath = null;
    }
    this._urlPath = urlPath;
    this._selectedViewIdx = 0;
    try {
      this._config = await fetchConfig(this.hass.connection, urlPath, false);
    } catch (err: any) {
      this._config = undefined;
    }
  }

  private _viewChanged(e) {
    const view = Number(e.target.value);

    if (!isNaN(view)) {
      this._selectedViewIdx = view;
    }
  }

  private _selectView(): void {
    fireEvent(this, "view-selected", { view: this._selectedViewIdx });
    this._params!.viewSelectedCallback(
      this._urlPath!,
      this._config!,
      this._selectedViewIdx
    );
    this.closeDialog();
  }

  static get styles(): CSSResultGroup {
    return [
      haStyleDialog,
      css`
        ha-paper-dropdown-menu {
          width: 100%;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-dialog-select-view": HuiDialogSelectView;
  }
}
