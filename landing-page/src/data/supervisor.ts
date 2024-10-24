export async function getSupervisorLogsFollow() {
  return fetch("/supervisor/logs/follow?lines=500");
}

export async function getObserverLogs() {
  return fetch("/observer/logs");
}

export async function getSupervisorNetworkInfo() {
  return fetch("/supervisor/network/info");
}
