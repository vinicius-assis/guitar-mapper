import { useEffect, useRef } from 'react';
import { STRING_COUNT, positionKey, type Position } from '../domain/fretboard';

export type MarkKind =
  | 'target'
  | 'correct'
  | 'wrong'
  | 'hint'
  | 'unseen'
  | 'learning'
  | 'mastered';

export interface Mark {
  position: Position;
  kind: MarkKind;
  label?: string;
}

export interface FretboardProps {
  fretMin: number;
  fretMax: number;
  marks: Mark[];
  onTap?: (position: Position) => void;
  leftHanded?: boolean;
  /** Casa a centralizar na área rolável. */
  scrollToFret?: number;
}

const FRET_W = 56;
const STRING_GAP = 44;
const TOP = 28;
const MARK_R = 16;
const INLAYS = new Set([3, 5, 7, 9, 12, 15, 17, 19, 21, 24]);
const STRINGS = [1, 2, 3, 4, 5, 6].slice(0, STRING_COUNT);

export function Fretboard({
  fretMin,
  fretMax,
  marks,
  onTap,
  leftHanded = false,
  scrollToFret,
}: FretboardProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const count = fretMax - fretMin + 1;
  const width = count * FRET_W;
  const height = TOP + STRING_COUNT * STRING_GAP;
  const frets = Array.from({ length: count }, (_, i) => fretMin + i);

  const colOf = (fret: number) => (leftHanded ? fretMax - fret : fret - fretMin);
  const cx = (fret: number) => colOf(fret) * FRET_W + FRET_W / 2;
  const cy = (string: number) => TOP + (string - 1) * STRING_GAP + STRING_GAP / 2;

  useEffect(() => {
    const el = scrollRef.current;
    if (el && scrollToFret !== undefined) {
      el.scrollLeft = cx(scrollToFret) - el.clientWidth / 2;
    }
  }, [scrollToFret, fretMin, fretMax, leftHanded]); // eslint-disable-line react-hooks/exhaustive-deps

  const visibleMarks = marks.filter((m) => m.position.fret >= fretMin && m.position.fret <= fretMax);

  return (
    <div className="fretboard" ref={scrollRef} role="group" aria-label="Braço da guitarra">
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        {frets.map((f) => (
          <text key={`n${f}`} className="fret-number" x={cx(f)} y={16} textAnchor="middle">
            {f}
          </text>
        ))}
        {frets.map((f) => {
          const x = leftHanded ? colOf(f) * FRET_W : (colOf(f) + 1) * FRET_W;
          return (
            <line
              key={`w${f}`}
              className={f === 0 ? 'nut' : 'wire'}
              x1={x}
              x2={x}
              y1={TOP}
              y2={height}
            />
          );
        })}
        {frets
          .filter((f) => INLAYS.has(f))
          .flatMap((f) =>
            (f % 12 === 0 ? [2, 4] : [3]).map((row) => (
              <circle
                key={`i${f}-${row}`}
                className="inlay"
                cx={cx(f)}
                cy={TOP + row * STRING_GAP}
                r={6}
              />
            )),
          )}
        {STRINGS.map((s) => (
          <line
            key={`s${s}`}
            className="string"
            x1={0}
            x2={width}
            y1={cy(s)}
            y2={cy(s)}
            strokeWidth={1 + (s - 1) * 0.4}
          />
        ))}
        {STRINGS.flatMap((s) =>
          frets.map((f) => (
            <rect
              key={`c${s}-${f}`}
              data-testid={`cell-${s}-${f}`}
              className={onTap ? 'cell cell--tappable' : 'cell'}
              x={colOf(f) * FRET_W}
              y={TOP + (s - 1) * STRING_GAP}
              width={FRET_W}
              height={STRING_GAP}
              {...(onTap
                ? {
                    role: 'button',
                    'aria-label': `Corda ${s}, casa ${f}`,
                    onClick: () => onTap({ string: s, fret: f }),
                  }
                : {})}
            />
          )),
        )}
        {visibleMarks.map((m) => {
          const x = cx(m.position.fret);
          const y = cy(m.position.string);
          const lines = m.label ? m.label.split(' · ') : [];
          return (
            <g
              key={`m${positionKey(m.position)}-${m.kind}`}
              className={`mark mark--${m.kind}`}
              pointerEvents="none"
            >
              <circle cx={x} cy={y} r={MARK_R} />
              {lines.length > 0 && (
                <text textAnchor="middle">
                  {lines.map((line, i) => (
                    <tspan key={i} x={x} y={y + (i - (lines.length - 1) / 2) * 12 + 4}>
                      {line}
                    </tspan>
                  ))}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
