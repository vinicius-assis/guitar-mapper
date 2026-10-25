import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  FIRST_QUIZ_FRET,
  MAX_FRET,
  STRING_COUNT,
  positionKey,
  type Position,
} from '../domain/fretboard';

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
  /** Nome de cada corda solta (índice 0 = corda 1), mostrado numa coluna fixa ao lado do braço. */
  stringLabels?: string[];
  /** A geometria acompanha a largura do container (tablet e computador); sem isso fica no tamanho natural. */
  fit?: boolean;
  /** Com `fit`, largura mínima por casa antes de rolar (padrão 56). */
  minFretWidth?: number;
  /**
   * Com `fit` (computador): mostra mais casas para ocupar a largura, centradas no trecho
   * fretMin–fretMax. As casas fora desse trecho ficam desabilitadas (escurecidas, sem toque).
   */
  expand?: boolean;
}

const NATURAL_FRET_W = 56;
const NATURAL_STRING_GAP = 44;
const TOP = 28;
const MAX_FRET_W = 180;
const TARGET_FRET_W = 72; // largura desejada por casa quando `expand` abre mais casas
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const INLAYS = new Set([3, 5, 7, 9, 12, 15, 17, 19, 21, 24]);
const STRINGS = [1, 2, 3, 4, 5, 6].slice(0, STRING_COUNT);

export function Fretboard({
  fretMin,
  fretMax,
  marks,
  onTap,
  leftHanded = false,
  scrollToFret,
  stringLabels,
  fit = false,
  minFretWidth = NATURAL_FRET_W,
  expand = false,
}: FretboardProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const focusCount = fretMax - fretMin + 1;

  // Com `fit`, mede o container e calcula a geometria de verdade (largura de cada casa, distância
  // entre cordas, tamanho das marcas) em vez de esticar a imagem: nada fica distorcido.
  const [measured, setMeasured] = useState(0);
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!fit || !el) return;
    const update = () => setMeasured(el.clientWidth);
    update();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, [fit]);

  const fitted = fit && measured > 0;
  // Janela exibida: o foco, ou (com `expand`) mais casas em volta dele, dentro de 1..24.
  const total = MAX_FRET - FIRST_QUIZ_FRET + 1;
  const count =
    expand && fitted
      ? Math.min(total, Math.max(focusCount, Math.floor(measured / TARGET_FRET_W)))
      : focusCount;
  const viewMin =
    expand && fitted
      ? Math.min(
          Math.max(fretMin - Math.floor((count - focusCount) / 2), FIRST_QUIZ_FRET),
          MAX_FRET - count + 1,
        )
      : fretMin;
  const viewMax = viewMin + count - 1;
  const disabled = (fret: number) => fret < fretMin || fret > fretMax;
  const FRET_W = fitted ? clamp(measured / count, minFretWidth, MAX_FRET_W) : NATURAL_FRET_W;
  const STRING_GAP = fitted ? clamp(Math.round(FRET_W * 0.8), NATURAL_STRING_GAP, 60) : NATURAL_STRING_GAP;
  const MARK_R = fitted ? clamp(Math.round(Math.min(FRET_W, STRING_GAP) * 0.36), 9, 20) : 16;
  const width = count * FRET_W;
  const height = TOP + STRING_COUNT * STRING_GAP;
  const frets = Array.from({ length: count }, (_, i) => viewMin + i);

  const colOf = (fret: number) => (leftHanded ? viewMax - fret : fret - viewMin);
  const cx = (fret: number) => colOf(fret) * FRET_W + FRET_W / 2;
  const cy = (string: number) => TOP + (string - 1) * STRING_GAP + STRING_GAP / 2;

  useEffect(() => {
    const el = scrollRef.current;
    if (el && scrollToFret !== undefined) {
      el.scrollLeft = cx(scrollToFret) - el.clientWidth / 2;
    }
  }, [scrollToFret, viewMin, viewMax, leftHanded]); // eslint-disable-line react-hooks/exhaustive-deps

  const visibleMarks = marks.filter((m) => m.position.fret >= viewMin && m.position.fret <= viewMax);

  return (
    <div className={`fretboard-frame${leftHanded ? ' fretboard-frame--mirrored' : ''}`}>
      {stringLabels && (
        <div
          className="string-labels"
          // Linhas em `fr` na mesma proporção do SVG: os nomes acompanham o braço quando ele escala.
          style={{ gridTemplateRows: `${TOP}fr repeat(${STRING_COUNT}, ${STRING_GAP}fr)` }}
          aria-hidden="true"
        >
          <div />
          {stringLabels.map((label, i) => (
            <div key={i} className="string-label" data-testid={`string-label-${i + 1}`}>
              {label}
            </div>
          ))}
        </div>
      )}
      <div className="fretboard" ref={scrollRef} role="group" aria-label="Braço da guitarra">
        <svg
          width={width}
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          style={fitted ? { display: 'block', marginLeft: 'auto', marginRight: 'auto' } : undefined}
        >
          {frets.map((f) => (
            <text
              key={`n${f}`}
              className={disabled(f) ? 'fret-number fret-number--disabled' : 'fret-number'}
              x={cx(f)}
              y={16}
              textAnchor="middle"
            >
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
                  r={Math.round(MARK_R * 0.4)}
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
            frets.map((f) => {
              const off = disabled(f);
              return (
                <rect
                  key={`c${s}-${f}`}
                  data-testid={`cell-${s}-${f}`}
                  className={off ? 'cell cell--disabled' : onTap ? 'cell cell--tappable' : 'cell'}
                  x={colOf(f) * FRET_W}
                  y={TOP + (s - 1) * STRING_GAP}
                  width={FRET_W}
                  height={STRING_GAP}
                  {...(onTap && !off
                    ? {
                        role: 'button',
                        'aria-label': `Corda ${s}, casa ${f}`,
                        onClick: () => onTap({ string: s, fret: f }),
                      }
                    : {})}
                />
              );
            }),
          )}
          {frets.filter(disabled).map((f) => (
            <rect
              key={`d${f}`}
              className="fret-disabled"
              x={colOf(f) * FRET_W}
              y={TOP}
              width={FRET_W}
              height={STRING_COUNT * STRING_GAP}
              pointerEvents="none"
            />
          ))}
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
    </div>
  );
}
