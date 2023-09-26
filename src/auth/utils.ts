import { html } from "lit";
import type { DataEntryFlowStep } from "../data/data_entry_flow";
import type { AuthProvider } from "../data/auth";

export const makeIcon = (path: string, clazz: string) =>
  html`<svg
    viewBox="0 0 24 24"
    focusable="false"
    role="img"
    aria-hidden="true"
    class=${clazz}
  >
    <path d=${path} fill="currentColor" />
  </svg>`;

export const loadStep = async (
  step: DataEntryFlowStep | undefined,
  clientId: string,
  authProvider: AuthProvider,
  redirectUri: URL
) => {
  if (step)
    fetch(`/auth/login_flow/${step.flow_id}`, {
      method: "DELETE",
      credentials: "same-origin",
    }).catch((err) => {
      // eslint-disable-next-line no-console
      console.error("Failed to cancel login flow", err);
    });

  const response = await fetch("/auth/login_flow", {
    method: "POST",
    credentials: "same-origin",
    body: JSON.stringify({
      client_id: clientId,
      handler: [authProvider.type, authProvider.id],
      redirect_uri: redirectUri,
    }),
  });

  if (!response.ok) {
    return { success: false, message: response.json().then((d) => d.message) };
  }

  return { success: true, data: await response.json() };
};

export const finish = (
  redirectUri: URL,
  params: Record<string, string | undefined>
) => {
  const url = new URL(redirectUri);
  for (const [name, value] of Object.entries(params)) {
    if (value === undefined) continue;
    url.searchParams.set(name, value);
  }
  document.location.assign(url);
};
