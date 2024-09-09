import "@material/mwc-tab-bar/mwc-tab-bar";
import "@material/mwc-tab/mwc-tab";
import { css, CSSResultGroup, html, LitElement, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../../../common/dom/fire_event";
import { LovelaceCardConfig } from "../../../../data/lovelace/config/card";
import { LovelaceSectionConfig } from "../../../../data/lovelace/config/section";
import { LovelaceConfig } from "../../../../data/lovelace/config/types";
import { LovelaceViewConfig } from "../../../../data/lovelace/config/view";
import { HomeAssistant } from "../../../../types";
import "./hui-card-element-editor";
import type { HuiCardElementEditor } from "./hui-card-element-editor";
import "./hui-card-layout-editor";
import "./hui-card-visibility-editor";

const TABS = ["config", "visibility", "layout"] as const;

@customElement("hui-card-editor")
class HuiCardEditor extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public lovelace!: LovelaceConfig;

  @property({ attribute: false }) public config!: LovelaceCardConfig;

  @property({ attribute: false }) public containerConfig!:
    | LovelaceViewConfig
    | LovelaceSectionConfig;

  @query("hui-card-element-editor")
  public elementEditor?: HuiCardElementEditor;

  @state() private _selectedTab: (typeof TABS)[number] = TABS[0];

  private _tabs = memoizeOne(
    (containerType: string | undefined, cardType: string) =>
      TABS.filter((tab) => {
        if (tab === "visibility") return cardType !== "conditional";
        if (tab === "layout") return containerType === "grid";
        return true;
      })
  );

  private renderContent() {
    if (this._selectedTab === "config") {
      return html`
        <hui-card-element-editor
          .hass=${this.hass}
          .lovelace=${this.lovelace}
          .value=${this.config}
        ></hui-card-element-editor>
      `;
    }
    if (this._selectedTab === "visibility") {
      return html`
        <hui-card-visibility-editor
          .hass=${this.hass}
          .config=${this.config}
          @value-changed=${this._configChanged}
        ></hui-card-visibility-editor>
      `;
    }
    if (this._selectedTab === "layout") {
      return html`
        <hui-card-layout-editor
          .hass=${this.hass}
          .config=${this.config}
          .sectionConfig=${this.containerConfig as LovelaceSectionConfig}
          @value-changed=${this._configChanged}
        >
        </hui-card-layout-editor>
      `;
    }
    return nothing;
  }

  private _configChanged(ev: CustomEvent): void {
    ev.stopPropagation();
    fireEvent(this, "config-changed", { config: ev.detail.value });
  }

  protected render() {
    const cardType = this.config.type;
    const containerType = this.containerConfig.type;
    const tabs = this._tabs(containerType, cardType);

    if (tabs.length <= 1) {
      return this.renderContent();
    }
    return html`
      <mwc-tab-bar
        .activeIndex=${tabs.indexOf(this._selectedTab)}
        @MDCTabBar:activated=${this._handleTabChanged}
      >
        ${tabs.map(
          (tab) => html`
            <mwc-tab
              .label=${this.hass.localize(
                `ui.panel.lovelace.editor.edit_card.tab_${tab}`
              )}
            >
            </mwc-tab>
          `
        )}
      </mwc-tab-bar>
      ${this.renderContent()}
    `;
  }

  private _handleTabChanged(ev: CustomEvent): void {
    const cardType = this.config.type;
    const containerType = this.containerConfig.type;
    const tabs = this._tabs(containerType, cardType);
    const newTab = tabs[ev.detail.index];
    if (newTab === this._selectedTab) {
      return;
    }
    this._selectedTab = newTab;
  }

  static get styles(): CSSResultGroup {
    return css`
      mwc-tab-bar {
        text-transform: uppercase;
        margin-bottom: 16px;
        border-bottom: 1px solid var(--divider-color);
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-card-editor": HuiCardEditor;
  }
}
