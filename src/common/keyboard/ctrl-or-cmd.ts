import { mdiAppleKeyboardCommand } from "@mdi/js";
import { html, type TemplateResult } from "lit";
import "../../components/ha-svg-icon";
import { isMac } from "../../util/is_mac";
import type { LocalizeFunc } from "../translations/localize";

export const ctrlOrCmdLabel = (localize: LocalizeFunc): string =>
  isMac ? "⌘" : localize("ui.dialogs.shortcuts.keys.ctrl");

export const renderCtrlOrCmd = (
  localize: LocalizeFunc
): TemplateResult | string =>
  isMac
    ? html`<ha-svg-icon .path=${mdiAppleKeyboardCommand}></ha-svg-icon>`
    : localize("ui.dialogs.shortcuts.keys.ctrl");
