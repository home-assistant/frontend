#!/usr/bin/env node
// @ts-check
// Checks npm registry metadata for the direct dependencies in package.json:
// deprecation, source repository and provenance. On pull requests only newly
// added packages are checked, and a deprecated one fails the check. Scheduled
// and manual runs report on every direct dependency without failing. Invoked
// from the `npm-metadata` job in .github/workflows/dependency-review.yaml via
// actions/github-script:
//
//   const { default: checkNpmMetadata } =
//     await import(`${process.env.GITHUB_WORKSPACE}/.github/scripts/check-npm-metadata.mjs`);
//   await checkNpmMetadata({ github, context, core });

/** @typedef {import("@octokit/rest").Octokit} GitHub */

/**
 * The parts of @actions/core used here, as passed in by actions/github-script.
 * @typedef {object} Core
 * @property {(message: string) => void} info
 * @property {(message: string, properties?: AnnotationProperties) => void} notice
 * @property {(message: string, properties?: AnnotationProperties) => void} warning
 * @property {(message: string, properties?: AnnotationProperties) => void} error
 * @property {(message: string) => void} setFailed
 * @property {Summary} summary
 */

/**
 * @typedef {object} AnnotationProperties
 * @property {string} [file]
 */

/**
 * @typedef {object} Summary
 * @property {(text: string, level?: number) => Summary} addHeading
 * @property {(rows: SummaryTableCell[][]) => Summary} addTable
 * @property {() => Promise<Summary>} write
 */

/** @typedef {string | { data: string, header?: boolean }} SummaryTableCell */

/**
 * The parts of the actions/github-script context used here.
 * @typedef {object} Context
 * @property {string} eventName
 * @property {string} sha
 * @property {{ owner: string, repo: string }} repo
 * @property {{ pull_request?: { base: { sha: string }, head: { sha: string } } }} payload
 */

/** @typedef {"dependencies" | "devDependencies"} Section */

/** @typedef {Partial<Record<Section, Record<string, string>>>} PackageJson */

/**
 * @typedef {object} Dependency
 * @property {string} name
 * @property {string} spec
 * @property {Section} section
 */

/**
 * The fields read from a version document on registry.npmjs.org.
 * @typedef {object} NpmManifest
 * @property {string} [deprecated]
 * @property {string | { url?: string }} [repository]
 * @property {{ attestations?: unknown }} [dist]
 */

/**
 * @typedef {object} Result
 * @property {string} name
 * @property {string} version
 * @property {Section} section
 * @property {string} [skipped]
 * @property {string} [deprecated]
 * @property {string} [repository]
 * @property {boolean} [provenance]
 */

/** @type {Section[]} */
const SECTIONS = ["dependencies", "devDependencies"];

const EXACT_VERSION = /^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/;

const NPM_ALIAS = /^npm:((?:@[^/]+\/)?[^@]+)@(.+)$/;

const CONCURRENCY = 8;

/**
 * @param {string} url
 * @returns {Promise<unknown>}
 */
const fetchJson = async (url) => {
  try {
    const response = await fetch(url);

    return response.ok ? await response.json() : undefined;
  } catch {
    return undefined;
  }
};

/**
 * @param {GitHub} github
 * @param {Context} context
 * @param {string} ref
 * @returns {Promise<PackageJson>}
 */
const readPackageJson = async (github, context, ref) => {
  const { data } = await github.rest.repos.getContent({
    ...context.repo,
    path: "package.json",
    ref,
    mediaType: { format: "raw" },
  });

  // The raw media type returns the file contents as a string
  return JSON.parse(/** @type {string} */ (/** @type {unknown} */ (data)));
};

/**
 * @param {PackageJson} pkg
 * @returns {Dependency[]}
 */
const listDependencies = (pkg) =>
  SECTIONS.flatMap((section) =>
    Object.entries(pkg[section] ?? {}).map(([name, spec]) => ({
      name,
      spec,
      section,
    }))
  );

/**
 * @param {NpmManifest["repository"]} repository
 * @returns {string | undefined}
 */
const repositoryUrl = (repository) => {
  const url = typeof repository === "string" ? repository : repository?.url;

  return url?.replace(/^git\+/, "").replace(/\.git$/, "");
};

/**
 * @param {Dependency} dependency
 * @returns {Promise<Result>}
 */
const checkPackage = async ({ name, spec, section }) => {
  // npm: aliases install another package, e.g. npm:typescript@7.0.2
  const alias = spec.match(NPM_ALIAS);
  const registryName = alias?.[1] ?? name;
  const version = alias?.[2] ?? spec;
  const result = { name, version, section };

  if (!EXACT_VERSION.test(version)) {
    return { ...result, skipped: "not an exact version" };
  }

  const manifest = /** @type {NpmManifest | undefined} */ (
    await fetchJson(
      `https://registry.npmjs.org/${registryName.replace("/", "%2F")}/${version}`
    )
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

/**
 * @param {Dependency[]} dependencies
 * @returns {Promise<Result[]>}
 */
const checkAll = async (dependencies) => {
  /** @type {Result[]} */
  const results = [];

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

/**
 * @param {Core} core
 * @param {string} heading
 * @param {Result[]} results
 */
const writeSummary = async (core, heading, results) => {
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

/**
 * @param {{ github: GitHub, context: Context, core: Core }} args
 */
export default async function checkNpmMetadata({ github, context, core }) {
  const pr = context.payload.pull_request;

  if (!pr) {
    const pkg = await readPackageJson(github, context, context.sha);
    const results = await checkAll(listDependencies(pkg));
    /** @param {Result} result */

    const flagged = (result) =>
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

  // Moving a package between sections is not a new dependency
  const existing = new Set(listDependencies(base).map(({ name }) => name));

  const added = listDependencies(head).filter(
    ({ name }) => !existing.has(name)
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
