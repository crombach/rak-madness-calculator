import { ChangeEventHandler, useCallback, useRef } from "react";
import { useNavigate } from "react-router";
import {
  useCalendar,
  useScores,
  useScoringStatus,
} from "../../context/AppDataContext";
import useExportScores from "../../hooks/useExportScores";
import { WeekInfo } from "../../types/League";
import getClasses from "../../utils/getClasses";
import Button from "../button/Button";
import Footer from "../footer/Footer";
import LabeledSelect from "./LabeledSelect";
import AppNavbar from "../navbar/AppNavbar";
import { APP_NAME } from "../navbar/LogoButton";
import resultsPath, { RESULTS_PAGE } from "../results/resultsPath";
import "./HomePage.scss";

/** Title case, to read like the week labels ESPN sends. */
const seasonLabel = (season: number) => `${season} Season`;

export default function HomePage() {
  const navigate = useNavigate();
  const {
    selectableWeeks,
    selectedWeek,
    setSelectedWeek,
    selectableSeasons,
    loadedSeason,
    requestedSeason,
    setSelectedSeason,
    isWeeksLoading,
  } = useCalendar();
  const scores = useScores();
  const { isScoresLoading, scoreLocalFile } = useScoringStatus();
  const { exportResults, isExportLoading } = useExportScores(
    scores,
    selectedWeek,
    loadedSeason,
  );

  const fileInputRef = useRef<HTMLInputElement>(null);
  const clickFileInput = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileUpload: ChangeEventHandler<HTMLInputElement> = useCallback(
    (event) => {
      scoreLocalFile(Array.from(event.target.files ?? [])[0]);
      // Cleared so picking the same file again still fires a change event.
      event.target.value = "";
    },
    [scoreLocalFile],
  );

  // Anything that has to finish before the controls mean anything. The week
  // lookup waits on the season list, so its flag covers that too.
  const isBusy = isWeeksLoading || isScoresLoading;
  const hasNoScoresYet = !selectedWeek || isBusy || !scores;

  return (
    <AppNavbar
      title={APP_NAME}
      view={null}
      // Shown here too, disabled until there is a week to switch between. No live
      // refresh: there is no week open yet to poll a game against.
      disabled={hasNoScoresYet}
      noWeekYet={hasNoScoresYet}
      isWeekLive={false}
      onViewChange={(view) =>
        navigate(resultsPath(loadedSeason, selectedWeek?.value, view))
      }
      season={loadedSeason}
      week={selectedWeek?.value}
      pagesDisabled={hasNoScoresYet}
    >
      {/*
        Only the first load hides the controls. Switching seasons disables them
        instead, so the picker the user just used does not vanish under them.
      */}
      {loadedSeason != null && (
        <>
          <div className="home__controls">
            <LabeledSelect<number>
              ariaLabel="Season"
              className="home__week-input home__season-input select__trigger"
              // The season asked for, not the one loaded, so the trigger shows
              // the switch immediately. Falls back for `make run`, where there
              // is no season list to have asked from.
              value={requestedSeason ?? loadedSeason ?? null}
              onValueChange={(season) =>
                season != null && setSelectedSeason(season)
              }
              disabled={isWeeksLoading}
              placeholder="Select a season..."
              renderValue={seasonLabel}
              items={selectableSeasons}
              itemKey={(season) => season}
              itemLabel={seasonLabel}
            />

            {/*
              `value` holds the WeekInfo object itself, and Base UI compares with
              Object.is by default, so an option only reads as selected when it is
              the same object the week list handed out.
            */}
            <LabeledSelect<WeekInfo>
              ariaLabel="Week"
              className="home__week-input select__trigger"
              value={selectedWeek ?? null}
              onValueChange={(week) => setSelectedWeek(week ?? undefined)}
              disabled={isWeeksLoading}
              placeholder="Select a week..."
              renderValue={(week) => week.label}
              items={selectableWeeks}
              itemKey={(week) => week.value}
              itemLabel={(week) => week.label}
            />

            {/* Hidden behind the button below, which forwards the click. */}
            <input
              ref={fileInputRef}
              className="home__file-input"
              type="file"
              accept=".xlsx"
              onChange={handleFileUpload}
            />
            <Button
              className={getClasses("home__button", {
                "--hide": isBusy || !!scores,
              })}
              onClick={clickFileInput}
              disabled={!selectedWeek || isBusy}
            >
              Use Local Spreadsheet
            </Button>
            <Button
              className="home__button"
              busy={isBusy}
              disabled={hasNoScoresYet}
              color="info"
              onClick={() =>
                navigate(
                  resultsPath(
                    loadedSeason,
                    selectedWeek?.value,
                    RESULTS_PAGE.scoreboard,
                  ),
                )
              }
            >
              View Results
            </Button>
            <Button
              className="home__button"
              busy={isBusy || isExportLoading}
              disabled={hasNoScoresYet || isExportLoading}
              color="warning"
              onClick={exportResults}
            >
              Export Results
            </Button>
          </div>

          <Footer />
        </>
      )}
    </AppNavbar>
  );
}
