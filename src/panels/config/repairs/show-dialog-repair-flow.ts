import { html } from "lit";
import { DataEntryFlowStep } from "../../../data/data_entry_flow";
import { domainToName } from "../../../data/integration";
import {
  RepairsIssue,
  createRepairsFlow,
  deleteRepairsFlow,
  fetchRepairsFlow,
  handleRepairsFlowStep,
} from "../../../data/repairs";
import {
  loadDataEntryFlowDialog,
  showFlowDialog,
} from "../../../dialogs/config-flow/show-dialog-data-entry-flow";
import { HomeAssistant } from "../../../types";

const mergePlaceholders = (issue: RepairsIssue, step: DataEntryFlowStep) =>
  step.description_placeholders && issue.translation_placeholders
    ? { ...issue.translation_placeholders, ...step.description_placeholders }
    : step.description_placeholders || issue.translation_placeholders;

const renderIssueDescription = (hass: HomeAssistant, issue: RepairsIssue) =>
  issue.breaks_in_ha_version
    ? html`
        <ha-alert alert-type="warning">
          ${hass.localize("ui.panel.config.repairs.dialog.breaks_in_version", {
            version: issue.breaks_in_ha_version,
          })} </ha-alert
        ><br />
      `
    : "";

export const loadRepairFlowDialog = loadDataEntryFlowDialog;

export const showRepairsFlowDialog = (
  element: HTMLElement,
  issue: RepairsIssue,
  dialogClosedCallback?: (params: { flowFinished: boolean }) => void
): void =>
  showFlowDialog(
    element,
    {
      startFlowHandler: issue.domain,
      domain: issue.domain,
      dialogClosedCallback,
    },
    {
      flowType: "repair_flow",
      loadDevicesAndAreas: false,
      createFlow: async (hass, handler) => {
        const [step] = await Promise.all([
          createRepairsFlow(hass, handler, issue.issue_id),
          hass.loadBackendTranslation("issues", issue.domain),
          hass.loadBackendTranslation("selector", issue.domain),
        ]);
        return step;
      },
      fetchFlow: async (hass, flowId) => {
        const [step] = await Promise.all([
          fetchRepairsFlow(hass, flowId),
          hass.loadBackendTranslation("issues", issue.domain),
          hass.loadBackendTranslation("selector", issue.domain),
        ]);
        return step;
      },
      handleFlowStep: handleRepairsFlowStep,
      deleteFlow: deleteRepairsFlow,

      renderAbortDescription(hass, step) {
        const description = hass.localize(
          `component.${issue.domain}.issues.${
            issue.translation_key || issue.issue_id
          }.fix_flow.abort.${step.reason}`,
          mergePlaceholders(issue, step)
        );

        return html`${renderIssueDescription(hass, issue)}
        ${description
          ? html`
              <ha-markdown
                breaks
                allowsvg
                .content=${description}
              ></ha-markdown>
            `
          : step.reason}`;
      },

      renderShowFormStepHeader(hass, step) {
        return (
          hass.localize(
            `component.${issue.domain}.issues.${
              issue.translation_key || issue.issue_id
            }.fix_flow.step.${step.step_id}.title`,
            mergePlaceholders(issue, step)
          ) || hass.localize("ui.dialogs.repair_flow.form.header")
        );
      },

      renderShowFormStepDescription(hass, step) {
        const description = hass.localize(
          `component.${issue.domain}.issues.${
            issue.translation_key || issue.issue_id
          }.fix_flow.step.${step.step_id}.description`,
          mergePlaceholders(issue, step)
        );
        return html`${renderIssueDescription(hass, issue)}
        ${description
          ? html`
              <ha-markdown
                allowsvg
                breaks
                .content=${description}
              ></ha-markdown>
            `
          : ""}`;
      },

      renderShowFormStepFieldLabel(hass, step, field, options) {
        return hass.localize(
          `component.${issue.domain}.issues.${
            issue.translation_key || issue.issue_id
          }.fix_flow.step.${step.step_id}.${options?.prefix ? `section.${options.prefix[0]}.` : ""}data.${field.name}`,
          mergePlaceholders(issue, step)
        );
      },

      renderShowFormStepFieldHelper(hass, step, field, options) {
        const description = hass.localize(
          `component.${issue.domain}.issues.${
            issue.translation_key || issue.issue_id
          }.fix_flow.step.${step.step_id}.${options?.prefix ? `section.${options.prefix[0]}.` : ""}data_description.${field.name}`,
          mergePlaceholders(issue, step)
        );
        return html`${renderIssueDescription(hass, issue)}
        ${description
          ? html`<ha-markdown breaks .content=${description}></ha-markdown>`
          : ""}`;
      },

      renderShowFormStepFieldError(hass, step, error) {
        return hass.localize(
          `component.${issue.domain}.issues.${
            issue.translation_key || issue.issue_id
          }.fix_flow.error.${error}`,
          mergePlaceholders(issue, step)
        );
      },

      renderShowFormStepFieldLocalizeValue(hass, _step, key) {
        return hass.localize(`component.${issue.domain}.selector.${key}`);
      },

      renderShowFormStepSubmitButton(hass, step) {
        return (
          hass.localize(
            `component.${issue.domain}.issues.${
              issue.translation_key || issue.issue_id
            }.fix_flow.step.${step.step_id}.submit`
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
          <p>${hass.localize("ui.dialogs.repair_flow.success.description")}</p>
        `;
      },

      renderShowFormProgressHeader(hass, step) {
        return (
          hass.localize(
            `component.${issue.domain}.issues.step.${
              issue.translation_key || issue.issue_id
            }.fix_flow.${step.step_id}.title`,
            mergePlaceholders(issue, step)
          ) || hass.localize(`component.${issue.domain}.title`)
        );
      },

      renderShowFormProgressDescription(hass, step) {
        const description = hass.localize(
          `component.${issue.domain}.issues.${
            issue.translation_key || issue.issue_id
          }.fix_flow.progress.${step.progress_action}`,
          mergePlaceholders(issue, step)
        );
        return html`${renderIssueDescription(hass, issue)}${description
          ? html`
              <ha-markdown
                allowsvg
                breaks
                .content=${description}
              ></ha-markdown>
            `
          : ""}`;
      },

      renderMenuHeader(hass, step) {
        return (
          hass.localize(
            `component.${issue.domain}.issues.${
              issue.translation_key || issue.issue_id
            }.fix_flow.step.${step.step_id}.title`,
            mergePlaceholders(issue, step)
          ) || hass.localize(`component.${issue.domain}.title`)
        );
      },

      renderMenuDescription(hass, step) {
        const description = hass.localize(
          `component.${issue.domain}.issues.${
            issue.translation_key || issue.issue_id
          }.fix_flow.step.${step.step_id}.description`,
          mergePlaceholders(issue, step)
        );
        return html`${renderIssueDescription(hass, issue)}
        ${description
          ? html`
              <ha-markdown
                allowsvg
                breaks
                .content=${description}
              ></ha-markdown>
            `
          : ""}`;
      },

      renderMenuOption(hass, step, option) {
        return hass.localize(
          `component.${issue.domain}.issues.${
            issue.translation_key || issue.issue_id
          }.fix_flow.step.${step.step_id}.menu_options.${option}`,
          mergePlaceholders(issue, step)
        );
      },

      renderLoadingDescription(hass, reason) {
        return (
          hass.localize(
            `component.${issue.domain}.issues.${
              issue.translation_key || issue.issue_id
            }.fix_flow.loading`
          ) ||
          (reason === "loading_flow" || reason === "loading_step"
            ? hass.localize(`ui.dialogs.repair_flow.loading.${reason}`, {
                integration: domainToName(hass.localize, issue.domain),
              })
            : "")
        );
      },
    }
  );
