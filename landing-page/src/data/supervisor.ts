import fetch from "./mockFetch";

export async function getObserverLogsFollow() {
  return fetch("/observer/logs/follow?lines=500");
}

export async function getSupervisorNetworkInfo() {
  return fetch("/supervisor/network/info");
}
