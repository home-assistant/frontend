import { fireEvent } from "../../common/dom/fire_event";

export interface DeviceReplacedDialogParams {
  /** The removed composite device that is being referenced. */
  originalDeviceId: string;
  /** The split devices the reference can be pointed at. */
  candidates: string[];
  /** The split device that took over the composite's primary config entry. */
  primaryId: string | null;
  /** Called with the device the user picked as replacement. */
  onResolved: (deviceId: string) => void;
}

export const showDeviceReplacedDialog = (
  element: HTMLElement,
  params: DeviceReplacedDialogParams
) =>
  fireEvent(element, "show-dialog", {
    dialogTag: "dialog-device-replaced",
    dialogImport: () => import("./dialog-device-replaced"),
    dialogParams: params,
  });
