import { TemplateResult } from "lit-html";
import { fireEvent } from "../../common/dom/fire_event";
import { HomeAssistant } from "../../types";
import {
  DataEntryFlowStepCreateEntry,
  DataEntryFlowStepExternal,
  DataEntryFlowStepForm,
  DataEntryFlowStep,
  DataEntryFlowStepAbort,
  FieldSchema,
} from "../../data/data_entry_flow";

export interface FlowConfig {
  loadDevicesAndAreas: boolean;

  getFlowHandlers?: (hass: HomeAssistant) => Promise<string[]>;

  createFlow(hass: HomeAssistant, handler: string): Promise<DataEntryFlowStep>;

  fetchFlow(hass: HomeAssistant, flowId: string): Promise<DataEntryFlowStep>;

  handleFlowStep(
    hass: HomeAssistant,
    flowId: string,
    data: { [key: string]: any }
  ): Promise<DataEntryFlowStep>;

  deleteFlow(hass: HomeAssistant, flowId: string): Promise<unknown>;

  renderAbortDescription(
    hass: HomeAssistant,
    step: DataEntryFlowStepAbort
  ): TemplateResult | "";

  renderShowFormStepHeader(
    hass: HomeAssistant,
    step: DataEntryFlowStepForm
  ): string;

  renderShowFormStepDescription(
    hass: HomeAssistant,
    step: DataEntryFlowStepForm
  ): TemplateResult | "";

  renderShowFormStepFieldLabel(
    hass: HomeAssistant,
    step: DataEntryFlowStepForm,
    field: FieldSchema
  ): string;

  renderShowFormStepFieldError(
    hass: HomeAssistant,
    step: DataEntryFlowStepForm,
    error: string
  ): string;

  renderExternalStepHeader(
    hass: HomeAssistant,
    step: DataEntryFlowStepExternal
  ): string;

  renderExternalStepDescription(
    hass: HomeAssistant,
    step: DataEntryFlowStepExternal
  ): TemplateResult | "";

  renderCreateEntryDescription(
    hass: HomeAssistant,
    step: DataEntryFlowStepCreateEntry
  ): TemplateResult | "";
}

export interface DataEntryFlowDialogParams {
  startFlowHandler?: string;
  continueFlowId?: string;
  dialogClosedCallback?: (params: { flowFinished: boolean }) => void;
  flowConfig: FlowConfig;
  showAdvanced?: boolean;
}

export const loadDataEntryFlowDialog = () =>
  import(
    /* webpackChunkName: "dialog-config-flow" */ "./dialog-data-entry-flow"
  );

export const showFlowDialog = (
  element: HTMLElement,
  dialogParams: Omit<DataEntryFlowDialogParams, "flowConfig">,
  flowConfig: FlowConfig
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "dialog-data-entry-flow",
    dialogImport: loadDataEntryFlowDialog,
    dialogParams: {
      ...dialogParams,
      flowConfig,
    },
  });
};
