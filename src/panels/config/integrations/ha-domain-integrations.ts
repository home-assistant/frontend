import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import { isComponentLoaded } from "../../../common/config/is_component_loaded";
import { fireEvent } from "../../../common/dom/fire_event";
import { protocolIntegrationPicked } from "../../../common/integrations/protocolIntegrationPicked";
import { navigate } from "../../../common/navigate";
import { caseInsensitiveStringCompare } from "../../../common/string/compare";
import { localizeConfigFlowTitle } from "../../../data/config_flow";
import { DataEntryFlowProgress } from "../../../data/data_entry_flow";
import {
  domainToName,
  fetchIntegrationManifest,
} from "../../../data/integration";
import { Integration } from "../../../data/integrations";
import { showConfigFlowDialog } from "../../../dialogs/config-flow/show-dialog-config-flow";
import { showAlertDialog } from "../../../dialogs/generic/show-dialog-box";
import { haStyle } from "../../../resources/styles";
import { HomeAssistant } from "../../../types";
import { brandsUrl } from "../../../util/brands-url";
import { documentationUrl } from "../../../util/documentation-url";
import "./ha-integration-list-item";

const standardToDomain = { zigbee: "zha", zwave: "zwave_js" } as const;

@customElement("ha-domain-integrations")
class HaDomainIntegrations extends LitElement {
  public hass!: HomeAssistant;

  @property() public domain!: string;

  @property({ attribute: false }) public integration?: Integration;

  @property({ attribute: false })
  public flowsInProgress?: DataEntryFlowProgress[];

  protected render() {
    return html`<mwc-list>
      ${this.flowsInProgress?.length
        ? html`<h3>
              ${this.hass.localize("ui.panel.config.integrations.discovered")}
            </h3>
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
            )}
            <li divider role="separator"></li>
            ${this.integration?.integrations
              ? html`<h3>
                  ${this.hass.localize(
                    "ui.panel.config.integrations.available_integrations"
                  )}
                </h3>`
              : ""}`
        : ""}
      ${this.integration?.iot_standards
        ? this.integration.iot_standards
            .filter((standard) => standard in standardToDomain)
            .map((standard) => {
              const domain: string = standardToDomain[standard];
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
                b[1].name || domainToName(this.hass.localize, b[0])
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
                @click=${this._integrationPicked}
              >
              </ha-integration-list-item>`}`
        : ""}
    </mwc-list> `;
  }

  private async _integrationPicked(ev) {
    const domain = ev.currentTarget.domain;

    if (
      ["cloud", "google_assistant", "alexa"].includes(domain) &&
      isComponentLoaded(this.hass, "cloud")
    ) {
      fireEvent(this, "close-dialog");
      navigate("/config/cloud");
      return;
    }

    if (
      (domain === this.domain &&
        !this.integration!.config_flow &&
        (!this.integration!.integrations?.[domain] ||
          !this.integration!.integrations[domain].config_flow)) ||
      !this.integration!.integrations?.[domain]?.config_flow
    ) {
      const manifest = await fetchIntegrationManifest(this.hass, domain);
      showAlertDialog(this, {
        title: this.hass.localize(
          "ui.panel.config.integrations.config_flow.yaml_only_title"
        ),
        text: this.hass.localize(
          "ui.panel.config.integrations.config_flow.yaml_only_text",
          {
            link:
              manifest?.is_built_in || manifest?.documentation
                ? html`<a
                    href=${manifest.is_built_in
                      ? documentationUrl(
                          this.hass,
                          `/integrations/${manifest.domain}`
                        )
                      : manifest.documentation}
                    target="_blank"
                    rel="noreferrer noopener"
                  >
                    ${this.hass.localize(
                      "ui.panel.config.integrations.config_flow.documentation"
                    )}</a
                  >`
                : this.hass.localize(
                    "ui.panel.config.integrations.config_flow.documentation"
                  ),
          }
        ),
      });
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
