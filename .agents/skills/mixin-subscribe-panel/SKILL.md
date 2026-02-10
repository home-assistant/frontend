---
name: mixin-subscribe-panel
description: Use when implementing panel classes with SubscribeMixin and hassSubscribe() entity subscriptions.
---

### Creating a Panel

```typescript
@customElement("ha-panel-myfeature")
export class HaPanelMyFeature extends SubscribeMixin(LitElement) {
  @property({ attribute: false })
  hass!: HomeAssistant;

  @property({ type: Boolean, reflect: true })
  narrow!: boolean;

  @property()
  route!: Route;

  hassSubscribe() {
    return [
      subscribeEntityRegistry(this.hass.connection, (entities) => {
        this._entities = entities;
      }),
    ];
  }
}
```
