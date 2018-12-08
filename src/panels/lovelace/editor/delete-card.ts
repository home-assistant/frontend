import { deleteCard, LovelaceCardConfig } from "../../../data/lovelace";
import { HomeAssistant } from "../../../types";

export async function confDeleteCard(
  hass: HomeAssistant,
  cardConfig: LovelaceCardConfig,
  reloadLovelace: () => void
): Promise<void> {
  if (!confirm("Are you sure you want to delete this card?")) {
    return;
  }
  try {
    await deleteCard(hass, cardConfig.view_index!, cardConfig.index!);
    reloadLovelace();
  } catch (err) {
    alert(`Deleting failed: ${err.message}`);
  }
}
