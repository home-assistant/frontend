import yaml from "js-yaml";

const secretYamlType = new yaml.Type("!secret", {
  kind: "scalar",
  construct(data) {
    data = data || "";
    return "!secret " + data;
  },
});

const includeYamlType = new yaml.Type("!include", {
  kind: "scalar",
  construct(data) {
    data = data || "";
    return "!include " + data;
  },
});

export const extYamlSchema = yaml.Schema.create([
  secretYamlType,
  includeYamlType,
]);
