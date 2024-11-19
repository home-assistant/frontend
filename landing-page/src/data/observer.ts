export async function getObserverLogs() {
  return fetch("/observer/logs");
}
