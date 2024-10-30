export async function getSupervisorLogsFollow() {
  return fetch("/supervisor/supervisor/logs/follow?lines=500", {
    headers: {
      Accept: "text/plain",
    },
  });
}

export async function getObserverLogs() {
  return fetch("/observer/logs");
}

export async function getSupervisorNetworkInfo() {
  return fetch("/supervisor/network/info");
}
