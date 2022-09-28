import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import { fireEvent } from "../../../common/dom/fire_event";
import { protocolIntegrationPicked } from "../../../common/integrations/protocolIntegrationPicked";
import { localizeConfigFlowTitle } from "../../../data/config_flow";
import { DataEntryFlowProgress } from "../../../data/data_entry_flow";
import {
  domainToName,
  fetchIntegrationManifest,
} from "../../../data/integration";
import { Integration } from "../../../data/integrations";
import { showConfigFlowDialog } from "../../../dialogs/config-flow/show-dialog-config-flow";
import { haStyle } from "../../../resources/styles";
import { HomeAssistant } from "../../../types";
import { brandsUrl } from "../../../util/brands-url";
import "./ha-integration-list-item";

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
            ([dom, val]) => html`<ha-integration-list-item
              .hass=${this.hass}
              .domain=${dom}
              .integration=${{
                ...val,
                domain: dom,
                name: val.name || domainToName(this.hass.localize, dom),
                is_built_in: val.is_built_in !== false,
                cloud: val.iot_class?.startsWith("cloud_"),
              }}
              @click=${this._integrationPicked}
            >
            </ha-integration-list-item>`
          )
        : ""}
      ${["zha", "zwave_js"].includes(this.domain)
        ? html`<mwc-list-item
            graphic="medium"
            .domain=${this.domain}
            @click=${this._standardPicked}
            hasMeta
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
            <span
              >${this.hass.localize(
                `ui.panel.config.integrations.add_${this.domain}_device`
              )}</span
            >
            <ha-icon-next slot="meta"></ha-icon-next>
          </mwc-list-item>`
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
            : html`<ha-integration-list-item
                .hass=${this.hass}
                .domain=${this.domain}
                .integration=${{
                  ...this.integration,
                  domain: this.domain,
                  name:
                    this.integration.name ||
                    domainToName(this.hass.localize, this.domain),
                  is_built_in: this.integration.is_built_in !== false,
                  cloud: this.integration.iot_class?.startsWith("cloud_"),
                }}
                @click=${this._integrationPicked}
              >
              </ha-integration-list-item>`}`
        : ""}
    `;
  }

  private async _integrationPicked(ev) {
    const domain = ev.currentTarget.domain;
    const root = this.getRootNode();
    showConfigFlowDialog(
      root instanceof ShadowRoot ? (root.host as HTMLElement) : this,
      {
        startFlowHandler: domain,
        showAdvanced: this.hass.userData?.showAdvanced,
        manifest: await fetchIntegrationManifest(this.hass, domain),
      }
    );
    fireEvent(this, "close-dialog");
  }

  private async _flowInProgressPicked(ev) {
    const flow: DataEntryFlowProgress = ev.currentTarget.flow;
    const root = this.getRootNode();
    showConfigFlowDialog(
      root instanceof ShadowRoot ? (root.host as HTMLElement) : this,
      {
        continueFlowId: flow.flow_id,
        showAdvanced: this.hass.userData?.showAdvanced,
        manifest: await fetchIntegrationManifest(this.hass, flow.handler),
      }
    );
    fireEvent(this, "close-dialog");
  }

  private _standardPicked(ev) {
    const domain = ev.currentTarget.domain;
    const root = this.getRootNode();
    fireEvent(this, "close-dialog");
    protocolIntegrationPicked(
      root instanceof ShadowRoot ? (root.host as HTMLElement) : this,
      this.hass,
      domain
    );
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
