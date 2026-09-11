import {
  mdiCast,
  mdiClockOutline,
  mdiCloud,
  mdiPuzzle,
  mdiRobot,
  mdiScriptText,
  mdiStateMachine,
} from "@mdi/js";
import { html } from "lit";
import { isComponentLoaded } from "../../common/config/is_component_loaded";
import { computeRTL } from "../../common/util/compute_rtl";
import "../../components/entity/state-badge";
import "../../components/ha-domain-icon";
import "../../components/ha-state-icon";
import "../../components/ha-svg-icon";
import "../../components/user/ha-user-badge";
import { mdiHomeAssistant } from "../../resources/home-assistant-logo-svg";
import type { LogbookEntry } from "../../data/logbook";
import type { User } from "../../data/user";
import type { HomeAssistant } from "../../types";
import { brandsUrl } from "../../util/brands-url";
import type { LogbookCause, LogbookGlyph } from "./logbook-entry-model";

// Names are the fixed system user names set by core (cloud/cast integrations).
const SYSTEM_USER_ICONS: Record<string, string> = {
  "Home Assistant Cloud": mdiCloud,
  "Home Assistant Cast": mdiCast,
};

export const renderLogbookCauseIcon = (cause: LogbookCause) => {
  if (cause.type === "user") {
    const systemIcon = cause.systemUser
      ? SYSTEM_USER_ICONS[cause.name]
      : undefined;
    if (systemIcon) {
      return html`<ha-svg-icon
        class="cause-icon"
        .path=${systemIcon}
      ></ha-svg-icon>`;
    }
    return html`<ha-user-badge
      class="cause-icon cause-avatar"
      .user=${{ id: cause.userId!, name: cause.name } as User}
    ></ha-user-badge>`;
  }
  if (cause.type === "automation") {
    return html`<ha-svg-icon
      class="cause-icon"
      .path=${mdiRobot}
    ></ha-svg-icon>`;
  }
  if (cause.type === "script") {
    return html`<ha-svg-icon
      class="cause-icon"
      .path=${mdiScriptText}
    ></ha-svg-icon>`;
  }
  if (cause.type === "state") {
    return html`<ha-svg-icon
      class="cause-icon"
      .path=${mdiStateMachine}
    ></ha-svg-icon>`;
  }
  if (cause.type === "scheduled") {
    return html`<ha-svg-icon
      class="cause-icon"
      .path=${mdiClockOutline}
    ></ha-svg-icon>`;
  }
  if (cause.type === "homeassistant") {
    return html`<ha-svg-icon
      class="cause-icon"
      .path=${mdiHomeAssistant}
    ></ha-svg-icon>`;
  }
  if (cause.brandDomain) {
    return html`<ha-domain-icon
      class="cause-icon"
      .domain=${cause.brandDomain}
      brand-fallback
    ></ha-domain-icon>`;
  }
  return html`<ha-svg-icon
    class="cause-icon"
    .path=${mdiPuzzle}
  ></ha-svg-icon>`;
};

const brandImage = (
  hass: HomeAssistant,
  entry: LogbookEntry,
  domain?: string
): string | undefined => {
  if (
    !domain ||
    entry.icon ||
    entry.state ||
    !isComponentLoaded(hass.config, domain)
  ) {
    return undefined;
  }
  return brandsUrl(
    {
      domain,
      type: "icon",
      darkOptimized: hass.themes?.darkMode,
    },
    hass.auth.data.hassUrl
  );
};

export const transitionArrow = (hass: HomeAssistant) =>
  computeRTL(hass.language, hass.translationMetadata.translations) ? "←" : "→";

export const renderLogbookGlyph = (
  hass: HomeAssistant,
  entry: LogbookEntry,
  glyph: LogbookGlyph
) => {
  if (glyph.type === "automation") {
    return html`<ha-svg-icon
      .path=${glyph.script ? mdiScriptText : mdiRobot}
    ></ha-svg-icon>`;
  }
  if (glyph.type === "state") {
    return html`<ha-state-icon
      .stateObj=${glyph.stateObj}
      .icon=${glyph.icon}
    ></ha-state-icon>`;
  }
  return html`<state-badge
    .overrideIcon=${glyph.icon}
    .overrideImage=${brandImage(hass, entry, glyph.domain)}
    .stateColor=${false}
  ></state-badge>`;
};
