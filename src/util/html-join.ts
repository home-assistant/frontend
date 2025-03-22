import type { TemplateResult } from "lit";
import { html, nothing } from "lit";

export const htmlJoin = (
  strings: (TemplateResult<1> | string)[],
  separator: TemplateResult<1> | string
) =>
  html`${strings.map(
    (value, index, array) =>
      html` ${value}${index < array.length - 1 ? html`${separator}` : nothing}`
  )}`;
