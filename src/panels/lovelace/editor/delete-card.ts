import { deleteCard } from "../../../data/lovelace";
import { HomeAssistant } from "../../../types";

export async function confDeleteCard(
  hass: HomeAssistant,
  cardId: string,
  reloadLovelace: () => void
): Promise<void> {
  if (!confirm("Are you sure you want to delete this card?")) {
    return;
  }
  try {
    await deleteCard(hass, cardId);
    reloadLovelace();
  } catch (err) {
    alert(`Deleting failed: ${err.message}`);
  }
}
