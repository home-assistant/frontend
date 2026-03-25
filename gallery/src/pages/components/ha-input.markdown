---
title: Input
---

# Input `<ha-input>`

A text input component supporting Home Assistant theming and validation, based on webawesome input.
Supports multiple input types including text, number, password, email, search, and more.

## Implementation

### Example usage

```html
<ha-input label="Name" value="Hello"></ha-input>

<ha-input label="Email" type="email" placeholder="you@example.com"></ha-input>

<ha-input label="Password" type="password" password-toggle></ha-input>

<ha-input label="Required" required></ha-input>

<ha-input label="Disabled" disabled value="Can't touch this"></ha-input>
```

### API

This component is based on the webawesome input component.

**Slots**

- `start`: Content placed before the input (usually for icons or prefixes).
- `end`: Content placed after the input (usually for icons or suffixes).
- `label`: Custom label content. Overrides the `label` property.
- `hint`: Custom hint content. Overrides the `hint` property.
- `clear-icon`: Custom clear icon.
- `show-password-icon`: Custom show password icon.
- `hide-password-icon`: Custom hide password icon.

**Properties/Attributes**

| Name                 | Type                                                                                           | Default    | Description                                                                                                |
| -------------------- | ---------------------------------------------------------------------------------------------- | ---------- | ---------------------------------------------------------------------------------------------------------- |
| appearance           | "material"/"outlined"                                                                          | "material" | Sets the input appearance style. "material" is the default filled style, "outlined" uses a bordered style. |
| type                 | "text"/"number"/"password"/"email"/"search"/"tel"/"url"/"date"/"datetime-local"/"time"/"color" | "text"     | Sets the input type.                                                                                       |
| value                | String                                                                                         | -          | The current value of the input.                                                                            |
| label                | String                                                                                         | ""         | The input's label text.                                                                                    |
| hint                 | String                                                                                         | ""         | The input's hint/helper text.                                                                              |
| placeholder          | String                                                                                         | ""         | Placeholder text shown when the input is empty.                                                            |
| with-clear           | Boolean                                                                                        | false      | Adds a clear button when the input is not empty.                                                           |
| readonly             | Boolean                                                                                        | false      | Makes the input readonly.                                                                                  |
| disabled             | Boolean                                                                                        | false      | Disables the input and prevents user interaction.                                                          |
| required             | Boolean                                                                                        | false      | Makes the input a required field.                                                                          |
| password-toggle      | Boolean                                                                                        | false      | Adds a button to toggle the password visibility.                                                           |
| without-spin-buttons | Boolean                                                                                        | false      | Hides the browser's built-in spin buttons for number inputs.                                               |
| auto-validate        | Boolean                                                                                        | false      | Validates the input on blur instead of on form submit.                                                     |
| invalid              | Boolean                                                                                        | false      | Marks the input as invalid.                                                                                |
| validation-message   | String                                                                                         | ""         | Custom validation message shown when the input is invalid.                                                 |
| pattern              | String                                                                                         | -          | A regular expression pattern to validate input against.                                                    |
| minlength            | Number                                                                                         | -          | The minimum length of input that will be considered valid.                                                 |
| maxlength            | Number                                                                                         | -          | The maximum length of input that will be considered valid.                                                 |
| min                  | Number/String                                                                                  | -          | The input's minimum value. Only applies to date and number input types.                                    |
| max                  | Number/String                                                                                  | -          | The input's maximum value. Only applies to date and number input types.                                    |
| step                 | Number/"any"                                                                                   | -          | Specifies the granularity that the value must adhere to.                                                   |

**CSS Custom Properties**

- `--ha-input-padding-top` - Padding above the input.
- `--ha-input-padding-bottom` - Padding below the input. Defaults to `var(--ha-space-2)`.
- `--ha-input-text-align` - Text alignment of the input. Defaults to `start`.
- `--ha-input-required-marker` - The marker shown after the label for required fields. Defaults to `"*"`.

---

## Derivatives

The following components extend or wrap `ha-input` for specific use cases:

- **`<ha-input-search>`** — A pre-configured search input with a magnify icon, clear button, and localized "Search" placeholder. Extends `ha-input`.
- **`<ha-input-copy>`** — A read-only input with a copy-to-clipboard button. Supports optional value masking with a reveal toggle.
- **`<ha-input-multi>`** — A dynamic list of text inputs for managing arrays of strings. Supports adding, removing, and drag-and-drop reordering.
