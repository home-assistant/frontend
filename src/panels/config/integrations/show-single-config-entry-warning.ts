import { html } from "lit";
import type { LocalizeFunc } from "../../../common/translations/localize";
import { domainToName } from "../../../data/integration";
import { showAlertDialog } from "../../../dialogs/generic/show-dialog-box";
import type { HomeAssistant } from "../../../types";

export async function showSingleConfigEntryWarning(
  element: HTMLElement,
  localize: LocalizeFunc,
  domain: string,
  loadBackendTranslation: HomeAssistant["loadBackendTranslation"]
) {
  const backendLocalize = await loadBackendTranslation("title", domain);
  showAlertDialog(element, {
    title: localize(
      "ui.panel.config.integrations.config_flow.single_config_entry_title"
    ),
    text: localize(
      "ui.panel.config.integrations.config_flow.single_config_entry",
      {
        integration_name: html`<a
          href=${`/config/integrations/integration/${domain}`}
          >${domainToName(backendLocalize, domain)}</a
        >`,
      }
    ),
  });
}
