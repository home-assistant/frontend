import { mdiDelete } from "@mdi/js";
import type { PropertyValues } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, query } from "lit/decorators";
import { keyed } from "lit/directives/keyed";
import "../../../components/ha-dropdown-item";
import type { HaDropdownSelectEvent } from "../../../components/ha-dropdown";
import "../../../components/ha-snap-bottom-sheet";
import type { HaSnapBottomSheet } from "../../../components/ha-snap-bottom-sheet";
import "../../../components/ha-svg-icon";
import type { HomeAssistant } from "../../../types";
import "../automation/sidebar/ha-automation-sidebar-card";
import type {
  EnergyEditorConfig,
  EnergyEditorElement,
} from "./editors/energy-editor";
import { renderEnergyEditor } from "./editors/render-energy-editor";

// The sidebar card header: the dialog header's 48px minimum plus its padding
const COLLAPSED_SHEET_HEIGHT = 68;

export interface EnergySidebarConfig {
  /** Identifies the edited item, to highlight its row. New items have none. */
  key?: string;
  editor: EnergyEditorConfig;
  title: string;
  subtitle: string;
  delete?: { label: string; action: () => void };
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-energy-sidebar": HaEnergySidebar;
  }

  interface HASSDomEvents {
    "energy-open-sidebar": EnergySidebarConfig;
    /** The edited item was saved, show it with this config */
    "energy-sidebar-saved": EnergySidebarConfig;
    "energy-close-sidebar": undefined;
  }
}

@customElement("ha-energy-sidebar")
export class HaEnergySidebar extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public config!: EnergySidebarConfig;

  @property({ type: Boolean, attribute: "wide" }) public isWide = false;

  @property({ type: Boolean }) public narrow = false;

  /** Unsaved changes keep the sheet from being swiped away */
  @property({ type: Boolean }) public dirty = false;

  @query(".editor") private _editor?: EnergyEditorElement;

  @query("ha-snap-bottom-sheet")
  private _bottomSheetElement?: HaSnapBottomSheet;

  public save(): Promise<boolean> {
    return this._editor?.save() ?? Promise.resolve(false);
  }

  /** Resolves once the bottom sheet slid out, on narrow screens */
  public async closeSheet() {
    await this._bottomSheetElement?.closeSheet();
  }

  protected updated(changedProps: PropertyValues<this>) {
    super.updated(changedProps);
    if (
      changedProps.has("config") &&
      this._bottomSheetElement?.position === "collapsed"
    ) {
      this._bottomSheetElement.snapTo("half");
    }
  }

  protected render() {
    if (!this.config) {
      return nothing;
    }

    const card = html`
      <ha-automation-sidebar-card
        .hass=${this.hass}
        .isWide=${this.isWide}
        .narrow=${this.narrow}
        @wa-select=${this._handleDropdownSelect}
      >
        <span slot="title">${this.config.title}</span>
        <span slot="subtitle">${this.config.subtitle}</span>
        ${
          this.config.delete
            ? html`
                <ha-dropdown-item
                  slot="menu-items"
                  value="delete"
                  variant="danger"
                >
                  <ha-svg-icon slot="icon" .path=${mdiDelete}></ha-svg-icon>
                  ${this.config.delete.label}
                </ha-dropdown-item>
              `
            : html`<span slot="overflow-menu"></span>`
        }
        ${keyed(this.config, renderEnergyEditor(this.hass, this.config.editor))}
      </ha-automation-sidebar-card>
    `;

    if (this.narrow) {
      return html`
        <ha-snap-bottom-sheet
          .dismissable=${!this.dirty}
          .minHeight=${COLLAPSED_SHEET_HEIGHT}
          .label=${this.config.title}
        >
          ${card}
        </ha-snap-bottom-sheet>
      `;
    }

    return card;
  }

  private _handleDropdownSelect(ev: HaDropdownSelectEvent) {
    if (ev.detail?.item?.value === "delete") {
      this.config.delete?.action();
    }
  }

  static styles = css`
    :host {
      z-index: 6;
      outline: none;
      height: calc(100% - var(--safe-area-inset-top, 0px));
      --ha-card-border-radius: var(
        --ha-dialog-border-radius,
        var(--ha-border-radius-2xl)
      );
      border-radius: var(--ha-card-border-radius);
      margin-top: var(--safe-area-inset-top);

      --ha-bottom-sheet-surface-background: var(--card-background-color);
    }
    /* Keeps the card to the sheet's height so its content scrolls */
    ha-snap-bottom-sheet ha-automation-sidebar-card {
      max-height: 100%;
    }
    .editor {
      padding-top: var(--ha-space-2);
    }
  `;
}
