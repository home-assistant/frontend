import { fireEvent } from "../../common/dom/fire_event";
import type { CameraStreamStatus, StreamType } from "../../data/camera-streams";

export interface CameraStreamInfoDialogParams {
  status: CameraStreamStatus;
  /** The stream types the camera supports, undefined while unknown */
  supportedTypes?: StreamType[];
}

export const showCameraStreamInfoDialog = (
  element: HTMLElement,
  params: CameraStreamInfoDialogParams
) =>
  fireEvent(element, "show-dialog", {
    dialogTag: "dialog-camera-stream-info",
    dialogImport: () => import("./dialog-camera-stream-info"),
    dialogParams: params,
  });
