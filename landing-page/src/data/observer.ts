export async function getObserverLogs() {
  return fetch("/observer/logs");
}

export const downloadUrl = "/observer/logs";
