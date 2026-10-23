# Anchored popovers for confirmations and simple forms

Concept branch: `anchored-confirmations`. Not for merging as it is. It exists to try the idea in real screens and to drive a UX design discussion.

## The idea

When a confirmation or a small form opens from a specific button, show it as a popover next to that button on larger screens, instead of a centred dialog. On small screens it becomes a bottom sheet. Confirmations opened without a button, such as after a save, keep today's dialog.

## What is in the branch

The branch sits on top of the data table group header actions (#55235), which added the first example.

### Shared pieces

- `showConfirmationDialog`, `showAlertDialog` and `showPromptDialog` take an optional `anchor`. `dialog-box` renders `ha-adaptive-popover` when it has one, and `ha-dialog` otherwise.
- `showFormDialog` takes the same `anchor`, and `dialog-form` follows the same rule.
- `ha-adaptive-popover` already switched to a bottom sheet below 870px wide or 500px tall. It now has:
  - `compact`, with tighter spacing for short content.
  - `accessibleLabel`, for when the title isn't the popover's own header.
  - `--ha-adaptive-popover-min-width` and `--ha-adaptive-popover-width`.
- `ha-dialog-header` takes `--ha-dialog-header-content-padding` and `--ha-dialog-header-min-height`. Both default to today's values.
- Confirmations with only a title show it as the message, without a header, so they don't read as a heading with nothing under it.

### Where it is used

| Where                                              | Opened from                                                                                        | Type                       |
| -------------------------------------------------- | -------------------------------------------------------------------------------------------------- | -------------------------- |
| Marketplace                                        | New group header action                                                                            | Confirmation               |
| Dashboard edit mode                                | Section menu, Delete                                                                               | Confirmation, destructive  |
| Energy settings                                    | Delete on grid, solar, battery, gas and water sources, individual devices, and the CO2 integration | Confirmation               |
| Dashboard resources                                | Delete                                                                                             | Confirmation, destructive  |
| Apps                                               | Remove repository, remove registry                                                                 | Confirmation, destructive  |
| Dropdown helper settings                           | Remove option                                                                                      | Confirmation over a dialog |
| Automation editor                                  | Trigger and action menus, Rename                                                                   | Prompt                     |
| Object selector (for example, card editor buttons) | Add, Edit                                                                                          | Form                       |

Menu items anchor to the menu's button, since the menu has closed by the time the popover opens.

## Needs deciding

1. **Whether to do this at all**, and for which kinds: confirmations, prompts (rename), small forms, or all three.
2. **Look.** The current popover uses the dialog's surface: large radius, shadow and filled buttons. It reads as Material. A flatter, less rounded popover would suit a small inline control better.
3. **Width.**
   - Messages are sized to their content, up to the screen width, so text only wraps when it has to.
   - Prompts have a minimum of 400px.
   - Forms use the 580px dialog width.
   - Are those the right three rules?
4. **Title-only confirmations.** Show the title as plain text (current), or keep a heading?
5. **Placement.** On some screens the popover covers the button that opened it (energy devices, dashboard sections). Should it always open beside or below the button?
6. **Mobile.** Bottom sheet, the same as adaptive dialogs, or a popover there too?
7. **Destructive confirmations.** A popover is lighter than a dialog. Is that too easy to confirm for deletes?
8. **Rollout.** There are about 170 confirmation calls. Opt in per call site (current), or anchor automatically when the click event is available?
9. **Popovers inside dialogs.** For example, removing a dropdown option from the helper settings dialog. Should popovers open there at all, and if they do, should they be kept inside the dialog's bounds?
10. **Forms.** The object selector's edit form doesn't work well as a popover stacked over the card editor dialog. It should probably be a view of its own instead of a stacked popover or dialog.

## Known gaps

- Confirmations block dismissing by clicking outside or pressing Escape, the same as the dialog today. A popover may be expected to dismiss more easily.
- Focus lands on the popover rather than the default button.
- Renames started from the automation sidebar have no anchor, so they stay dialogs.
- Timer presets and other forms opened from custom events can't be anchored yet, because the event doesn't carry the clicked element.
- Energy's "Are you sure you want to remove this source?" is a title-only confirmation. The current build shows it as plain text, but the energy captures were taken before that change and still show it as a heading.

## Values to turn into variables or tokens

These were tuned by eye in the concept and are hard-coded:

| Where                                 | Value                                                                                                           | Why                                                        |
| ------------------------------------- | --------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| `ha-adaptive-popover`, compact footer | `18px` right and bottom padding                                                                                 | Looked even with the 20px around the text                  |
| `ha-adaptive-popover`, compact        | `var(--ha-space-5)` (20px) edges, `--ha-space-3` (12px) under the title, `--ha-space-4` (16px) above the footer | Should be `--ha-popover-padding` and gap tokens            |
| `dialog-box`, prompt popover          | `min(400px, 95vw)` minimum width                                                                                | A text field has no width of its own                       |
| `dialog-box`, message popover         | `95vw` maximum width                                                                                            | Lets messages grow before wrapping                         |
| `ha-data-table`, group actions        | `margin-top: -12px`                                                                                             | Undoes the group header's `padding-top: 12px`              |
| `ha-data-table`, group actions        | `48px` in the end padding calculation                                                                           | The rows' icon button size, to line up with overflow menus |

## Related earlier work

An earlier concept made more info a popover. It needed a "mini" variant and more work, and that thinking moved to card feature actions opening popovers instead. Both point the same way: lighter, anchored surfaces for quick actions.
