import { mdiArrowUpCircle, mdiCheckCircle } from "@mdi/js";
import { html, nothing } from "lit";
import "../../../components/ha-svg-icon";
import type { RepositoryBase } from "../../../data/marketplace/repository";
import { brandsUrl } from "../../../util/brands-url";
import { typeIcon } from "./type-icon";

interface RepositoryIconOptions {
  darkMode: boolean | undefined;
  hassUrl: string;
  // Leave it out where everything shown is installed, a mark would say nothing
  installedLabel?: string;
  updateLabel?: string;
}

// A corner of the icon, ringed so it stands out on any brand image
const BADGE_STYLE =
  "position: absolute; inset-inline-end: -6px; bottom: -6px; --mdc-icon-size: 18px; background-color: var(--card-background-color); border-radius: 50%";

// Like the icons on the devices page, the category icon without a domain.
// Styled inline, as the tables render it where the styles of a page do not reach.
export const renderRepositoryIcon = (
  repository: RepositoryBase,
  { darkMode, hassUrl, installedLabel, updateLabel }: RepositoryIconOptions
) =>
  html`<div style="position: relative; display: flex">
    ${
      repository.category === "integration" && repository.domain
        ? html`<img
            alt=""
            crossorigin="anonymous"
            referrerpolicy="no-referrer"
            src=${brandsUrl(
              {
                domain: repository.domain,
                type: "icon",
                darkOptimized: darkMode,
              },
              hassUrl
            )}
          />`
        : html`<ha-svg-icon
            .path=${typeIcon(repository.category)}
          ></ha-svg-icon>`
    }
    ${
      // An update says more than that it is installed, so it takes its place
      updateLabel && repository.pending_upgrade
        ? html`<ha-svg-icon
            class="update-badge"
            role="img"
            aria-label=${updateLabel}
            .path=${mdiArrowUpCircle}
            style="${BADGE_STYLE}; color: var(--warning-color)"
          ></ha-svg-icon>`
        : installedLabel && repository.installed
          ? html`<ha-svg-icon
              class="installed-badge"
              role="img"
              aria-label=${installedLabel}
              .path=${mdiCheckCircle}
              style="${BADGE_STYLE}; color: var(--success-color)"
            ></ha-svg-icon>`
          : nothing
    }
  </div>`;
