import { html } from "lit";

export const renderMoveShortcutHint = (
  moveUpLabel: string,
  moveDownLabel: string
) => html`
  ${moveUpLabel} <span dir="ltr">(Alt+↑)</span>
  <br />
  ${moveDownLabel} <span dir="ltr">(Alt+↓)</span>
`;
