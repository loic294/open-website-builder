import { spawn } from "node:child_process";

export class NpmScriptError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = "NpmScriptError";
    Object.assign(this, details);
  }
}

function displayCommand(scriptName) {
  return `npm run ${JSON.stringify(scriptName)}`;
}

function runNpmScript(projectRoot, scriptName) {
  return new Promise((resolve, reject) => {
    const child = spawn("npm", ["run", scriptName], {
      cwd: projectRoot,
      env: process.env,
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
      reject(
        new NpmScriptError(error.message, {
          command: displayCommand(scriptName),
          stdout: stdout.trim(),
          stderr: stderr.trim(),
          exitCode: null,
        }),
      );
    });
    child.on("close", (exitCode) => {
      const result = {
        command: displayCommand(scriptName),
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        exitCode,
      };
      if (exitCode !== 0) {
        reject(
          new NpmScriptError(
            result.stderr ||
              result.stdout ||
              `npm exited with code ${exitCode}`,
            result,
          ),
        );
        return;
      }
      resolve(result);
    });
  });
}

export function createNpmScriptService({ projectRoot, scriptName = "upload" }) {
  if (!projectRoot) {
    throw new Error("npm script service requires a project root.");
  }
  if (typeof scriptName !== "string" || !scriptName.trim()) {
    throw new Error("npm script service requires a non-empty script name.");
  }

  let operationQueue = Promise.resolve();
  return {
    run() {
      const result = operationQueue.then(
        () => runNpmScript(projectRoot, scriptName),
        () => runNpmScript(projectRoot, scriptName),
      );
      operationQueue = result.catch(() => {});
      return result;
    },
  };
}
