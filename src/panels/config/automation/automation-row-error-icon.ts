import { mdiAlertCircle } from "@mdi/js";
import { html, nothing } from "lit";
import type { ConfigPath } from "../../../common/util/config-path";
import "../../../components/ha-svg-icon";
import "../../../components/ha-tooltip";
import type { ConfigValidationError } from "../../../data/config";
import { errorText } from "./automation-errors";

export const renderRowErrorIcon = (
  errors: ConfigValidationError[],
  path: ConfigPath,
  label: string
) =>
  errors.length
    ? html`<ha-svg-icon
          id="error-icon"
          slot="icons"
          tabindex="0"
          class="error-indicator"
          .path=${mdiAlertCircle}
          role="img"
          aria-label=${label}
        ></ha-svg-icon>
        <ha-tooltip for="error-icon" slot="icons">
          ${errors.map((error) => html`<p>${errorText(error, path)}</p>`)}
        </ha-tooltip>`
    : nothing;
