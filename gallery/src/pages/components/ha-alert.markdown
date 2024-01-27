---
title: Alert
subtitle: An alert displays a short, important message in a way that attracts the user's attention without interrupting the user's task.
---

<style>
  ha-alert {
    display: block;
    margin: 4px 0;
  }
</style>

# Alert `<ha-alert>`

The alert offers four severity levels that set a distinctive icon and color.

<ha-alert alert-type="error">
  This is an error alert — check it out!
</ha-alert>

<ha-alert alert-type="warning">
  This is an warning alert — check it out!
</ha-alert>

<ha-alert alert-type="info">
  This is an info alert — check it out!
</ha-alert>

<ha-alert alert-type="success">
  This is an success alert — check it out!
</ha-alert>

**Note:** This component is by <a href="https://mui.com/components/alert/" rel="noopener noreferrer" target="_blank">MUI</a> and is not documented in the <a href="https://material.io" rel="noopener noreferrer" target="_blank">Material Design guidelines</a>.

1. [Guidelines](#guidelines)
2. [Implementation](#implementation)

### Resources

| Type           | Link                                                                                                                                                                      | Status    |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- |
| Design         | <a href="https://www.figma.com/community/file/967153512097289521/Home-Assistant-DesignKit" rel="noopener noreferrer" target="_blank">Home Assistant DesignKit</a> (Figma) | Available |
| Implementation | <a href="https://github.com/home-assistant/frontend/blob/dev/src/components/ha-alert.ts" rel="noopener noreferrer" target="_blank">Web Component</a> (GitHub)             | Available |

## Guidelines

### Usage

An alert displays a short, important message in a way that attracts the user's attention without interrupting the user's task.

### Anatomy

_Documentation coming soon_

### Error alert

Error alerts
_Real world example coming soon_

### Warning alert

Warning alerts
_Real world example coming soon_

### Info alert

Info alerts
_Real world example coming soon_

### Success alert

Success alerts
_Real world example coming soon_

### Placement

### Accessibility

(WAI-ARIA: [https://www.w3.org/TR/wai-aria-practices/#alert](https://www.w3.org/TR/wai-aria-practices/#alert))

When the component is dynamically displayed, the content is automatically announced by most screen readers. At this time, screen readers do not inform users of alerts that are present when the page loads.

Using color to add meaning only provides a visual indication, which will not be conveyed to users of assistive technologies such as screen readers. Ensure that information denoted by the color is either obvious from the content itself (for example the visible text), or is included through alternative means, such as additional hidden text.

Actions must have a tab index of 0 so that they can be reached by keyboard-only users.

## Implementation

### Example Usage

**Alert type**

<ha-alert alert-type="error">
  This is an error alert — check it out!
</ha-alert>

<ha-alert alert-type="warning">
  This is an warning alert — check it out!
</ha-alert>

<ha-alert alert-type="info">
  This is an info alert — check it out!
</ha-alert>

<ha-alert alert-type="success">
  This is an success alert — check it out!
</ha-alert>

```html
<ha-alert alert-type="error"> This is an error alert — check it out! </ha-alert>
<ha-alert alert-type="warning">
  This is a warning alert — check it out!
</ha-alert>
<ha-alert alert-type="info"> This is an info alert — check it out! </ha-alert>
<ha-alert alert-type="success">
  This is a success alert — check it out!
</ha-alert>
```

**Title**

The `title ` option should not be used without a description.

<ha-alert alert-type="success" title="Success">
  This is an success alert — check it out!
</ha-alert>

```html
<ha-alert alert-type="success" title="Success">
  This is an success alert — check it out!
</ha-alert>
```

**Dismissable**

<ha-alert alert-type="success" dismissable>
  This is an success alert — check it out!
</ha-alert>

```html
<ha-alert alert-type="success" dismissable>
  This is an success alert — check it out!
</ha-alert>
```

**Slotted action**

<ha-alert alert-type="success">
  This is an success alert — check it out!
  <mwc-button slot="action" label="Undo"></mwc-button>
</ha-alert>

```html
<ha-alert alert-type="success">
  This is an success alert — check it out!
  <mwc-button slot="action" label="Undo"></mwc-button>
</ha-alert>
```

**Slotted icon**

_Documentation coming soon_

### API

**Properties/Attributes**

| Name        | Type    | Default | Description                                           |
| ----------- | ------- | ------- | ----------------------------------------------------- |
| title       | string  | ``      | Title to display.                                     |
| alertType   | string  | `info`  | Severity level that set a distinctive icon and color. |
| dismissable | boolean | `false` | Gives the option to close the alert.                  |
| icon        | string  | ``      | Icon to display.                                      |
| action      | string  | ``      | Add an action button to the alert.                    |
| rtl         | boolean | `false` | Support languages that use right-to-left.             |

**Events**

_Documentation coming soon_

**CSS Custom Properties**

_Documentation coming soon_
