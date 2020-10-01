import {
  CSSResult,
  customElement,
  html,
  LitElement,
  property,
  TemplateResult,
  css,
  PropertyValues,
} from "lit-element";
import { DeviceRegistryEntry } from "../../../../../../data/device_registry";
import { haStyle } from "../../../../../../resources/styles";
import { HomeAssistant } from "../../../../../../types";
import {
  getIdentifiersFromDevice,
  OZWNodeIdentifiers,
} from "../../../../../../data/ozw";
import { showOZWRefreshNodeDialog } from "../../../../integrations/integration-panels/ozw/show-dialog-ozw-refresh-node";
import { navigate } from "../../../../../../common/navigate";
import "@material/mwc-button/mwc-button";

@customElement("ha-device-actions-ozw")
export class HaDeviceActionsOzw extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public device!: DeviceRegistryEntry;

  @property()
  private node_id = 0;

  @property()
  private ozw_instance = 1;


  protected updated(changedProperties: PropertyValues) {
    if (changedProperties.has("device")) {
      const identifiers:
        | OZWNodeIdentifiers
        | undefined = getIdentifiersFromDevice(this.device);
      if (!identifiers) {
        return;
      }
      this.ozw_instance = identifiers.ozw_instance;
      this.node_id = identifiers.node_id;
    }
  }

  protected render(): TemplateResult {
    if (!this.ozw_instance || !this.node_id) {
      return html``;
    }
    return html`
      <mwc-button @click=${this._nodeDetailsClicked}>
        ${this.hass.localize("ui.panel.config.ozw.node.button")}
      </mwc-button>
      <mwc-button @click=${this._refreshNodeClicked}>
        ${this.hass.localize("ui.panel.config.ozw.refresh_node.button")}
      </mwc-button>
    `;
  }

  private async _refreshNodeClicked() {
    showOZWRefreshNodeDialog(this, {
      node_id: this.node_id,
      ozw_instance: this.ozw_instance,
    });
  }

  private async _nodeDetailsClicked() {
    navigate(
      this,
      `/config/ozw/network/${this.ozw_instance}/node/${this.node_id}/dashboard`
    );
  }

  static get styles(): CSSResult[] {
    return [
      haStyle,
      css`
        :host {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
        }
      `,
    ];
  }
}
