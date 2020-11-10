import { html } from "lit-element";
import { localizeKey } from "../../common/translations/localize";
import { ConfigEntry } from "../../data/config_entries";
import {
  createOptionsFlow,
  deleteOptionsFlow,
  fetchOptionsFlow,
  handleOptionsFlowStep,
} from "../../data/options_flow";
import {
  loadDataEntryFlowDialog,
  showFlowDialog,
} from "./show-dialog-data-entry-flow";

export const loadOptionsFlowDialog = loadDataEntryFlowDialog;

export const showOptionsFlowDialog = (
  element: HTMLElement,
  configEntry: ConfigEntry
): void =>
  showFlowDialog(
    element,
    {
      startFlowHandler: configEntry.entry_id,
    },
    {
      loadDevicesAndAreas: false,
      createFlow: async (hass, handler) => {
        const [step] = await Promise.all([
          createOptionsFlow(hass, handler),
          hass.loadBackendTranslation("options", configEntry.domain),
        ]);
        return step;
      },
      fetchFlow: async (hass, flowId) => {
        const [step] = await Promise.all([
          fetchOptionsFlow(hass, flowId),
          hass.loadBackendTranslation("options", configEntry.domain),
        ]);
        return step;
      },
      handleFlowStep: handleOptionsFlowStep,
      deleteFlow: deleteOptionsFlow,

      renderAbortDescription(hass, step) {
        const description = localizeKey(
          hass.localize,
          `component.${configEntry.domain}.options.abort.${step.reason}`,
          step.description_placeholders
        );

        return description
          ? html`
              <ha-markdown
                breaks
                allowsvg
                .content=${description}
              ></ha-markdown>
            `
          : "";
      },

      renderShowFormStepHeader(hass, step) {
        return (
          hass.localize(
            `component.${configEntry.domain}.options.step.${step.step_id}.title`
          ) || hass.localize(`ui.dialogs.options_flow.form.header`)
        );
      },

      renderShowFormStepDescription(hass, step) {
        const description = localizeKey(
          hass.localize,
          `component.${configEntry.domain}.options.step.${step.step_id}.description`,
          step.description_placeholders
        );
        return description
          ? html`
              <ha-markdown
                allowsvg
                breaks
                .content=${description}
              ></ha-markdown>
            `
          : "";
      },

      renderShowFormStepFieldLabel(hass, step, field) {
        return hass.localize(
          `component.${configEntry.domain}.options.step.${step.step_id}.data.${field.name}`
        );
      },

      renderShowFormStepFieldError(hass, _step, error) {
        return hass.localize(
          `component.${configEntry.domain}.options.error.${error}`
        );
      },

      renderExternalStepHeader(_hass, _step) {
        return "";
      },

      renderExternalStepDescription(_hass, _step) {
        return "";
      },

      renderCreateEntryDescription(hass, _step) {
        return html`
          <p>${hass.localize(`ui.dialogs.options_flow.success.description`)}</p>
        `;
      },

      renderShowFormProgressHeader(_hass, _step) {
        return "";
      },

      renderShowFormProgressDescription(_hass, _step) {
        return "";
      },
    }
  );
