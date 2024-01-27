import { html } from "lit";
import { domainToName } from "../../../data/integration";
import {
  createRepairsFlow,
  deleteRepairsFlow,
  fetchRepairsFlow,
  handleRepairsFlowStep,
  RepairsIssue,
} from "../../../data/repairs";
import {
  loadDataEntryFlowDialog,
  showFlowDialog,
} from "../../../dialogs/config-flow/show-dialog-data-entry-flow";

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
            `component.${issue.domain}.issues.${
              issue.translation_key || issue.issue_id
            }.fix_flow.step.${step.step_id}.title`,
            step.description_placeholders
          ) || hass.localize("ui.dialogs.repair_flow.form.header")
        );
      },

      renderShowFormStepDescription(hass, step) {
        const description = hass.localize(
          `component.${issue.domain}.issues.${
            issue.translation_key || issue.issue_id
          }.fix_flow.step.${step.step_id}.description`,
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
          `component.${issue.domain}.issues.${
            issue.translation_key || issue.issue_id
          }.fix_flow.step.${step.step_id}.data.${field.name}`
        );
      },

      renderShowFormStepFieldHelper(hass, step, field) {
        const description = hass.localize(
          `component.${issue.domain}.issues.${
            issue.translation_key || issue.issue_id
          }.fix_flow.step.${step.step_id}.data_description.${field.name}`,
          step.description_placeholders
        );
        return description
          ? html`<ha-markdown breaks .content=${description}></ha-markdown>`
          : "";
      },

      renderShowFormStepFieldError(hass, step, error) {
        return hass.localize(
          `component.${issue.domain}.issues.${
            issue.translation_key || issue.issue_id
          }.fix_flow.error.${error}`,
          step.description_placeholders
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
            }.fix_flow.${step.step_id}.title`
          ) || hass.localize(`component.${issue.domain}.title`)
        );
      },

      renderShowFormProgressDescription(hass, step) {
        const description = hass.localize(
          `component.${issue.domain}.issues.${
            issue.translation_key || issue.issue_id
          }.fix_flow.progress.${step.progress_action}`,
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

      renderMenuHeader(hass, step) {
        return (
          hass.localize(
            `component.${issue.domain}.issues.${
              issue.translation_key || issue.issue_id
            }.fix_flow.step.${step.step_id}.title`
          ) || hass.localize(`component.${issue.domain}.title`)
        );
      },

      renderMenuDescription(hass, step) {
        const description = hass.localize(
          `component.${issue.domain}.issues.${
            issue.translation_key || issue.issue_id
          }.fix_flow.step.${step.step_id}.description`,
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

      renderMenuOption(hass, step, option) {
        return hass.localize(
          `component.${issue.domain}.issues.${
            issue.translation_key || issue.issue_id
          }.fix_flow.step.${step.step_id}.menu_options.${option}`,
          step.description_placeholders
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
