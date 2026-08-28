import { ChangeEventHandler, useCallback, useRef } from "react";
import { useNavigate } from "react-router";
import { useAppData } from "../../context/AppDataContext";
import useExportScores from "../../hooks/useExportScores";
import { WeekInfo } from "../../types/League";
import doNothing from "../../utils/doNothing";
import getClasses from "../../utils/getClasses";
import Button from "../button/Button";
import Footer from "../footer/Footer";
import LabeledSelect from "./LabeledSelect";
import LogoButton, { APP_NAME } from "../navbar/LogoButton";
import ScoresNavbar from "../navbar/ScoresNavbar";
import PageLayout from "../pageLayout/PageLayout";
import resultsPath from "../results/resultsPath";
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
    scores,
    isScoresLoading,
    scoreLocalFile,
  } = useAppData();
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
    <PageLayout
      title={APP_NAME}
      navbarLeft={<LogoButton onClick={() => navigate("/")} />}
      navbarRight={
        // Shown here too, disabled until there is a week to switch between, so
        // the navbar looks the same before its own routes exist as it does on
        // them. No live refresh: there is no week open yet to poll a game
        // against.
        <ScoresNavbar
          view={null}
          disabled={hasNoScoresYet}
          isWeekLive={false}
          onViewChange={(view) =>
            navigate(resultsPath(loadedSeason, selectedWeek?.value, view))
          }
          onRefresh={doNothing}
          isRefreshing={false}
        />
      }
    >
      {/*
        Only the first load hides the controls. Switching seasons disables them
        instead, so the picker the user just used does not vanish under them.
      */}
      {loadedSeason != null && (
        <>
          <div className="home__controls">
            {/*
              Seasons are named by the year they started in, so the 2025 season
              covers the games played from September 2025 into January 2026.
            */}
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
                  resultsPath(loadedSeason, selectedWeek?.value, "Scoreboard"),
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
    </PageLayout>
  );
}
