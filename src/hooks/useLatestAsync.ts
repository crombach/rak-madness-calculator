import { useEffect, useEffectEvent, useState } from "react";
import latestOnly from "../utils/latestOnly";

export type AsyncStatus = "idle" | "loading" | "success" | "error";

type Settled<T> = {
  load: () => Promise<T>;
  data?: T;
  status: "success" | "error";
};

/**
 * Runs `load` whenever its identity changes, and keeps only the answer to the
 * newest one. Undefined `load` asks for nothing, and reads as `idle`.
 *
 * `data` holds the last answer through the next load, so a switch shows the old
 * one until the new one lands. A failure drops it and hands the error to
 * `onError`, which is where each caller says whether a failure speaks.
 */
export default function useLatestAsync<T>(
  load: (() => Promise<T>) | undefined,
  onError: (error: unknown) => void,
): { data: T | undefined; status: AsyncStatus } {
  const [settled, setSettled] = useState<Settled<T>>();
  const reportError = useEffectEvent(onError);

  useEffect(() => {
    if (load == null) return;
    return latestOnly(async (isCurrent) => {
      try {
        const data = await load();
        if (isCurrent()) setSettled({ load, data, status: "success" });
      } catch (error) {
        if (!isCurrent()) return;
        setSettled({ load, status: "error" });
        reportError(error);
      }
    });
  }, [load]);

  // Derived rather than set when `load` changes, so the render that asks for a
  // new answer already reads as loading.
  const status: AsyncStatus =
    load == null ? "idle" : settled?.load === load ? settled.status : "loading";
  return { data: settled?.data, status };
}
