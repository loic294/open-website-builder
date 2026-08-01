function markPhase(error, phase) {
  if (error instanceof Error) {
    error.phase = phase;
    return error;
  }
  const wrapped = new Error(String(error));
  wrapped.phase = phase;
  return wrapped;
}

export function createDeploymentService({ generate, upload, afterUpload }) {
  let operationQueue = Promise.resolve();

  async function deploy() {
    let generation;
    let uploadResult;
    let repository = null;

    try {
      generation = await generate();
    } catch (error) {
      throw markPhase(error, "generate");
    }
    try {
      uploadResult = await upload();
    } catch (error) {
      throw markPhase(error, "upload");
    }
    if (afterUpload) {
      try {
        repository = await afterUpload();
      } catch (error) {
        throw markPhase(error, "repository");
      }
    }

    return { generation, upload: uploadResult, repository };
  }

  return {
    publish() {
      const result = operationQueue.then(deploy, deploy);
      operationQueue = result.catch(() => {});
      return result;
    },
  };
}
