import { css, html, LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import { repeat } from "lit/directives/repeat";
import type { LovelaceViewSidebarConfig } from "../../../data/lovelace/config/view";
import type { HomeAssistant } from "../../../types";
import "../sections/hui-section";
import type { Lovelace } from "../types";

export const DEFAULT_VIEW_SIDEBAR_LAYOUT = "start";

@customElement("hui-view-sidebar")
export class HuiViewSidebar extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public lovelace!: Lovelace;

  @property({ attribute: false }) public config?: LovelaceViewSidebarConfig;

  @property({ attribute: false }) public viewIndex!: number;

  render() {
    if (!this.lovelace) return nothing;

    // Use preview mode instead of setting lovelace to avoid the sections to be
    // editable as it is not yet supported
    return html`
      <div class="container">
        ${repeat(
          this.config?.sections || [],
          (section) => html`
            <hui-section
              .config=${section}
              .hass=${this.hass}
              .preview=${this.lovelace.editMode}
              .viewIndex=${this.viewIndex}
            ></hui-section>
          `
        )}
      </div>
    `;
  }

  static styles = css`
    .container {
      display: flex;
      flex-direction: column;
      gap: var(--row-gap, 8px);
      width: 100%;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-view-sidebar": HuiViewSidebar;
  }
}
