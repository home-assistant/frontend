import { fireEvent } from "../../../../common/dom/fire_event";
import { Webhook } from "../../../../data/webhook";
import { CloudWebhook } from "../../../../data/cloud";

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
    dialogTag: "dialog-manage-cloudhook",
    dialogImport: () =>
      import(
        /* webpackChunkName: "cloud-webhook-manage-dialog" */ "./dialog-manage-cloudhook"
      ),
    dialogParams: webhookDialogParams,
  });
};
