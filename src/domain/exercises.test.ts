import { describe, expect, it } from 'vitest';
import { EXERCISE_META, QUIZ_MODES, TRACKS } from './exercises';

describe('exercises', () => {
  it('lista os modos na ordem braço, ouvido, teoria', () => {
    expect(QUIZ_MODES).toEqual([
      'position-to-note',
      'note-to-position',
      'flashcard',
      'ear',
      'ear-interval',
      'ear-degree',
      'interval',
    ]);
  });

  it('cada modo tem metadados com o próprio id', () => {
    for (const mode of QUIZ_MODES) expect(EXERCISE_META[mode].mode).toBe(mode);
  });

  it('as trilhas cobrem cada modo exatamente uma vez', () => {
    expect(TRACKS.map((t) => t.label)).toEqual(['Braço', 'Ouvido', 'Teoria']);
    expect(TRACKS.flatMap((t) => t.modes)).toEqual(QUIZ_MODES);
  });

  it('só os modos de braço registram progresso de posição', () => {
    expect(EXERCISE_META['position-to-note'].recordsPositionProgress).toBe(true);
    expect(EXERCISE_META['note-to-position'].recordsPositionProgress).toBe(true);
    expect(EXERCISE_META.flashcard.recordsPositionProgress).toBe(true);
    expect(EXERCISE_META.ear.recordsPositionProgress).toBe(false);
    expect(EXERCISE_META.interval.recordsPositionProgress).toBe(false);
  });

  it('a trilha Ouvido tem os três modos, em ordem', () => {
    expect(TRACKS.find((t) => t.id === 'ouvido')!.modes).toEqual(['ear', 'ear-interval', 'ear-degree']);
  });

  it('os modos novos de ouvido não registram posição nem usam Foco', () => {
    for (const mode of ['ear-interval', 'ear-degree'] as const) {
      expect(EXERCISE_META[mode].recordsPositionProgress).toBe(false);
      expect(EXERCISE_META[mode].usesFocus).toBe(false);
    }
    for (const mode of ['position-to-note', 'note-to-position', 'flashcard', 'ear', 'interval'] as const) {
      expect(EXERCISE_META[mode].usesFocus).toBe(true);
    }
  });

  it('rótulos dos modos novos', () => {
    expect(EXERCISE_META['ear-interval'].label).toBe('Ouvir intervalos');
    expect(EXERCISE_META['ear-degree'].label).toBe('Ouvir graus');
  });

  it('rótulos', () => {
    expect(EXERCISE_META['position-to-note'].label).toBe('Posição → nota');
    expect(EXERCISE_META.interval.label).toBe('Intervalos');
  });
});
