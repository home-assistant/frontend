import { html } from "lit";
import { getConfigEntries } from "../../data/config_entries";
import { domainToName } from "../../data/integration";
import { getIntegrationDescriptions } from "../../data/integrations";
import { showConfigFlowDialog } from "../../dialogs/config-flow/show-dialog-config-flow";
import { showConfirmationDialog } from "../../dialogs/generic/show-dialog-box";
import { showMatterAddDeviceDialog } from "../../panels/config/integrations/integration-panels/matter/show-dialog-add-matter-device";
import { showZWaveJSAddNodeDialog } from "../../panels/config/integrations/integration-panels/zwave_js/show-dialog-zwave_js-add-node";
import type { HomeAssistant } from "../../types";
import { documentationUrl } from "../../util/documentation-url";
import { isComponentLoaded } from "../config/is_component_loaded";
import { navigate } from "../navigate";

export const PROTOCOL_INTEGRATIONS = ["zha", "zwave_js", "matter"] as const;

export const protocolIntegrationPicked = async (
  element: HTMLElement,
  hass: HomeAssistant,
  domain: string,
  options?: { brand?: string; domain?: string; config_entry?: string }
) => {
  if (options?.domain) {
    const localize = await hass.loadBackendTranslation("title", options.domain);
    options.domain = domainToName(localize, options.domain);
  }

  if (options?.brand) {
    const integrationDescriptions = await getIntegrationDescriptions(hass);
    options.brand =
      integrationDescriptions.core.integration[options.brand]?.name ||
      options.brand;
  }

  if (domain === "zwave_js") {
    const entries = options?.config_entry
      ? undefined
      : await getConfigEntries(hass, {
          domain,
        });

    if (
      !isComponentLoaded(hass, "zwave_js") ||
      (!options?.config_entry && !entries?.length)
    ) {
      // If the component isn't loaded, ask them to load the integration first
      showConfirmationDialog(element, {
        title: hass.localize(
          "ui.panel.config.integrations.config_flow.missing_zwave_zigbee_title",
          { integration: "Z-Wave" }
        ),
        text: hass.localize(
          "ui.panel.config.integrations.config_flow.missing_zwave_zigbee",
          {
            integration: "Z-Wave",
            brand: options?.brand || options?.domain || "Z-Wave",
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
          showConfigFlowDialog(element, {
            startFlowHandler: "zwave_js",
          });
        },
      });
      return;
    }

    showZWaveJSAddNodeDialog(element, {
      entry_id: options?.config_entry || entries![0].entry_id,
    });
  } else if (domain === "zha") {
    const entries = options?.config_entry
      ? undefined
      : await getConfigEntries(hass, {
          domain,
        });

    if (
      !isComponentLoaded(hass, "zha") ||
      (!options?.config_entry && !entries?.length)
    ) {
      // If the component isn't loaded, ask them to load the integration first
      showConfirmationDialog(element, {
        title: hass.localize(
          "ui.panel.config.integrations.config_flow.missing_zwave_zigbee_title",
          { integration: "Zigbee" }
        ),
        text: hass.localize(
          "ui.panel.config.integrations.config_flow.missing_zwave_zigbee",
          {
            integration: "Zigbee",
            brand: options?.brand || options?.domain || "Zigbee",
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
          showConfigFlowDialog(element, {
            startFlowHandler: "zha",
          });
        },
      });
      return;
    }

    navigate("/config/zha/add");
  } else if (domain === "matter") {
    const entries = options?.config_entry
      ? undefined
      : await getConfigEntries(hass, {
          domain,
        });
    if (
      !isComponentLoaded(hass, domain) ||
      (!options?.config_entry && !entries?.length)
    ) {
      // If the component isn't loaded, ask them to load the integration first
      showConfirmationDialog(element, {
        title: hass.localize(
          "ui.panel.config.integrations.config_flow.missing_zwave_zigbee_title",
          { integration: "Matter" }
        ),
        text: hass.localize(
          "ui.panel.config.integrations.config_flow.missing_matter",
          {
            integration: "Matter",
            brand: options?.brand || options?.domain || "Matter",
            supported_hardware_link: html`<a
              href=${documentationUrl(hass, "/integrations/matter")}
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
          showConfigFlowDialog(element, {
            startFlowHandler: "matter",
          });
        },
      });
      return;
    }
    showMatterAddDeviceDialog(element);
  }
};
