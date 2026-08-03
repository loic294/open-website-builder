import { spawn } from "node:child_process";
import { access, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const PACKAGE_NAME = "open-website-builder";
const SEMVER_PATTERN =
  /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;
const VERSION_PATTERN =
  /^(\^|~)?(\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?)$/;

export class DependencyVersionError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = "DependencyVersionError";
    Object.assign(this, details);
  }
}

function runNpmInstall({ projectRoot, env }) {
  return new Promise((resolveCommand, rejectCommand) => {
    const child = spawn("npm", ["i"], {
      cwd: projectRoot,
      env,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("error", (error) => {
      rejectCommand(
        new DependencyVersionError(error.message, {
          command: "HUSKY=0 npm i",
          stdout: stdout.trim(),
          stderr: stderr.trim(),
          exitCode: null,
        }),
      );
    });
    child.on("close", (exitCode) => {
      const result = {
        command: "HUSKY=0 npm i",
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        exitCode,
      };
      if (exitCode !== 0) {
        rejectCommand(
          new DependencyVersionError(
            result.stderr ||
              result.stdout ||
              `npm exited with code ${exitCode}`,
            result,
          ),
        );
        return;
      }
      resolveCommand(result);
    });
  });
}

async function readPackage(packagePath, label) {
  let source;
  try {
    source = await readFile(packagePath, "utf8");
  } catch (error) {
    throw new DependencyVersionError(`Could not read ${label} package.json.`, {
      cause: error,
    });
  }

  try {
    return { packageJson: JSON.parse(source), source };
  } catch (error) {
    throw new DependencyVersionError(
      `${label} package.json is not valid JSON.`,
      {
        cause: error,
      },
    );
  }
}

function formatPackageJson(packageJson, source) {
  const indentation = source.match(/^[\t ]+(?=")/m)?.[0] || "  ";
  const trailingNewline = source.endsWith("\n") ? "\n" : "";
  return `${JSON.stringify(packageJson, null, indentation)}${trailingNewline}`;
}

async function pathExists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

export function createDependencyVersionService({
  appRoot,
  contentRoot,
  commit,
  install = runNpmInstall,
}) {
  if (!appRoot || !contentRoot) {
    throw new Error(
      "Dependency version service requires app and content roots.",
    );
  }
  if (typeof commit !== "function") {
    throw new Error("Dependency version service requires a commit function.");
  }

  return {
    async sync() {
      const editorPackagePath = resolve(appRoot, "package.json");
      const projectPackagePath = resolve(contentRoot, "package.json");
      const { packageJson: editorPackage } = await readPackage(
        editorPackagePath,
        "Editor",
      );
      if (editorPackage.name !== PACKAGE_NAME) {
        throw new DependencyVersionError(
          `Editor package.json must describe ${PACKAGE_NAME}.`,
        );
      }
      if (!SEMVER_PATTERN.test(editorPackage.version || "")) {
        throw new DependencyVersionError(
          "Editor package.json has an invalid version.",
        );
      }

      const { packageJson: projectPackage, source } = await readPackage(
        projectPackagePath,
        "Website",
      );
      const currentSpecification = projectPackage.dependencies?.[PACKAGE_NAME];
      const specificationMatch = currentSpecification?.match(VERSION_PATTERN);
      if (!specificationMatch) {
        throw new DependencyVersionError(
          `Website dependencies.${PACKAGE_NAME} must be an exact, caret, or tilde version.`,
        );
      }

      const [, prefix = "", currentVersion] = specificationMatch;
      if (currentVersion === editorPackage.version) {
        return { updated: false, version: editorPackage.version };
      }

      projectPackage.dependencies[PACKAGE_NAME] =
        `${prefix}${editorPackage.version}`;
      await writeFile(
        projectPackagePath,
        formatPackageJson(projectPackage, source),
      );
      const installResult = await install({
        projectRoot: contentRoot,
        env: { ...process.env, HUSKY: "0" },
      });
      const paths = ["package.json"];
      if (await pathExists(resolve(contentRoot, "package-lock.json"))) {
        paths.push("package-lock.json");
      }
      await commit({
        message: `Update ${PACKAGE_NAME} to ${editorPackage.version}`,
        paths,
      });

      return {
        updated: true,
        version: editorPackage.version,
        install: installResult,
      };
    },
  };
}
