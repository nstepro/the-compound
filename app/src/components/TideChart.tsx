import { Fragment } from 'react';
import { Container, ActionIcon, LoadingOverlay, Alert, Button, Divider } from '@mantine/core';
import { IconChevronLeft, IconChevronRight, IconAlertCircle } from '@tabler/icons-react';
import { useTides } from './useTides';
import type { TideEntry } from '../types';
import styles from './TideChart.module.css';

const MOON_PHASE_SYMBOLS: Record<string, string> = {
  'New Moon': '●', // ● fully dark
  'First Quarter': '◐', // ◐ right half lit (waxing)
  'Full Moon': '○', // ○ fully lit
  'Last Quarter': '◑', // ◑ left half lit (waning)
};

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/** Formats a "YYYY-MM-DD" date string as "MMMM D, YYYY" without Date/timezone parsing. */
function formatLongDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  return `${MONTH_NAMES[month - 1]} ${day}, ${year}`;
}

function MoonGlyph({ phase }: { phase: string }) {
  const symbol = MOON_PHASE_SYMBOLS[phase];
  if (!symbol) return null;

  return (
    <span className={styles.moonGlyph} title={phase} aria-label={phase}>
      {symbol}
    </span>
  );
}

function TideCell({ entry }: { entry: TideEntry | null }) {
  if (!entry) {
    return (
      <>
        <td className={styles.emptyCell} aria-label="no tide">
          &mdash;
        </td>
        <td className={styles.emptyCell} aria-label="no tide">
          &mdash;
        </td>
      </>
    );
  }

  const cellClassName = `${styles.cell} ${entry.extreme ? styles.extreme : ''}`;

  return (
    <>
      <td className={`${cellClassName} ${styles.time}`}>{entry.time}</td>
      <td className={`${cellClassName} ${styles.height}`}>{entry.ft}</td>
    </>
  );
}

export function TideChart() {
  const {
    data, loading, error, notReady, retry, goPrevMonth, goNextMonth, canGoPrev, canGoNext,
  } = useTides();

  const moonPhaseByDay = new Map((data?.moonPhases ?? []).map((m): [number, string] => [m.day, m.phase]));

  return (
    <Container size="lg" py="xl">
      <h1 className={styles.srOnly}>Tide predictions for Tenants Harbor, Maine</h1>

      {notReady && (
        <Alert icon={<IconAlertCircle size={16} />} title="Tide data is being prepared" color="blue">
          Try again in a moment — the first sync from NOAA is still running.
          <div style={{ marginTop: '0.75rem' }}>
            <Button size="xs" onClick={retry}>Retry</Button>
          </div>
        </Alert>
      )}

      {!notReady && error && (
        <Alert icon={<IconAlertCircle size={16} />} title="Error" color="red">
          {error}
        </Alert>
      )}

      {!notReady && !error && (
        <div className={styles.card}>
          <LoadingOverlay visible={loading && !data} />

          {data && (
            <>
              <div className={styles.nextTideStrip}>
                <div className={styles.todayDate}>{formatLongDate(data.today.date)}</div>
                <div className={styles.tideRow}>
                  {data.nextTides.map((tide, index) => (
                    <Fragment key={`${tide.date}-${tide.time}-${tide.type}`}>
                      {index > 0 && <span className={styles.nextTideSep}>—</span>}
                      <span>
                        <strong>{tide.label.toUpperCase()} {tide.time} {tide.meridiem}</strong> • {tide.ft} FT
                      </span>
                    </Fragment>
                  ))}
                </div>
              </div>

              <Divider orientation="horizontal" my="sm" size="sm" color="black" w="50%" ml="25%" mb="0" />

              <div className={styles.monthNav}>
                <ActionIcon
                  aria-label="Previous month"
                  variant="transparent"
                  onClick={goPrevMonth}
                  color="black"
                  className={canGoPrev ? undefined : styles.navHidden}
                  tabIndex={canGoPrev ? 0 : -1}
                  aria-hidden={!canGoPrev}
                >
                  <IconChevronLeft />
                </ActionIcon>

                <div className={styles.monthTitle}>
                  <div className={styles.monthLabel}>{data.monthLabel}</div>
                  <div className={styles.correctionNote}>{data.station.correctionNote}</div>
                  <div className={styles.correctionDetail}>
                    {data.station.correctionDetail} &middot; {data.station.datum}
                  </div>
                </div>

                <ActionIcon
                  aria-label="Next month"
                  variant="transparent"
                  onClick={goNextMonth}
                  color="black"
                  className={canGoNext ? undefined : styles.navHidden}
                  tabIndex={canGoNext ? 0 : -1}
                  aria-hidden={!canGoNext}
                >
                  <IconChevronRight />
                </ActionIcon>
              </div>

              {data.stale && (
                <div className={styles.staleNote}>Showing the most recently synced data</div>
              )}

              <table className={styles.grid}>
                <caption className={styles.srOnly}>
                  Tide predictions for Tenants Harbor, {data.monthLabel}
                </caption>
                <thead>
                  <tr>
                    <th colSpan={1} scope="col"></th>
                    <th colSpan={4} scope="colgroup" className={styles.groupHeader}>High Tides</th>
                    <th colSpan={4} scope="colgroup" className={styles.groupHeader}>Low Tides</th>
                  </tr>
                  <tr>
                    <th colSpan={1} scope="col"></th>
                    <th colSpan={2} scope="colgroup" className={styles.subHeader}>A.M.</th>
                    <th colSpan={2} scope="colgroup" className={styles.subHeader}>P.M.</th>
                    <th colSpan={2} scope="colgroup" className={styles.subHeader}>A.M.</th>
                    <th colSpan={2} scope="colgroup" className={styles.subHeader}>P.M.</th>
                  </tr>
                  <tr>
                    <th scope="col" className={styles.subHeader}>DATE</th>
                    <th scope="col" className={styles.subHeader}>Time</th>
                    <th scope="col" className={styles.subHeader}>Ft.</th>
                    <th scope="col" className={styles.subHeader}>Time</th>
                    <th scope="col" className={styles.subHeader}>Ft.</th>
                    <th scope="col" className={styles.subHeader}>Time</th>
                    <th scope="col" className={styles.subHeader}>Ft.</th>
                    <th scope="col" className={styles.subHeader}>Time</th>
                    <th scope="col" className={styles.subHeader}>Ft.</th>
                  </tr>
                </thead>
                <tbody>
                  {data.days.map((day) => (
                    <tr
                      key={day.date}
                      className={[day.isToday && styles.today, day.isWeekend && styles.weekend].filter(Boolean).join(' ')}
                    >
                      <th scope="row" className={`${styles.dateCell} ${day.isWeekend ? styles.weekendLabel : ''}`}>
                        {day.day} {day.dow}
                        {moonPhaseByDay.has(day.day) && <MoonGlyph phase={moonPhaseByDay.get(day.day)!} />}
                      </th>
                      <TideCell entry={day.highs.am} />
                      <TideCell entry={day.highs.pm} />
                      <TideCell entry={day.lows.am} />
                      <TideCell entry={day.lows.pm} />
                    </tr>
                  ))}
                </tbody>
              </table>

              {(data.moonPhases.length > 0 || data.footnotes.length > 0) && (
                <div className={styles.footer}>
                  {data.moonPhases.length > 0 && (
                    <div className={styles.moonLine}>
                      &#9789;{' '}
                      {data.moonPhases.map((m) => `${m.day} ${m.phase.toUpperCase()}`).join(' · ')}
                    </div>
                  )}
                  {data.footnotes.map((note) => (
                    <div key={note} className={styles.footnote}>{note}</div>
                  ))}
                  <div className={styles.sourceLine}>
                    Predictions from NOAA CO-OPS station {data.station.id}.
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </Container>
  );
}
