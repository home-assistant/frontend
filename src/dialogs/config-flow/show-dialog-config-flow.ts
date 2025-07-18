import { html, nothing } from "lit";
import {
  createConfigFlow,
  deleteConfigFlow,
  fetchConfigFlow,
  handleConfigFlowStep,
} from "../../data/config_flow";
import { domainToName } from "../../data/integration";
import type { DataEntryFlowDialogParams } from "./show-dialog-data-entry-flow";
import {
  loadDataEntryFlowDialog,
  showFlowDialog,
} from "./show-dialog-data-entry-flow";

export const loadConfigFlowDialog = loadDataEntryFlowDialog;

export const showConfigFlowDialog = (
  element: HTMLElement,
  dialogParams: Omit<DataEntryFlowDialogParams, "flowConfig"> & {
    entryId?: string;
  }
): void =>
  showFlowDialog(element, dialogParams, {
    flowType: "config_flow",
    showDevices: true,
    createFlow: async (hass, handler) => {
      const [step] = await Promise.all([
        createConfigFlow(hass, handler, dialogParams.entryId),
        hass.loadFragmentTranslation("config"),
        hass.loadBackendTranslation("config", handler),
        hass.loadBackendTranslation("selector", handler),
        // Used as fallback if no header defined for step
        hass.loadBackendTranslation("title", handler),
      ]);
      return step;
    },
    fetchFlow: async (hass, flowId) => {
      const [step] = await Promise.all([
        fetchConfigFlow(hass, flowId),
        hass.loadFragmentTranslation("config"),
      ]);
      await Promise.all([
        hass.loadBackendTranslation("config", step.handler),
        hass.loadBackendTranslation("selector", step.handler),
        // Used as fallback if no header defined for step
        hass.loadBackendTranslation("title", step.handler),
      ]);
      return step;
    },
    handleFlowStep: handleConfigFlowStep,
    deleteFlow: deleteConfigFlow,

    renderAbortDescription(hass, step) {
      const description = hass.localize(
        `component.${step.translation_domain || step.handler}.config.abort.${step.reason}`,
        step.description_placeholders
      );

      return description
        ? html`
            <ha-markdown allow-svg breaks .content=${description}></ha-markdown>
          `
        : step.reason;
    },

    renderShowFormStepHeader(hass, step) {
      return (
        hass.localize(
          `component.${step.translation_domain || step.handler}.config.step.${step.step_id}.title`,
          step.description_placeholders
        ) || hass.localize(`component.${step.handler}.title`)
      );
    },

    renderShowFormStepDescription(hass, step) {
      const description = hass.localize(
        `component.${step.translation_domain || step.handler}.config.step.${step.step_id}.description`,
        step.description_placeholders
      );
      return description
        ? html`
            <ha-markdown
              .allowDataUrl=${step.handler === "zwave_js"}
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
          `component.${step.handler}.config.step.${step.step_id}.sections.${field.name}.name`,
          step.description_placeholders
        );
      }

      const prefix = options?.path?.[0] ? `sections.${options.path[0]}.` : "";

      return (
        hass.localize(
          `component.${step.handler}.config.step.${step.step_id}.${prefix}data.${field.name}`,
          step.description_placeholders
        ) || field.name
      );
    },

    renderShowFormStepFieldHelper(hass, step, field, options) {
      if (field.type === "expandable") {
        return hass.localize(
          `component.${step.translation_domain || step.handler}.config.step.${step.step_id}.sections.${field.name}.description`,
          step.description_placeholders
        );
      }

      const prefix = options?.path?.[0] ? `sections.${options.path[0]}.` : "";

      const description = hass.localize(
        `component.${step.translation_domain || step.handler}.config.step.${step.step_id}.${prefix}data_description.${field.name}`,
        step.description_placeholders
      );

      return description
        ? html`<ha-markdown breaks .content=${description}></ha-markdown>`
        : "";
    },

    renderShowFormStepFieldError(hass, step, error) {
      return (
        hass.localize(
          `component.${step.translation_domain || step.translation_domain || step.handler}.config.error.${error}`,
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
        `component.${step.translation_domain || step.handler}.config.${step.step_id}.description`,
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
                allow-svg
                breaks
                .content=${description}
              ></ha-markdown>
            `
          : ""}
      `;
    },

    renderCreateEntryDescription(hass, step) {
      const description = hass.localize(
        `component.${step.translation_domain || step.handler}.config.create_entry.${
          step.description || "default"
        }`,
        step.description_placeholders
      );

      return html`
        ${description
          ? html`
              <ha-markdown
                allow-svg
                breaks
                .content=${description}
              ></ha-markdown>
            `
          : nothing}
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
        `component.${step.translation_domain || step.handler}.config.progress.${step.progress_action}`,
        step.description_placeholders
      );
      return description
        ? html`
            <ha-markdown allow-svg breaks .content=${description}></ha-markdown>
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
        `component.${step.translation_domain || step.handler}.config.step.${step.step_id}.description`,
        step.description_placeholders
      );
      return description
        ? html`
            <ha-markdown allow-svg breaks .content=${description}></ha-markdown>
          `
        : "";
    },

    renderMenuOption(hass, step, option) {
      return hass.localize(
        `component.${step.translation_domain || step.handler}.config.step.${step.step_id}.menu_options.${option}`,
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
