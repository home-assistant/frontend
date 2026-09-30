#!/usr/bin/env node
// Checks npm registry metadata for the direct dependencies in package.json:
// deprecation, source repository and provenance. On pull requests only newly
// added packages are checked, and a deprecated one fails the check. Scheduled
// and manual runs report on every direct dependency without failing. Invoked
// from the `npm-metadata` job in .github/workflows/dependency-review.yaml via
// actions/github-script:
//
//   const { default: checkNpmMetadata } =
//     await import(`${process.env.GITHUB_WORKSPACE}/.github/scripts/check-npm-metadata.mts`);
//   await checkNpmMetadata({ github, context, core });

import type { Octokit } from "@octokit/rest";
import type {
  Context,
  Core,
  GitHubScriptArgs,
  PullRequestPayload,
} from "./github-script.d.ts";

// Scheduled and manual runs have no pull request
type Payload = Partial<PullRequestPayload>;

type Section =
  | "dependencies"
  | "devDependencies"
  | "optionalDependencies"
  | "peerDependencies";

type PackageJson = Partial<Record<Section, Record<string, string>>>;

interface Dependency {
  name: string;
  // The package npm installs, which differs from name for npm: aliases
  registryName: string;
  version: string;
  section: Section;
}

// The fields read from a version document on registry.npmjs.org
interface NpmManifest {
  deprecated?: string;
  repository?: string | { url?: string };
  dist?: { attestations?: object };
}

interface Result {
  name: string;
  version: string;
  section: Section;
  skipped?: string;
  deprecated?: string;
  repository?: string;
  provenance?: boolean;
}

const SECTIONS: Section[] = [
  "dependencies",
  "devDependencies",
  "optionalDependencies",
  "peerDependencies",
];

const EXACT_VERSION = /^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/;

const NPM_ALIAS = /^npm:((?:@[^/]+\/)?[^@]+)@(.+)$/;

const CONCURRENCY = 8;

// Returns undefined when the registry reports 404, and throws on any other
// failure so a registry outage fails the job instead of skipping the check.
const fetchJson = async <T,>(url: string): Promise<T | undefined> => {
  const response = await fetch(url);

  if (response.status === 404) {
    return undefined;
  }

  if (!response.ok) {
    throw new Error(
      `Request to ${url} failed: ${response.status} ${response.statusText}`
    );
  }

  return JSON.parse(await response.text());
};

const readPackageJson = async (
  github: Octokit,
  context: Context<Payload>,
  ref: string
): Promise<PackageJson> => {
  const { data } = await github.rest.repos.getContent({
    ...context.repo,
    path: "package.json",
    ref,
    mediaType: { format: "raw" },
  });

  // The raw media type returns the file contents as a string, but Octokit
  // types the response as the JSON form
  if (typeof data !== "string") {
    throw new Error("Expected raw package.json contents");
  }

  return JSON.parse(data);
};

const listDependencies = (pkg: PackageJson): Dependency[] =>
  SECTIONS.flatMap((section) =>
    Object.entries(pkg[section] ?? {}).map(([name, spec]) => {
      // npm: aliases install another package, e.g. npm:typescript@7.0.2
      const alias = spec.match(NPM_ALIAS);

      return {
        name,
        registryName: alias?.[1] ?? name,
        version: alias?.[2] ?? spec,
        section,
      };
    })
  );

const repositoryUrl = (repository: NpmManifest["repository"]) => {
  const url = typeof repository === "string" ? repository : repository?.url;

  return url?.replace(/^git\+/, "").replace(/\.git$/, "");
};

const checkPackage = async ({
  name,
  registryName,
  version,
  section,
}: Dependency): Promise<Result> => {
  const result = {
    name: registryName === name ? name : `${name} (npm:${registryName})`,
    version,
    section,
  };

  if (!EXACT_VERSION.test(version)) {
    return { ...result, skipped: "not an exact version" };
  }

  const manifest = await fetchJson<NpmManifest>(
    `https://registry.npmjs.org/${encodeURIComponent(registryName)}/${version}`
  );

  if (!manifest) {
    return { ...result, skipped: "not found on the npm registry" };
  }

  return {
    ...result,
    deprecated: manifest.deprecated,
    repository: repositoryUrl(manifest.repository),
    provenance: Boolean(manifest.dist?.attestations),
  };
};

const checkAll = async (dependencies: Dependency[]) => {
  const results: Result[] = [];

  for (let i = 0; i < dependencies.length; i += CONCURRENCY) {
    results.push(
      // eslint-disable-next-line no-await-in-loop
      ...(await Promise.all(
        dependencies.slice(i, i + CONCURRENCY).map(checkPackage)
      ))
    );
  }

  return results;
};

const writeSummary = async (core: Core, heading: string, results: Result[]) => {
  await core.summary
    .addHeading(heading, 2)
    .addTable([
      [
        "Package",
        "Version",
        "Section",
        "Deprecated",
        "Provenance",
        "Repository",
      ].map((data) => ({ data, header: true })),
      ...results.map((result) =>
        result.skipped
          ? [
              result.name,
              result.version,
              result.section,
              `skipped: ${result.skipped}`,
              "-",
              "-",
            ]
          : [
              result.name,
              result.version,
              result.section,
              result.deprecated ? "yes" : "no",
              result.provenance ? "yes" : "no",
              result.repository ?? "none",
            ]
      ),
    ])
    .write();
};

export default async function checkNpmMetadata({
  github,
  context,
  core,
}: GitHubScriptArgs<Payload>) {
  const pr = context.payload.pull_request;

  if (!pr) {
    const pkg = await readPackageJson(github, context, context.sha);
    const results = await checkAll(listDependencies(pkg));

    const flagged = (result: Result) =>
      Number(
        Boolean(result.skipped || result.deprecated || !result.repository)
      );

    results.sort(
      (a, b) => flagged(b) - flagged(a) || a.name.localeCompare(b.name)
    );
    await writeSummary(core, "Direct dependencies", results);

    return;
  }

  const [base, head] = await Promise.all([
    readPackageJson(github, context, pr.base.sha),
    readPackageJson(github, context, pr.head.sha),
  ]);

  // Compare the packages npm installs, so pointing an npm: alias at another
  // package counts as new, but moving a package between sections does not
  const existing = new Set(
    listDependencies(base).map(({ registryName }) => registryName)
  );

  const added = listDependencies(head).filter(
    ({ registryName }) => !existing.has(registryName)
  );

  if (added.length === 0) {
    core.info("No new dependencies");

    return;
  }

  const results = await checkAll(added);
  const annotation = { file: "package.json" };

  for (const result of results) {
    const label = `${result.name}@${result.version}`;

    if (result.skipped) {
      core.warning(`${label}: ${result.skipped}, not checked`, annotation);
      continue;
    }

    if (result.deprecated) {
      core.error(`${label} is deprecated: ${result.deprecated}`, annotation);
    }

    if (!result.repository) {
      core.warning(`${label} has no source repository`, annotation);
    }

    if (!result.provenance) {
      core.notice(`${label} was published without provenance`, annotation);
    }
  }

  await writeSummary(core, "New dependencies", results);

  if (results.some((result) => result.deprecated)) {
    core.setFailed("New dependencies must not be deprecated on npm");
  }
}
