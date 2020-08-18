import { fireEvent } from "../../common/dom/fire_event";

export interface HaImageCropperDialogParams {
  file: File;
  croppedCallback: (file: File) => void;
}

const loadImageCropperDialog = () =>
  import(
    /* webpackChunkName: "image-cropper-dialog" */ "./image-cropper-dialog"
  );

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
