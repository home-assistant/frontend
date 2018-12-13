import { Lovelace } from "../types";
import { deleteCard } from "./config-util";

export async function confDeleteCard(
  lovelace: Lovelace,
  path: [number, number]
): Promise<void> {
  if (!confirm("Are you sure you want to delete this card?")) {
    return;
  }
  try {
    await lovelace.saveConfig(deleteCard(lovelace.config, path));
  } catch (err) {
    alert(`Deleting failed: ${err.message}`);
  }
}
