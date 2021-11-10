import { fireEvent } from "../../common/dom/fire_event";

export interface CropOptions {
  round: boolean;
  type?: "image/jpeg" | "image/png";
  quality?: number;
  aspectRatio?: number;
}

export interface HaImageCropperDialogParams {
  file: File;
  options: CropOptions;
  croppedCallback: (file: File) => void;
}

const loadImageCropperDialog = () => import("./image-cropper-dialog");

export const showImageCropperDialog = (
  element: HTMLElement,
  dialogParams: HaImageCropperDialogParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "image-cropper-dialog",
    dialogImport: loadImageCropperDialog,
    dialogParams,
  });
};
