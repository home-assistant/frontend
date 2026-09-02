import type { HomeAssistant } from "../../../types";
import { documentationUrl } from "../tools/documentation";
import type { Hacs } from "./hacs";

export const aboutHacsmarkdownContent = (hass: HomeAssistant, hacs: Hacs) => `
**${hass.localize("ui.panel.store.dialog_about.integration_version")}:** | ${hacs.info.version}
:--|--
**${hass.localize("ui.panel.store.common.repositories")}:** | ${hacs.repositories.length}
**${hass.localize("ui.panel.store.dialog_about.downloaded_repositories")}:** | ${
  hacs.repositories.filter((repo) => repo.installed).length
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

_Everything you find in HACS is **not** tested by Home Assistant, that includes HACS itself.
The HACS and Home Assistant teams do not support **anything** you find here._`;
