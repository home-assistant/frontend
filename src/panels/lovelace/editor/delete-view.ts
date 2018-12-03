import { deleteView } from "../../../data/lovelace";
import { HomeAssistant } from "../../../types";

export async function confDeleteView(
  hass: HomeAssistant,
  viewId: string,
  reloadLovelace: () => void
): Promise<void> {
  if (!confirm("Are you sure you want to delete this view?")) {
    return;
  }
  try {
    await deleteView(hass, viewId);
    reloadLovelace();
  } catch (err) {
    alert(`Deleting failed: ${err.message}`);
  }
}
