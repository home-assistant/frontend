import { mdiClose, mdiPlus } from "@mdi/js";
import { css, CSSResult, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import { fireEvent } from "../common/dom/fire_event";
import { loadSortable, SortableInstance } from "../resources/sortable.ondemand";
import { HomeAssistant } from "../types";
import "./ha-icon";
import "./ha-icon-button";
import "./ha-svg-icon";

const styles = css`
  .panel {
    --rgb-text: var(--rgb-sidebar-text-color);
    background-color: transparent;
    color: rgb(var(--rgb-text));
    font-family: inherit;
    border: none;
    cursor: pointer;
    width: 100%;
    font-weight: 500;
    font-size: 14px;
    line-height: 20px;

    box-sizing: border-box;
    display: flex;
    align-items: center;
    padding: 0 16px;
    border-radius: var(--sidebar-item-radius, 56px);
    height: 52px;
  }
  .panel .icon {
    width: 36px;
    text-align: left;
  }
  .panel:hover {
    color: rgb(var(--rgb-text));
    background-color: rgba(var(--rgb-text), 0.08);
  }
  .panel:focus-visible,
  .panel:active {
    color: rgb(var(--rgb-text));
    background-color: rgba(var(--rgb-text), 0.12);
  }
  #sortable {
    overflow: visible;
    padding: 0 12px;
  }
  #sortable .panel {
    cursor: grab;
  }
  .panel ha-icon-button {
    margin-left: auto;
    margin-right: -11px;
  }
  .panel ha-svg-icon {
    margin-left: auto;
  }
`;
@customElement("ha-sidebar-edit-panels")
class HaSidebarEditPanels extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public panels: any[] = [];

  @property() public hiddenPanels: any[] = [];

  static styles = styles;

  private _sortable?: SortableInstance;

  private sortableStyleLoaded = false;

  protected render() {
    const renderPanel = (panel) =>
      html`<div class="panel" data-panel=${panel.url_path}>
        <span class="icon">
          ${panel.icon
            ? html`<ha-icon slot="item-icon" .icon=${panel.icon}></ha-icon>`
            : html`<ha-svg-icon
                slot="item-icon"
                .path=${panel.iconPath}
              ></ha-svg-icon>`}
        </span>
        ${panel.name}
        <ha-icon-button
          .label=${this.hass.localize("ui.sidebar.hide_panel")}
          .path=${mdiClose}
          @click=${this._hidePanel}
        ></ha-icon-button>
      </div>`;
    const renderHiddenPanel = (panel) =>
      html`<button
        class="panel"
        data-panel=${panel.url_path}
        title=${this.hass.localize("ui.sidebar.show_panel")}
        @click=${this._showPanel}
      >
        <span class="icon">
          ${panel.icon
            ? html`<ha-icon slot="item-icon" .icon=${panel.icon}></ha-icon>`
            : html`<ha-svg-icon
                slot="item-icon"
                .path=${panel.iconPath}
              ></ha-svg-icon>`}
        </span>
        ${panel.name}
        <ha-svg-icon .path=${mdiPlus}></ha-svg-icon>
      </button>`;
    return html`<div id="sortable">${this.panels.map(renderPanel)}</div>
      ${this.hiddenPanels.map(renderHiddenPanel)}`;
  }

  protected async firstUpdated() {
    await Promise.all([this._loadSortableStyle(), this._createSortable()]);
  }

  private async _loadSortableStyle() {
    if (this.sortableStyleLoaded) return;

    const sortStylesImport = await import("../resources/ha-sortable-style");

    const style = document.createElement("style");
    style.innerHTML = (sortStylesImport.sortableStyles as CSSResult).cssText;
    this.shadowRoot!.appendChild(style);

    this.sortableStyleLoaded = true;
    await this.updateComplete;
  }

  private async _createSortable() {
    const Sortable = await loadSortable();
    this._sortable = new Sortable(
      this.shadowRoot!.getElementById("sortable")!,
      {
        animation: 150,
        dataIdAttr: "data-panel",
        handle: "div",
        onSort: () => {
          fireEvent(this, "panel-reorder", this._sortable!.toArray());
        },
      }
    );
  }

  private _hidePanel(ev: CustomEvent) {
    const panel = (ev.target as HTMLElement)
      .closest("[data-panel]")
      ?.getAttribute("data-panel");
    if (!panel) return;
    fireEvent(this, "panel-hide", panel);
  }

  private _showPanel(ev: CustomEvent) {
    const panel = (ev.target as HTMLElement)
      .closest("[data-panel]")
      ?.getAttribute("data-panel");
    if (!panel) return;
    fireEvent(this, "panel-show", panel);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-sidebar-edit-panels": HaSidebarEditPanels;
  }
  interface HASSDomEvents {
    "panel-reorder": string[];
    "panel-hide": string;
    "panel-show": string;
  }
}
