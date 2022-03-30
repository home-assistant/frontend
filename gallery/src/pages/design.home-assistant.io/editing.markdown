---
title: Editing design.home-assistant.io
---

![Home Assistant Logo](/images/logo-with-text.png)

# How to edit design.home-assistant.io

All pages are stored in [the pages folder][pages-folder] on GitHub. Pages are grouped in a folder per sidebar section. Each page can contain a `<page name>.markdown` description file, a `<page name>.ts` demo file or both. If both are defined the description is rendered first. The description can contain metadata to specify the title of the page.

## Development

You can develop design.home-assistant.io locally by checking out [the Home Assistant frontend repository](https://github.com/home-assistant/frontend). The command to run the gallery is `gallery/script/develop_gallery`. It will automatically open a browser window and load the development version of the website.

## Creating a page

Navigate to the [the pages folder][pages-folder] on GitHub. If the folder for your category does not exist yet, create it. Create a new Markdown file inside this folder for your description, ie `usability.markdown`. This filename will be used in the URL. Add the following content:

```markdown
---
title: My new page
---

Hello and welcome to my new page!
```

Once saved, the page will be automatically added to the bottom of the sidebar. The title specified in the header will be shown as the page title and used in the sidebar.

## Linking the page in the sidebar

By default the sidebar will gather all pages and group them by category. You can override the order of the categories, define a name for categories and change the order of the pages in [`sidebar.js`](https://github.com/home-assistant/frontend/blob/dev/gallery/sidebar.js).

Any category not listed in `sidebar.js` will be placed at the end of the sidebar.

Any page not listed in `sidebar.js` will be placed at the end of its category.

## Adding a demo to a page

Create a file next to the description file with the same name as the description file, but with the `.ts` extension: `usability.ts`. For this example, we assume that the category folder that contains `usability.markdown` and `usability.ts` is called `user-experience`. Add the following content to `usability.ts`:

```ts
import { html, css, LitElement } from "lit";
import { customElement } from "lit/decorators";
import "../../../../src/components/ha-card";

@customElement("demo-user-experience-usability")
export class DemoUserExperienceUsability extends LitElement {
  protected render() {
    return html`
      <ha-card>
        <div class="card-content">Hello world!</div>
      </ha-card>
    `;
  }

  static get styles() {
    return css`
      ha-card {
        max-width: 600px;
        margin: 24px auto;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "demo-user-experience-usability": DemoUserExperienceUsability;
  }
}
```

Note that the demo deosn't need to render anything itself. It can also be used to declare web components to be used by the page description. Because page descriptions are using markdown, they can embed any HTML.

## Publishing changes

The website is automatically published whenever the source files in the `dev` branch change. So to get your changes published, open a pull request with your changes.

[pages-folder]: https://github.com/home-assistant/frontend/tree/dev/gallery/src/pages
