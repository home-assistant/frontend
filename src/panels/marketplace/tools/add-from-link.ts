import type { LocalizeFunc } from "../../../common/translations/localize";
import type { MarketplaceData } from "../../../data/marketplace/marketplace";
import { showAlertDialog } from "../../../dialogs/generic/show-dialog-box";
import { showMarketplaceCustomRepositoriesDialog } from "../dialogs/show-dialog-marketplace-custom-repositories";

// The backend reports why the Marketplace is disabled, mapped so it can be shown
// as a translated sentence.
const DISABLED_REASONS = ["invalid_token", "rate_limit", "removed"] as const;

type DisabledReason = (typeof DISABLED_REASONS)[number];

const isKnownDisabledReason = (reason: string): reason is DisabledReason =>
  DISABLED_REASONS.some((known) => known === reason);

// Opens the dialog to add a repository from a link, or says why it cannot
export const showMarketplaceAddFromLink = (
  element: HTMLElement,
  localize: LocalizeFunc,
  marketplace: MarketplaceData
) => {
  const disabledReason = marketplace.info.disabled_reason;

  if (disabledReason) {
    showAlertDialog(element, {
      title: localize("ui.panel.marketplace.dialog.disabled.title"),
      text: isKnownDisabledReason(disabledReason)
        ? localize(
            `ui.panel.marketplace.dialog.disabled.reason.${disabledReason}`
          )
        : localize("ui.panel.marketplace.dialog.disabled.reason.unknown"),
    });

    return;
  }

  showMarketplaceCustomRepositoriesDialog(element, { marketplace });
};
