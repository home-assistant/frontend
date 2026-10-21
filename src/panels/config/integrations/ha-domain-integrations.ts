import "@home-assistant/webawesome/dist/components/divider/divider";
import { mdiPlus } from "@mdi/js";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import { isComponentLoaded } from "../../../common/config/is_component_loaded";
import type { HASSDomCurrentTargetEvent } from "../../../common/dom/fire_event";
import { fireEvent } from "../../../common/dom/fire_event";
import { getShadowRootHost } from "../../../common/dom/get-shadow-root-host";
import {
  PROTOCOL_INTEGRATIONS,
  protocolIntegrationPicked,
} from "../../../common/integrations/protocolIntegrationPicked";
import { navigate } from "../../../common/navigate";
import { caseInsensitiveStringCompare } from "../../../common/string/compare";
import "../../../components/ha-button";
import "../../../components/ha-svg-icon";
import "../../../components/item/ha-list-item-button";
import "../../../components/list/ha-list-base";
import { localizeConfigFlowTitle } from "../../../data/config_flow";
import type { DataEntryFlowProgress } from "../../../data/data_entry_flow";
import {
  domainToName,
  fetchIntegrationManifest,
} from "../../../data/integration";
import type { Brand, Integration } from "../../../data/integrations";
import { showConfigFlowDialog } from "../../../dialogs/config-flow/show-dialog-config-flow";
import { haStyle } from "../../../resources/styles";
import type { HomeAssistant } from "../../../types";
import { brandsUrl } from "../../../util/brands-url";
import "./ha-integration-list-item";
import { showYamlIntegrationDialog } from "./show-add-integration-dialog";

export const standardToDomain = { zigbee: "zha", zwave: "zwave_js" } as const;

@customElement("ha-domain-integrations")
class HaDomainIntegrations extends LitElement {
  public hass!: HomeAssistant;

  @property() public domain!: string;

  @property({ attribute: false }) public integration?: Brand | Integration;

  @property({ attribute: false })
  public flowsInProgress?: DataEntryFlowProgress[];

  @property({ attribute: false })
  public navigateToResult = false;

  @property({ attribute: false })
  public showManageLink = false;

  // Cards like the dialog's other lists, with the manage button floating
  // at the bottom
  @property({ type: Boolean, reflect: true }) public boxed = false;

  protected render() {
    // Only show manage link if not already on the integrations dashboard
    const manage =
      this.showManageLink &&
      !location.pathname.startsWith("/config/integrations");
    return html`<div class="box">
      <ha-list-base>
        ${
          this.flowsInProgress?.length
            ? html`<h3>
                  ${this.hass.localize("ui.panel.config.integrations.discovered")}
                </h3>
                ${this.flowsInProgress.map(
                  (flow) =>
                    html`<ha-list-item-button
                      .flow=${flow}
                      @click=${this._flowInProgressPicked}
                    >
                      <img
                        alt=""
                        slot="start"
                        loading="lazy"
                        src=${brandsUrl(
                          {
                            domain: flow.handler,
                            type: "icon",
                            darkOptimized: this.hass.themes?.darkMode,
                          },
                          this.hass.auth.data.hassUrl
                        )}
                        crossorigin="anonymous"
                        referrerpolicy="no-referrer"
                      />
                      <span slot="headline"
                        >${localizeConfigFlowTitle(this.hass.localize, flow)}</span
                      >
                      <span slot="supporting-text"
                        >${domainToName(this.hass.localize, flow.handler)}</span
                      >
                      <ha-svg-icon slot="end" .path=${mdiPlus}></ha-svg-icon>
                    </ha-list-item-button>`
                )}
                <wa-divider></wa-divider>
                ${
                  this.integration &&
                  "integrations" in this.integration &&
                  this.integration.integrations
                    ? html`<h3>
                        ${this.hass.localize(
                          "ui.panel.config.integrations.available_integrations"
                        )}
                      </h3>`
                    : nothing
                }`
            : nothing
        }
        ${
          this.integration?.iot_standards
            ? this.integration.iot_standards
                .filter((standard) =>
                  (PROTOCOL_INTEGRATIONS as readonly string[]).includes(
                    standardToDomain[standard] || standard
                  )
                )
                .map((standard) => {
                  const domain: (typeof PROTOCOL_INTEGRATIONS)[number] =
                    standardToDomain[standard] || standard;
                  return html`<ha-list-item-button
                    .domain=${domain}
                    @click=${this._standardPicked}
                  >
                    <img
                      slot="start"
                      loading="lazy"
                      alt=""
                      src=${brandsUrl(
                        {
                          domain,
                          type: "icon",
                          darkOptimized: this.hass.themes?.darkMode,
                        },
                        this.hass.auth.data.hassUrl
                      )}
                      crossorigin="anonymous"
                      referrerpolicy="no-referrer"
                    />
                    <span slot="headline"
                      >${this.hass.localize(
                        `ui.panel.config.integrations.add_${domain}_device`
                      )}</span
                    >
                    <ha-icon-next slot="end"></ha-icon-next>
                  </ha-list-item-button>`;
                })
            : ""
        }
        ${
          this.integration &&
          "integrations" in this.integration &&
          this.integration.integrations
            ? Object.entries(this.integration.integrations)
                .filter(([, val]) => val.integration_type !== "hardware")
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
                      .domain=${dom}
                      .integration=${{
                        ...val,
                        domain: dom,
                        name: val.name || domainToName(this.hass.localize, dom),
                        is_built_in: val.is_built_in !== false,
                        cloud: val.iot_class?.startsWith("cloud_"),
                      }}
                      .opensFlow=${!val.iot_standards}
                      @click=${this._integrationPicked}
                    >
                    </ha-integration-list-item>`
                )
            : ""
        }
        ${
          (PROTOCOL_INTEGRATIONS as readonly string[]).includes(this.domain)
            ? html`<ha-list-item-button
                .domain=${this.domain}
                @click=${this._standardPicked}
              >
                <img
                  slot="start"
                  loading="lazy"
                  alt=""
                  src=${brandsUrl(
                    {
                      domain: this.domain,
                      type: "icon",
                      darkOptimized: this.hass.themes?.darkMode,
                    },
                    this.hass.auth.data.hassUrl
                  )}
                  crossorigin="anonymous"
                  referrerpolicy="no-referrer"
                />
                <span slot="headline"
                  >${this.hass.localize(
                    `ui.panel.config.integrations.add_${
                      this.domain as (typeof PROTOCOL_INTEGRATIONS)[number]
                    }_device`
                  )}</span
                >
                <ha-icon-next slot="end"></ha-icon-next>
              </ha-list-item-button>`
            : ""
        }
        ${
          this.integration &&
          "config_flow" in this.integration &&
          this.integration.config_flow
            ? html`${
                this.flowsInProgress?.length
                  ? html`<ha-list-item-button
                      .domain=${this.domain}
                      @click=${this._integrationPicked}
                      .integration=${{
                        ...this.integration,
                        domain: this.domain,
                        name:
                          this.integration.name ||
                          domainToName(this.hass.localize, this.domain),
                        is_built_in: this.integration.is_built_in !== false,
                        cloud: this.integration.iot_class?.startsWith("cloud_"),
                      }}
                    >
                      <span slot="headline">
                        ${this.hass.localize(
                          "ui.panel.config.integrations.new_flow",
                          {
                            integration:
                              this.integration.name ||
                              domainToName(this.hass.localize, this.domain),
                          }
                        )}
                      </span>
                      <ha-svg-icon slot="end" .path=${mdiPlus}></ha-svg-icon>
                    </ha-list-item-button>`
                  : html`<ha-integration-list-item
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
                      opens-flow
                      @click=${this._integrationPicked}
                    >
                    </ha-integration-list-item>`
              }`
            : ""
        }
        ${
          manage && !this.boxed
            ? html`<ha-list-item-button @click=${this._manageDiscovered}>
                <span slot="headline"
                  >${this.hass.localize(
                    "ui.panel.config.integrations.manage_discovered"
                  )}</span
                >
                <span slot="supporting-text"
                  >${this.hass.localize(
                    "ui.panel.config.integrations.manage_discovered_description"
                  )}</span
                >
                <ha-icon-next slot="end"></ha-icon-next>
              </ha-list-item-button>`
            : nothing
        }
      </ha-list-base>
      ${
        manage && this.boxed
          ? html`<div class="footer">
              <div class="footer-bar">
                <ha-button
                  appearance="plain"
                  size="s"
                  @click=${this._manageDiscovered}
                >
                  ${this.hass.localize(
                    "ui.panel.config.integrations.manage_discovered"
                  )}
                </ha-button>
              </div>
            </div>`
          : nothing
      }
    </div>`;
  }

  private async _integrationPicked(
    ev: HASSDomCurrentTargetEvent<HTMLElement & { domain: string }>
  ) {
    const domain = ev.currentTarget.domain;

    if (
      ["cloud", "google_assistant", "alexa"].includes(domain) &&
      isComponentLoaded(this.hass.config, "cloud")
    ) {
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

    showConfigFlowDialog(getShadowRootHost(this) ?? this, {
      startFlowHandler: domain,
      navigateToResult: this.navigateToResult,
      manifest: await fetchIntegrationManifest(this.hass, domain),
    });
    fireEvent(this, "close-dialog");
  }

  private async _flowInProgressPicked(ev: Event) {
    const flow: DataEntryFlowProgress = (ev.currentTarget as any).flow;
    showConfigFlowDialog(getShadowRootHost(this) ?? this, {
      continueFlowId: flow.flow_id,
      navigateToResult: this.navigateToResult,
      manifest: await fetchIntegrationManifest(this.hass, flow.handler),
    });
    fireEvent(this, "close-dialog");
  }

  private _manageDiscovered() {
    fireEvent(this, "close-dialog");
    navigate("/config/integrations/dashboard?historyBack=1");
  }

  private _standardPicked(
    ev: HASSDomCurrentTargetEvent<HTMLElement & { domain: string }>
  ) {
    const domain = ev.currentTarget.domain;
    const dialogParentElement = getShadowRootHost(this) ?? this;
    fireEvent(this, "close-dialog");
    protocolIntegrationPicked(dialogParentElement, this.hass, domain, {
      brand: this.domain,
    });
  }

  static styles = [
    haStyle,
    css`
      :host {
        display: block;
        --ha-row-item-padding-inline: var(--ha-space-6);
      }
      h3 {
        margin: var(--ha-space-2) var(--ha-space-6) 0;
        color: var(--secondary-text-color);
        font-size: var(--ha-font-size-m);
        font-weight: var(--ha-font-weight-medium);
      }
      h3:first-of-type {
        margin-top: 0;
      }
      img {
        width: 32px;
        height: 32px;
      }
      wa-divider {
        margin-top: var(--ha-space-2);
      }
      ha-icon-next {
        color: var(--ha-color-text-secondary);
      }
      ha-svg-icon[slot="end"] {
        color: var(--primary-color);
      }
      .box {
        display: contents;
      }
      /* Fill the scroll view, the box scrolls itself */
      :host([boxed]) {
        --ha-row-item-padding-inline: var(--ha-space-3);
        display: flex;
        flex-direction: column;
        flex: 1;
        height: 100%;
        min-height: 0;
      }
      /* Scrolls itself, so the footer can float over its end */
      :host([boxed]) .box {
        display: flex;
        flex-direction: column;
        flex: 1;
        min-height: 0;
        overflow: auto;
        /* No rubber band: it would bounce the footer away from the bottom */
        overscroll-behavior: none;
      }
      :host([boxed]) ha-list-base {
        flex-shrink: 0;
      }
      /* Clip instead of hide: hidden makes the list its own scroll
         container, which would hold the title to the list, not the box */
      :host([boxed]) ha-list-base::part(base) {
        overflow-x: clip;
      }
      /* Like the title above the other lists, held at the top */
      :host([boxed]) h3 {
        position: sticky;
        top: 0;
        z-index: 1;
        display: flex;
        align-items: center;
        box-sizing: border-box;
        min-height: var(--ha-space-10);
        margin: 0;
        padding: var(--ha-space-2) var(--ha-space-3) var(--ha-space-2)
          calc(var(--ha-space-4) + 1px + var(--ha-space-3));
        background-color: var(--card-background-color);
        color: var(--primary-text-color);
        font-weight: var(--ha-font-weight-medium);
      }
      /* Cards, like the integrations in the other lists */
      :host([boxed]) ha-list-item-button {
        padding: 0 var(--ha-space-4) var(--ha-space-2);
        box-sizing: border-box;
        --ha-list-item-focus-radius: var(--ha-border-radius-lg);
      }
      :host([boxed]) ha-list-item-button::part(base) {
        border: 1px solid var(--ha-color-border-neutral-quiet);
        border-radius: var(--ha-border-radius-lg);
        overflow: hidden;
      }
      :host([boxed]) wa-divider {
        display: none;
      }
      /* Managing what was found floats over the end of the list, which
         fades out under it */
      .footer {
        position: sticky;
        bottom: 0;
        z-index: 1;
        margin-top: auto;
        padding: var(--ha-space-6) var(--ha-space-4) var(--ha-space-3);
        background: linear-gradient(
          to bottom,
          transparent,
          var(--card-background-color) var(--ha-space-6)
        );
        pointer-events: none;
      }
      .footer-bar {
        display: flex;
        justify-content: center;
        padding: var(--ha-space-1);
        border-radius: var(--ha-border-radius-xl);
        background-color: var(--ha-color-surface-low);
        pointer-events: auto;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-domain-integrations": HaDomainIntegrations;
  }
}
