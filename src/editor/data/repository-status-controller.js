import { dataLayer } from "./data-layer.js";

const POLL_INTERVAL_MS = 5 * 60 * 1000;

class RepositoryStatusController {
  constructor() {
    this.status = null;
    this.loading = false;
    this.action = "";
    this.error = null;
    this.listeners = new Set();
    this.intervalId = null;
    this.requestPromise = null;
    this.onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        this.refresh().catch(() => {});
        this.startPolling();
      } else {
        this.stopPolling();
      }
    };
  }

  snapshot() {
    return {
      status: this.status,
      loading: this.loading,
      action: this.action,
      error: this.error,
    };
  }

  notify() {
    const snapshot = this.snapshot();
    for (const listener of this.listeners) {
      listener(snapshot);
    }
  }

  subscribe(listener) {
    this.listeners.add(listener);
    listener(this.snapshot());
    if (this.listeners.size === 1) {
      document.addEventListener("visibilitychange", this.onVisibilityChange);
      this.refresh().catch(() => {});
      this.startPolling();
    }
    return () => {
      this.listeners.delete(listener);
      if (this.listeners.size === 0) {
        document.removeEventListener(
          "visibilitychange",
          this.onVisibilityChange,
        );
        this.stopPolling();
      }
    };
  }

  startPolling() {
    if (
      this.intervalId ||
      typeof document === "undefined" ||
      document.visibilityState === "hidden"
    ) {
      return;
    }
    this.intervalId = window.setInterval(
      () => this.refresh().catch(() => {}),
      POLL_INTERVAL_MS,
    );
  }

  stopPolling() {
    if (this.intervalId) {
      window.clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  async refresh() {
    if (this.requestPromise || this.action) return this.requestPromise;
    this.loading = true;
    this.notify();
    this.requestPromise = dataLayer
      .getRepositoryStatus()
      .then((status) => {
        this.status = status;
        this.error = null;
        return status;
      })
      .catch((error) => {
        if (error.status === 404) {
          this.status = { available: false };
          this.error = null;
          return this.status;
        }
        this.error = error;
        throw error;
      })
      .finally(() => {
        this.loading = false;
        this.requestPromise = null;
        this.notify();
      });
    return this.requestPromise;
  }

  async runAction(action) {
    if (this.action || this.requestPromise) return null;
    this.action = action;
    this.error = null;
    this.notify();
    try {
      const status =
        action === "pull"
          ? await dataLayer.pullRepository()
          : await dataLayer.pushRepository();
      this.status = status;
      if (action === "pull") {
        window.dispatchEvent(new CustomEvent("editor-repository-updated"));
      }
      return status;
    } catch (error) {
      this.error = error;
      throw error;
    } finally {
      this.action = "";
      this.notify();
    }
  }

  pull() {
    return this.runAction("pull");
  }

  push() {
    return this.runAction("push");
  }
}

export const repositoryStatusController = new RepositoryStatusController();
