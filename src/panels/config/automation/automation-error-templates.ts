import { mdiAlertCircle } from "@mdi/js";
import { html, nothing } from "lit";
import { ifDefined } from "lit/directives/if-defined";
import type { LocalizeFunc } from "../../../common/translations/localize";
import type { ConfigPath } from "../../../common/util/config-path";
import "../../../components/ha-alert";
import "../../../components/ha-svg-icon";
import "../../../components/ha-tooltip";
import type { ConfigValidationError } from "../../../data/config";
import { errorText } from "./automation-errors";

export const renderRowErrorIcon = (
  localize: LocalizeFunc,
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
          ${errors.map((error) => html`<div>${errorText(localize, error, path)}</div>`)}
        </ha-tooltip>`
    : nothing;

/** Lists errors with their path relative to `path`. */
export const renderErrorsAlert = (
  localize: LocalizeFunc,
  errors: ConfigValidationError[],
  path: ConfigPath = [],
  slot?: string
) =>
  errors.length
    ? html`<ha-alert
        alert-type="error"
        class="errors-alert"
        slot=${ifDefined(slot)}
      >
        ${errors.map((error) => html`<div>${errorText(localize, error, path)}</div>`)}
      </ha-alert>`
    : nothing;
