import { html } from "lit";
import {
  createConfigFlow,
  deleteConfigFlow,
  fetchConfigFlow,
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
    flowType: "config_flow",
    loadDevicesAndAreas: true,
    createFlow: async (hass, handler) => {
      const [step] = await Promise.all([
        createConfigFlow(hass, handler),
        hass.loadFragmentTranslation("config"),
        hass.loadBackendTranslation("config", handler),
        hass.loadBackendTranslation("selector", handler),
        // Used as fallback if no header defined for step
        hass.loadBackendTranslation("title", handler),
      ]);
      return step;
    },
    fetchFlow: async (hass, flowId) => {
      const step = await fetchConfigFlow(hass, flowId);
      await hass.loadFragmentTranslation("config");
      await hass.loadBackendTranslation("config", step.handler);
      await hass.loadBackendTranslation("selector", step.handler);
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
          `component.${step.handler}.config.step.${step.step_id}.title`,
          step.description_placeholders
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
      return (
        hass.localize(
          `component.${step.handler}.config.error.${error}`,
          step.description_placeholders
        ) || error
      );
    },

    renderShowFormStepFieldLocalizeValue(hass, step, key) {
      return hass.localize(`component.${step.handler}.selector.${key}`);
    },

    renderShowFormStepSubmitButton(hass, step) {
      return (
        hass.localize(
          `component.${step.handler}.config.step.${step.step_id}.submit`
        ) ||
        hass.localize(
          `ui.panel.config.integrations.config_flow.${
            step.last_step === false ? "next" : "submit"
          }`
        )
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
      if (reason !== "loading_flow" && reason !== "loading_step") {
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
