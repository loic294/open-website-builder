function markPhase(error, phase) {
  if (error instanceof Error) {
    error.phase = phase;
    return error;
  }
  const wrapped = new Error(String(error));
  wrapped.phase = phase;
  return wrapped;
}

export function createDeploymentService({ upload, repository }) {
  let operationQueue = Promise.resolve();

  async function deploy() {
    let uploadResult = null;
    let repositoryResult = null;

    if (upload) {
      try {
        uploadResult = await upload();
      } catch (error) {
        throw markPhase(error, "upload");
      }
    }
    if (repository) {
      try {
        repositoryResult = await repository();
      } catch (error) {
        throw markPhase(error, "repository");
      }
    }

    return { upload: uploadResult, repository: repositoryResult };
  }

  return {
    publish() {
      const result = operationQueue.then(deploy, deploy);
      operationQueue = result.catch(() => {});
      return result;
    },
  };
}
