import { TemplateResult } from "lit";
import { fireEvent } from "../../common/dom/fire_event";
import type { HaFormSchema } from "../../components/ha-form/types";
import {
  DataEntryFlowStep,
  DataEntryFlowStepAbort,
  DataEntryFlowStepCreateEntry,
  DataEntryFlowStepExternal,
  DataEntryFlowStepForm,
  DataEntryFlowStepMenu,
  DataEntryFlowStepProgress,
  FlowType,
} from "../../data/data_entry_flow";
import type { IntegrationManifest } from "../../data/integration";
import type { HomeAssistant } from "../../types";

export interface FlowConfig {
  flowType: FlowType;

  loadDevicesAndAreas: boolean;

  createFlow(hass: HomeAssistant, handler: string): Promise<DataEntryFlowStep>;

  fetchFlow(hass: HomeAssistant, flowId: string): Promise<DataEntryFlowStep>;

  handleFlowStep(
    hass: HomeAssistant,
    flowId: string,
    data: Record<string, any>
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
    field: HaFormSchema
  ): string;

  renderShowFormStepFieldHelper(
    hass: HomeAssistant,
    step: DataEntryFlowStepForm,
    field: HaFormSchema
  ): TemplateResult | string;

  renderShowFormStepFieldError(
    hass: HomeAssistant,
    step: DataEntryFlowStepForm,
    error: string
  ): string;

  renderShowFormStepFieldLocalizeValue(
    hass: HomeAssistant,
    step: DataEntryFlowStepForm,
    key: string
  ): string;

  renderShowFormStepSubmitButton(
    hass: HomeAssistant,
    step: DataEntryFlowStepForm
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

  renderShowFormProgressHeader(
    hass: HomeAssistant,
    step: DataEntryFlowStepProgress
  ): string;

  renderShowFormProgressDescription(
    hass: HomeAssistant,
    step: DataEntryFlowStepProgress
  ): TemplateResult | "";

  renderMenuHeader(hass: HomeAssistant, step: DataEntryFlowStepMenu): string;

  renderMenuDescription(
    hass: HomeAssistant,
    step: DataEntryFlowStepMenu
  ): TemplateResult | "";

  renderMenuOption(
    hass: HomeAssistant,
    step: DataEntryFlowStepMenu,
    option: string
  ): string;

  renderLoadingDescription(
    hass: HomeAssistant,
    loadingReason: LoadingReason,
    handler?: string,
    step?: DataEntryFlowStep | null
  ): string;
}

export type LoadingReason =
  | "loading_handlers"
  | "loading_flow"
  | "loading_step"
  | "loading_devices_areas";

export interface DataEntryFlowDialogParams {
  startFlowHandler?: string;
  searchQuery?: string;
  continueFlowId?: string;
  manifest?: IntegrationManifest | null;
  domain?: string;
  dialogClosedCallback?: (params: {
    flowFinished: boolean;
    entryId?: string;
  }) => void;
  flowConfig: FlowConfig;
  showAdvanced?: boolean;
  dialogParentElement?: HTMLElement;
}

export const loadDataEntryFlowDialog = () => import("./dialog-data-entry-flow");

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
      dialogParentElement: element,
    },
  });
};
