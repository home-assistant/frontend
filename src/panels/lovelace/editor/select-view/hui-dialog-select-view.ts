import "@material/mwc-button/mwc-button";
import "@material/mwc-list/mwc-list";
import "@material/mwc-list/mwc-list-item";
import "@material/mwc-list/mwc-radio-list-item";
import { css, CSSResultGroup, html, LitElement, nothing } from "lit";
import { customElement, state } from "lit/decorators";
import { fireEvent } from "../../../../common/dom/fire_event";
import { stopPropagation } from "../../../../common/dom/stop_propagation";
import "../../../../components/ha-alert";
import { createCloseHeading } from "../../../../components/ha-dialog";
import "../../../../components/ha-icon";
import "../../../../components/ha-select";
import {
  fetchConfig,
  LovelaceConfig,
} from "../../../../data/lovelace/config/types";
import {
  fetchDashboards,
  LovelaceDashboard,
} from "../../../../data/lovelace/dashboard";
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

  protected render() {
    if (!this._params) {
      return nothing;
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
          ? html`<ha-select
              .label=${this.hass.localize(
                "ui.panel.lovelace.editor.select_view.dashboard_label"
              )}
              .disabled=${!this._dashboards.length}
              .value=${this._urlPath || this.hass.defaultPanel}
              @selected=${this._dashboardChanged}
              @closed=${stopPropagation}
              fixedMenuPosition
              naturalMenuWidth
              dialogInitialFocus
            >
              <mwc-list-item
                value="lovelace"
                .disabled=${(this.hass.panels.lovelace?.config as any)?.mode ===
                "yaml"}
              >
                Default
              </mwc-list-item>
              ${this._dashboards.map((dashboard) => {
                if (!this.hass.user!.is_admin && dashboard.require_admin) {
                  return "";
                }
                return html`
                  <mwc-list-item
                    .disabled=${dashboard.mode !== "storage"}
                    .value=${dashboard.url_path}
                    >${dashboard.title}</mwc-list-item
                  >
                `;
              })}
            </ha-select>`
          : ""}
        ${!this._config || (this._config.views || []).length < 1
          ? html`<ha-alert alert-type="error"
              >${this.hass.localize(
                this._config
                  ? "ui.panel.lovelace.editor.select_view.no_views"
                  : "ui.panel.lovelace.editor.select_view.no_config"
              )}</ha-alert
            >`
          : this._config.views.length > 1
            ? html`
                <mwc-list dialogInitialFocus>
                  ${this._config.views.map(
                    (view, idx) => html`
                      <mwc-radio-list-item
                        .graphic=${this._config?.views.some(({ icon }) => icon)
                          ? "icon"
                          : nothing}
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
            : ""}
        <mwc-button
          slot="secondaryAction"
          @click=${this.closeDialog}
          dialogInitialFocus
        >
          ${this.hass!.localize("ui.common.cancel")}
        </mwc-button>
        <mwc-button
          slot="primaryAction"
          .disabled=${!this._config || (this._config.views || []).length < 1}
          @click=${this._selectView}
        >
          ${this._params.actionLabel || this.hass!.localize("ui.common.move")}
        </mwc-button>
      </ha-dialog>
    `;
  }

  private async _getDashboards() {
    this._dashboards =
      this._params!.dashboards || (await fetchDashboards(this.hass));
  }

  private async _dashboardChanged(ev) {
    let urlPath: string | null = ev.target.value;
    if (urlPath === this._urlPath) {
      return;
    }
    if (urlPath === "lovelace") {
      urlPath = null;
    }
    this._urlPath = urlPath;
    this._selectedViewIdx = 0;
    try {
      this._config = (await fetchConfig(
        this.hass.connection,
        urlPath,
        false
      )) as LovelaceConfig;
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
        ha-select {
          width: 100%;
        }
        mwc-radio-list-item {
          direction: ltr;
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
