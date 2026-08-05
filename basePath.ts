const repositoryName = process.env.GITHUB_REPOSITORY?.split("/")[1];

/**
 * Path prefix the exported site is served under. GitHub Pages serves a project
 * site from /<repository>/, so every root-relative asset needs this prefix.
 *
 * Next applies it automatically to bundled assets and <Link> hrefs, but not to
 * metadata URLs such as icons, so those must prepend it explicitly.
 */
export const basePath = process.env.GITHUB_ACTIONS === "true" && repositoryName
  ? `/${repositoryName}`
  : "";
