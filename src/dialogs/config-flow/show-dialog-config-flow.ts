import { html } from "lit-element";
import { caseInsensitiveCompare } from "../../common/string/compare";
import { localizeKey } from "../../common/translations/localize";
import {
  createConfigFlow,
  deleteConfigFlow,
  fetchConfigFlow,
  getConfigFlowHandlers,
  handleConfigFlowStep,
} from "../../data/config_flow";
import { domainToName } from "../../data/integration";
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
      const [handlers] = await Promise.all([
        getConfigFlowHandlers(hass),
        hass.loadBackendTranslation("title", undefined, true),
      ]);

      return handlers.sort((handlerA, handlerB) =>
        caseInsensitiveCompare(
          domainToName(hass.localize, handlerA),
          domainToName(hass.localize, handlerB)
        )
      );
    },
    createFlow: async (hass, handler) => {
      const [step] = await Promise.all([
        createConfigFlow(hass, handler),
        hass.loadBackendTranslation("config", handler),
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
      const description = localizeKey(
        hass.localize,
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
      const description = localizeKey(
        hass.localize,
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

    renderShowFormStepFieldError(hass, step, error) {
      return hass.localize(`component.${step.handler}.config.error.${error}`);
    },

    renderExternalStepHeader(hass, step) {
      return (
        hass.localize(
          `component.${step.handler}.config.${step.step_id}.title`
        ) ||
        hass.localize(
          "ui.panel.config.integrations.config_flow.external_step.open_site"
        )
      );
    },

    renderExternalStepDescription(hass, step) {
      const description = localizeKey(
        hass.localize,
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
      const description = localizeKey(
        hass.localize,
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
  });
