import { mdiAlertCircle, mdiLock, mdiCheck, mdiEye, mdiEyeOff } from "@mdi/js";
import { toASCII } from "punycode";
import { LocalizeFunc, computeLocalize } from "../common/translations/localize";
import { extractSearchParamsObject } from "../common/url/search-params";
import type { AuthProvider } from "../data/auth";
import type { DataEntryFlowStep } from "../data/data_entry_flow";
import "../resources/roboto";
import { getLocalLanguage, getTranslation } from "../util/common-translation";
import type { HaFormSchema } from "../components/ha-form/types";

let localize: LocalizeFunc = () => "";
let localizeLoaded = false;
let onLocalizeLoad: () => void | undefined;
const loadLocalize = async () => {
  const language = getLocalLanguage();
  const { data: translations } = await getTranslation(
    "page-authorize",
    language
  );

  const _cache = {};
  const _resources = { [language]: translations };
  localize = await computeLocalize(_cache, language, _resources);
  localizeLoaded = true;
  if (onLocalizeLoad) onLocalizeLoad();
};
loadLocalize();

const content = document.getElementById("content")!;

const escape = (text: string) =>
  text.replace(/</g, "&lt;").replace(/>/g, "&gt;");
const icon = (path: string, clazz: string) =>
  `<svg viewBox="0 0 24 24" focusable="false" role="img" aria-hidden="true" class="${clazz}"><path d="${path}" fill="currentColor"/></svg>`;
const errorRow = (message: string) => `<div class="error">
  ${icon(mdiAlertCircle, "error")} ${message}
</div>`;
const makeInput = (
  item: HaFormSchema,
  name: string,
  currentFormData: FormData | null
) => {
  if (item.type === "string") {
    const attributes: Record<string, any> = {
      placeholder: name,
      name: item.name,
      type:
        item.name === "password"
          ? "password"
          : item.name === "code"
          ? "number"
          : "text",
      autocomplete:
        item.name === "username"
          ? "username"
          : item.name === "password"
          ? "current-password"
          : item.name === "code"
          ? "one-time-code"
          : undefined,
      required: item.required,
    };
    if (item.name === "username" && currentFormData) {
      attributes.value = currentFormData.get("username") || undefined;
    }
    if (item.name === "username" || item.name === "password") {
      attributes.autocapitalize = "off";
      attributes.autocorrect = "off";
    }
    const attributesStr = Object.entries(attributes)
      .filter(([_key, value]) => value)
      .map(([key, value]) => `${key}="${value}"`)
      .join(" ");

    let output = `<input ${attributesStr} /><div class="bar"></div>`;
    if (item.name === "password") {
      output += `<button type="button" onclick="togglePassword(event)">${icon(
        mdiEye,
        ""
      )}</button>`;
    }
    return `<div class="input-wrapper">${output}</div>`;
  }
  if (item.type === "select") {
    const options = item.options.map(
      (o) => `<option value="${o[0]}">${o[1]}</option>`
    );
    return `<div class="input-wrapper">
      <select name="${item.name}"${
        item.required ? " required" : ""
      }>${options.join("")}</select>
      <div class="bar"></div>
      <span class="name">${name}</span>
    </div>`;
  }
  return undefined;
};

// eslint-disable-next-line @typescript-eslint/dot-notation
window["togglePassword"] = (
  e: MouseEvent & { currentTarget: HTMLButtonElement }
) => {
  const input = e.currentTarget.parentElement!.firstChild as HTMLInputElement;
  if (input.type === "password") {
    input.type = "text";
    e.currentTarget.innerHTML = icon(mdiEyeOff, "");
  } else {
    input.type = "password";
    e.currentTarget.innerHTML = icon(mdiEye, "");
  }
};
const showError = (error: string) => {
  content.innerHTML = `
    ${icon(mdiAlertCircle, "error")}
    <p>${error}</p>
  `;
};
const showSuccess = (message: string) => {
  content.innerHTML = `
    ${icon(mdiCheck, "info")}
    <p>${message}</p>
  `;
};
const showContainer = (heading: string, contents: string) => {
  content.innerHTML = `
    ${icon(mdiLock, "info")}
    <h1>${heading}</h1>
    ${contents}
  `;
};

const query = extractSearchParamsObject();
const appNames: Record<string, string> = {
  "https://home-assistant.io/iOS": "iOS",
  "https://home-assistant.io/android": "Android",
};
const start = async (
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
    showError("Error while loading next step");
    const data = await response.json();
    showError(`${data.message} while loading next step`);
    return { success: false, data: undefined };
  }

  return { success: true, data: await response.json() };
};
const finish = (
  redirectUri: URL,
  params: Record<string, string | undefined>
) => {
  showSuccess(localize("ui.panel.page-authorize.logging_in"));

  const url = new URL(redirectUri);
  for (const [name, value] of Object.entries(params)) {
    if (value === undefined) continue;
    url.searchParams.set(name, value);
  }
  document.location.assign(url);
};

const intro = async () => {
  let redirectUri: URL;
  try {
    const _redirectUri = new URL(query.redirect_uri);
    if (
      // eslint-disable-next-line no-script-url
      ["javascript:", "data:", "vbscript:", "file:", "about:"].includes(
        _redirectUri.protocol
      )
    ) {
      showError("Invalid redirect URI");
      return;
    }
    redirectUri = _redirectUri;
  } catch (e) {
    showError("Invalid redirect URI");
    return;
  }
  const clientId = query.client_id;
  const mode =
    redirectUri.host === location.host
      ? ({ name: "login" } as const)
      : clientId && clientId in appNames
      ? ({ name: "app", data: appNames[clientId] } as const)
      : ({ name: "client", data: clientId && toASCII(clientId) } as const);

  const authProvidersResp = await ((window as any).providersPromise ||
    fetch("/auth/providers", {
      credentials: "same-origin",
    }));
  const authProviders = await authProvidersResp.json();

  if (
    authProvidersResp.status === 400 &&
    authProviders.code === "onboarding_required"
  ) {
    location.href = `/onboarding.html${location.search}`;
    return;
  }

  if (authProviders.length === 0) {
    showError("No auth providers");
    return;
  }
  let authProvider: AuthProvider = authProviders[0];
  let step: DataEntryFlowStep;
  let storeToken = true;

  const updateContainer = () => {
    let contents = "";

    if (mode.name === "app")
      contents += `<p>${localize("ui.panel.page-authorize.text_app", {
        platform: escape(mode.data),
      })}</p>`;
    if (mode.name === "client")
      contents += `<p>${localize("ui.panel.page-authorize.text_client", {
        clientId: escape(mode.data),
      })}</p>`;

    if (step?.type === "form") {
      const currentForm = document.querySelector("form");
      const currentFormData = currentForm && new FormData(currentForm);
      if (step.errors?.base) {
        const error = localize(
          `ui.panel.page-authorize.form.providers.${authProvider.type}.error.${step.errors.base}`
        );
        contents += errorRow(error);
      }
      for (const item of step.data_schema) {
        const name = localize(
          `ui.panel.page-authorize.form.providers.${authProvider.type}.step.${step.step_id}.data.${item.name}`
        );
        const result = makeInput(item, name, currentFormData);
        if (result) contents += result;
      }
      if (
        step.step_id !== "select_mfa_module" &&
        step.step_id !== "mfa" &&
        mode.name === "login"
      ) {
        const hash = Math.random().toString().substring(2);
        window["function" + hash] = async (
          event: InputEvent & { currentTarget: HTMLInputElement }
        ) => {
          storeToken = event.currentTarget.checked;
        };
        contents += `<label>
          <input type="checkbox" oninput="function${hash}(event)"${
            storeToken ? " checked" : ""
          } />
          ${localize("ui.panel.page-authorize.store_token")}
        </label>`;
      }
    } else if (step?.type === "abort") {
      contents += errorRow(
        localize("ui.panel.page-authorize.abort_intro") +
          "<br>" +
          localize(
            `ui.panel.page-authorize.form.providers.${authProvider.type}.abort.${step.reason}`
          )
      );
    }

    const buttons: string[] = [];
    for (const provider of authProviders as AuthProvider[]) {
      if (provider === authProvider) continue;
      const hash = Math.random().toString().substring(2);
      // eslint-disable-next-line @typescript-eslint/no-loop-func
      window["function" + hash] = async () => {
        const result = await start(step, clientId, provider, redirectUri);
        if (!result.success) return;
        authProvider = provider;
        step = result.data;
        updateContainer();
      };
      buttons.push(
        `<button class="tonal" type="button" onclick="function${hash}()">${localize(
          "ui.panel.page-authorize.button_use_other_method",
          { method: provider.name }
        )}</button>`
      );
    }
    if (step?.type === "abort") {
      const provider = authProvider;
      const hash = Math.random().toString().substring(2);
      // eslint-disable-next-line @typescript-eslint/no-loop-func
      window["function" + hash] = async () => {
        const result = await start(step, clientId, provider, redirectUri);
        if (!result.success) return;
        authProvider = provider;
        step = result.data;
        updateContainer();
      };
      buttons.push(
        `<button class="main" type="button" onclick="function${hash}()">${localize(
          "ui.panel.page-authorize.button_start_over",
          { method: provider.name }
        )}</button>`
      );
    }
    if (step?.type === "form") {
      buttons.push(
        `<button class="main">${localize(
          "ui.panel.page-authorize.form.next"
        )}</button>`
      );
    }
    if (buttons.length > 0)
      contents += `<div class="buttons">${buttons.join("")}</div>`;

    const submitHash = Math.random().toString().substring(2);
    window["function" + submitHash] = async (
      event: SubmitEvent & { currentTarget: HTMLFormElement }
    ) => {
      event.preventDefault();
      const formdata = new FormData(event.currentTarget);
      const data = {
        ...Object.fromEntries(formdata),
        client_id: clientId,
      };

      const response = await fetch(`/auth/login_flow/${step.flow_id}`, {
        method: "POST",
        credentials: "same-origin",
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        showError("Error while loading next step");
        const result = await response.json();
        showError(`${result.message} while loading next step`);
        return;
      }
      step = await response.json();
      if (step.type === "create_entry") {
        finish(redirectUri, {
          code: step.result as unknown as string,
          state: query.state,
          storeToken: storeToken ? "true" : undefined,
        });
        return;
      }
      updateContainer();
    };
    showContainer(
      localize(`ui.panel.page-authorize.heading_${mode.name}`),
      `<form onsubmit="function${submitHash}(event)">${contents}</form>`
    );

    const firstInput = document.querySelector("input");
    if (firstInput) firstInput.focus();
  };

  let _stepResult: any;
  const stepPromise = start(
    undefined,
    clientId,
    authProvider,
    redirectUri
  ).then((result) => {
    _stepResult = result;
  });

  if (!localizeLoaded) {
    await new Promise((resolve) => {
      onLocalizeLoad = () => resolve(undefined);
    });
  }

  if (_stepResult?.success === false) return;
  updateContainer();

  await stepPromise;

  const { success, data } = _stepResult as { success: boolean; data: any };
  if (!success) return;
  step = data;
  updateContainer();
};
intro();
