import { fireEvent } from "../../../common/dom/fire_event";
import { Webhook } from "../../../data/webhook";
import { CloudWebhook } from "../../../data/cloud";

export interface WebhookDialogParams {
  webhook: Webhook;
  cloudhook: CloudWebhook;
  disableHook: () => void;
}

export const showManageCloudhookDialog = (
  element: HTMLElement,
  webhookDialogParams: WebhookDialogParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "cloud-webhook-manage-dialog",
    dialogImport: () =>
      import(/* webpackChunkName: "cloud-webhook-manage-dialog" */ "./cloud-webhook-manage-dialog"),
    dialogParams: webhookDialogParams,
  });
};
