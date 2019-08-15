import {
  getConfigFlowHandlers,
  fetchConfigFlow,
  handleConfigFlowStep,
  deleteConfigFlow,
  createConfigFlow,
} from "../../data/config_entries";
import { HomeAssistant } from "../../types";
import {
  DataEntryFlowStepForm,
  DataEntryFlowStepExternal,
  DataEntryFlowStepCreateEntry,
  DataEntryFlowStepAbort,
} from "../../data/data_entry_flow";
import { html } from "lit-element";
import { localizeKey } from "../../common/translations/localize";
import {
  showFlowDialog,
  DataEntryFlowDialogParams,
  loadDataEntryFlowDialog,
} from "./show-dialog-data-entry-flow";
import { caseInsensitiveCompare } from "../../common/string/compare";

export const loadConfigFlowDialog = loadDataEntryFlowDialog;

export const showConfigFlowDialog = (
  element: HTMLElement,
  dialogParams: Omit<DataEntryFlowDialogParams, "flowConfig">
): void =>
  showFlowDialog(element, dialogParams, {
    loadDevicesAndAreas: true,
    getFlowHandlers: (hass) =>
      getConfigFlowHandlers(hass).then((handlers) =>
        handlers.sort((handlerA, handlerB) =>
          caseInsensitiveCompare(
            hass.localize(`component.${handlerA}.config.title`),
            hass.localize(`component.${handlerB}.config.title`)
          )
        )
      ),
    createFlow: createConfigFlow,
    fetchFlow: fetchConfigFlow,
    handleFlowStep: handleConfigFlowStep,
    deleteFlow: deleteConfigFlow,

    renderAbortDescription(hass: HomeAssistant, step: DataEntryFlowStepAbort) {
      const description = localizeKey(
        hass.localize,
        `component.${step.handler}.config.abort.${step.reason}`,
        step.description_placeholders
      );

      return description
        ? html`
            <ha-markdown .content=${description}></ha-markdown>
          `
        : "";
    },

    renderShowFormStepHeader(hass: HomeAssistant, step: DataEntryFlowStepForm) {
      return hass.localize(
        `component.${step.handler}.config.step.${step.step_id}.title`
      );
    },

    renderShowFormStepDescription(
      hass: HomeAssistant,
      step: DataEntryFlowStepForm
    ) {
      const description = localizeKey(
        hass.localize,
        `component.${step.handler}.config.step.${step.step_id}.description`,
        step.description_placeholders
      );
      return description
        ? html`
            <ha-markdown .content=${description}></ha-markdown>
          `
        : "";
    },

    renderExternalStepHeader(
      hass: HomeAssistant,
      step: DataEntryFlowStepExternal
    ) {
      return hass.localize(
        `component.${step.handler}.config.step.${step.step_id}.title`
      );
    },

    renderExternalStepDescription(
      hass: HomeAssistant,
      step: DataEntryFlowStepExternal
    ) {
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
              <ha-markdown .content=${description}></ha-markdown>
            `
          : ""}
      `;
    },

    renderCreateEntryDescription(
      hass: HomeAssistant,
      step: DataEntryFlowStepCreateEntry
    ) {
      const description = localizeKey(
        hass.localize,
        `component.${step.handler}.config.create_entry.${step.description ||
          "default"}`,
        step.description_placeholders
      );

      return html`
        ${description
          ? html`
              <ha-markdown .content=${description}></ha-markdown>
            `
          : ""}
        <p>Created config for ${step.title}.</p>
      `;
    },
  });
