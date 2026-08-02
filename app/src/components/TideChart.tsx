import { Fragment } from 'react';
import { Container, ActionIcon, LoadingOverlay, Alert, Button } from '@mantine/core';
import { IconChevronLeft, IconChevronRight, IconAlertCircle } from '@tabler/icons-react';
import { useTides } from './useTides';
import type { TideEntry } from '../types';
import styles from './TideChart.module.css';

function TideCell({ entry }: { entry: TideEntry | null }) {
  if (!entry) {
    return (
      <td className={styles.emptyCell} aria-label="no tide">
        &mdash;
      </td>
    );
  }

  return (
    <td className={`${styles.cell} ${entry.extreme ? styles.extreme : ''}`}>
      <span className={styles.time}>{entry.time}</span>
      <span className={styles.ft}>{entry.ft}</span>
    </td>
  );
}

export function TideChart() {
  const {
    data, loading, error, notReady, retry, goPrevMonth, goNextMonth, canGoPrev, canGoNext,
  } = useTides();

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
                {data.nextTides.map((tide, index) => (
                  <Fragment key={`${tide.date}-${tide.time}-${tide.type}`}>
                    {index > 0 && <span className={styles.nextTideSep}>&middot;</span>}
                    <span>
                      {tide.label.toUpperCase()} {tide.time} {tide.meridiem} {tide.ft} FT
                    </span>
                  </Fragment>
                ))}
              </div>

              <div className={styles.monthNav}>
                <ActionIcon
                  aria-label="Previous month"
                  variant="subtle"
                  disabled={!canGoPrev}
                  onClick={goPrevMonth}
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
                  variant="subtle"
                  disabled={!canGoNext}
                  onClick={goNextMonth}
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
                    <th rowSpan={2} scope="col" className={styles.dateHeader}>Date</th>
                    <th colSpan={2} scope="colgroup" className={styles.groupHeader}>High Tides</th>
                    <th colSpan={2} scope="colgroup" className={styles.groupHeader}>Low Tides</th>
                  </tr>
                  <tr>
                    <th scope="col" className={styles.subHeader}>A.M.</th>
                    <th scope="col" className={styles.subHeader}>P.M.</th>
                    <th scope="col" className={styles.subHeader}>A.M.</th>
                    <th scope="col" className={styles.subHeader}>P.M.</th>
                  </tr>
                </thead>
                <tbody>
                  {data.days.map((day) => (
                    <tr
                      key={day.date}
                      className={[day.isToday && styles.today, day.isWeekend && styles.weekend].filter(Boolean).join(' ')}
                    >
                      <th scope="row" className={styles.dateCell}>
                        {day.day} {day.isWeekend ? day.dow.toUpperCase() : day.dow}
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
