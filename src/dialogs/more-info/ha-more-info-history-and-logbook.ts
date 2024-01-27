import { css, CSSResultGroup, html, LitElement } from "lit";
import { customElement, property, query } from "lit/decorators";
import { ChartResizeOptions } from "../../components/chart/ha-chart-base";
import { HomeAssistant } from "../../types";
import {
  computeShowHistoryComponent,
  computeShowLogBookComponent,
} from "./const";
import "./ha-more-info-history";
import type { MoreInfoHistory } from "./ha-more-info-history";
import "./ha-more-info-logbook";

@customElement("ha-more-info-history-and-logbook")
export class MoreInfoHistoryAndLogbook extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public entityId!: string;

  @query("ha-more-info-history")
  private _history?: MoreInfoHistory;

  public resize(options?: ChartResizeOptions) {
    this._history?.resize(options);
  }

  protected render() {
    return html`
      ${computeShowHistoryComponent(this.hass, this.entityId)
        ? html`
            <ha-more-info-history
              .hass=${this.hass}
              .entityId=${this.entityId}
            ></ha-more-info-history>
          `
        : ""}
      ${computeShowLogBookComponent(this.hass, this.entityId)
        ? html`
            <ha-more-info-logbook
              .hass=${this.hass}
              .entityId=${this.entityId}
            ></ha-more-info-logbook>
          `
        : ""}
    `;
  }

  static get styles(): CSSResultGroup {
    return css`
      ha-more-info-history,
      ha-more-info-logbook {
        display: block;
      }
      ha-more-info-history + ha-more-info-logbook {
        margin-top: 16px;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-more-info-history-and-logbook": MoreInfoHistoryAndLogbook;
  }
}
