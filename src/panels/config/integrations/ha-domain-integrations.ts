import { RequestSelectedDetail } from "@material/mwc-list/mwc-list-item-base";
import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import { isComponentLoaded } from "../../../common/config/is_component_loaded";
import { fireEvent } from "../../../common/dom/fire_event";
import {
  protocolIntegrationPicked,
  PROTOCOL_INTEGRATIONS,
} from "../../../common/integrations/protocolIntegrationPicked";
import { shouldHandleRequestSelectedEvent } from "../../../common/mwc/handle-request-selected-event";
import { navigate } from "../../../common/navigate";
import { caseInsensitiveStringCompare } from "../../../common/string/compare";
import { localizeConfigFlowTitle } from "../../../data/config_flow";
import { DataEntryFlowProgress } from "../../../data/data_entry_flow";
import {
  domainToName,
  fetchIntegrationManifest,
} from "../../../data/integration";
import { Brand, Integration } from "../../../data/integrations";
import { showConfigFlowDialog } from "../../../dialogs/config-flow/show-dialog-config-flow";
import { haStyle } from "../../../resources/styles";
import { HomeAssistant } from "../../../types";
import { brandsUrl } from "../../../util/brands-url";
import "./ha-integration-list-item";
import { showYamlIntegrationDialog } from "./show-add-integration-dialog";

const standardToDomain = { zigbee: "zha", zwave: "zwave_js" } as const;

@customElement("ha-domain-integrations")
class HaDomainIntegrations extends LitElement {
  public hass!: HomeAssistant;

  @property() public domain!: string;

  @property({ attribute: false }) public integration?: Brand | Integration;

  @property({ attribute: false })
  public flowsInProgress?: DataEntryFlowProgress[];

  protected render() {
    return html`<mwc-list>
      ${this.flowsInProgress?.length
        ? html`<h3>
              ${this.hass.localize("ui.panel.config.integrations.discovered")}
            </h3>
            ${this.flowsInProgress.map(
              (flow) =>
                html`<mwc-list-item
                  graphic="medium"
                  .flow=${flow}
                  @request-selected=${this._flowInProgressPicked}
                  hasMeta
                >
                  <img
                    alt=""
                    slot="graphic"
                    loading="lazy"
                    src=${brandsUrl({
                      domain: flow.handler,
                      type: "icon",
                      useFallback: true,
                      darkOptimized: this.hass.themes?.darkMode,
                    })}
                    crossorigin="anonymous"
                    referrerpolicy="no-referrer"
                  />
                  <span
                    >${localizeConfigFlowTitle(this.hass.localize, flow)}</span
                  >
                  <ha-icon-next slot="meta"></ha-icon-next>
                </mwc-list-item>`
            )}
            <li divider role="separator"></li>
            ${this.integration &&
            "integrations" in this.integration &&
            this.integration.integrations
              ? html`<h3>
                  ${this.hass.localize(
                    "ui.panel.config.integrations.available_integrations"
                  )}
                </h3>`
              : ""}`
        : ""}
      ${this.integration?.iot_standards
        ? this.integration.iot_standards
            .filter((standard) =>
              (PROTOCOL_INTEGRATIONS as ReadonlyArray<string>).includes(
                standardToDomain[standard] || standard
              )
            )
            .map((standard) => {
              const domain: (typeof PROTOCOL_INTEGRATIONS)[number] =
                standardToDomain[standard] || standard;
              return html`<mwc-list-item
                graphic="medium"
                .domain=${domain}
                @request-selected=${this._standardPicked}
                hasMeta
              >
                <img
                  slot="graphic"
                  loading="lazy"
                  alt=""
                  src=${brandsUrl({
                    domain,
                    type: "icon",
                    useFallback: true,
                    darkOptimized: this.hass.themes?.darkMode,
                  })}
                  crossorigin="anonymous"
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
      ${this.integration &&
      "integrations" in this.integration &&
      this.integration.integrations
        ? Object.entries(this.integration.integrations)
            .sort((a, b) => {
              if (a[1].config_flow && !b[1].config_flow) {
                return -1;
              }
              if (b[1].config_flow && !a[1].config_flow) {
                return 0;
              }
              return caseInsensitiveStringCompare(
                a[1].name || domainToName(this.hass.localize, a[0]),
                b[1].name || domainToName(this.hass.localize, b[0]),
                this.hass.locale.language
              );
            })
            .map(
              ([dom, val]) =>
                html`<ha-integration-list-item
                  .hass=${this.hass}
                  .domain=${dom}
                  .integration=${{
                    ...val,
                    domain: dom,
                    name: val.name || domainToName(this.hass.localize, dom),
                    is_built_in: val.is_built_in !== false,
                    cloud: val.iot_class?.startsWith("cloud_"),
                  }}
                  @request-selected=${this._integrationPicked}
                >
                </ha-integration-list-item>`
            )
        : ""}
      ${(PROTOCOL_INTEGRATIONS as ReadonlyArray<string>).includes(this.domain)
        ? html`<mwc-list-item
            graphic="medium"
            .domain=${this.domain}
            @request-selected=${this._standardPicked}
            hasMeta
          >
            <img
              slot="graphic"
              loading="lazy"
              alt=""
              src=${brandsUrl({
                domain: this.domain,
                type: "icon",
                useFallback: true,
                darkOptimized: this.hass.themes?.darkMode,
              })}
              crossorigin="anonymous"
              referrerpolicy="no-referrer"
            />
            <span
              >${this.hass.localize(
                `ui.panel.config.integrations.add_${
                  this.domain as (typeof PROTOCOL_INTEGRATIONS)[number]
                }_device`
              )}</span
            >
            <ha-icon-next slot="meta"></ha-icon-next>
          </mwc-list-item>`
        : ""}
      ${this.integration &&
      "config_flow" in this.integration &&
      this.integration.config_flow
        ? html`${this.flowsInProgress?.length
            ? html`<mwc-list-item
                .domain=${this.domain}
                @request-selected=${this._integrationPicked}
                .integration=${{
                  ...this.integration,
                  domain: this.domain,
                  name:
                    this.integration.name ||
                    domainToName(this.hass.localize, this.domain),
                  is_built_in: this.integration.is_built_in !== false,
                  cloud: this.integration.iot_class?.startsWith("cloud_"),
                }}
                hasMeta
              >
                ${this.hass.localize("ui.panel.config.integrations.new_flow", {
                  integration:
                    this.integration.name ||
                    domainToName(this.hass.localize, this.domain),
                })}
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
                @request-selected=${this._integrationPicked}
              >
              </ha-integration-list-item>`}`
        : ""}
    </mwc-list> `;
  }

  private async _integrationPicked(ev: CustomEvent<RequestSelectedDetail>) {
    if (!shouldHandleRequestSelectedEvent(ev)) {
      return;
    }
    const domain = (ev.currentTarget as any).domain;

    if (
      ["cloud", "google_assistant", "alexa"].includes(domain) &&
      isComponentLoaded(this.hass, "cloud")
    ) {
      fireEvent(this, "close-dialog");
      navigate("/config/cloud");
      return;
    }

    const integration = (ev.currentTarget as any).integration;

    if (integration.supported_by) {
      // @ts-ignore
      fireEvent(this, "supported-by", { integration });
      return;
    }

    if (integration.iot_standards) {
      // @ts-ignore
      fireEvent(this, "select-brand", {
        brand: integration.domain,
      });
      return;
    }

    if (
      (domain === this.domain &&
        (("integration_type" in this.integration! &&
          !this.integration.config_flow) ||
          (!("integration_type" in this.integration!) &&
            (!this.integration!.integrations ||
              !(domain in this.integration!.integrations))))) ||
      // config_flow being undefined means its false
      (!("integration_type" in this.integration!) &&
        !this.integration!.integrations?.[domain]?.config_flow)
    ) {
      const manifest = await fetchIntegrationManifest(this.hass, domain);
      showYamlIntegrationDialog(this, { manifest });
      return;
    }

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

  private async _flowInProgressPicked(ev: CustomEvent<RequestSelectedDetail>) {
    if (!shouldHandleRequestSelectedEvent(ev)) {
      return;
    }
    const flow: DataEntryFlowProgress = (ev.currentTarget as any).flow;
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

  private _standardPicked(ev: CustomEvent<RequestSelectedDetail>) {
    if (!shouldHandleRequestSelectedEvent(ev)) {
      return;
    }
    const domain = (ev.currentTarget as any).domain;
    const root = this.getRootNode();
    fireEvent(this, "close-dialog");
    protocolIntegrationPicked(
      root instanceof ShadowRoot ? (root.host as HTMLElement) : this,
      this.hass,
      domain,
      { brand: this.domain }
    );
  }

  static styles = [
    haStyle,
    css`
      :host {
        display: block;
        --mdc-list-item-graphic-size: 40px;
        --mdc-list-side-padding: 24px;
      }
      h3 {
        margin: 8px 24px 0;
        color: var(--secondary-text-color);
        font-size: 14px;
        font-weight: 500;
      }
      h3:first-of-type {
        margin-top: 0;
      }
      img {
        width: 40px;
        height: 40px;
      }
      li[divider] {
        margin-top: 8px;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-domain-integrations": HaDomainIntegrations;
  }
}
