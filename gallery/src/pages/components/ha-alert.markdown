---
title: Alerts
---

# Alert `<ha-alert>`
The alert offers four severity levels that set a distinctive icon and color.

<ha-alert alert-type="error">This is an error alert — check it out!</ha-alert>

<ha-alert alert-type="warning">This is an warning alert — check it out!</ha-alert>

<ha-alert alert-type="info">This is an info alert — check it out!</ha-alert>

<ha-alert alert-type="success">This is an success alert — check it out!</ha-alert>

**Note:** This component is by [MUI](https://mui.com/components/alert/) and is not documented in the [Material Design guidelines](https://material.io).

1. [Guidelines](#guidelines)
2. [Implementation](#implementation)

### Resources
| Type           | Link                             | Status    |
|----------------|----------------------------------|-----------|
| Design         | [Home Assistant DesignKit](https://www.figma.com/community/file/967153512097289521/Home-Assistant-DesignKit) (Figma) | Available |
| Implementation | [Web Component](https://github.com/home-assistant/frontend/blob/dev/src/components/ha-alert.ts) (GitHub)            | Available |

## Guidelines
### Usage
An alert displays a short, important message in a way that attracts the user's attention without interrupting the user's task.

### Anatomy
*Documentation coming soon*

### Error alert
Error alerts
*Real world example comming soon*

### Warning alert
Warning alerts
*Real world example comming soon*

### Info alert
Info alerts
*Real world example comming soon*

### Success alert
Success alerts
*Real world example comming soon*

### Placement


### Accessibility
(WAI-ARIA: [https://www.w3.org/TR/wai-aria-practices/#alert](https://www.w3.org/TR/wai-aria-practices/#alert))

When the component is dynamically displayed, the content is automatically announced by most screen readers. At this time, screen readers do not inform users of alerts that are present when the page loads.

Using color to add meaning only provides a visual indication, which will not be conveyed to users of assistive technologies such as screen readers. Ensure that information denoted by the color is either obvious from the content itself (for example the visible text), or is included through alternative means, such as additional hidden text.

Actions must have a tab index of 0 so that they can be reached by keyboard-only users.

## Implementation
* CSS variable
* Events


### Example Usage
**Alert type**

<ha-alert alert-type="error">This is an error alert — check it out!</ha-alert>

<ha-alert alert-type="warning">This is an warning alert — check it out!</ha-alert>

<ha-alert alert-type="info">This is an info alert — check it out!</ha-alert>

<ha-alert alert-type="success">This is an success alert — check it out!</ha-alert>


```html
<ha-alert alert-type="error">This is an error alert — check it out!</ha-alert>
<ha-alert alert-type="warning">This is a warning alert — check it out!</ha-alert>
<ha-alert alert-type="info">This is an info alert — check it out!</ha-alert>
<ha-alert alert-type="success">This is a success alert — check it out!</ha-alert>
```

**Title**

The `title ` option should not be used without a description.

<ha-alert alert-type="error" title="Error">
	This is an error alert — <strong>check it out!</strong>
</ha-alert>

<ha-alert alert-type="warning">
	<title>Warning</title>
	This is an warning alert — <strong>check it out!</strong>
</ha-alert>

<ha-alert alert-type="info">
	<title>Info</title>
	This is an info alert — <strong>check it out!</strong>
</ha-alert>

<ha-alert alert-type="success">
	<title>Success </title>
	This is an success alert — <strong>check it out!</strong>
</ha-alert>

```html
<ha-alert alert-type="error" title="Error">
	This is an error alert — <strong>check it out!</strong>
</ha-alert>
<ha-alert alert-type="warning">
	<title>Warning</title>
	This is an warning alert — <strong>check it out!</strong>
</ha-alert>
<ha-alert alert-type="info">
	<title>Info</title>
	This is an info alert — <strong>check it out!</strong>
</ha-alert>
<ha-alert alert-type="success">
	<title>Success </title>
	This is an success alert — <strong>check it out!</strong>
</ha-alert>
```

**Dismissable**

*Documentation coming soon*

**Slotted icon**

*Documentation coming soon*

**Slotted action**

*Documentation coming soon*

**Right to left**

*Documentation coming soon*

### API
**Properties/Attributes**

| Name        | Type    | Default | Description                                           |
|-------------|---------|---------|-------------------------------------------------------|
| title       | string  | ``      | Title to display.                                     |
| alertType   | string  | `info`  | Severity level that set a distinctive icon and color. |
| dismissable | boolean | `false` | Gives the option to close the alert.                  |
| icon        | string  | ``      | Icon to display.                                      |
| action      | string  | ``      | Add an action button to the alert.                    |
| rtl         | boolean | `false` | Support languages that use right-to-left.             |

**Events**

*Documentation comming soon*

**CSS Custom Properties**

*Documentation coming soon*
