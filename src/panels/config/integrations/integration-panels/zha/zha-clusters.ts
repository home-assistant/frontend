import "@material/mwc-list/mwc-list-item";
import { mdiHelpCircle } from "@mdi/js";
import {
  css,
  CSSResultGroup,
  html,
  LitElement,
  PropertyValues,
  TemplateResult,
} from "lit";
import { property, state } from "lit/decorators";
import { fireEvent } from "../../../../../common/dom/fire_event";
import { stopPropagation } from "../../../../../common/dom/stop_propagation";
import "../../../../../components/buttons/ha-call-service-button";
import "../../../../../components/ha-card";
import "../../../../../components/ha-icon-button";
import "../../../../../components/ha-select";
import "../../../../../components/ha-service-description";
import {
  Cluster,
  fetchClustersForZhaNode,
  ZHADevice,
} from "../../../../../data/zha";
import { haStyle } from "../../../../../resources/styles";
import { HomeAssistant } from "../../../../../types";
import "../../../ha-config-section";
import { computeClusterKey } from "./functions";

declare global {
  // for fire event
  interface HASSDomEvents {
    "zha-cluster-selected": {
      cluster?: Cluster;
    };
  }
}

export class ZHAClusters extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property() public isWide?: boolean;

  @property() public selectedDevice?: ZHADevice;

  @property() public showHelp = false;

  @state() private _selectedClusterIndex = -1;

  @state() private _clusters: Cluster[] = [];

  protected updated(changedProperties: PropertyValues): void {
    if (changedProperties.has("selectedDevice")) {
      this._clusters = [];
      this._selectedClusterIndex = -1;
      fireEvent(this, "zha-cluster-selected", {
        cluster: undefined,
      });
      this._fetchClustersForZhaNode();
    }
    super.update(changedProperties);
  }

  protected render(): TemplateResult {
    return html`
      <ha-config-section .isWide=${this.isWide}>
        <div class="header" slot="header">
          <ha-icon-button
            class="toggle-help-icon"
            @click=${this._onHelpTap}
            .path=${mdiHelpCircle}
            .label=${this.hass!.localize("ui.common.help")}
          >
          </ha-icon-button>
        </div>
        <span slot="introduction">
          ${this.hass!.localize("ui.panel.config.zha.clusters.introduction")}
        </span>

        <ha-card class="content">
          <div class="node-picker">
            <ha-select
              .label=${this.hass!.localize(
                "ui.panel.config.zha.common.clusters"
              )}
              class="menu"
              .value=${String(this._selectedClusterIndex)}
              @selected=${this._selectedClusterChanged}
              @closed=${stopPropagation}
              fixedMenuPosition
              naturalMenuWidth
            >
              ${this._clusters.map(
                (entry, idx) => html`
                  <mwc-list-item .value=${String(idx)}
                    >${computeClusterKey(entry)}</mwc-list-item
                  >
                `
              )}
            </ha-select>
          </div>
          ${this.showHelp
            ? html`
                <div class="help-text">
                  ${this.hass!.localize(
                    "ui.panel.config.zha.clusters.help_cluster_dropdown"
                  )}
                </div>
              `
            : ""}
        </ha-card>
      </ha-config-section>
    `;
  }

  private async _fetchClustersForZhaNode(): Promise<void> {
    if (this.hass) {
      this._clusters = await fetchClustersForZhaNode(
        this.hass,
        this.selectedDevice!.ieee
      );
      this._clusters.sort((a, b) => a.name.localeCompare(b.name));
    }
  }

  private _selectedClusterChanged(event): void {
    this._selectedClusterIndex = Number(event.target!.value);
    fireEvent(this, "zha-cluster-selected", {
      cluster: this._clusters[this._selectedClusterIndex],
    });
  }

  private _onHelpTap(): void {
    this.showHelp = !this.showHelp;
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        ha-select {
          margin-top: 16px;
        }
        .menu {
          width: 100%;
        }

        .content {
          margin-top: 24px;
        }

        .header {
          flex-grow: 1;
        }

        ha-card {
          max-width: 680px;
        }

        .node-picker {
          align-items: center;
          padding-left: 28px;
          padding-right: 28px;
          padding-bottom: 10px;
        }

        .toggle-help-icon {
          float: right;
          top: -6px;
          right: 0;
          padding-right: 0px;
          color: var(--primary-color);
        }

        [hidden] {
          display: none;
        }

        .help-text {
          color: grey;
          padding-left: 28px;
          padding-right: 28px;
          padding-bottom: 16px;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "zha-cluster": ZHAClusters;
  }
}

customElements.define("zha-clusters", ZHAClusters);
