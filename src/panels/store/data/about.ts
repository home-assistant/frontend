import type { HomeAssistant } from "../../../types";
import { documentationUrl } from "../tools/documentation";
import type { StoreData } from "./store";

export const aboutStoreMarkdownContent = (
  hass: HomeAssistant,
  store: StoreData
) => `
**${hass.localize("ui.panel.store.dialog_about.integration_version")}:** | ${store.info.version}
:--|--
**${hass.localize("ui.panel.store.common.repositories")}:** | ${store.repositories.length}
**${hass.localize("ui.panel.store.dialog_about.downloaded_repositories")}:** | ${
  store.repositories.filter((repo) => repo.installed).length
}

**${hass.localize("ui.panel.store.dialog_about.useful_links")}:**

- [General documentation](${documentationUrl({})})
- [Configuration](${documentationUrl({
  path: "/docs/use/configuration/basic",
})})
- [FAQ](${documentationUrl({ path: "/docs/faq" })})
- [GitHub](https://github.com/hacs)
- [Discord](https://discord.gg/apgchf8)
- [Become a GitHub sponsor? ❤️](https://github.com/sponsors/ludeeus)
- [BuyMe~~Coffee~~Beer? 🍺🙈](https://buymeacoffee.com/ludeeus)

***

_Everything you find in the Community store is **not** tested by Home Assistant, that includes the store itself.
The store and Home Assistant teams do not support **anything** you find here._`;
