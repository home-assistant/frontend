import { mdiDelete, mdiDotsVertical, mdiRestart } from "@mdi/js";
import { css, html, LitElement, nothing, type TemplateResult } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../common/dom/fire_event";
import "../../components/ha-alert";
import "../../components/ha-button";
import "../../components/ha-dialog-footer";
import "../../components/ha-dropdown";
import "../../components/ha-dropdown-item";
import "../../components/animation/ha-fade-in";
import "../../components/ha-icon-button";
import "../../components/ha-items-display-editor";
import type {
  DisplayItem,
  DisplayValue,
} from "../../components/ha-items-display-editor";
import "../../components/ha-navigation-picker";
import type { HaNavigationPicker } from "../../components/ha-navigation-picker";
import {
  computePanels,
  SHORTCUT_KEY_PREFIX,
} from "../../components/ha-sidebar";
import "../../components/ha-spinner";
import "../../components/ha-svg-icon";
import "../../components/ha-dialog";
import { computeNavigationPathInfo } from "../../data/compute-navigation-path-info";
import {
  fetchFrontendUserData,
  saveFrontendUserData,
} from "../../data/frontend";
import {
  FIXED_PANELS,
  getDefaultPanelUrlPath,
  getPanelIcon,
  getPanelIconPath,
  getPanelTitle,
} from "../../data/panel";
import { DirtyStateProviderMixin } from "../../mixins/dirty-state-provider-mixin";
import type { HomeAssistant, ValueChangedEvent } from "../../types";
import { showConfirmationDialog } from "../generic/show-dialog-box";

interface SidebarState {
  order: string[];
  hidden: string[];
  shortcuts: string[];
}

@customElement("dialog-edit-sidebar")
class DialogEditSidebar extends DirtyStateProviderMixin<SidebarState>()(
  LitElement
) {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _open = false;

  @state() private _order?: string[];

  @state() private _hidden?: string[];

  @state() private _customShortcuts?: string[];

  @state() private _error?: string;

  @query("ha-navigation-picker") private _picker?: HaNavigationPicker;

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
      this._customShortcuts = data?.customShortcuts ?? [];

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
      const order = this._order ?? [];
      this._initDirtyTracking(
        { type: "deep" },
        {
          order,
          hidden: this._computeHiddenPanels(),
          shortcuts: this._customShortcuts ?? [],
        }
      );
    } catch (err: any) {
      this._error = err.message || err;
    }
  }

  private _dialogClosed(): void {
    this._open = false;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  public closeDialog(): void {
    this._open = false;
  }

  private _panels = memoizeOne((panels: HomeAssistant["panels"]) =>
    panels ? Object.values(panels) : []
  );

  private _computeHiddenPanels(): string[] {
    const panels = this._panels(this.hass.panels);
    const defaultPanel = getDefaultPanelUrlPath(this.hass);

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

    return Array.from(hiddenSet);
  }

  /**
   * Paths to exclude from the shortcut picker:
   * - All panel paths (e.g. /lovelace, /todo, /map) — they are already sidebar items
   * - Fixed sidebar paths (/config, /profile) — rendered outside the editable list
   * - Already-added shortcut paths — prevent duplicates
   */
  private _computePickerExcludePaths = memoizeOne(
    (panels: HomeAssistant["panels"], customShortcuts: string[]): string[] => {
      const panelPaths = Object.values(panels).map(
        (panel) => `/${panel.url_path}`
      );
      const fixedPaths = FIXED_PANELS.map((urlPath) => `/${urlPath}`);
      return [...panelPaths, ...fixedPaths, ...customShortcuts];
    }
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

    const hiddenPanels = this._computeHiddenPanels();

    const panelDisplayItems = [
      ...beforeSpacer,
      ...panels.filter((panel) => hiddenPanels.includes(panel.url_path)),
      ...afterSpacer,
    ].map<DisplayItem>((panel) => ({
      value: panel.url_path,
      label:
        (getPanelTitle(this.hass, panel) || panel.url_path) +
        `${defaultPanel === panel.url_path ? ` (${this.hass.localize("ui.sidebar.default")})` : ""}`,
      icon: getPanelIcon(panel),
      iconPath: getPanelIconPath(panel),
      disableHiding: panel.url_path === defaultPanel,
    }));

    const shortcutDisplayItems: DisplayItem[] = (
      this._customShortcuts ?? []
    ).map((path): DisplayItem => {
      const info = computeNavigationPathInfo(this.hass, path);
      return {
        value: `${SHORTCUT_KEY_PREFIX}${path}`,
        label: info.label || path,
        icon: info.icon,
        iconPath: info.iconPath,
        disableHiding: true,
      };
    });

    const allItems = [...panelDisplayItems, ...shortcutDisplayItems];

    return html`
      <ha-items-display-editor
        .value=${{
          order: this._order,
          hidden: hiddenPanels,
        }}
        .items=${allItems}
        .actionsRenderer=${this._actionsRenderer}
        @value-changed=${this._changed}
      >
      </ha-items-display-editor>
      <ha-navigation-picker
        .hass=${this.hass}
        .addButtonLabel=${this.hass.localize("ui.sidebar.add_shortcut")}
        .excludeDashboards=${true}
        .excludeViews=${true}
        .excludeApps=${true}
        .excludeRelated=${true}
        .excludePaths=${this._computePickerExcludePaths(
          this.hass.panels,
          this._customShortcuts ?? []
        )}
        @value-changed=${this._addShortcut}
      ></ha-navigation-picker>
    `;
  }

  protected render() {
    const dialogTitle = this.hass.localize("ui.sidebar.edit_sidebar");

    return html`
      <ha-dialog
        .open=${this._open}
        header-title=${dialogTitle}
        header-subtitle=${!this._migrateToUserData
          ? this.hass.localize("ui.sidebar.edit_subtitle")
          : ""}
        .preventScrimClose=${this.isDirtyState}
        @closed=${this._dialogClosed}
      >
        <ha-dropdown slot="headerActionItems" placement="bottom-end">
          <ha-icon-button
            slot="trigger"
            .label=${this.hass.localize("ui.common.menu")}
            .path=${mdiDotsVertical}
          ></ha-icon-button>
          <ha-dropdown-item @click=${this._resetToDefaults}>
            <ha-svg-icon slot="icon" .path=${mdiRestart}></ha-svg-icon>
            ${this.hass.localize("ui.sidebar.reset_to_defaults")}
          </ha-dropdown-item>
        </ha-dropdown>
        <div class="content">${this._renderContent()}</div>
        <ha-dialog-footer slot="footer">
          <ha-button
            slot="secondaryAction"
            appearance="plain"
            @click=${this.closeDialog}
          >
            ${this.hass.localize("ui.common.cancel")}
          </ha-button>
          <ha-button
            slot="primaryAction"
            .disabled=${!this._order ||
            !this._hidden ||
            !this._customShortcuts ||
            !this.isDirtyState}
            @click=${this._save}
          >
            ${this.hass.localize("ui.common.save")}
          </ha-button>
        </ha-dialog-footer>
      </ha-dialog>
    `;
  }

  private _actionsRenderer = (
    item: DisplayItem
  ): TemplateResult<1> | typeof nothing => {
    if (!item.value.startsWith(SHORTCUT_KEY_PREFIX)) return nothing;
    return html`<ha-icon-button
      .path=${mdiDelete}
      .label=${this.hass.localize("ui.common.delete")}
      data-item-value=${item.value}
      @click=${this._handleDeleteShortcut}
    ></ha-icon-button>`;
  };

  private _handleDeleteShortcut = (ev: Event): void => {
    const itemValue = (ev.currentTarget as HTMLElement).dataset.itemValue;
    if (itemValue) this._deleteShortcut(itemValue);
  };

  private _addShortcut = (ev: ValueChangedEvent<string>): void => {
    ev.stopPropagation();
    const path = ev.detail.value;
    if (!path) return;
    if (this._picker) this._picker.value = undefined;
    if ((this._customShortcuts ?? []).includes(path)) return;
    this._customShortcuts = [...(this._customShortcuts ?? []), path];
    this._order = [...(this._order ?? []), `${SHORTCUT_KEY_PREFIX}${path}`];
    this._updateDirtyState({
      order: this._order,
      hidden: this._computeHiddenPanels(),
      shortcuts: this._customShortcuts,
    });
  };

  private _deleteShortcut(itemValue: string): void {
    const path = itemValue.slice(SHORTCUT_KEY_PREFIX.length);
    this._customShortcuts = (this._customShortcuts ?? []).filter(
      (p) => p !== path
    );
    this._order = (this._order ?? []).filter((key) => key !== itemValue);
    this._updateDirtyState({
      order: this._order,
      hidden: this._computeHiddenPanels(),
      shortcuts: this._customShortcuts,
    });
  }

  private _changed(ev: ValueChangedEvent<DisplayValue>): void {
    const { order = [], hidden = [] } = ev.detail.value;
    this._order = [...order];
    this._hidden = [...hidden];
    this._updateDirtyState({
      order: this._order,
      hidden: this._hidden,
      shortcuts: this._customShortcuts ?? [],
    });
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
    this._customShortcuts = [];
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
        customShortcuts: this._customShortcuts ?? [],
      });
    } catch (err: any) {
      this._error = err.message || err;
      return;
    }

    this._markDirtyStateClean();
    this.closeDialog();
  }

  static styles = css`
    ha-dialog {
      max-height: 90%;
      --dialog-content-padding: var(--ha-space-2) var(--ha-space-6);
    }

    @media all and (max-width: 580px), all and (max-height: 500px) {
      ha-dialog {
        min-width: 100%;
        min-height: 100%;
      }
    }

    ha-navigation-picker {
      display: block;
      margin-top: var(--ha-space-4);
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
