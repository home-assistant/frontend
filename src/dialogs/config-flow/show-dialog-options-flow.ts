import { html } from "lit";
import type { ConfigEntry } from "../../data/config_entries";
import { domainToName } from "../../data/integration";
import {
  createOptionsFlow,
  deleteOptionsFlow,
  fetchOptionsFlow,
  handleOptionsFlowStep,
} from "../../data/options_flow";
import type { DataEntryFlowDialogParams } from "./show-dialog-data-entry-flow";
import {
  loadDataEntryFlowDialog,
  showFlowDialog,
} from "./show-dialog-data-entry-flow";

export const loadOptionsFlowDialog = loadDataEntryFlowDialog;

export const showOptionsFlowDialog = (
  element: HTMLElement,
  configEntry: ConfigEntry,
  dialogParams?: Omit<DataEntryFlowDialogParams, "flowConfig">
): void =>
  showFlowDialog(
    element,
    {
      startFlowHandler: configEntry.entry_id,
      domain: configEntry.domain,
      ...dialogParams,
    },
    {
      flowType: "options_flow",
      showDevices: false,
      createFlow: async (hass, handler) => {
        const [step] = await Promise.all([
          createOptionsFlow(hass, handler),
          hass.loadFragmentTranslation("config"),
          hass.loadBackendTranslation("options", configEntry.domain),
          hass.loadBackendTranslation("selector", configEntry.domain),
        ]);
        return step;
      },
      fetchFlow: async (hass, flowId) => {
        const [step] = await Promise.all([
          fetchOptionsFlow(hass, flowId),
          hass.loadFragmentTranslation("config"),
          hass.loadBackendTranslation("options", configEntry.domain),
          hass.loadBackendTranslation("selector", configEntry.domain),
        ]);
        return step;
      },
      handleFlowStep: handleOptionsFlowStep,
      deleteFlow: deleteOptionsFlow,

      renderAbortDescription(hass, step) {
        const description = hass.localize(
          `component.${step.translation_domain || configEntry.domain}.options.abort.${step.reason}`,
          step.description_placeholders
        );

        return description
          ? html`
              <ha-markdown
                breaks
                allow-svg
                .content=${description}
              ></ha-markdown>
            `
          : step.reason;
      },

      renderShowFormStepHeader(hass, step) {
        return (
          hass.localize(
            `component.${step.translation_domain || configEntry.domain}.options.step.${step.step_id}.title`,
            step.description_placeholders
          ) || hass.localize(`ui.dialogs.options_flow.form.header`)
        );
      },

      renderShowFormStepDescription(hass, step) {
        const description = hass.localize(
          `component.${step.translation_domain || configEntry.domain}.options.step.${step.step_id}.description`,
          step.description_placeholders
        );
        return description
          ? html`
              <ha-markdown
                allow-svg
                breaks
                .content=${description}
              ></ha-markdown>
            `
          : "";
      },

      renderShowFormStepFieldLabel(hass, step, field, options) {
        if (field.type === "expandable") {
          return hass.localize(
            `component.${configEntry.domain}.options.step.${step.step_id}.sections.${field.name}.name`,
            step.description_placeholders
          );
        }

        const prefix = options?.path?.[0] ? `sections.${options.path[0]}.` : "";

        return (
          hass.localize(
            `component.${configEntry.domain}.options.step.${step.step_id}.${prefix}data.${field.name}`,
            step.description_placeholders
          ) || field.name
        );
      },

      renderShowFormStepFieldHelper(hass, step, field, options) {
        if (field.type === "expandable") {
          return hass.localize(
            `component.${step.translation_domain || configEntry.domain}.options.step.${step.step_id}.sections.${field.name}.description`,
            step.description_placeholders
          );
        }

        const prefix = options?.path?.[0] ? `sections.${options.path[0]}.` : "";

        const description = hass.localize(
          `component.${step.translation_domain || configEntry.domain}.options.step.${step.step_id}.${prefix}data_description.${field.name}`,
          step.description_placeholders
        );
        return description
          ? html`<ha-markdown breaks .content=${description}></ha-markdown>`
          : "";
      },

      renderShowFormStepFieldError(hass, step, error) {
        return (
          hass.localize(
            `component.${step.translation_domain || configEntry.domain}.options.error.${error}`,
            step.description_placeholders
          ) || error
        );
      },

      renderShowFormStepFieldLocalizeValue(hass, _step, key) {
        return hass.localize(`component.${configEntry.domain}.selector.${key}`);
      },

      renderShowFormStepSubmitButton(hass, step) {
        return (
          hass.localize(
            `component.${configEntry.domain}.options.step.${step.step_id}.submit`
          ) ||
          hass.localize(
            `ui.panel.config.integrations.config_flow.${
              step.last_step === false ? "next" : "submit"
            }`
          )
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

      renderShowFormProgressHeader(hass, step) {
        return (
          hass.localize(
            `component.${configEntry.domain}.options.step.${step.step_id}.title`
          ) || hass.localize(`component.${configEntry.domain}.title`)
        );
      },

      renderShowFormProgressDescription(hass, step) {
        const description = hass.localize(
          `component.${step.translation_domain || configEntry.domain}.options.progress.${step.progress_action}`,
          step.description_placeholders
        );
        return description
          ? html`
              <ha-markdown
                allow-svg
                breaks
                .content=${description}
              ></ha-markdown>
            `
          : "";
      },

      renderMenuHeader(hass, step) {
        return (
          hass.localize(
            `component.${configEntry.domain}.options.step.${step.step_id}.title`
          ) || hass.localize(`component.${configEntry.domain}.title`)
        );
      },

      renderMenuDescription(hass, step) {
        const description = hass.localize(
          `component.${step.translation_domain || configEntry.domain}.options.step.${step.step_id}.description`,
          step.description_placeholders
        );
        return description
          ? html`
              <ha-markdown
                allow-svg
                breaks
                .content=${description}
              ></ha-markdown>
            `
          : "";
      },

      renderMenuOption(hass, step, option) {
        return hass.localize(
          `component.${step.translation_domain || configEntry.domain}.options.step.${step.step_id}.menu_options.${option}`,
          step.description_placeholders
        );
      },

      renderLoadingDescription(hass, reason) {
        return (
          hass.localize(`component.${configEntry.domain}.options.loading`) ||
          (reason === "loading_flow" || reason === "loading_step"
            ? hass.localize(`ui.dialogs.options_flow.loading.${reason}`, {
                integration: domainToName(hass.localize, configEntry.domain),
              })
            : "")
        );
      },
    }
  );
