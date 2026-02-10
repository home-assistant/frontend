---
name: create-card
description: Create Lovelace card implementations. Use when implementing LovelaceCard methods, config validation, card size behavior, and optional editor hooks.
---

#### Creating a Lovelace Card

**Purpose**: Cards allow users to tell different stories about their house (based on gallery)

```typescript
@customElement("hui-my-card")
export class HuiMyCard extends LitElement implements LovelaceCard {
  @property({ attribute: false })
  hass!: HomeAssistant;

  @state()
  private _config?: MyCardConfig;

  public setConfig(config: MyCardConfig): void {
    if (!config.entity) {
      throw new Error("Entity required");
    }
    this._config = config;
  }

  public getCardSize(): number {
    return 3; // Height in grid units
  }

  // Optional: Editor for card configuration
  public static getConfigElement(): LovelaceCardEditor {
    return document.createElement("hui-my-card-editor");
  }

  // Optional: Stub config for card picker
  public static getStubConfig(): object {
    return { entity: "" };
  }
}
```

**Card Guidelines:**

- Cards are highly customizable for different households
- Implement `LovelaceCard` interface with `setConfig()` and `getCardSize()`
- Use proper error handling in `setConfig()`
- Consider all possible states (loading, error, unavailable)
- Support different entity types and states
- Follow responsive design principles
- Add configuration editor when needed
