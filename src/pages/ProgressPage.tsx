import { useEffect, useMemo, useRef } from 'react';
import { analyticsService } from '../core/services/AnalyticsService';
import { getGameMeta } from '../games/gameRegistry';
import { Panel } from '../components/ui/primitives/Panel';
import { Badge } from '../components/ui/primitives/Badge';
import { StatCard } from '../components/ui/StatCard';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import type { SessionReport } from '../types';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

interface GameTrend {
  gameId: string;
  title: string;
  sessionCount: number;
  latestScore: number;
  latestAccuracy: number;
  /** Latest session's accuracy minus the average of every prior session — null with only one session (nothing to compare against yet). */
  deltaAccuracy: number | null;
}

/**
 * Closes the "write-only data" gap: AnalyticsService has persisted full
 * session history all along (score/accuracy/duration, last 100 sessions),
 * but nothing ever surfaced it — only live aggregate counters showed on the
 * landing page. For a rehab tool, trend-over-time (is my form/ROM improving?)
 * matters more than any single session's number (Nielsen #6, Recognition
 * over recall).
 */
export function ProgressPage() {
  useDocumentTitle('RehabPlay — Progress');
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => { headingRef.current?.focus(); }, []);

  const history = analyticsService.getHistory();

  const byGame = useMemo<GameTrend[]>(() => {
    const map = new Map<string, SessionReport[]>();
    for (const s of history) {
      const list = map.get(s.gameId) ?? [];
      list.push(s);
      map.set(s.gameId, list);
    }
    const trends: GameTrend[] = [];
    for (const [gameId, sessions] of map) {
      const sorted = [...sessions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      const latest = sorted[sorted.length - 1];
      const prior = sorted.slice(0, -1);
      const priorAvgAccuracy = prior.length > 0 ? prior.reduce((s, r) => s + r.accuracy, 0) / prior.length : null;
      trends.push({
        gameId,
        title: getGameMeta(gameId)?.title ?? gameId,
        sessionCount: sorted.length,
        latestScore: latest.score,
        latestAccuracy: latest.accuracy,
        deltaAccuracy: priorAvgAccuracy != null ? latest.accuracy - priorAvgAccuracy : null,
      });
    }
    return trends.sort((a, b) => b.sessionCount - a.sessionCount);
  }, [history]);

  const recent = useMemo(
    () => [...history].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 20),
    [history]
  );

  const totalSessions = history.length;
  const avgAccuracy = totalSessions > 0 ? Math.round(history.reduce((s, r) => s + r.accuracy, 0) / totalSessions) : 0;
  const totalScore = history.reduce((s, r) => s + r.score, 0);

  return (
    <div className="space-y-8 sm:space-y-10">
      <div>
        <h1 ref={headingRef} tabIndex={-1} className="text-3xl sm:text-4xl font-extrabold text-text font-display tracking-tight outline-none">
          Your Progress
        </h1>
        <p className="text-muted mt-2 text-sm sm:text-base max-w-2xl leading-relaxed">
          A trend view across every session you've logged — not just today's snapshot.
        </p>
      </div>

      {totalSessions === 0 ? (
        <Panel className="p-8 sm:p-12 text-center max-w-xl">
          <p className="text-muted text-sm sm:text-base">
            No sessions yet. Finish any exercise and it'll start building your history here.
          </p>
        </Panel>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 max-w-3xl">
            <StatCard value={totalSessions} label="Sessions Logged" tone="neutral" />
            <StatCard value={`${avgAccuracy}%`} label="Avg Accuracy" tone="success" />
            <StatCard value={totalScore} label="Total Score" tone="accent" />
          </div>

          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-text font-display mb-4">By exercise</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {byGame.map(g => (
                <Panel key={g.gameId} className="p-4 sm:p-5">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-bold text-text">{g.title}</h3>
                    <Badge tone="neutral">{g.sessionCount} session{g.sessionCount === 1 ? '' : 's'}</Badge>
                  </div>
                  <div className="flex items-center justify-between gap-2 text-sm flex-wrap">
                    <span className="text-muted">Latest: {g.latestScore} pts, {g.latestAccuracy}% accuracy</span>
                    {g.deltaAccuracy != null && (
                      <span className={`font-bold text-xs whitespace-nowrap ${g.deltaAccuracy >= 0 ? 'text-success-text' : 'text-warning-text'}`}>
                        {g.deltaAccuracy >= 0 ? '▲' : '▼'} {Math.abs(Math.round(g.deltaAccuracy))}% vs your average
                      </span>
                    )}
                  </div>
                </Panel>
              ))}
            </div>
          </div>

          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-text font-display mb-4">Recent sessions</h2>
            <Panel className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-faint text-xs uppercase tracking-wider border-b border-border">
                    <th className="p-3 font-bold">Date</th>
                    <th className="p-3 font-bold">Exercise</th>
                    <th className="p-3 font-bold text-right">Score</th>
                    <th className="p-3 font-bold text-right">Accuracy</th>
                    <th className="p-3 font-bold text-right">Duration</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map((r, i) => (
                    <tr key={i} className="border-b border-border last:border-0">
                      <td className="p-3 text-muted whitespace-nowrap">{formatDate(r.date)}</td>
                      <td className="p-3 text-text font-medium whitespace-nowrap">{getGameMeta(r.gameId)?.title ?? r.gameId}</td>
                      <td className="p-3 text-right text-text tabular-nums">{r.score}</td>
                      <td className="p-3 text-right text-text tabular-nums">{r.accuracy}%</td>
                      <td className="p-3 text-right text-muted tabular-nums">{Math.round(r.duration)}s</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Panel>
          </div>
        </>
      )}
    </div>
  );
}
