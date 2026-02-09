import { cli as analyzeCustomElements } from "@custom-elements-manifest/analyzer/cli.js";
import path from "path";

const toCamelCase = (value) =>
  value.replace(/-([a-z])/g, (_match, char) => char.toUpperCase());

const mdCode = (value) => {
  if (value === undefined || value === null || value === "") {
    return "";
  }

  return `\`${String(value).replace(/`/g, "\\`")}\``;
};

const mdText = (value) =>
  String(value || "")
    .replace(/\|/g, "\\|")
    .replace(/\r?\n+/g, "<br>")
    .trim();

const markdownTable = (headers, rows) => {
  if (!rows.length) {
    return "";
  }

  const header = `| ${headers.join(" | ")} |`;
  const separator = `| ${headers.map(() => "---").join(" | ")} |`;
  const body = rows.map((row) => `| ${row.join(" | ")} |`).join("\n");

  return `${header}\n${separator}\n${body}`;
};

const mergeAttributesIntoFields = (manifest) => {
  if (!manifest?.modules) {
    return manifest;
  }

  for (const mod of manifest.modules) {
    if (!mod.declarations) {
      continue;
    }

    for (const declaration of mod.declarations) {
      if (!declaration.attributes?.length) {
        continue;
      }

      declaration.members = declaration.members || [];

      const memberNames = new Set(
        declaration.members.map((member) => member.name)
      );
      const membersByName = new Map(
        declaration.members.map((member) => [member.name, member])
      );

      declaration.attributes = declaration.attributes.map((attribute) => {
        if (attribute.fieldName) {
          return attribute;
        }

        const camelName = toCamelCase(attribute.name);
        let inferredFieldName;

        if (memberNames.has(camelName)) {
          inferredFieldName = camelName;
        } else if (memberNames.has(attribute.name)) {
          inferredFieldName = attribute.name;
        }

        return inferredFieldName
          ? { ...attribute, fieldName: inferredFieldName }
          : attribute;
      });

      for (const attribute of declaration.attributes) {
        if (!attribute.fieldName) {
          continue;
        }

        const existingMember = membersByName.get(attribute.fieldName);
        if (existingMember) {
          if (!existingMember.attribute) {
            existingMember.attribute = attribute.name;
          }

          continue;
        }

        const newMember = {
          kind: "field",
          name: attribute.fieldName,
          privacy: "public",
          type: attribute.type,
          default: attribute.default,
          description: attribute.description,
          attribute: attribute.name,
        };

        declaration.members.push(newMember);
        membersByName.set(attribute.fieldName, newMember);
        memberNames.add(attribute.fieldName);
      }
    }
  }

  return manifest;
};

const formatType = (type) => {
  if (!type) {
    return "";
  }

  if (typeof type === "string") {
    return type;
  }

  if (type.text) {
    return type.text;
  }

  return "";
};

const getWebAwesomeSuperclassDocsUrl = (superclass) => {
  const packageName = superclass?.package || "";

  if (!packageName.startsWith("@home-assistant/webawesome")) {
    return undefined;
  }

  const match = packageName.match(/components\/([^/]+)/);
  if (match?.[1]) {
    return `https://webawesome.com/docs/components/${match[1]}`;
  }

  return "https://webawesome.com/docs/components/";
};

const renderComponentApiMarkdown = (manifest) => {
  if (!manifest?.modules?.length) {
    return "";
  }

  const sections = [];

  for (const mod of manifest.modules) {
    for (const declaration of mod.declarations || []) {
      if (declaration.kind !== "class") {
        continue;
      }

      const classHeading = declaration.tagName
        ? `### ${mdCode(declaration.tagName)}`
        : `### ${mdCode(declaration.name)}`;
      sections.push(classHeading);

      if (declaration.description) {
        sections.push("#### Description");
        sections.push(mdText(declaration.description));
      }

      const properties = (declaration.members || [])
        .filter(
          (member) => member.kind === "field" && member.privacy !== "private"
        )
        .map((member) => [
          mdCode(member.name),
          mdText(member.attribute || ""),
          mdCode(formatType(member.type) || ""),
          mdCode(member.default || ""),
          mdText(member.description || ""),
        ]);

      const propertiesTable = markdownTable(
        ["Name", "Attribute", "Type", "Default", "Description"],
        properties
      );
      if (propertiesTable) {
        sections.push("#### Properties");
        sections.push(propertiesTable);
      }

      const events = (declaration.events || []).map((event) => [
        mdCode(event.name),
        mdCode(formatType(event.type) || ""),
        mdText(event.description || ""),
      ]);
      const eventsTable = markdownTable(
        ["Name", "Type", "Description"],
        events
      );
      if (eventsTable) {
        sections.push("#### Events");
        sections.push(eventsTable);
      }

      const cssProperties = (declaration.cssProperties || []).map(
        (property) => [
          mdCode(property.name),
          mdCode(property.default || ""),
          mdText(property.description || ""),
        ]
      );
      const cssPropertiesTable = markdownTable(
        ["Name", "Default", "Description"],
        cssProperties
      );
      if (cssPropertiesTable) {
        sections.push("#### CSS custom properties");
        sections.push(
          "[How to use CSS custom properties](https://developer.mozilla.org/docs/Web/CSS/CSS_cascading_variables/Using_CSS_custom_properties)"
        );
        sections.push(cssPropertiesTable);
      }

      const cssParts = (declaration.cssParts || []).map((part) => [
        mdCode(part.name),
        mdText(part.description || ""),
      ]);
      const cssPartsTable = markdownTable(["Name", "Description"], cssParts);
      if (cssPartsTable) {
        sections.push("#### CSS shadow parts");
        sections.push(
          "[How to style shadow parts with ::part()](https://developer.mozilla.org/docs/Web/CSS/::part)"
        );
        sections.push(cssPartsTable);
      }

      const slots = (declaration.slots || []).map((slot) => [
        mdCode(slot.name || "(default)"),
        slot.name ? "no" : "yes",
        mdText(slot.description || ""),
      ]);
      const slotsTable = markdownTable(
        ["Name", "Default", "Description"],
        slots
      );
      if (slotsTable) {
        sections.push("#### Slots");
        sections.push(slotsTable);
      }

      sections.push("#### Class");
      sections.push(
        markdownTable(
          ["Name", "Tag name"],
          [[mdCode(declaration.name), mdCode(declaration.tagName || "")]]
        )
      );

      if (declaration.superclass?.name) {
        const docsUrl = getWebAwesomeSuperclassDocsUrl(declaration.superclass);
        const notes = docsUrl ? `[Web Awesome docs](${docsUrl})` : "";

        sections.push("#### Superclass");
        sections.push(
          markdownTable(
            ["Name", "Package", "Docs"],
            [
              [
                mdCode(declaration.superclass.name),
                mdText(declaration.superclass.package || ""),
                notes,
              ],
            ]
          )
        );
      }
    }
  }

  return sections.filter(Boolean).join("\n\n").trim();
};

export const generateComponentApiMarkdown = async (componentFile) => {
  const manifest = await analyzeCustomElements({
    argv: [
      "analyze",
      "--litelement",
      "--globs",
      path.relative(process.cwd(), componentFile),
      "--quiet",
    ],
    cwd: process.cwd(),
    noWrite: true,
  });

  mergeAttributesIntoFields(manifest);
  return renderComponentApiMarkdown(manifest);
};
