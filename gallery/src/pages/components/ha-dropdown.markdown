---
title: Dropdown
---

<style>
  .wrapper {
    display: flex;
    gap: 24px;
    align-items: flex-start;
  }
  ha-dropdown {
    min-width: 180px;
  }
</style>

# Dropdown `<ha-dropdown>`

## Implementation

A compact, accessible dropdown menu for choosing actions or settings. `ha-dropdown` supports composed menu items (`<ha-dropdown-item>`) for icons, submenus, checkboxes, disabled entries, and destructive variants. Use composition with `slot="trigger"` to control the trigger button and use `<ha-dropdown-item>` for rich item content.

### Example usage (composition)

<div class="wrapper">
  <ha-dropdown open>
    <ha-button slot="trigger" with-caret>Dropdown</ha-button>

    <ha-dropdown-item>
      <ha-svg-icon .path=${mdiContentCut} slot="icon"></ha-svg-icon>
      Cut
    </ha-dropdown-item>

    <ha-dropdown-item>
      <ha-svg-icon .path=${mdiContentCopy} slot="icon"></ha-svg-icon>
      Copy
    </ha-dropdown-item>

    <ha-dropdown-item disabled>
      <ha-svg-icon .path=${mdiContentPaste} slot="icon"></ha-svg-icon>
      Paste
    </ha-dropdown-item>

    <ha-dropdown-item>
      Show images
      <ha-dropdown-item slot="submenu" value="show-all-images"
        >Show all images</ha-dropdown-item
      >
      <ha-dropdown-item slot="submenu" value="show-thumbnails"
        >Show thumbnails</ha-dropdown-item
      >
    </ha-dropdown-item>

    <ha-dropdown-item type="checkbox" checked>Emoji shortcuts</ha-dropdown-item>
    <ha-dropdown-item type="checkbox" checked>Word wrap</ha-dropdown-item>

    <ha-dropdown-item variant="danger">
      <ha-svg-icon .path=${mdiDelete} slot="icon"></ha-svg-icon>
      Delete
    </ha-dropdown-item>

  </ha-dropdown>
</div>

```html
<ha-dropdown open>
  <ha-button slot="trigger" with-caret>Dropdown</ha-button>

  <ha-dropdown-item>
    <ha-svg-icon .path="${mdiContentCut}" slot="icon"></ha-svg-icon>
    Cut
  </ha-dropdown-item>

  <ha-dropdown-item>
    <ha-svg-icon .path="${mdiContentCopy}" slot="icon"></ha-svg-icon>
    Copy
  </ha-dropdown-item>

  <ha-dropdown-item disabled>
    <ha-svg-icon .path="${mdiContentPaste}" slot="icon"></ha-svg-icon>
    Paste
  </ha-dropdown-item>

  <ha-dropdown-item>
    Show images
    <ha-dropdown-item slot="submenu" value="show-all-images"
      >Show all images</ha-dropdown-item
    >
    <ha-dropdown-item slot="submenu" value="show-thumbnails"
      >Show thumbnails</ha-dropdown-item
    >
  </ha-dropdown-item>

  <ha-dropdown-item type="checkbox" checked>Emoji shortcuts</ha-dropdown-item>
  <ha-dropdown-item type="checkbox" checked>Word wrap</ha-dropdown-item>

  <ha-dropdown-item variant="danger">
    <ha-svg-icon .path="${mdiDelete}" slot="icon"></ha-svg-icon>
    Delete
  </ha-dropdown-item>
</ha-dropdown>
```

### API

This component is based on the webawesome dropdown component.
Check the [webawesome documentation](https://webawesome.com/docs/components/dropdown/) for more details.
