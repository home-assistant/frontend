import { html } from "lit";
import { isMac } from "../../util/is_mac";

export const renderMoveShortcutHint = (
  moveUpLabel: string,
  moveDownLabel: string
) => html`
  ${moveUpLabel} <span dir="ltr">(${isMac ? "⌥" : "Alt"}+↑)</span>
  <br />
  ${moveDownLabel} <span dir="ltr">(${isMac ? "⌥" : "Alt"}+↓)</span>
`;
