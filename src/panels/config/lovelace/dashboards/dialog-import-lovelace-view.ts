import { mdiClose } from "@mdi/js";
import { dump, load } from "js-yaml";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../../common/dom/fire_event";
import { navigate } from "../../../../common/navigate";
import "../../../../components/ha-alert";
import "../../../../components/ha-button";
import "../../../../components/ha-code-editor";
import "../../../../components/ha-dialog";
import "../../../../components/ha-dialog-footer";
import "../../../../components/ha-dialog-header";
import "../../../../components/ha-expansion-panel";
import "../../../../components/ha-textfield";
import "../../../../components/ha-select";
import type { HaSelectSelectEvent } from "../../../../components/ha-select";
import "../../../../components/ha-dropdown-item";
import "../../../../components/ha-spinner";
import type { LovelaceConfig } from "../../../../data/lovelace/config/types";
import {
  fetchConfig,
  isStrategyDashboard,
  saveConfig,
} from "../../../../data/lovelace/config/types";
import type { LovelaceViewConfig } from "../../../../data/lovelace/config/view";
import type { LovelaceStorageDashboard } from "../../../../data/lovelace/dashboard";
import { fetchDashboards } from "../../../../data/lovelace/dashboard";
import { addView } from "../../../lovelace/editor/config-util";
import { haStyleDialog } from "../../../../resources/styles";
import type { HomeAssistant } from "../../../../types";
import { clearEntityReferences } from "./import-utils";
import type { ImportLovelaceViewDialogParams } from "./show-dialog-import-lovelace-view";

interface DashboardOption {
  value: string;
  label: string;
}

@customElement("dialog-import-lovelace-view")
class DialogImportLovelaceView extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _params?: ImportLovelaceViewDialogParams;

  @state() private _open = false;

  @state() private _step: "loading" | "configure" | "error" = "loading";

  @state() private _config?: LovelaceViewConfig;

  @state() private _dashboards: DashboardOption[] = [];

  private _abortController?: AbortController;

  @state() private _selectedDashboardPath = "";

  @state() private _error?: string;

  @state() private _saving = false;

  @state() private _sourceUrlWarning = false;

  public async showDialog(
    params: ImportLovelaceViewDialogParams
  ): Promise<void> {
    this._abortController = new AbortController();
    this._params = params;
    this._step = "loading";
    this._error = undefined;
    this._saving = false;
    this._config = undefined;
    this._selectedDashboardPath = "";
    this._sourceUrlWarning = !this._isTrustedUrl(params.url);
    this._open = true;

    try {
      const [fetchResult, allDashboards] = await Promise.all([
        fetch(params.url, { signal: this._abortController.signal }),
        fetchDashboards(this.hass),
      ]);

      if (!fetchResult.ok) {
        throw new Error(
          this.hass.localize(
            "ui.panel.config.lovelace.dashboards.import_view.error_fetch"
          )
        );
      }

      let parsed: unknown;
      const importedView = await fetchResult.text();
      try {
        parsed = load(importedView);
      } catch {
        throw new Error(
          this.hass.localize(
            "ui.panel.config.lovelace.dashboards.import_view.error_parse"
          )
        );
      }

      if (
        !parsed ||
        typeof parsed !== "object" ||
        "views" in (parsed as object)
      ) {
        throw new Error(
          this.hass.localize(
            "ui.panel.config.lovelace.dashboards.import_view.error_not_a_view"
          )
        );
      }

      this._config = clearEntityReferences(parsed as LovelaceViewConfig);

      const candidates = allDashboards.filter(
        (d): d is LovelaceStorageDashboard => d.mode === "storage"
      );

      // Fetch each dashboard's config to filter out strategy-based dashboards
      // (e.g. the built-in Map dashboard), which don't support adding views.
      const configs = await Promise.all(
        candidates.map((d) =>
          fetchConfig(this.hass.connection, d.url_path, false).catch(() => null)
        )
      );

      this._dashboards = candidates
        .filter((_, i) => !configs[i] || !isStrategyDashboard(configs[i]!))
        .map((d) => ({ value: d.url_path, label: d.title }));

      this._selectedDashboardPath = this._dashboards[0]?.value ?? "";
      this._step = "configure";
    } catch (err: any) {
      if (err.name === "AbortError") return;
      this._error = err.message;
      this._step = "error";
    }
  }

  public closeDialog(): void {
    this._abortController?.abort();
    this._open = false;
  }

  private _dialogClosed(): void {
    this._params = undefined;
    this._config = undefined;
    this._error = undefined;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  protected render() {
    if (!this._params) {
      return nothing;
    }

    return html`
      <ha-dialog
        .hass=${this.hass}
        .open=${this._open}
        width="medium"
        @closed=${this._dialogClosed}
      >
        <ha-dialog-header slot="header">
          <ha-icon-button
            slot="navigationIcon"
            @click=${this.closeDialog}
            .label=${this.hass.localize("ui.common.close")}
            .path=${mdiClose}
          ></ha-icon-button>
          <span slot="title">
            ${this.hass.localize(
              "ui.panel.config.lovelace.dashboards.import_view.header"
            )}
          </span>
        </ha-dialog-header>

        <div>
          ${this._step === "loading"
            ? html`<div class="loading"><ha-spinner></ha-spinner></div>`
            : this._step === "error"
              ? html`<ha-alert alert-type="error">${this._error}</ha-alert>`
              : html`
                  ${this._sourceUrlWarning
                    ? html`
                        <ha-alert alert-type="warning">
                          ${this.hass.localize(
                            "ui.panel.config.lovelace.dashboards.import_view.source_warning"
                          )}
                        </ha-alert>
                      `
                    : nothing}
                  <p>
                    ${this.hass.localize(
                      "ui.panel.config.lovelace.dashboards.import_view.introduction"
                    )}
                  </p>
                  ${this._dashboards.length === 0
                    ? html`
                        <ha-alert alert-type="warning">
                          ${this.hass.localize(
                            "ui.panel.config.lovelace.dashboards.import_view.no_dashboards"
                          )}
                        </ha-alert>
                      `
                    : nothing}
                  <ha-textfield
                    .label=${this.hass.localize(
                      "ui.panel.config.lovelace.dashboards.import_view.view_title"
                    )}
                    .value=${this._config!.title || ""}
                    @change=${this._titleChanged}
                  ></ha-textfield>
                  ${this._dashboards.length > 0
                    ? html`
                        <ha-select
                          .label=${this.hass.localize(
                            "ui.panel.config.lovelace.dashboards.import_view.target_dashboard"
                          )}
                          .value=${this._dashboards.find(
                            (d) => d.value === this._selectedDashboardPath
                          )?.label ?? ""}
                          @selected=${this._dashboardSelected}
                        >
                          ${this._dashboards.map(
                            (d) =>
                              html`<ha-dropdown-item
                                .value=${d.value}
                                .selected=${d.value ===
                                this._selectedDashboardPath}
                                >${d.label}</ha-dropdown-item
                              >`
                          )}
                        </ha-select>
                      `
                    : nothing}
                  <ha-expansion-panel
                    .header=${this.hass.localize(
                      "ui.panel.config.lovelace.dashboards.import_view.preview_title"
                    )}
                  >
                    <ha-code-editor
                      mode="yaml"
                      .value=${dump(this._config!)}
                      .hass=${this.hass}
                      read-only
                      dir="ltr"
                    ></ha-code-editor>
                  </ha-expansion-panel>
                `}
        </div>

        <ha-dialog-footer slot="footer">
          <ha-button
            appearance="plain"
            slot="secondaryAction"
            @click=${this.closeDialog}
            .disabled=${this._saving}
          >
            ${this.hass.localize("ui.common.cancel")}
          </ha-button>
          ${this._step === "configure"
            ? html`
                <ha-button
                  slot="primaryAction"
                  @click=${this._save}
                  .disabled=${this._saving || this._dashboards.length === 0}
                  .loading=${this._saving}
                >
                  ${this.hass.localize(
                    "ui.panel.config.lovelace.dashboards.import_view.add_btn"
                  )}
                </ha-button>
              `
            : nothing}
        </ha-dialog-footer>
      </ha-dialog>
    `;
  }

  private _titleChanged(ev: Event) {
    this._config = {
      ...this._config!,
      title: (ev.target as HTMLInputElement).value,
    };
  }

  private _dashboardSelected(ev: HaSelectSelectEvent) {
    this._selectedDashboardPath = ev.detail.value;
  }

  private async _save() {
    this._saving = true;
    this._error = undefined;
    try {
      const currentConfig = await fetchConfig(
        this.hass.connection,
        this._selectedDashboardPath,
        false
      );

      if (isStrategyDashboard(currentConfig)) {
        this._error = this.hass.localize(
          "ui.panel.config.lovelace.dashboards.import_view.error_strategy_dashboard"
        );
        return;
      }

      const newConfig = addView(
        this.hass,
        currentConfig as LovelaceConfig,
        this._config!,
        true
      );
      await saveConfig(this.hass, this._selectedDashboardPath, newConfig);
      const addedView = newConfig.views[newConfig.views.length - 1];
      const viewPath = addedView.path ?? newConfig.views.length - 1;
      this.closeDialog();
      navigate(`/${this._selectedDashboardPath}/${viewPath}?edit=1`);
    } catch (err: any) {
      this._error = err.message;
    } finally {
      this._saving = false;
    }
  }

  private _isTrustedUrl(url?: string): boolean {
    if (!url) {
      return true;
    }
    let hostname: string;
    try {
      hostname = new URL(url).hostname.toLowerCase();
    } catch {
      return false;
    }
    return (
      hostname === "github.com" ||
      hostname.endsWith(".github.com") ||
      hostname.endsWith(".githubusercontent.com") ||
      hostname === "home-assistant.io" ||
      hostname.endsWith(".home-assistant.io")
    );
  }

  static styles = [
    haStyleDialog,
    css`
      p {
        margin-top: 0;
        margin-bottom: var(--ha-space-2);
      }
      ha-alert {
        display: block;
        margin-bottom: var(--ha-space-2);
      }
      ha-textfield {
        display: block;
        margin-bottom: var(--ha-space-4);
      }
      ha-select {
        display: block;
        margin-bottom: var(--ha-space-4);
      }
      ha-expansion-panel {
        --expansion-panel-content-padding: 0px;
        margin-top: var(--ha-space-4);
      }
      .loading {
        display: flex;
        justify-content: center;
        padding: var(--ha-space-4);
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-import-lovelace-view": DialogImportLovelaceView;
  }
}
