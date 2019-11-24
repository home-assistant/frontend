import "../../../layouts/hass-subpage";
import "./zha-groups-data-table";

import {
  LitElement,
  html,
  TemplateResult,
  property,
  customElement,
  CSSResult,
  css,
} from "lit-element";
import { HomeAssistant } from "../../../types";
import { ZHAGroup, fetchGroups } from "../../../data/zha";
import { sortZHAGroups } from "./functions";

@customElement("zha-groups-dashboard")
export class ZHAGroupsDashboard extends LitElement {
  @property() public hass!: HomeAssistant;
  @property() public narrow = false;
  @property() public _groups!: ZHAGroup[];

  public connectedCallback(): void {
    super.connectedCallback();
    this._fetchGroups();
  }

  protected render(): TemplateResult {
    return html`
      <hass-subpage
        header=${this.hass.localize(
          "ui.panel.config.zha.common.zha_zigbee_groups"
        )}
      >
        <div class="content">
          <zha-groups-data-table
            .hass=${this.hass}
            .narrow=${this.narrow}
            .groups=${this._groups}
          ></zha-groups-data-table>
        </div>
      </hass-subpage>
    `;
  }

  private async _fetchGroups() {
    this._groups = (await fetchGroups(this.hass!)).sort(sortZHAGroups);
  }

  static get styles(): CSSResult {
    return css`
      .content {
        padding: 4px;
      }
      zha-groups-data-table {
        width: 100%;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "zha-groups-dashboard": ZHAGroupsDashboard;
  }
}
