import { html } from "lit";
import {
  createConfigFlow,
  deleteConfigFlow,
  fetchConfigFlow,
  getConfigFlowHandlers,
  handleConfigFlowStep,
} from "../../data/config_flow";
import { domainToName } from "../../data/integration";
import { getSupportedBrands } from "../../data/supported_brands";
import {
  DataEntryFlowDialogParams,
  loadDataEntryFlowDialog,
  showFlowDialog,
} from "./show-dialog-data-entry-flow";

export const loadConfigFlowDialog = loadDataEntryFlowDialog;

export const showConfigFlowDialog = (
  element: HTMLElement,
  dialogParams: Omit<DataEntryFlowDialogParams, "flowConfig">
): void =>
  showFlowDialog(element, dialogParams, {
    loadDevicesAndAreas: true,
    getFlowHandlers: async (hass) => {
      const [integrations, helpers, supportedBrands] = await Promise.all([
        getConfigFlowHandlers(hass, "integration"),
        getConfigFlowHandlers(hass, "helper"),
        getSupportedBrands(hass),
        hass.loadBackendTranslation("title", undefined, true),
      ]);

      return { integrations, helpers, supportedBrands };
    },
    createFlow: async (hass, handler) => {
      const [step] = await Promise.all([
        createConfigFlow(hass, handler),
        hass.loadBackendTranslation("config", handler),
        // Used as fallback if no header defined for step
        hass.loadBackendTranslation("title", handler),
      ]);
      return step;
    },
    fetchFlow: async (hass, flowId) => {
      const step = await fetchConfigFlow(hass, flowId);
      await hass.loadBackendTranslation("config", step.handler);
      return step;
    },
    handleFlowStep: handleConfigFlowStep,
    deleteFlow: deleteConfigFlow,

    renderAbortDescription(hass, step) {
      const description = hass.localize(
        `component.${step.handler}.config.abort.${step.reason}`,
        step.description_placeholders
      );

      return description
        ? html`
            <ha-markdown allowsvg breaks .content=${description}></ha-markdown>
          `
        : "";
    },

    renderShowFormStepHeader(hass, step) {
      return (
        hass.localize(
          `component.${step.handler}.config.step.${step.step_id}.title`
        ) || hass.localize(`component.${step.handler}.title`)
      );
    },

    renderShowFormStepDescription(hass, step) {
      const description = hass.localize(
        `component.${step.handler}.config.step.${step.step_id}.description`,
        step.description_placeholders
      );
      return description
        ? html`
            <ha-markdown allowsvg breaks .content=${description}></ha-markdown>
          `
        : "";
    },

    renderShowFormStepFieldLabel(hass, step, field) {
      return hass.localize(
        `component.${step.handler}.config.step.${step.step_id}.data.${field.name}`
      );
    },

    renderShowFormStepFieldHelper(hass, step, field) {
      const description = hass.localize(
        `component.${step.handler}.config.step.${step.step_id}.data_description.${field.name}`,
        step.description_placeholders
      );
      return description
        ? html`<ha-markdown breaks .content=${description}></ha-markdown>`
        : "";
    },

    renderShowFormStepFieldError(hass, step, error) {
      return hass.localize(
        `component.${step.handler}.config.error.${error}`,
        step.description_placeholders
      );
    },

    renderExternalStepHeader(hass, step) {
      return (
        hass.localize(
          `component.${step.handler}.config.step.${step.step_id}.title`
        ) ||
        hass.localize(
          "ui.panel.config.integrations.config_flow.external_step.open_site"
        )
      );
    },

    renderExternalStepDescription(hass, step) {
      const description = hass.localize(
        `component.${step.handler}.config.${step.step_id}.description`,
        step.description_placeholders
      );

      return html`
        <p>
          ${hass.localize(
            "ui.panel.config.integrations.config_flow.external_step.description"
          )}
        </p>
        ${description
          ? html`
              <ha-markdown
                allowsvg
                breaks
                .content=${description}
              ></ha-markdown>
            `
          : ""}
      `;
    },

    renderCreateEntryDescription(hass, step) {
      const description = hass.localize(
        `component.${step.handler}.config.create_entry.${
          step.description || "default"
        }`,
        step.description_placeholders
      );

      return html`
        ${description
          ? html`
              <ha-markdown
                allowsvg
                breaks
                .content=${description}
              ></ha-markdown>
            `
          : ""}
        <p>
          ${hass.localize(
            "ui.panel.config.integrations.config_flow.created_config",
            "name",
            step.title
          )}
        </p>
      `;
    },

    renderShowFormProgressHeader(hass, step) {
      return (
        hass.localize(
          `component.${step.handler}.config.step.${step.step_id}.title`
        ) || hass.localize(`component.${step.handler}.title`)
      );
    },

    renderShowFormProgressDescription(hass, step) {
      const description = hass.localize(
        `component.${step.handler}.config.progress.${step.progress_action}`,
        step.description_placeholders
      );
      return description
        ? html`
            <ha-markdown allowsvg breaks .content=${description}></ha-markdown>
          `
        : "";
    },

    renderMenuHeader(hass, step) {
      return (
        hass.localize(
          `component.${step.handler}.config.step.${step.step_id}.title`
        ) || hass.localize(`component.${step.handler}.title`)
      );
    },

    renderMenuDescription(hass, step) {
      const description = hass.localize(
        `component.${step.handler}.config.step.${step.step_id}.description`,
        step.description_placeholders
      );
      return description
        ? html`
            <ha-markdown allowsvg breaks .content=${description}></ha-markdown>
          `
        : "";
    },

    renderMenuOption(hass, step, option) {
      return hass.localize(
        `component.${step.handler}.config.step.${step.step_id}.menu_options.${option}`,
        step.description_placeholders
      );
    },

    renderLoadingDescription(hass, reason, handler, step) {
      if (!["loading_flow", "loading_step"].includes(reason)) {
        return "";
      }
      const domain = step?.handler || handler;
      return hass.localize(
        `ui.panel.config.integrations.config_flow.loading.${reason}`,
        {
          integration: domain
            ? domainToName(hass.localize, domain)
            : // when we are continuing a config flow, we only know the ID and not the domain
              hass.localize(
                "ui.panel.config.integrations.config_flow.loading.fallback_title"
              ),
        }
      );
    },
  });
