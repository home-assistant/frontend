import { Lovelace } from "../types";

export async function confDeleteCard(
  lovelace: Lovelace,
  path: [number, number]
): Promise<void> {
  if (!confirm("Are you sure you want to delete this card?")) {
    return;
  }
  try {
    await lovelace.deleteCard(path);
  } catch (err) {
    alert(`Deleting failed: ${err.message}`);
  }
}
