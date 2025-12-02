import "@material/mwc-linear-progress/mwc-linear-progress";
import { mdiClose, mdiDotsVertical, mdiRestart } from "@mdi/js";
import { css, html, LitElement, nothing, type TemplateResult } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../common/dom/fire_event";
import "../../components/ha-alert";
import "../../components/ha-dialog-header";
import "../../components/ha-fade-in";
import "../../components/ha-icon-button";
import "../../components/ha-items-display-editor";
import type {
  DisplayItem,
  DisplayValue,
} from "../../components/ha-items-display-editor";
import "../../components/ha-md-button-menu";
import "../../components/ha-md-dialog";
import type { HaMdDialog } from "../../components/ha-md-dialog";
import "../../components/ha-md-menu-item";
import { computePanels } from "../../components/ha-sidebar";
import "../../components/ha-spinner";
import "../../components/ha-svg-icon";
import {
  fetchFrontendUserData,
  saveFrontendUserData,
} from "../../data/frontend";
import {
  getDefaultPanelUrlPath,
  getPanelIcon,
  getPanelIconPath,
  getPanelTitle,
  SHOW_AFTER_SPACER_PANELS,
} from "../../data/panel";
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

    const defaultPanel = getDefaultPanelUrlPath(this.hass);

    const [beforeSpacer, afterSpacer] = computePanels(
      this.hass.panels,
      defaultPanel,
      this._order,
      this._hidden,
      this.hass.locale
    );

    const orderSet = new Set(this._order);
    const hiddenSet = new Set(this._hidden);

    for (const panel of panels) {
      if (
        panel.default_visible === false &&
        !orderSet.has(panel.url_path) &&
        !hiddenSet.has(panel.url_path)
      ) {
        hiddenSet.add(panel.url_path);
      }
    }

    if (hiddenSet.has(defaultPanel)) {
      hiddenSet.delete(defaultPanel);
    }

    const hiddenPanels = Array.from(hiddenSet);

    const items = [
      ...beforeSpacer,
      ...panels.filter((panel) => hiddenPanels.includes(panel.url_path)),
      ...afterSpacer,
    ].map<DisplayItem>((panel) => ({
      value: panel.url_path,
      label:
        (getPanelTitle(this.hass, panel) || panel.url_path) +
        `${defaultPanel === panel.url_path ? " (default)" : ""}`,
      icon: getPanelIcon(panel),
      iconPath: getPanelIconPath(panel),
      disableSorting: SHOW_AFTER_SPACER_PANELS.includes(panel.url_path),
      disableHiding: panel.url_path === defaultPanel,
    }));

    return html`
      <ha-items-display-editor
        .hass=${this.hass}
        .value=${{
          order: this._order,
          hidden: hiddenPanels,
        }}
        .items=${items}
        @value-changed=${this._changed}
        dont-sort-visible
      >
      </ha-items-display-editor>
    `;
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
          <ha-md-button-menu
            slot="actionItems"
            positioning="popover"
            anchor-corner="end-end"
            menu-corner="start-end"
          >
            <ha-icon-button
              slot="trigger"
              .label=${this.hass.localize("ui.common.menu")}
              .path=${mdiDotsVertical}
            ></ha-icon-button>
            <ha-md-menu-item .clickAction=${this._resetToDefaults}>
              <ha-svg-icon slot="start" .path=${mdiRestart}></ha-svg-icon>
              ${this.hass.localize("ui.sidebar.reset_to_defaults")}
            </ha-md-menu-item>
          </ha-md-button-menu>
        </ha-dialog-header>
        <div slot="content" class="content">${this._renderContent()}</div>
        <div slot="actions">
          <ha-button appearance="plain" @click=${this.closeDialog}>
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

  private _resetToDefaults = async () => {
    const confirmation = await showConfirmationDialog(this, {
      text: this.hass.localize("ui.sidebar.reset_confirmation"),
      confirmText: this.hass.localize("ui.common.reset"),
    });

    if (!confirmation) {
      return;
    }

    this._order = [];
    this._hidden = [];
    try {
      await saveFrontendUserData(this.hass.connection, "sidebar", {});
    } catch (err: any) {
      this._error = err.message || err;
    }
    this.closeDialog();
  };

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
      --dialog-content-padding: 8px 24px;
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
