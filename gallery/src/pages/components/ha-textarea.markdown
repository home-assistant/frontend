---
title: Textarea
---

# Textarea `<ha-textarea>`

A multiline text input component supporting Home Assistant theming and validation, based on webawesome textarea.
Supports autogrow, hints, validation, and both material and outlined appearances.

## Implementation

### Example usage

```html
<ha-textarea label="Description" value="Hello world"></ha-textarea>

<ha-textarea label="Notes" placeholder="Type here..." autogrow></ha-textarea>

<ha-textarea label="Required field" required></ha-textarea>

<ha-textarea label="Disabled" disabled value="Can't edit this"></ha-textarea>
```

### API

This component is based on the webawesome textarea component.

**Slots**

- `label`: Custom label content. Overrides the `label` property.
- `hint`: Custom hint content. Overrides the `hint` property.

**Properties/Attributes**

| Name               | Type                                                           | Default | Description                                                              |
| ------------------ | -------------------------------------------------------------- | ------- | ------------------------------------------------------------------------ |
| value              | String                                                         | -       | The current value of the textarea.                                       |
| label              | String                                                         | ""      | The textarea's label text.                                               |
| hint               | String                                                         | ""      | The textarea's hint/helper text.                                         |
| placeholder        | String                                                         | ""      | Placeholder text shown when the textarea is empty.                       |
| rows               | Number                                                         | 4       | The number of visible text rows.                                         |
| resize             | "none"/"vertical"/"horizontal"/"both"/"auto"                   | "none"  | Controls the textarea's resize behavior.                                 |
| readonly           | Boolean                                                        | false   | Makes the textarea readonly.                                             |
| disabled           | Boolean                                                        | false   | Disables the textarea and prevents user interaction.                     |
| required           | Boolean                                                        | false   | Makes the textarea a required field.                                     |
| auto-validate      | Boolean                                                        | false   | Validates the textarea on blur instead of on form submit.                |
| invalid            | Boolean                                                        | false   | Marks the textarea as invalid.                                           |
| validation-message | String                                                         | ""      | Custom validation message shown when the textarea is invalid.            |
| minlength          | Number                                                         | -       | The minimum length of input that will be considered valid.               |
| maxlength          | Number                                                         | -       | The maximum length of input that will be considered valid.               |
| name               | String                                                         | -       | The name of the textarea, submitted as a name/value pair with form data. |
| autocapitalize     | "off"/"none"/"on"/"sentences"/"words"/"characters"             | ""      | Controls whether and how text input is automatically capitalized.        |
| autocomplete       | String                                                         | -       | Indicates whether the browser's autocomplete feature should be used.     |
| autofocus          | Boolean                                                        | false   | Automatically focuses the textarea when the page loads.                  |
| spellcheck         | Boolean                                                        | true    | Enables or disables the browser's spellcheck feature.                    |
| inputmode          | "none"/"text"/"decimal"/"numeric"/"tel"/"search"/"email"/"url" | ""      | Hints at the type of data for showing an appropriate virtual keyboard.   |
| enterkeyhint       | "enter"/"done"/"go"/"next"/"previous"/"search"/"send"          | ""      | Customizes the label or icon of the Enter key on virtual keyboards.      |

#### CSS Parts

- `wa-base` - The underlying wa-textarea base wrapper.
- `wa-hint` - The underlying wa-textarea hint container.
- `wa-textarea` - The underlying wa-textarea textarea element.

**CSS Custom Properties**

- `--ha-textarea-padding-bottom` - Padding below the textarea host.
- `--ha-textarea-max-height` - Maximum height of the textarea when using `resize="auto"`. Defaults to `200px`.
- `--ha-textarea-required-marker` - The marker shown after the label for required fields. Defaults to `"*"`.
