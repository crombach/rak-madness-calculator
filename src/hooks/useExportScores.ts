import { useCallback, useState } from "react";
import {
  errorToast,
  successToast,
  useToastActions,
} from "../context/ToastContext";
import { WeekInfo } from "../types/League";
import { RakMadnessScores } from "../types/RakMadnessScores";
import buildSpreadsheetBuffer, {
  XLSX_CONTENT_TYPE,
} from "../utils/buildSpreadsheetBuffer";

/** Downloads the current scores as a workbook. */
export default function useExportScores(
  scores?: RakMadnessScores,
  week?: WeekInfo,
  season?: number,
) {
  const { showToast } = useToastActions();
  const [isExportLoading, setExportLoading] = useState(false);

  const exportResults = useCallback(() => {
    if (!week || !scores || season == null) return;
    const exportResultsAsync = async () => {
      setExportLoading(true);
      try {
        const spreadsheetBuffer = await buildSpreadsheetBuffer(scores, {
          season,
          week: week.value,
        });

        const blob = new Blob([spreadsheetBuffer], {
          type: XLSX_CONTENT_TYPE,
        });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `rak-madness_${season}_week-${week.value}_results.xlsx`;
        link.click();
        link.remove();
        // The click starts the download asynchronously, so revoking on the same
        // tick can win the race and hand the browser a dead URL. There's no API
        // to confirm the blob was read, but a macrotask tick reliably comes
        // after it in practice, across current browsers.
        setTimeout(() => window.URL.revokeObjectURL(url), 0);

        showToast(successToast(`Exported results spreadsheet`));
      } catch (error) {
        console.error("Failed to export results spreadsheet", error);
        showToast(errorToast("Failed to export results spreadsheet."));
      } finally {
        setExportLoading(false);
      }
    };
    exportResultsAsync();
  }, [scores, week, season, showToast]);

  return { exportResults, isExportLoading };
}
