import { html } from "lit";
import { isComponentLoaded } from "../common/config/is_component_loaded";
import { fireEvent } from "../common/dom/fire_event";
import { navigate } from "../common/navigate";
import { LocalizeFunc } from "../common/translations/localize";
import { showConfirmationDialog } from "../dialogs/generic/show-dialog-box";
import { showZWaveJSAddNodeDialog } from "../panels/config/integrations/integration-panels/zwave_js/show-dialog-zwave_js-add-node";
import { HomeAssistant } from "../types";
import { documentationUrl } from "../util/documentation-url";
import { getConfigEntries } from "./config_entries";

export interface IntegrationManifest {
  is_built_in: boolean;
  domain: string;
  name: string;
  config_flow: boolean;
  documentation: string;
  issue_tracker?: string;
  dependencies?: string[];
  after_dependencies?: string[];
  codeowners?: string[];
  requirements?: string[];
  ssdp?: Array<{ manufacturer?: string; modelName?: string; st?: string }>;
  zeroconf?: string[];
  homekit?: { models: string[] };
  quality_scale?: "gold" | "internal" | "platinum" | "silver";
  iot_class:
    | "assumed_state"
    | "cloud_polling"
    | "cloud_push"
    | "local_polling"
    | "local_push";
}

export interface IntegrationSetup {
  domain: string;
  seconds?: number;
}

export const integrationIssuesUrl = (
  domain: string,
  manifest: IntegrationManifest
) =>
  manifest.issue_tracker ||
  `https://github.com/home-assistant/home-assistant/issues?q=is%3Aissue+is%3Aopen+label%3A%22integration%3A+${domain}%22`;

export const domainToName = (
  localize: LocalizeFunc,
  domain: string,
  manifest?: IntegrationManifest
) => localize(`component.${domain}.title`) || manifest?.name || domain;

export const fetchIntegrationManifests = (
  hass: HomeAssistant,
  integrations?: string[]
) => {
  const params: any = {
    type: "manifest/list",
  };
  if (integrations) {
    params.integrations = integrations;
  }
  return hass.callWS<IntegrationManifest[]>(params);
};

export const fetchIntegrationManifest = (
  hass: HomeAssistant,
  integration: string
) => hass.callWS<IntegrationManifest>({ type: "manifest/get", integration });

export const fetchIntegrationSetups = (hass: HomeAssistant) =>
  hass.callWS<IntegrationSetup[]>({ type: "integration/setup_info" });

export const protocolIntegrationPicked = async (
  element: HTMLElement,
  hass: HomeAssistant,
  slug: string
) => {
  if (slug === "zwave_js") {
    const entries = await getConfigEntries(hass, {
      domain: "zwave_js",
    });

    if (!entries.length) {
      // If the component isn't loaded, ask them to load the integration first
      showConfirmationDialog(element, {
        text: hass.localize(
          "ui.panel.config.integrations.config_flow.missing_zwave_zigbee",
          {
            integration: "Z-Wave",
            supported_hardware_link: html`<a
              href=${documentationUrl(hass, "/docs/z-wave/controllers")}
              target="_blank"
              rel="noreferrer"
              >${hass.localize(
                "ui.panel.config.integrations.config_flow.supported_hardware"
              )}</a
            >`,
          }
        ),
        confirmText: hass.localize(
          "ui.panel.config.integrations.config_flow.proceed"
        ),
        confirm: () => {
          fireEvent(element, "handler-picked", {
            handler: "zwave_js",
          });
        },
      });
      return;
    }

    showZWaveJSAddNodeDialog(element, {
      entry_id: entries[0].entry_id,
    });
  } else if (slug === "zha") {
    // If the component isn't loaded, ask them to load the integration first
    if (!isComponentLoaded(hass, "zha")) {
      showConfirmationDialog(element, {
        text: hass.localize(
          "ui.panel.config.integrations.config_flow.missing_zwave_zigbee",
          {
            integration: "Zigbee",
            supported_hardware_link: html`<a
              href=${documentationUrl(
                hass,
                "/integrations/zha/#known-working-zigbee-radio-modules"
              )}
              target="_blank"
              rel="noreferrer"
              >${hass.localize(
                "ui.panel.config.integrations.config_flow.supported_hardware"
              )}</a
            >`,
          }
        ),
        confirmText: hass.localize(
          "ui.panel.config.integrations.config_flow.proceed"
        ),
        confirm: () => {
          fireEvent(element, "handler-picked", {
            handler: "zha",
          });
        },
      });
      return;
    }

    navigate("/config/zha/add");
  }
};
