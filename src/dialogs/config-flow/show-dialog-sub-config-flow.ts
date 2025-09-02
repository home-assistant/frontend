import { html, nothing } from "lit";
import type { ConfigEntry } from "../../data/config_entries";
import { domainToName } from "../../data/integration";
import {
  createSubConfigFlow,
  deleteSubConfigFlow,
  fetchSubConfigFlow,
  handleSubConfigFlowStep,
} from "../../data/sub_config_flow";
import type { DataEntryFlowDialogParams } from "./show-dialog-data-entry-flow";
import {
  loadDataEntryFlowDialog,
  showFlowDialog,
} from "./show-dialog-data-entry-flow";

export const loadSubConfigFlowDialog = loadDataEntryFlowDialog;

export const showSubConfigFlowDialog = (
  element: HTMLElement,
  configEntry: ConfigEntry,
  flowType: string,
  dialogParams: Omit<DataEntryFlowDialogParams, "flowConfig"> & {
    subEntryId?: string;
  }
): void =>
  showFlowDialog(element, dialogParams, {
    flowType: "config_subentries_flow",
    showDevices: true,
    createFlow: async (hass, handler) => {
      const [step] = await Promise.all([
        createSubConfigFlow(hass, handler, flowType, dialogParams.subEntryId),
        hass.loadFragmentTranslation("config"),
        hass.loadBackendTranslation("config_subentries", configEntry.domain),
        hass.loadBackendTranslation("selector", configEntry.domain),
        // Used as fallback if no header defined for step
        hass.loadBackendTranslation("title", configEntry.domain),
      ]);
      return step;
    },
    fetchFlow: async (hass, flowId) => {
      const step = await fetchSubConfigFlow(hass, flowId);
      await hass.loadFragmentTranslation("config");
      await hass.loadBackendTranslation(
        "config_subentries",
        configEntry.domain
      );
      await hass.loadBackendTranslation("selector", configEntry.domain);
      return step;
    },
    handleFlowStep: handleSubConfigFlowStep,
    deleteFlow: deleteSubConfigFlow,

    renderAbortDescription(hass, step) {
      const description = hass.localize(
        `component.${step.translation_domain || configEntry.domain}.config_subentries.${flowType}.abort.${step.reason}`,
        step.description_placeholders
      );

      return description
        ? html`
            <ha-markdown allowsvg breaks .content=${description}></ha-markdown>
          `
        : step.reason;
    },

    renderShowFormStepHeader(hass, step) {
      return (
        hass.localize(
          `component.${step.translation_domain || configEntry.domain}.config_subentries.${flowType}.step.${step.step_id}.title`,
          step.description_placeholders
        ) || hass.localize(`component.${configEntry.domain}.title`)
      );
    },

    renderShowFormStepDescription(hass, step) {
      const description = hass.localize(
        `component.${step.translation_domain || configEntry.domain}.config_subentries.${flowType}.step.${step.step_id}.description`,
        step.description_placeholders
      );
      return description
        ? html`
            <ha-markdown allowsvg breaks .content=${description}></ha-markdown>
          `
        : "";
    },

    renderShowFormStepFieldLabel(hass, step, field, options) {
      if (field.type === "expandable") {
        return hass.localize(
          `component.${configEntry.domain}.config_subentries.${flowType}.step.${step.step_id}.sections.${field.name}.name`,
          step.description_placeholders
        );
      }

      const prefix = options?.path?.[0] ? `sections.${options.path[0]}.` : "";

      return (
        hass.localize(
          `component.${configEntry.domain}.config_subentries.${flowType}.step.${step.step_id}.${prefix}data.${field.name}`,
          step.description_placeholders
        ) || field.name
      );
    },

    renderShowFormStepFieldHelper(hass, step, field, options) {
      if (field.type === "expandable") {
        return hass.localize(
          `component.${step.translation_domain || configEntry.domain}.config_subentries.${flowType}.step.${step.step_id}.sections.${field.name}.description`,
          step.description_placeholders
        );
      }

      const prefix = options?.path?.[0] ? `sections.${options.path[0]}.` : "";

      const description = hass.localize(
        `component.${step.translation_domain || configEntry.domain}.config_subentries.${flowType}.step.${step.step_id}.${prefix}data_description.${field.name}`,
        step.description_placeholders
      );

      return description
        ? html`<ha-markdown breaks .content=${description}></ha-markdown>`
        : "";
    },

    renderShowFormStepFieldError(hass, step, error) {
      return (
        hass.localize(
          `component.${step.translation_domain || step.translation_domain || configEntry.domain}.config_subentries.${flowType}.error.${error}`,
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
          `component.${configEntry.domain}.config_subentries.${flowType}.step.${step.step_id}.submit`
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
          `component.${configEntry.domain}.config_subentries.${flowType}.step.${step.step_id}.title`
        ) ||
        hass.localize(
          "ui.panel.config.integrations.config_flow.external_step.open_site"
        )
      );
    },

    renderExternalStepDescription(hass, step) {
      const description = hass.localize(
        `component.${step.translation_domain || configEntry.domain}.config_subentries.${flowType}.step.${step.step_id}.description`,
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
        `component.${step.translation_domain || configEntry.domain}.config_subentries.${flowType}.create_entry.${
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
          : nothing}
      `;
    },

    renderShowFormProgressHeader(hass, step) {
      return (
        hass.localize(
          `component.${configEntry.domain}.config_subentries.${flowType}.step.${step.step_id}.title`
        ) || hass.localize(`component.${configEntry.domain}.title`)
      );
    },

    renderShowFormProgressDescription(hass, step) {
      const description = hass.localize(
        `component.${step.translation_domain || configEntry.domain}.config_subentries.${flowType}.progress.${step.progress_action}`,
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
          `component.${configEntry.domain}.config_subentries.${flowType}.step.${step.step_id}.title`,
          step.description_placeholders
        ) || hass.localize(`component.${configEntry.domain}.title`)
      );
    },

    renderMenuDescription(hass, step) {
      const description = hass.localize(
        `component.${step.translation_domain || configEntry.domain}.config_subentries.${flowType}.step.${step.step_id}.description`,
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
        `component.${step.translation_domain || configEntry.domain}.config_subentries.${flowType}.step.${step.step_id}.menu_options.${option}`,
        step.description_placeholders
      );
    },

    renderMenuOptionDescription(hass, step, option) {
      return hass.localize(
        `component.${step.translation_domain || configEntry.domain}.config_subentries.${flowType}.step.${step.step_id}.menu_option_descriptions.${option}`,
        step.description_placeholders
      );
    },

    renderMenuOptionSortValue(hass, step, option) {
      return hass.localize(
        `component.${step.translation_domain || configEntry.domain}.config_subentries.${flowType}.step.${step.step_id}.menu_sort_values.${option}`,
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
