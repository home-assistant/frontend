import { deleteCard } from "../common/data";
import { HomeAssistant } from "../../../types";
import { LovelaceCardConfig } from "../types";

export async function confDeleteCard(
  hass: HomeAssistant,
  cardConfig: LovelaceCardConfig,
  reloadLovelace: () => void,
  noIdCallback: () => void
): Promise<void> {
  if (!cardConfig) {
    return;
  }
  if (!cardConfig.id) {
    noIdCallback();
    return;
  }
  if (!confirm("Are you sure you want to delete this card?")) {
    return;
  }

  try {
    await deleteCard(hass, cardConfig.id);
    reloadLovelace();
  } catch (err) {
    alert(`Deleting failed: ${err.message}`);
  }
}
