import type { LoRaWANConnection } from "../../../../../data/lorawan";

export const connectionLabels = (connections: LoRaWANConnection[]) => {
  const connectionsByTitle = new Map<string, LoRaWANConnection[]>();
  for (const connection of connections) {
    const matching = connectionsByTitle.get(connection.title);
    if (matching) {
      matching.push(connection);
    } else {
      connectionsByTitle.set(connection.title, [connection]);
    }
  }
  const usedLabels = new Set(connectionsByTitle.keys());
  const labels = new Map<string, string>();
  for (const [title, matching] of connectionsByTitle) {
    if (matching.length === 1) {
      labels.set(matching[0].entry_id, title);
      continue;
    }
    let index = 1;
    for (const connection of matching.sort((a, b) =>
      a.entry_id.localeCompare(b.entry_id)
    )) {
      let label: string;
      do {
        label = `${title} (${index++})`;
      } while (usedLabels.has(label));
      usedLabels.add(label);
      labels.set(connection.entry_id, label);
    }
  }
  return labels;
};
