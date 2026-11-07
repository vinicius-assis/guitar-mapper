import { describe, expect, it } from "vitest";
import type { NoteIndex } from "./notes";
import { SCALE_IDS, SCALES, type ScaleId } from "./scales";
import { spellingLabel, spellScale, type Letter } from "./spelling";

const LETTERS: readonly Letter[] = ["C", "D", "E", "F", "G", "A", "B"];
const NATURAL_PC: Record<Letter, number> = {
  C: 0,
  D: 2,
  E: 4,
  F: 5,
  G: 7,
  A: 9,
  B: 11,
};
const ROOTS = Array.from({ length: 12 }, (_, i) => i as NoteIndex);
const BLACK = [1, 3, 6, 8, 10] as const;
const NATURAL_ROOTS = [0, 2, 4, 5, 7, 9, 11] as const;

const names = (root: NoteIndex, id: ScaleId, acc: "sharp" | "flat" | "auto") =>
  spellScale(root, SCALES[id], acc)
    .map((s) => spellingLabel(s, "cifra"))
    .join(" ");

/** Automático: índice = tônica 0..11. */
const AUTO: Record<ScaleId, string[]> = {
  "pent-minor": [
    "C Eb F G Bb",
    "C# E F# G# B",
    "D F G A C",
    "Eb Gb Ab Bb Db",
    "E G A B D",
    "F Ab Bb C Eb",
    "F# A B C# E",
    "G Bb C D F",
    "G# B C# D# F#",
    "A C D E G",
    "Bb Db Eb F Ab",
    "B D E F# A",
  ],
  "pent-major": [
    "C D E G A",
    "Db Eb F Ab Bb",
    "D E F# A B",
    "Eb F G Bb C",
    "E F# G# B C#",
    "F G A C D",
    "F# G# A# C# D#",
    "G A B D E",
    "Ab Bb C Eb F",
    "A B C# E F#",
    "Bb C D F G",
    "B C# D# F# G#",
  ],
  blues: [
    "C Eb F Gb G Bb",
    "C# E F# G G# B",
    "D F G Ab A C",
    "Eb Gb Ab A Bb Db",
    "E G A Bb B D",
    "F Ab Bb Cb C Eb",
    "F# A B C C# E",
    "G Bb C Db D F",
    "G# B C# D D# F#",
    "A C D Eb E G",
    "Bb Db Eb Fb F Ab",
    "B D E F F# A",
  ],
  major: [
    "C D E F G A B",
    "Db Eb F Gb Ab Bb C",
    "D E F# G A B C#",
    "Eb F G Ab Bb C D",
    "E F# G# A B C# D#",
    "F G A Bb C D E",
    "F# G# A# B C# D# E#",
    "G A B C D E F#",
    "Ab Bb C Db Eb F G",
    "A B C# D E F# G#",
    "Bb C D Eb F G A",
    "B C# D# E F# G# A#",
  ],
  minor: [
    "C D Eb F G Ab Bb",
    "C# D# E F# G# A B",
    "D E F G A Bb C",
    "Eb F Gb Ab Bb Cb Db",
    "E F# G A B C D",
    "F G Ab Bb C Db Eb",
    "F# G# A B C# D E",
    "G A Bb C D Eb F",
    "G# A# B C# D# E F#",
    "A B C D E F G",
    "Bb C Db Eb F Gb Ab",
    "B C# D E F# G A",
  ],
  dorian: [
    "C D Eb F G A Bb",
    "C# D# E F# G# A# B",
    "D E F G A B C",
    "Eb F Gb Ab Bb C Db",
    "E F# G A B C# D",
    "F G Ab Bb C D Eb",
    "F# G# A B C# D# E",
    "G A Bb C D E F",
    "Ab Bb Cb Db Eb F Gb",
    "A B C D E F# G",
    "Bb C Db Eb F G Ab",
    "B C# D E F# G# A",
  ],
  phrygian: [
    "C Db Eb F G Ab Bb",
    "C# D E F# G# A B",
    "D Eb F G A Bb C",
    "D# E F# G# A# B C#",
    "E F G A B C D",
    "F Gb Ab Bb C Db Eb",
    "F# G A B C# D E",
    "G Ab Bb C D Eb F",
    "G# A B C# D# E F#",
    "A Bb C D E F G",
    "Bb Cb Db Eb F Gb Ab",
    "B C D E F# G A",
  ],
  lydian: [
    "C D E F# G A B",
    "Db Eb F G Ab Bb C",
    "D E F# G# A B C#",
    "Eb F G A Bb C D",
    "E F# G# A# B C# D#",
    "F G A B C D E",
    "Gb Ab Bb C Db Eb F",
    "G A B C# D E F#",
    "Ab Bb C D Eb F G",
    "A B C# D# E F# G#",
    "Bb C D E F G A",
    "B C# D# E# F# G# A#",
  ],
  mixolydian: [
    "C D E F G A Bb",
    "Db Eb F Gb Ab Bb Cb",
    "D E F# G A B C",
    "Eb F G Ab Bb C Db",
    "E F# G# A B C# D",
    "F G A Bb C D Eb",
    "F# G# A# B C# D# E",
    "G A B C D E F",
    "Ab Bb C Db Eb F Gb",
    "A B C# D E F# G",
    "Bb C D Eb F G Ab",
    "B C# D# E F# G# A",
  ],
  locrian: [
    "C Db Eb F Gb Ab Bb",
    "C# D E F# G A B",
    "D Eb F G Ab Bb C",
    "D# E F# G# A B C#",
    "E F G A Bb C D",
    "F Gb Ab Bb Cb Db Eb",
    "F# G A B C D E",
    "G Ab Bb C Db Eb F",
    "G# A B C# D E F#",
    "A Bb C D Eb F G",
    "A# B C# D# E F# G#",
    "B C D E F G A",
  ],
};
/** Sustenidos: só as tônicas pretas (as naturais são iguais a AUTO). */
const SHARP: Record<ScaleId, Record<1 | 3 | 6 | 8 | 10, string>> = {
  "pent-minor": {
    1: "C# E F# G# B",
    3: "D# F# G# A# C#",
    6: "F# A B C# E",
    8: "G# B C# D# F#",
    10: "A# C# D# E# G#",
  },
  "pent-major": {
    1: "C# D# E# G# A#",
    3: "Eb F G Bb C",
    6: "F# G# A# C# D#",
    8: "G# A# B# D# E#",
    10: "Bb C D F G",
  },
  blues: {
    1: "C# E F# G G# B",
    3: "D# F# G# A A# C#",
    6: "F# A B C C# E",
    8: "G# B C# D D# F#",
    10: "A# C# D# E E# G#",
  },
  major: {
    1: "C# D# E# F# G# A# B#",
    3: "Eb F G Ab Bb C D",
    6: "F# G# A# B C# D# E#",
    8: "Ab Bb C Db Eb F G",
    10: "Bb C D Eb F G A",
  },
  minor: {
    1: "C# D# E F# G# A B",
    3: "D# E# F# G# A# B C#",
    6: "F# G# A B C# D E",
    8: "G# A# B C# D# E F#",
    10: "A# B# C# D# E# F# G#",
  },
  dorian: {
    1: "C# D# E F# G# A# B",
    3: "D# E# F# G# A# B# C#",
    6: "F# G# A B C# D# E",
    8: "G# A# B C# D# E# F#",
    10: "Bb C Db Eb F G Ab",
  },
  phrygian: {
    1: "C# D E F# G# A B",
    3: "D# E F# G# A# B C#",
    6: "F# G A B C# D E",
    8: "G# A B C# D# E F#",
    10: "A# B C# D# E# F# G#",
  },
  lydian: {
    1: "Db Eb F G Ab Bb C",
    3: "Eb F G A Bb C D",
    6: "F# G# A# B# C# D# E#",
    8: "Ab Bb C D Eb F G",
    10: "Bb C D E F G A",
  },
  mixolydian: {
    1: "C# D# E# F# G# A# B",
    3: "Eb F G Ab Bb C Db",
    6: "F# G# A# B C# D# E",
    8: "G# A# B# C# D# E# F#",
    10: "Bb C D Eb F G Ab",
  },
  locrian: {
    1: "C# D E F# G A B",
    3: "D# E F# G# A B C#",
    6: "F# G A B C D E",
    8: "G# A B C# D E F#",
    10: "A# B C# D# E F# G#",
  },
};
/** Bemóis: só as tônicas pretas. */
const FLAT: Record<ScaleId, Record<1 | 3 | 6 | 8 | 10, string>> = {
  "pent-minor": {
    1: "Db Fb Gb Ab Cb",
    3: "Eb Gb Ab Bb Db",
    6: "F# A B C# E",
    8: "Ab Cb Db Eb Gb",
    10: "Bb Db Eb F Ab",
  },
  "pent-major": {
    1: "Db Eb F Ab Bb",
    3: "Eb F G Bb C",
    6: "Gb Ab Bb Db Eb",
    8: "Ab Bb C Eb F",
    10: "Bb C D F G",
  },
  blues: {
    1: "Db Fb Gb G Ab Cb",
    3: "Eb Gb Ab A Bb Db",
    6: "F# A B C C# E",
    8: "Ab Cb Db D Eb Gb",
    10: "Bb Db Eb Fb F Ab",
  },
  major: {
    1: "Db Eb F Gb Ab Bb C",
    3: "Eb F G Ab Bb C D",
    6: "Gb Ab Bb Cb Db Eb F",
    8: "Ab Bb C Db Eb F G",
    10: "Bb C D Eb F G A",
  },
  minor: {
    1: "C# D# E F# G# A B",
    3: "Eb F Gb Ab Bb Cb Db",
    6: "F# G# A B C# D E",
    8: "Ab Bb Cb Db Eb Fb Gb",
    10: "Bb C Db Eb F Gb Ab",
  },
  dorian: {
    1: "Db Eb Fb Gb Ab Bb Cb",
    3: "Eb F Gb Ab Bb C Db",
    6: "F# G# A B C# D# E",
    8: "Ab Bb Cb Db Eb F Gb",
    10: "Bb C Db Eb F G Ab",
  },
  phrygian: {
    1: "C# D E F# G# A B",
    3: "Eb Fb Gb Ab Bb Cb Db",
    6: "F# G A B C# D E",
    8: "G# A B C# D# E F#",
    10: "Bb Cb Db Eb F Gb Ab",
  },
  lydian: {
    1: "Db Eb F G Ab Bb C",
    3: "Eb F G A Bb C D",
    6: "Gb Ab Bb C Db Eb F",
    8: "Ab Bb C D Eb F G",
    10: "Bb C D E F G A",
  },
  mixolydian: {
    1: "Db Eb F Gb Ab Bb Cb",
    3: "Eb F G Ab Bb C Db",
    6: "Gb Ab Bb Cb Db Eb Fb",
    8: "Ab Bb C Db Eb F Gb",
    10: "Bb C D Eb F G Ab",
  },
  locrian: {
    1: "C# D E F# G A B",
    3: "D# E F# G# A B C#",
    6: "F# G A B C D E",
    8: "G# A B C# D E F#",
    10: "Bb Cb Db Eb Fb Gb Ab",
  },
};

const CASES = SCALE_IDS.flatMap((id) => ROOTS.map((r) => [id, r] as const));

describe("spellScale tables", () => {
  it.each(CASES)("%s root %i auto", (id, r) => {
    expect(names(r, id, "auto")).toBe(AUTO[id][r]);
  });
  it.each(
    CASES.filter(([, r]) => (NATURAL_ROOTS as readonly number[]).includes(r)),
  )("%s natural root %i is the same for sharp and flat", (id, r) => {
    expect(names(r, id, "sharp")).toBe(AUTO[id][r]);
    expect(names(r, id, "flat")).toBe(AUTO[id][r]);
  });
  it.each(CASES.filter(([, r]) => (BLACK as readonly number[]).includes(r)))(
    "%s black root %i sharp/flat",
    (id, r) => {
      const k = r as (typeof BLACK)[number];
      expect(names(r, id, "sharp")).toBe(SHARP[id][k]);
      expect(names(r, id, "flat")).toBe(FLAT[id][k]);
    },
  );
});

describe("spellScale invariants", () => {
  for (const id of SCALE_IDS) {
    for (const r of ROOTS) {
      for (const acc of ["sharp", "flat", "auto"] as const) {
        it(`${id} root ${r} ${acc}`, () => {
          const scale = SCALES[id];
          const sp = spellScale(r, scale, acc);
          expect(sp).toHaveLength(scale.semitones.length);
          sp.forEach((s, i) => {
            expect(s.accidental).toBeGreaterThanOrEqual(-1);
            expect(s.accidental).toBeLessThanOrEqual(1);
            expect(
              (((NATURAL_PC[s.letter] + s.accidental) % 12) + 12) % 12,
            ).toBe((r + scale.semitones[i]) % 12);
          });
          if (scale.blueNote === undefined) {
            const rootLetter = LETTERS.indexOf(sp[0].letter);
            sp.forEach((s, i) => {
              expect(s.letter).toBe(
                LETTERS[(rootLetter + scale.letterSteps[i]) % 7],
              );
            });
          }
        });
      }
    }
  }
});

describe("spellScale examples", () => {
  it("Ab major", () =>
    expect(names(8, "major", "auto")).toBe("Ab Bb C Db Eb F G"));
  it("A blues uses b5, not #4", () =>
    expect(names(9, "blues", "auto")).toBe("A C D Eb E G"));
  it("Eb blues", () =>
    expect(names(3, "blues", "auto")).toBe("Eb Gb Ab A Bb Db"));
  it("solfege", () =>
    expect(
      spellingLabel(spellScale(6, SCALES.major, "auto")[0], "solfejo"),
    ).toBe("Fá#"));
});
