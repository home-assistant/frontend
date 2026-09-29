import type { LocalizeFunc } from "../../../common/translations/localize";
import type { RepositoryBase } from "../../../data/marketplace/repository";

// The backend only refuses a download when Home Assistant is older than the
// repository asks for.
export const downloadBlockedReason = (
  localize: LocalizeFunc,
  repository: RepositoryBase
): string =>
  repository.homeassistant
    ? localize("ui.panel.marketplace.repository.requires_homeassistant", {
        version: repository.homeassistant,
      })
    : localize("ui.panel.marketplace.repository.requires_newer_homeassistant");
