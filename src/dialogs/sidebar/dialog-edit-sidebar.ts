import "@material/mwc-linear-progress/mwc-linear-progress";
import { mdiClose } from "@mdi/js";
import { css, html, LitElement, nothing, type TemplateResult } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../common/dom/fire_event";
import "../../components/ha-alert";
import "../../components/ha-dialog-header";
import "../../components/ha-fade-in";
import "../../components/ha-icon-button";
import "../../components/ha-items-display-editor";
import type { DisplayValue } from "../../components/ha-items-display-editor";
import "../../components/ha-md-dialog";
import type { HaMdDialog } from "../../components/ha-md-dialog";
import { computePanels, PANEL_ICONS } from "../../components/ha-sidebar";
import "../../components/ha-spinner";
import {
  fetchFrontendUserData,
  saveFrontendUserData,
} from "../../data/frontend";
import type { HomeAssistant } from "../../types";
import { showConfirmationDialog } from "../generic/show-dialog-box";

@customElement("dialog-edit-sidebar")
class DialogEditSidebar extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _open = false;

  @query("ha-md-dialog") private _dialog?: HaMdDialog;

  @state() private _order?: string[];

  @state() private _hidden?: string[];

  @state() private _error?: string;

  /**
   * If user has old localStorage values, show a confirmation dialog
   */
  @state() private _migrateToUserData = false;

  public async showDialog(): Promise<void> {
    this._open = true;

    this._getData();
  }

  private async _getData() {
    try {
      const data = await fetchFrontendUserData(this.hass.connection, "sidebar");
      this._order = data?.panelOrder;
      this._hidden = data?.hiddenPanels;

      // fallback to old localStorage values
      if (!this._order) {
        const storedOrder = localStorage.getItem("sidebarPanelOrder");
        this._migrateToUserData = !!storedOrder;
        this._order = storedOrder ? JSON.parse(storedOrder) : [];
      }
      if (!this._hidden) {
        const storedHidden = localStorage.getItem("sidebarHiddenPanels");
        this._migrateToUserData = this._migrateToUserData || !!storedHidden;
        this._hidden = storedHidden ? JSON.parse(storedHidden) : [];
      }
    } catch (err: any) {
      this._error = err.message || err;
    }
  }

  private _dialogClosed(): void {
    this._open = false;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  public closeDialog(): void {
    this._dialog?.close();
  }

  private _panels = memoizeOne((panels: HomeAssistant["panels"]) =>
    panels ? Object.values(panels) : []
  );

  private _renderContent(): TemplateResult {
    if (!this._order || !this._hidden) {
      return html`<ha-fade-in .delay=${500}
        ><ha-spinner size="large"></ha-spinner
      ></ha-fade-in>`;
    }

    if (this._error) {
      return html`<ha-alert alert-type="error">${this._error}</ha-alert>`;
    }

    const panels = this._panels(this.hass.panels);

    const [beforeSpacer, afterSpacer] = computePanels(
      this.hass.panels,
      this.hass.defaultPanel,
      this._order,
      this._hidden,
      this.hass.locale
    );

    const items = [
      ...beforeSpacer,
      ...panels.filter((panel) => this._hidden!.includes(panel.url_path)),
      ...afterSpacer.filter((panel) => panel.url_path !== "config"),
    ].map((panel) => ({
      value: panel.url_path,
      label:
        panel.url_path === this.hass.defaultPanel
          ? panel.title || this.hass.localize("panel.states")
          : this.hass.localize(`panel.${panel.title}`) || panel.title || "?",
      icon: panel.icon || undefined,
      iconPath:
        panel.url_path === this.hass.defaultPanel && !panel.icon
          ? PANEL_ICONS.lovelace
          : panel.url_path in PANEL_ICONS
            ? PANEL_ICONS[panel.url_path]
            : undefined,
      disableSorting: panel.url_path === "developer-tools",
    }));

    return html`<ha-items-display-editor
      .hass=${this.hass}
      .value=${{
        order: this._order,
        hidden: this._hidden,
      }}
      .items=${items}
      @value-changed=${this._changed}
      dont-sort-visible
    >
    </ha-items-display-editor>`;
  }

  protected render() {
    if (!this._open) {
      return nothing;
    }

    const dialogTitle = this.hass.localize("ui.sidebar.edit_sidebar");

    return html`
      <ha-md-dialog open @closed=${this._dialogClosed}>
        <ha-dialog-header slot="headline">
          <ha-icon-button
            slot="navigationIcon"
            .label=${this.hass.localize("ui.common.close") ?? "Close"}
            .path=${mdiClose}
            @click=${this.closeDialog}
          ></ha-icon-button>
          <span slot="title" .title=${dialogTitle}>${dialogTitle}</span>
          ${!this._migrateToUserData
            ? html`<span slot="subtitle"
                >${this.hass.localize("ui.sidebar.edit_subtitle")}</span
              >`
            : nothing}
        </ha-dialog-header>
        <div slot="content" class="content">${this._renderContent()}</div>
        <div slot="actions">
          <ha-button @click=${this.closeDialog}>
            ${this.hass.localize("ui.common.cancel")}
          </ha-button>
          <ha-button
            .disabled=${!this._order || !this._hidden}
            @click=${this._save}
          >
            ${this.hass.localize("ui.common.save")}
          </ha-button>
        </div>
      </ha-md-dialog>
    `;
  }

  private _changed(ev: CustomEvent<{ value: DisplayValue }>): void {
    const { order = [], hidden = [] } = ev.detail.value;
    this._order = [...order];
    this._hidden = [...hidden];
  }

  private async _save() {
    if (this._migrateToUserData) {
      const confirmation = await showConfirmationDialog(this, {
        destructive: true,
        text: this.hass.localize("ui.sidebar.migrate_to_user_data"),
      });
      if (!confirmation) {
        return;
      }
    }

    try {
      await saveFrontendUserData(this.hass.connection, "sidebar", {
        panelOrder: this._order!,
        hiddenPanels: this._hidden!,
      });
    } catch (err: any) {
      this._error = err.message || err;
      return;
    }

    this.closeDialog();
  }

  static styles = css`
    ha-md-dialog {
      min-width: 600px;
      max-height: 90%;
    }

    @media all and (max-width: 600px), all and (max-height: 500px) {
      ha-md-dialog {
        --md-dialog-container-shape: 0;
        min-width: 100%;
        min-height: 100%;
      }
    }

    ha-fade-in {
      display: flex;
      justify-content: center;
      align-items: center;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-edit-sidebar": DialogEditSidebar;
  }
}
