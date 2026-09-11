import { consume } from "@lit/context";
import type { CSSResultGroup, TemplateResult } from "lit";
import { css, html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { filterNavigationPages } from "../../../common/config/filter_navigation_pages";
import "../../../components/ha-card";
import "../../../components/ha-icon-next";
import type { CloudStatus } from "../../../data/cloud";
import { getConfigEntries } from "../../../data/config_entries";
import type { PageNavigation } from "../../../layouts/hass-tabs-subpage";
import {
  childPanelReadyContext,
  type RegisterChildPanelReady,
} from "../../../layouts/panel-ready";
import type { HomeAssistant } from "../../../types";
import "../../../components/ha-config-navigation-list";

@customElement("ha-config-navigation")
class HaConfigNavigation extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public narrow = false;

  @property({ attribute: false }) public pages!: PageNavigation[];

  @property() public label?: string;

  @state() private _visiblePages?: PageNavigation[];

  private _hasBluetoothConfigEntries = false;

  private _bluetoothEntriesLoaded?: Promise<void>;

  private _childReadyRegistered = false;

  private _filterNavigationPages = memoizeOne(
    (
      hass: HomeAssistant,
      pages: PageNavigation[],
      hasBluetoothConfigEntries: boolean
    ) => filterNavigationPages(hass, pages, { hasBluetoothConfigEntries })
  );

  @consume({ context: childPanelReadyContext, subscribe: true })
  private _registerChildPanelReady?: RegisterChildPanelReady;

  protected override updated(changedProps: Map<PropertyKey, unknown>) {
    super.updated(changedProps);

    const pagesOrHassChanged =
      changedProps.has("pages") || changedProps.has("hass");

    if (pagesOrHassChanged) {
      const ready = this._resolveVisiblePages();
      if (!this._childReadyRegistered && this._registerChildPanelReady) {
        this._registerChildPanelReady(ready);
        this._childReadyRegistered = true;
      }
      return;
    }

    if (
      !this._childReadyRegistered &&
      this._registerChildPanelReady &&
      this.pages &&
      this.hass
    ) {
      this._registerChildPanelReady(this._resolveVisiblePages());
      this._childReadyRegistered = true;
    }
  }

  protected render(): TemplateResult {
    const pages = (this._visiblePages ?? []).map((page) => ({
      ...page,
      name:
        page.name ||
        this.hass.localize(
          `ui.panel.config.dashboard.${page.translationKey}.main`
        ),
      description:
        page.component === "cloud" && (page.info as CloudStatus)
          ? page.info.logged_in
            ? `
                  ${this.hass.localize(
                    "ui.panel.config.cloud.description_login"
                  )}
                `
            : `
                  ${this.hass.localize(
                    "ui.panel.config.cloud.description_features"
                  )}
                `
          : `
                ${
                  page.description ||
                  this.hass.localize(
                    `ui.panel.config.dashboard.${page.translationKey}.secondary`
                  )
                }
              `,
    }));
    const label = this.label ?? this.hass.localize("panel.config");
    return html`
      <div class="visually-hidden" role="heading" aria-level="2">${label}</div>
      <ha-config-navigation-list
        has-secondary
        .hass=${this.hass}
        .narrow=${this.narrow}
        .pages=${pages}
        .label=${label}
      ></ha-config-navigation-list>
    `;
  }

  private _loadBluetoothEntries(): Promise<void> {
    if (!this._bluetoothEntriesLoaded) {
      this._bluetoothEntriesLoaded = getConfigEntries(this.hass, {
        domain: "bluetooth",
      })
        .then((entries) => {
          this._hasBluetoothConfigEntries = entries.length > 0;
        })
        .catch(() => {
          this._hasBluetoothConfigEntries = false;
        });
    }
    return this._bluetoothEntriesLoaded;
  }

  private async _resolveVisiblePages(): Promise<void> {
    if (this.pages.some((page) => page.component === "bluetooth")) {
      await this._loadBluetoothEntries();
    }

    const visiblePages = this._filterNavigationPages(
      this.hass,
      this.pages,
      this._hasBluetoothConfigEntries
    );
    const currentVisiblePages = this._visiblePages;
    if (
      !currentVisiblePages ||
      visiblePages.length !== currentVisiblePages.length ||
      visiblePages.some((page, index) => page !== currentVisiblePages[index])
    ) {
      this._visiblePages = visiblePages;
    }
    await this.updateComplete;
  }

  static styles: CSSResultGroup = css`
    /* Accessibility */
    .visually-hidden {
      position: absolute;
      overflow: hidden;
      clip: rect(0 0 0 0);
      height: 1px;
      width: 1px;
      margin: -1px;
      padding: 0;
      border: 0;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-config-navigation": HaConfigNavigation;
  }
}
