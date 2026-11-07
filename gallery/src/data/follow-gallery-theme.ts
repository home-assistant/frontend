import type { ReactiveElement } from "lit";
import { ContextSubscriptionController } from "../../../src/common/decorators/consume";
import { uiContext } from "../../../src/data/context";
import type { MockHomeAssistant } from "../../../src/fake_data/provide_hass";

// A demo that provides its own hass hides the gallery theme from its children,
// so pass the gallery light or dark mode on to it.
export const followGalleryTheme = (
  host: ReactiveElement,
  hass: MockHomeAssistant
) =>
  new ContextSubscriptionController(host, uiContext, (ui) => {
    if (ui) {
      hass.updateHass({
        themes: ui.themes,
        selectedTheme: ui.selectedTheme,
      });
    }
  });
