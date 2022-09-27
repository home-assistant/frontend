import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import { fireEvent } from "../../../common/dom/fire_event";
import { protocolIntegrationPicked } from "../../../common/integrations/protocolIntegrationPicked";
import { localizeConfigFlowTitle } from "../../../data/config_flow";
import { DataEntryFlowProgress } from "../../../data/data_entry_flow";
import { domainToName } from "../../../data/integration";
import { Integration } from "../../../data/integrations";
import { showConfigFlowDialog } from "../../../dialogs/config-flow/show-dialog-config-flow";
import { haStyle } from "../../../resources/styles";
import { HomeAssistant } from "../../../types";
import { brandsUrl } from "../../../util/brands-url";

const standardToDomain = { zigbee: "zha", "z-wave": "zwave_js" } as const;

@customElement("ha-domain-integrations")
class HaDomainIntegrations extends LitElement {
  public hass!: HomeAssistant;

  @property() public domain!: string;

  @property({ attribute: false }) public integration!: Integration;

  @property({ attribute: false })
  public flowsInProgress?: DataEntryFlowProgress[];

  protected render() {
    return html`
      ${this.flowsInProgress?.length
        ? html`<h3>We discovered the following:</h3>
            ${this.flowsInProgress.map(
              (flow) => html`<mwc-list-item
                graphic="medium"
                .flow=${flow}
                @click=${this._flowInProgressPicked}
                hasMeta
              >
                <img
                  slot="graphic"
                  loading="lazy"
                  src=${brandsUrl({
                    domain: flow.handler,
                    type: "icon",
                    useFallback: true,
                    darkOptimized: this.hass.themes?.darkMode,
                  })}
                  referrerpolicy="no-referrer"
                />
                <span
                  >${localizeConfigFlowTitle(this.hass.localize, flow)}</span
                >
                <ha-icon-next slot="meta"></ha-icon-next>
              </mwc-list-item>`
            )}`
        : ""}
      ${this.integration?.iot_standards
        ? this.integration.iot_standards.map((standard) => {
            const domain: string = standardToDomain[standard] || standard;
            return html`<mwc-list-item
              graphic="medium"
              .domain=${domain}
              @click=${this._standardPicked}
              hasMeta
            >
              <img
                slot="graphic"
                loading="lazy"
                src=${brandsUrl({
                  domain,
                  type: "icon",
                  useFallback: true,
                  darkOptimized: this.hass.themes?.darkMode,
                })}
                referrerpolicy="no-referrer"
              />
              <span
                >${this.hass.localize(
                  `ui.panel.config.integrations.add_${domain}_device`
                )}</span
              >
              <ha-icon-next slot="meta"></ha-icon-next>
            </mwc-list-item>`;
          })
        : ""}
      ${this.integration?.integrations
        ? Object.entries(this.integration.integrations).map(
            ([dom, val]) => html`<mwc-list-item
              graphic="medium"
              .domain=${dom}
              @click=${this._integrationPicked}
              hasMeta
            >
              <img
                slot="graphic"
                loading="lazy"
                src=${brandsUrl({
                  domain: dom,
                  type: "icon",
                  useFallback: true,
                  darkOptimized: this.hass.themes?.darkMode,
                })}
                referrerpolicy="no-referrer"
              />
              <span>
                ${val.name || domainToName(this.hass.localize, dom)}
              </span>
              <ha-icon-next slot="meta"></ha-icon-next>
            </mwc-list-item>`
          )
        : ""}
      ${this.integration?.config_flow
        ? html`${this.flowsInProgress?.length
            ? html`<mwc-list-item
                .domain=${this.domain}
                @click=${this._integrationPicked}
                hasMeta
              >
                Setup another instance of
                ${this.integration.name ||
                domainToName(this.hass.localize, this.domain)}
                <ha-icon-next slot="meta"></ha-icon-next>
              </mwc-list-item>`
            : html`<mwc-list-item
                graphic="medium"
                .domain=${this.domain}
                @click=${this._integrationPicked}
              >
                <img
                  slot="graphic"
                  loading="lazy"
                  src=${brandsUrl({
                    domain: this.domain,
                    type: "icon",
                    useFallback: true,
                    darkOptimized: this.hass.themes?.darkMode,
                  })}
                  referrerpolicy="no-referrer"
                />
                <span>
                  ${this.integration.name ||
                  domainToName(this.hass.localize, this.domain)}
                </span>
                <ha-icon-next slot="meta"></ha-icon-next>
              </mwc-list-item>`}`
        : ""}
    `;
  }

  private _integrationPicked(ev) {
    const domain = ev.currentTarget.domain;
    fireEvent(this, "close-dialog");
    showConfigFlowDialog(this, {
      startFlowHandler: domain,
      showAdvanced: this.hass.userData?.showAdvanced,
    });
  }

  private _flowInProgressPicked(ev) {
    const flow: DataEntryFlowProgress = ev.currentTarget.flow;
    fireEvent(this, "close-dialog");
    showConfigFlowDialog(this, {
      continueFlowId: flow.flow_id,
      showAdvanced: this.hass.userData?.showAdvanced,
    });
  }

  private _standardPicked(ev) {
    const domain = ev.currentTarget.domain;
    fireEvent(this, "close-dialog");
    protocolIntegrationPicked(this, this.hass, domain);
  }

  static styles = [
    haStyle,
    css`
      :host {
        display: block;
      }
      h3 {
        margin: 0 24px;
        color: var(--primary-text-color);
        font-size: 14px;
      }
      img {
        width: 40px;
        height: 40px;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-domain-integrations": HaDomainIntegrations;
  }
}
