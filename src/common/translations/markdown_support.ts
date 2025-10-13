import { html } from "lit";
import type { LocalizeFunc } from "./localize";

const MARKDOWN_SUPPORT_URL = "https://commonmark.org/help/";

export const supportsMarkdownHelper = (localize: LocalizeFunc) =>
  localize("ui.common.supports_markdown", {
    markdown_help_link: html`<a
      href=${MARKDOWN_SUPPORT_URL}
      target="_blank"
      rel="noreferrer"
      >${localize("ui.common.markdown")}</a
    >`,
  });
