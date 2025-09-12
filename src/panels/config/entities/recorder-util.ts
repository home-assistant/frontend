import type { HaSwitch } from "../../../components/ha-switch";
import { setEntityRecordingOptions } from "../../../data/recorder";
import { showAlertDialog } from "../../../dialogs/generic/show-dialog-box";
import type { HomeAssistant } from "../../../types";

export interface RecordingChangeParams {
  hass: HomeAssistant;
  entityId: string;
  checkbox: HaSwitch;
  onSuccess?: (recordingDisabled: boolean) => void;
  onError?: () => void;
}

export const handleRecordingChange = async (params: RecordingChangeParams) => {
  const { hass, entityId, checkbox, onSuccess, onError } = params;
  const newRecordingDisabled = !checkbox.checked;

  try {
    await setEntityRecordingOptions(
      hass,
      [entityId],
      newRecordingDisabled ? "user" : null
    );

    if (onSuccess) {
      onSuccess(newRecordingDisabled);
    }
  } catch (err: any) {
    showAlertDialog(checkbox, {
      text: err.message,
    });
    checkbox.checked = !checkbox.checked;

    if (onError) {
      onError();
    }
  }
};
