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
      'scale-degree',
      'scale-play',
      'harmony-chord',
      'harmony-degree',
      'harmony-quality',
      'chord-name',
      'chord-play',
      'guide-tones',
      'arpeggio',
      'ii-v-i',
    ]);
  });

  it('cada modo tem metadados com o próprio id', () => {
    for (const mode of QUIZ_MODES) expect(EXERCISE_META[mode].mode).toBe(mode);
  });

  it('as trilhas cobrem cada modo exatamente uma vez', () => {
    expect(TRACKS.map((t) => t.label)).toEqual(['Braço', 'Ouvido', 'Teoria', 'Escalas', 'Harmonia', 'Acordes']);
    expect([...TRACKS.flatMap((t) => t.modes)].sort()).toEqual([...QUIZ_MODES].sort());
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

  it('a trilha Escalas tem os dois modos, sem progresso de posição nem Foco', () => {
    expect(TRACKS.find((t) => t.id === 'escalas')!.modes).toEqual(['scale-degree', 'scale-play', 'arpeggio']);
    for (const mode of ['scale-degree', 'scale-play'] as const) {
      expect(EXERCISE_META[mode].track).toBe('escalas');
      expect(EXERCISE_META[mode].recordsPositionProgress).toBe(false);
      expect(EXERCISE_META[mode].usesFocus).toBe(false);
    }
    expect(EXERCISE_META['scale-degree'].label).toBe('Grau no desenho');
    expect(EXERCISE_META['scale-play'].label).toBe('Toque a escala');
  });

  it('a trilha Harmonia tem os três modos, sem progresso de posição nem Foco', () => {
    const modes = ['harmony-chord', 'harmony-degree', 'harmony-quality'] as const;
    expect(TRACKS.find((t) => t.id === 'harmonia')!.modes).toEqual(modes);
    for (const mode of modes) {
      expect(EXERCISE_META[mode].track).toBe('harmonia');
      expect(EXERCISE_META[mode].recordsPositionProgress).toBe(false);
      expect(EXERCISE_META[mode].usesFocus).toBe(false);
    }
    expect(EXERCISE_META['harmony-chord'].label).toBe('Acorde do grau');
    expect(EXERCISE_META['harmony-degree'].label).toBe('Grau do acorde');
    expect(EXERCISE_META['harmony-quality'].label).toBe('Qualidade do acorde');
  });

  it('a trilha Acordes tem os dois modos, sem progresso de posição nem Foco', () => {
    const modes = ['chord-name', 'chord-play'] as const;
    expect(TRACKS.find((t) => t.id === 'acordes')!.modes).toEqual([...modes, 'guide-tones', 'ii-v-i']);
    for (const mode of modes) {
      expect(EXERCISE_META[mode].track).toBe('acordes');
      expect(EXERCISE_META[mode].recordsPositionProgress).toBe(false);
      expect(EXERCISE_META[mode].usesFocus).toBe(false);
    }
    expect(EXERCISE_META['chord-name'].label).toBe('Nome do acorde');
    expect(EXERCISE_META['chord-play'].label).toBe('Monte o acorde');
  });

  it('os modos do M7 entram em trilhas existentes, sem progresso de posição nem Foco', () => {
    expect(TRACKS.find((t) => t.id === 'escalas')!.modes).toEqual(['scale-degree', 'scale-play', 'arpeggio']);
    expect(TRACKS.find((t) => t.id === 'acordes')!.modes).toEqual(['chord-name', 'chord-play', 'guide-tones', 'ii-v-i']);
    const tracks = { 'guide-tones': 'acordes', arpeggio: 'escalas', 'ii-v-i': 'acordes' } as const;
    const labels = { 'guide-tones': 'Notas-guia', arpeggio: 'Arpejo no desenho', 'ii-v-i': 'ii–V–I' } as const;
    for (const mode of ['guide-tones', 'arpeggio', 'ii-v-i'] as const) {
      expect(EXERCISE_META[mode].track).toBe(tracks[mode]);
      expect(EXERCISE_META[mode].label).toBe(labels[mode]);
      expect(EXERCISE_META[mode].recordsPositionProgress).toBe(false);
      expect(EXERCISE_META[mode].usesFocus).toBe(false);
    }
  });

  it('rótulos', () => {
    expect(EXERCISE_META['position-to-note'].label).toBe('Posição → nota');
    expect(EXERCISE_META.interval.label).toBe('Intervalos');
  });
});
