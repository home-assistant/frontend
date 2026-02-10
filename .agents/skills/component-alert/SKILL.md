---
name: component-alert
description: Show user feedback with ha-alert. Use when choosing alert types, properties, and accessible dynamic status messaging.
---

### Alert Component (ha-alert)

- Types: `error`, `warning`, `info`, `success`
- Properties: `title`, `alert-type`, `dismissable`, `icon`, `action`, `rtl`
- Content announced by screen readers when dynamically displayed

```html
<ha-alert alert-type="error">Error message</ha-alert>
<ha-alert alert-type="warning" title="Warning">Description</ha-alert>
<ha-alert alert-type="success" dismissable>Success message</ha-alert>
```

**Gallery Documentation:**

- `gallery/src/pages/components/ha-alert.markdown`
