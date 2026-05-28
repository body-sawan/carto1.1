import { useEffect, useState } from "react";
import { fetchHealthStatus, type HealthResponse } from "./httpClient";

export type BackendHealthState = "checking" | "online" | "offline";

interface BackendHealthSnapshot {
  error: string | null;
  lastCheckedAt: string | null;
  status: BackendHealthState;
  value: HealthResponse | null;
}

const INITIAL_STATE: BackendHealthSnapshot = {
  error: null,
  lastCheckedAt: null,
  status: "checking",
  value: null
};

export function useBackendHealth() {
  const [health, setHealth] = useState<BackendHealthSnapshot>(INITIAL_STATE);

  useEffect(() => {
    let mounted = true;
    let pollTimer: ReturnType<typeof setTimeout> | null = null;

    async function load() {
      const controller = new AbortController();
      try {
        const value = await fetchHealthStatus(controller.signal);
        if (!mounted) return;
        setHealth({
          error: null,
          lastCheckedAt: new Date().toISOString(),
          status: "online",
          value
        });
      } catch (error) {
        if (!mounted) return;
        setHealth((current) => ({
          error: error instanceof Error ? error.message : "Backend unavailable.",
          lastCheckedAt: current.lastCheckedAt,
          status: "offline",
          value: current.value
        }));
      } finally {
        if (mounted) {
          pollTimer = setTimeout(load, 8000);
        }
      }
    }

    void load();

    return () => {
      mounted = false;
      if (pollTimer) clearTimeout(pollTimer);
    };
  }, []);

  return health;
}
