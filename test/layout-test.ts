/*
 * MIT License
 *
 * Copyright (c) 2018-2021 Robert Knight
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

import { assert, describe, it } from 'vitest';
import { XorShift } from 'xorshift';

import {
  adjustmentRatios,
  breakLines,
  forcedBreak,
  MIN_COST,
  positionItems,
  InputItem,
  MaxAdjustmentExceededError,
  Penalty,
} from '../src/layout';

import { layoutItemsFromString, TextBox, TextGlue, TextInputItem } from '../src/helpers';

import { box, chunk, glue, lineStrings, penalty } from './util';

import fixture from './fixtures/layout';

interface LayoutFixture {
  /** Input text of paragraph. */
  input: string;

  outputs: {
    /** Line-breaking options. */
    layoutOptions: {
      maxAdjustmentRatio: number;
      charWidth: number;
      lineWidths: number | number[];
    };

    /** Expected broken lines. */
    lines: string[];
  }[];
}

/**
 * Read paragraph layout fixture from a file.
 *
 * The format of the fixture files is:
 *
 * ```
 * {input text}
 *
 * {output 0 settings}
 *
 * {output 0 lines}
 *
 * {output 1 settings }
 *
 * {output 1 lines}
 * ...
 * ```
 */
function readLayoutFixture(content: string): LayoutFixture {
  const defaultSettings = {
    charWidth: 5,
    maxAdjustmentRatio: 1,
  };

  const sections = content.split('\n\n');
  const input = sections[0];
  const outputs = [];
  for (let i = 1; i < sections.length; i += 2) {
    const outputSettings = JSON.parse(sections[i]);
    const outputLines = sections[i + 1].split('\n').filter((l) => l.length > 0);

    outputs.push({
      layoutOptions: {
        ...defaultSettings,
        ...outputSettings,
      },
      lines: outputLines,
    });
  }

  return {
    input,
    outputs,
  };
}

function repeat<T>(arr: T[], count: number) {
  let result = [];
  while (count) {
    --count;
    result.push(...arr);
  }
  return result;
}

function itemsFromString(s: string, charWidth: number, glueStretch: number): TextInputItem[] {
  const items = s.split(/(\s+|-)/).map((substr) => {
    const width = substr.length * charWidth;
    if (substr.match(/^\s+$/)) {
      return { type: 'glue', width, shrink: 2, stretch: glueStretch, text: substr } as TextGlue;
    } else if (substr === '-') {
      return { type: 'penalty', width, flagged: true, cost: 5 } as Penalty;
    } else {
      return { type: 'box', width, text: substr } as TextBox;
    }
  });
  items.push({ type: 'glue', width: 0, shrink: 0, stretch: 1000, text: '' });
  items.push(forcedBreak());
  return items;
}

function charWidth(char: string): number {
  // Traditional Monotype character widths in machine units (1/18th of an em)
  // from p. 75 of Digital Typography
  if (char.length !== 1) {
    throw new Error(`Input is not a single character: ${char}`);
  }
  switch (char) {
    case 'i':
    case 'l':
    case ',':
    case '.':
    case ';':
    case '’':
      return 5;
    case 'f':
    case 'j':
    case 'I':
    case '-':
    case '\u00ad':
      return 6;
    case 'r':
    case 's':
    case 't':
      return 7;
    case 'c':
    case 'e':
    case 'z':
      return 8;
    case 'a':
    case 'g':
    case 'o':
    case 'v':
      return 9;
    case 'b':
    case 'd':
    case 'h':
    case 'k':
    case 'n':
    case 'p':
    case 'q':
    case 'u':
    case 'x':
    case 'y':
      return 10;
    case 'w':
    case 'C':
      return 13;
    case 'm':
      return 15;
    default:
      throw new Error(`Unsupported character: ${char.charCodeAt(0)}`);
  }
}

function frogPrinceItemsImpl(
  text: string,
  prologue: TextInputItem[],
  betweenWords: (c: string) => TextInputItem[],
  epilogue: TextInputItem[],
): TextInputItem[] {
  const result: TextInputItem[] = [];
  let buf = '';
  let width = 0;
  let lastC = '*';

  result.push(...prologue);

  for (const c of text) {
    if (['-', '\u00AD', ' '].includes(c)) {
      if (buf !== '') {
        result.push({ type: 'box', width, text: buf } as TextBox);
        buf = '';
        width = 0;
      }
    }

    switch (c) {
      case ' ':
        result.push(...betweenWords(lastC));
        break;
      case '-':
        result.push({ type: 'box', width: charWidth(c), text: '-' } as TextBox);
        result.push({ type: 'penalty', width: 0, cost: 50, flagged: true });
        break;
      case '\u00AD':
        // Soft hyphen
        result.push({ type: 'penalty', width: charWidth(c), cost: 50, flagged: true });
        break;
      default:
        buf += c;
        width += charWidth(c);
        break;
    }

    lastC = c;
  }

  if (buf !== '') {
    result.push({ type: 'box', width, text: buf });
  }

  result.push(...epilogue);

  return result;
}

const frogPrinceText =
  'In olden times when wish\u00ading still helped one, there lived a king whose daugh\u00adters were all beau\u00adti\u00adful; and the young\u00adest was so beau\u00adti\u00adful that the sun it\u00adself, which has seen so much, was aston\u00adished when\u00adever it shone in her face. Close by the king’s castle lay a great dark for\u00adest, and un\u00adder an old lime-tree in the for\u00adest was a well, and when the day was very warm, the king’s child went out into the for\u00adest and sat down by the side of the cool foun\u00adtain; and when she was bored she took a golden ball, and threw it up on high and caught it; and this ball was her favor\u00adite play\u00adthing.';

function frogPrinceItems(): TextInputItem[] {
  // Built as described on p. 75 of Digital Typography
  const prologue: TextInputItem[] = [];
  const betweenWords = (c: string): TextInputItem[] => {
    switch (c) {
      case ',':
        return [{ type: 'glue', width: 6, stretch: 4, shrink: 2, text: ' ' } as TextGlue];
      case ';':
        return [{ type: 'glue', width: 6, stretch: 4, shrink: 1, text: ' ' } as TextGlue];
      case '.':
        return [{ type: 'glue', width: 8, stretch: 6, shrink: 1, text: ' ' } as TextGlue];
      default:
        return [{ type: 'glue', width: 6, stretch: 3, shrink: 2, text: ' ' } as TextGlue];
    }
  };
  const epilogue: TextInputItem[] = [
    { type: 'penalty', width: 0, cost: 1000, flagged: false },
    { type: 'glue', width: 0, stretch: 1000, shrink: 0, text: '' } as TextGlue,
    { type: 'penalty', width: 0, cost: -1000, flagged: true },
  ];
  return frogPrinceItemsImpl(frogPrinceText, prologue, betweenWords, epilogue);
}

function frogPrinceCenteredItems(): TextInputItem[] {
  // Built as described on pp. 94-95 of Digital Typography
  const prologue: TextInputItem[] = [
    { type: 'glue', width: 0, stretch: 18, shrink: 0, text: '' } as TextGlue,
  ];
  const betweenWords = (c: string): TextInputItem[] => {
    const stretchFactor: number = 6; // Knuth’s magic scale factor
    let outerGlueStretch: number;
    switch (c) {
      case ',':
        outerGlueStretch = 4 * stretchFactor;
        return [
          { type: 'glue', width: 0, stretch: outerGlueStretch, shrink: 0, text: '' } as TextGlue,
          { type: 'penalty', width: 0, cost: 0, flagged: false } as Penalty,
          {
            type: 'glue',
            width: 6,
            stretch: -2 * outerGlueStretch,
            shrink: 0,
            text: '',
          } as TextGlue,
          { type: 'box', width: 0, text: '' } as TextBox,
          { type: 'penalty', width: 0, cost: 1000, flagged: false, text: '' } as Penalty,
          { type: 'glue', width: 0, stretch: outerGlueStretch, shrink: 0 } as TextGlue,
        ];
      case ';':
        outerGlueStretch = 4 * stretchFactor;
        return [
          { type: 'glue', width: 0, stretch: outerGlueStretch, shrink: 0, text: '' } as TextGlue,
          { type: 'penalty', width: 0, cost: 0, flagged: false } as Penalty,
          {
            type: 'glue',
            width: 6,
            stretch: -2 * outerGlueStretch,
            shrink: 0,
            text: '',
          } as TextGlue,
          { type: 'box', width: 0, text: '' } as TextBox,
          { type: 'penalty', width: 0, cost: 1000, flagged: false, text: '' } as Penalty,
          { type: 'glue', width: 0, stretch: outerGlueStretch, shrink: 0 } as TextGlue,
        ];
      case '.':
        outerGlueStretch = 6 * stretchFactor;
        return [
          { type: 'glue', width: 0, stretch: outerGlueStretch, shrink: 0, text: '' } as TextGlue,
          { type: 'penalty', width: 0, cost: 0, flagged: false } as Penalty,
          {
            type: 'glue',
            width: 8,
            stretch: -2 * outerGlueStretch,
            shrink: 0,
            text: '',
          } as TextGlue,
          { type: 'box', width: 0, text: '' } as TextBox,
          { type: 'penalty', width: 0, cost: 1000, flagged: false, text: '' } as Penalty,
          { type: 'glue', width: 0, stretch: outerGlueStretch, shrink: 0 } as TextGlue,
        ];
      default:
        outerGlueStretch = 3 * stretchFactor;
        return [
          { type: 'glue', width: 0, stretch: outerGlueStretch, shrink: 0, text: '' } as TextGlue,
          { type: 'penalty', width: 0, cost: 0, flagged: false } as Penalty,
          {
            type: 'glue',
            width: 6,
            stretch: -2 * outerGlueStretch,
            shrink: 0,
            text: '',
          } as TextGlue,
          { type: 'box', width: 0, text: '' } as TextBox,
          { type: 'penalty', width: 0, cost: 1000, flagged: false, text: '' } as Penalty,
          { type: 'glue', width: 0, stretch: outerGlueStretch, shrink: 0 } as TextGlue,
        ];
    }
  };
  const epilogue: TextInputItem[] = [
    { type: 'glue', width: 0, stretch: 18, shrink: 0, text: '' } as TextGlue,
    { type: 'penalty', width: 0, cost: -1000, flagged: false },
  ];
  return frogPrinceItemsImpl(
    frogPrinceText.replace(/\u00AD/g, ''),
    prologue,
    betweenWords,
    epilogue,
  );
}

describe('layout', () => {
  describe('breakLines', () => {
    it('returns an empty list if the input is empty', () => {
      const breakpoints = breakLines([], 100);
      assert.deepEqual(breakpoints, []);
    });

    it('returns initial and final breakpoints for a single-box paragraph', () => {
      const breakpoints = breakLines([box(10), forcedBreak()], 100);
      assert.deepEqual(breakpoints, [0, 1]);
    });

    it('generates narrow frog prince layout from p. 81 of Digital Typography', () => {
      const items = frogPrinceItems();
      // width given on p. 78 of Digital Typography
      // subtract 1em (18 machine units) from the first line
      const lineLengths = [372, ...Array(items.length - 1).fill(390)];
      const breakpoints = breakLines(items, lineLengths);
      const lines = lineStrings(items, breakpoints);
      assert.deepEqual(lines, [
        'In olden times when wishing still helped one,',
        'there lived a king whose daughters were all beau-',
        'tiful; and the youngest was so beautiful that the',
        'sun itself, which has seen so much, was aston-',
        'ished whenever it shone in her face. Close by the',
        'king’s castle lay a great dark forest, and under an',
        'old limetree in the forest was a well, and when',
        'the day was very warm, the king’s child went out',
        'into the forest and sat down by the side of the',
        'cool fountain; and when she was bored she took a',
        'golden ball, and threw it up on high and caught',
        'it; and this ball was her favorite plaything. -',
      ]);
      const adjRatios = adjustmentRatios(items, lineLengths, breakpoints).map((num) =>
        Number(num.toFixed(3)),
      );
      assert.deepEqual(
        adjRatios,
        [0.857, 0.0, 0.28, 1.0, 0.067, -0.278, 0.536, -0.167, 0.7, -0.176, 0.357, 0.049],
      );
    });

    it('generates wide frog prince layout from p. 82 of Digital Typography', () => {
      const items = frogPrinceItems();
      // width given on p. 81 of Digital Typography
      // subtract 1em (18 machine units) from the first line
      const lineLengths = [482, ...Array(items.length - 1).fill(500)];
      const breakpoints = breakLines(items, lineLengths);
      const lines = lineStrings(items, breakpoints);
      assert.deepEqual(lines, [
        'In olden times when wishing still helped one, there lived a',
        'king whose daughters were all beautiful; and the youngest was',
        'so beautiful that the sun itself, which has seen so much, was',
        'astonished whenever it shone in her face. Close by the king’s',
        'castle lay a great dark forest, and under an old limetree in the',
        'forest was a well, and when the day was very warm, the king’s',
        'child went out into the forest and sat down by the side of the',
        'cool fountain; and when she was bored she took a golden ball,',
        'and threw it up on high and caught it; and this ball was her',
        'favorite plaything. -',
      ]);
      const adjRatios = adjustmentRatios(items, lineLengths, breakpoints).map((num) =>
        Number(num.toFixed(3)),
      );
      assert.deepEqual(
        adjRatios,
        [0.774, 0.179, 0.629, 0.545, 0.0, 0.079, 0.282, 0.294, 0.575, 0.353],
      );
    });

    it('generates ragged-centered frog prince layout from p. 95 of Digital Typography', () => {
      const items = frogPrinceCenteredItems();
      // Pages 78 and 81 give widths of other examples, but Knuth does not give
      // the width of this one. It is wider than the other examples and seems
      // to be about 33 ems. 593 machine units is the closest width to that
      // estimate which preserves the line breaks shown in the book.
      const lineLengths = Array(items.length).fill(593);
      const breakpoints = breakLines(items, lineLengths);
      const lines = lineStrings(items, breakpoints).map((l) => l.replace(/\s+/g, ' '));
      assert.deepEqual(lines, [
        'In olden times when wishing still helped one, there lived a king whose',
        'daughters were all beautiful; and the youngest was so beautiful that the',
        'sun itself, which has seen so much, was astonished whenever it shone in',
        'her face. Close by the king’s castle lay a great dark forest, and under an',
        'old limetree in the forest was a well, and when the day was very warm,',
        'the king’s child went out into the forest and sat down by the side of the',
        'cool fountain; and when she was bored she took a golden ball, and threw',
        'it up on high and caught it; and this ball was her favorite plaything.',
      ]);
    });

    it('generates expected layout', () => {
      const f = readLayoutFixture(fixture);
      f.outputs.forEach(({ lines, layoutOptions }) => {
        const measure = (text: string) => text.length * 5;
        const items = layoutItemsFromString(f.input, measure);
        const breakpoints = breakLines(items, layoutOptions.lineWidths, layoutOptions);
        const itemText = (item: TextInputItem) => (item.type == 'box' ? item.text : ' ');

        // Check that breakpoints occur at expected positions.
        const actualLines = chunk(breakpoints, 2)
          .map(([start, end]) => items.slice(start, end).map(itemText).join('').trim())
          .filter((l) => l.length > 0);

        assert.deepEqual(actualLines, lines);

        // Check that adjustment ratios for each line are in range.
        const adjRatios = adjustmentRatios(items, layoutOptions.lineWidths, breakpoints);
        adjRatios.forEach((ar) => {
          assert.isAtLeast(ar, -1);
          assert.isAtMost(ar, layoutOptions.maxAdjustmentRatio);
        });
      });
    });

    it('uses defaults if options are omitted', () => {
      const measure = (text: string) => text.length * 5;
      const items = layoutItemsFromString('one fine day in the middle of the night', measure);
      const breakpoints = breakLines(items, 100);
      assert.deepEqual(breakpoints, [0, 9, 18]);
    });

    it('succeeds when min adjustment ratio is exceeded', () => {
      // Lay out input into a line with a width (5) of less than the box width
      // (10).
      // We'll give up and make lines which exceed the specified length.
      const lines = repeat([box(10), glue(5, 1, 1)], 5);
      const items: InputItem[] = [...lines, forcedBreak()];
      const breakpoints = breakLines(items, 5, {
        maxAdjustmentRatio: 1,
      });
      assert.deepEqual(breakpoints, [0, 1, 3, 5, 7, 9, 10]);
    });

    it('handles glue with zero stretch', () => {
      const items = [box(10), glue(5, 0, 0), box(10), forcedBreak()];
      const breakpoints = breakLines(items, 50);
      assert.deepEqual(breakpoints, [0, 3]);
    });

    it('handles glue with zero shrink', () => {
      const items = [box(10), glue(5, 0, 0), box(10), forcedBreak()];
      const breakpoints = breakLines(items, 21);
      assert.deepEqual(breakpoints, [0, 3]);
    });

    it('handles boxes that are wider than the line width', () => {
      const items = [box(5), glue(5, 10, 10), box(100), glue(5, 10, 10), forcedBreak()];
      const breakpoints = breakLines(items, 50);
      assert.deepEqual(breakpoints, [0, 3, 4]);
    });

    // The first case changes behavior relative to the old
    // `hasNegativeValues` pruning guard. The remaining cases are soundness
    // checks: they assert the exact optimal break sequence that must still be
    // found when negative widths are present.

    it('does not lose the optimum when negative values are present', () => {
      //
      // Line-length = 10
      //
      //  ┌─12─┐○───────○┌─-2─┐○────○┌──9──┐○──────○
      //   box   g(0,-2)  box   g(0)  box    g(0,+3)
      //
      // The best break sequence is 0-3-6:
      //
      //   * first line  = 12 + (-2) = 10  (perfect fit, r = 0)
      //   * second line = 9 + stretch(3)  (r = 1/3)
      //
      // Without Restriction-1 guarding the optimization, the active node for the
      // beginning of the paragraph is thrown away at breakpoint 1 (r = –∞), and the
      // algorithm therefore ends up with 0-1-6 instead.
      //
      const items: InputItem[] = [
        { type: 'box', width: 12 },
        { type: 'glue', width: 0, stretch: 0, shrink: 2 },
        { type: 'box', width: -2 },
        { type: 'glue', width: 0, stretch: 0, shrink: 0 },
        { type: 'box', width: 9 },
        { type: 'glue', width: 0, stretch: 3, shrink: 0 },
        forcedBreak(),
      ];
      const breakpoints = breakLines(items, 10);
      assert.deepEqual(breakpoints, [0, 3, 6]);
    });

    it(
      'changes behavior when negative glue cannot rescue a later line',
      () => {
        // Under the old `hasNegativeValues` guard, the negative glue width
        // disabled pruning and the algorithm fell back to [0, 4]. The new
        // rule still prunes this irrecoverably overfull node and isolates the
        // wide box at [0, 3, 4].
        const items: InputItem[] = [
          box(5),
          glue(-1, 0, 0),
          box(100),
          glue(10, 10, 10),
          forcedBreak(),
        ];
        const breakpoints = breakLines(items, 50);
        assert.deepEqual(breakpoints, [0, 3, 4]);
      },
    );

    it(
      'keeps the optimal breaks when negative penalty width rescues a line',
      () => {
        // line 0->3: box(11) + box(1) + penalty_width(-2) = 10   r = 0
        // line 3->6: box(10) + glue(0, stretch=1000)             r \approx 0
        //
        // At breakpoint 1 (penalty(0)), the line from node 0 is
        // box(11) = 11 > lineWidth(10) with zero shrink, giving r = -inf. A
        // naive pruning rule would discard node 0 here. But the later
        // breakpoint at penalty(-2) rescues the line: base width 12 plus
        // penalty width -2 = 10. The suffix-minimum guard must keep node 0
        // alive.
        const items: InputItem[] = [
          box(11),
          penalty(0, 0, false),
          box(1),
          penalty(-2, 0, false),
          box(10),
          glue(0, 0, 1000),
          forcedBreak(),
        ];
        const breakpoints = breakLines(items, 10);
        assert.deepEqual(breakpoints, [0, 3, 6]);
      },
    );

    it(
      'keeps the optimal breaks when interior negative glue rescues a line',
      () => {
        // At breakpoint 1, the line from node 0 is overfull: box(11) > 10.
        // A later ordinary breakpoint is still viable because the interior
        // glue(-4) and box(3) bring the total back to 10.
        const items: InputItem[] = [
          box(11),
          penalty(0, 0, false),
          glue(-4, 0, 0),
          box(3),
          penalty(0, 0, false),
          box(10),
          forcedBreak(),
        ];
        const breakpoints = breakLines(items, 10);
        assert.deepEqual(breakpoints, [0, 4, 6]);
      },
    );

    it(
      'keeps the optimal breaks when pre-break negative content rescues a line',
      () => {
        // box(11) + glue(-2) = 9 at the forced break -> single line [0, 3].
        // At penalty(0) (index 1), the line width is 11 > 10, but the
        // negative glue before the forced break brings it to 9 < 10.
        const items: InputItem[] = [
          box(11),
          penalty(0, 0, false),
          glue(-2, 0, 0),
          forcedBreak(),
        ];
        const breakpoints = breakLines(items, 10);
        assert.deepEqual(breakpoints, [0, 3]);
      },
    );

    it(
      'does not prune when a forced break has a negative penalty width',
      () => {
        // box(11) + box(1) + penalty_width(-2) = 10 at the forced break.
        // At penalty(0) (index 1), the line width is 11 > 10, but the
        // forced break's negative width makes the line exactly 10.
        const items: InputItem[] = [
          box(11),
          penalty(0, 0, false),
          box(1),
          penalty(-2, MIN_COST, false),
        ];
        const breakpoints = breakLines(items, 10);
        assert.deepEqual(breakpoints, [0, 3]);
      },
    );

    it('does not prune when glue shrink is negative', () => {
      // The suffix-minimum floor argument assumes shrink cannot increase line
      // width. Negative shrink breaks that assumption, so pruning must be
      // disabled even when widths and stretch are otherwise ordinary.
      //
      // With pruning disabled, the valid solution is a single line [0, 6].
      // If pruning were enabled, node 0 would be discarded at breakpoint 1
      // and the algorithm would fall back to [0, 1, 6].
      const items: InputItem[] = [
        box(2),
        penalty(0, 0, false),
        glue(0, -5, 0),
        box(0),
        penalty(0, 0, false),
        glue(0, 0, 0),
        forcedBreak(),
      ];
      const breakpoints = breakLines(items, 1);
      assert.deepEqual(breakpoints, [0, 6]);
    });

    [
      {
        items: [box(10), glue(10, 10, 10), box(10), forcedBreak()],
        lineWidth: 1000,
        expectedBreakpoints: [0, 3],
      },
      {
        items: [box(10), glue(10, 5, 5), box(100), forcedBreak()],
        lineWidth: 50,
        expectedBreakpoints: [0, 3],
      },
    ].forEach(({ items, lineWidth, expectedBreakpoints }, i) => {
      it(`succeeds when initial max adjustment ratio is exceeded (${i + 1})`, () => {
        // Lay out input into a line which would need to stretch more than
        // `glue.width + maxAdjustmentRatio * glue.stretch` in order to fit.
        //
        // Currently the algorithm will simply retry with a higher threshold. If
        // we followed TeX's solution (see Knuth-Plass p.1162) then we would first
        // retry with the same threshold after applying hyphenation to break
        // existing boxes and then only after that retry with a higher threshold.
        const breakpoints = breakLines(items, lineWidth, {
          initialMaxAdjustmentRatio: 1,
        });
        assert.deepEqual(breakpoints, expectedBreakpoints);
      });
    });

    it('applies a penalty for consecutive lines ending with a hyphen', () => {
      const text = 'long-word long-word one long-word';
      const charWidth = 5;
      const glueStretch = 60;
      const items = itemsFromString(text, charWidth, glueStretch);
      const lineWidth = 14 * charWidth;

      // Break lines without a double-hyphen penalty.
      let breakpoints = breakLines(items, lineWidth);
      let lines = lineStrings(items, breakpoints);
      assert.deepEqual(
        lines,
        ['longword long-', 'word one long-', 'word'],
        'did not break as expected without penalty',
      );

      // Break lines with a double-hyphen penalty.
      breakpoints = breakLines(items, lineWidth, {
        doubleHyphenPenalty: 200,
      });
      lines = lineStrings(items, breakpoints);
      assert.deepEqual(
        lines,
        ['longword long-', 'word one', 'longword'],
        'did not break as expected with penalty',
      );
    });

    it('applies a penalty when adjacent lines have different tightness', () => {
      // Getting this test case to produce different output with and without the
      // penalty applied required ~~lots of fiddling~~ highly scientific
      // adjustments.
      //
      // It requires that boxes have enough variety and maximum width, and glues
      // have sufficiently small stretch, that adjustment ratios between lines
      // are large enough to fall into different "fitness class" thresholds.
      const prng = new (XorShift as any)([1, 10, 15, 20]);
      const wordSoup = (length: number) => {
        let result: InputItem[] = [];
        while (result.length < length) {
          result.push({ type: 'box', width: prng.random() * 20 });
          result.push({ type: 'glue', width: 6, shrink: 3, stretch: 5 });
        }
        return result;
      };
      const items = [...wordSoup(100), forcedBreak()];
      const lineWidth = 50;

      // Break lines without contrasting tightess penalty.
      let breakpointsA = breakLines(items, lineWidth, {
        adjacentLooseTightPenalty: 0,
      });

      // Break lines with constrasting tightness penalty.
      let breakpointsB = breakLines(items, lineWidth, {
        adjacentLooseTightPenalty: 10000,
      });

      assert.notDeepEqual(breakpointsA, breakpointsB);
    });

    it('keeps competing fitness-class paths at the same breakpoint', () => {
      const items = [
        box(7),
        glue(6, 3, 5),
        box(23),
        glue(6, 3, 5),
        box(13),
        glue(6, 3, 5),
        box(15),
        glue(6, 3, 5),
        box(15),
        glue(6, 3, 5),
        box(16),
        glue(6, 3, 5),
        box(24),
        forcedBreak(),
      ];

      assert.deepEqual(
        breakLines(items, 53, {
          adjacentLooseTightPenalty: 10000,
          initialMaxAdjustmentRatio: 5,
          maxAdjustmentRatio: null,
        }),
        [0, 5, 9, 13],
      );
    });

    it('adds adjustmentRatioPenalty to badness before demerits are computed', () => {
      // This fixture separates two similar scoring rules:
      //
      // - Correct: add `adjustmentRatioPenalty` to badness first, then apply
      //   the standard demerits formula.
      // - Incorrect: compute standard demerits first, then tack the extra
      //   looseness penalty on afterward.
      //
      // With this paragraph, the correct rule prefers breaking at the first
      // penalty ([0, 3, 11]) because it strongly punishes the very loose second
      // line in [0, 6, 11]. The incorrect post-hoc rule still prefers
      // [0, 6, 11], because the first breakpoint's high positive penalty (200)
      // dominates once the looseness penalty is no longer squared together with
      // badness and breakpoint cost.
      const lineWidth = 65;
      const adjustmentRatioPenalty = (r: number) => (r <= 1 ? 0 : 1000 * (r - 1) ** 2);
      const items: InputItem[] = [
        box(31),
        glue(5, 3, 9),
        box(8),
        penalty(0, 200, false),
        glue(5, 3, 9),
        box(14),
        penalty(0, 50, false),
        glue(5, 3, 6),
        box(18),
        glue(5, 3, 9),
        box(20),
        forcedBreak(),
      ];

      const breakpointsWithoutPenalty = breakLines(items, lineWidth, {
        maxAdjustmentRatio: null,
        initialMaxAdjustmentRatio: 3,
      });
      const breakpointsWithPenalty = breakLines(items, lineWidth, {
        maxAdjustmentRatio: null,
        initialMaxAdjustmentRatio: 3,
        adjustmentRatioPenalty,
      });

      assert.deepEqual(breakpointsWithoutPenalty, [0, 6, 11]);
      assert.deepEqual(breakpointsWithPenalty, [0, 3, 11]);

      const totalDemerits = (
        breakpoints: number[],
        penaltyMode: 'badness' | 'post-hoc',
      ) => {
        return adjustmentRatios(items, lineWidth, breakpoints).reduce((sum, ratio, line) => {
          const baseBadness = 100 * Math.abs(ratio) ** 3;
          const extraBadness = adjustmentRatioPenalty(ratio);
          const breakpoint = items[breakpoints[line + 1]];
          const breakpointPenalty = breakpoint.type === 'penalty' ? breakpoint.cost : 0;

          if (penaltyMode === 'badness') {
            if (breakpointPenalty >= 0) {
              return sum + (1 + baseBadness + extraBadness + breakpointPenalty) ** 2;
            }
            if (breakpointPenalty > MIN_COST) {
              return sum + (1 + baseBadness + extraBadness) ** 2 - breakpointPenalty ** 2;
            }
            return sum + (1 + baseBadness + extraBadness) ** 2;
          }

          let demerits;
          if (breakpointPenalty >= 0) {
            demerits = (1 + baseBadness + breakpointPenalty) ** 2;
          } else if (breakpointPenalty > MIN_COST) {
            demerits = (1 + baseBadness) ** 2 - breakpointPenalty ** 2;
          } else {
            demerits = (1 + baseBadness) ** 2;
          }
          return sum + demerits + extraBadness;
        }, 0);
      };

      assert.isBelow(
        totalDemerits([0, 3, 11], 'badness'),
        totalDemerits([0, 6, 11], 'badness'),
      );
      assert.isAbove(
        totalDemerits([0, 3, 11], 'post-hoc'),
        totalDemerits([0, 6, 11], 'post-hoc'),
      );
    });

    it('adjustmentRatioPenalty returning 0 does not change results', () => {
      const items = [
        box(10),
        glue(5, 3, 3),
        box(10),
        glue(5, 3, 3),
        box(10),
        forcedBreak(),
      ];

      const breakpointsA = breakLines(items, 30);
      const breakpointsB = breakLines(items, 30, {
        adjustmentRatioPenalty: () => 0,
      });

      assert.deepEqual(breakpointsA, breakpointsB);
    });

    it('adjustmentRatioPenalty: null does not change results', () => {
      const items = [
        box(10),
        glue(5, 3, 3),
        box(10),
        glue(5, 3, 3),
        box(10),
        forcedBreak(),
      ];

      const breakpointsA = breakLines(items, 30);
      const breakpointsB = breakLines(items, 30, {
        adjustmentRatioPenalty: null,
      });

      assert.deepEqual(breakpointsA, breakpointsB);
    });

    it('does not call adjustmentRatioPenalty for non-finite ratios', () => {
      const items = [box(10), glue(5, 0, 0), box(10), forcedBreak()];
      let calls = 0;

      const breakpoints = breakLines(items, 30, {
        maxAdjustmentRatio: null,
        initialMaxAdjustmentRatio: Number.POSITIVE_INFINITY,
        adjustmentRatioPenalty: (ratio) => {
          calls++;
          assert.isTrue(Number.isFinite(ratio));
          return 1;
        },
      });

      assert.deepEqual(breakpoints, [0, 3]);
      assert.equal(calls, 0);
    });

    it('throws if adjustmentRatioPenalty returns a negative number', () => {
      const items = [box(10), glue(5, 3, 3), box(10), forcedBreak()];
      assert.throws(
        () =>
          breakLines(items, 30, {
            adjustmentRatioPenalty: () => -1,
          }),
        /finite non-negative/,
      );
    });

    it('throws if adjustmentRatioPenalty returns NaN', () => {
      const items = [box(10), glue(5, 3, 3), box(10), forcedBreak()];
      assert.throws(
        () =>
          breakLines(items, 30, {
            adjustmentRatioPenalty: () => NaN,
          }),
        /finite non-negative/,
      );
    });

    it('throws if adjustmentRatioPenalty returns Infinity', () => {
      const items = [box(10), glue(5, 3, 3), box(10), forcedBreak()];
      assert.throws(
        () =>
          breakLines(items, 30, {
            adjustmentRatioPenalty: () => Infinity,
          }),
        /finite non-negative/,
      );
    });

    it('throws `MaxAdjustmentExceededError` if max adjustment ratio is exceeded', () => {
      const items = [box(10), glue(5, 10, 10), box(10), forcedBreak()];
      const opts = { maxAdjustmentRatio: 1 };
      assert.throws(() => breakLines(items, 100, opts), MaxAdjustmentExceededError);
    });

    it('does not carry a breakpoint penalty width into the next line', () => {
      const items = [
        box(3),
        box(3),
        glue(1, 1, 1),
        penalty(1, 0, false),
        box(3),
        penalty(2, 10, false),
        box(3),
        glue(2, 1, 2),
        forcedBreak(),
      ];

      assert.deepEqual(breakLines(items, 12), [0, 5, 8]);
    });

    it('treats an exact-fit line with rigid glue as having zero adjustment', () => {
      const items = [box(10), glue(5, 0, 0), box(10), forcedBreak()];
      const breakpoints = breakLines(items, 25);

      assert.deepEqual(breakpoints, [0, 3]);
      assert.deepEqual(adjustmentRatios(items, 25, breakpoints), [0]);
    });

    it('requires a terminal forced break', () => {
      const items = [box(10), glue(5, 1, 1), box(10)];

      assert.throws(() => breakLines(items, 12), /forced break/i);
    });
  });

  describe('positionItems', () => {
    it('lays out items with justified margins', () => {
      const items = [
        box(10),
        glue(10, 5, 5),
        box(10),
        glue(10, 5, 5),
        box(10),
        glue(10, 5, 5),
        forcedBreak(),
      ];
      const lineWidth = 35;
      const breakpoints = [0, 3, 6];

      const boxes = positionItems(items, lineWidth, breakpoints);

      assert.deepEqual(boxes, [
        {
          item: 0,
          line: 0,
          xOffset: 0,
          width: 10,
        },
        {
          item: 2,
          line: 0,
          xOffset: 25,
          width: 10,
        },
        {
          item: 4,
          line: 1,
          xOffset: 0,
          width: 10,
        },
      ]);
    });

    it('does not let gap between boxes shrink below `glue.width - glue.shrink`', () => {
      const items = [box(10), glue(10, 5, 5), box(100), forcedBreak()];
      const lineWidth = 50;
      const breakpoints = [0, 3];

      const boxes = positionItems(items, lineWidth, breakpoints);

      assert.deepEqual(boxes, [
        {
          item: 0,
          line: 0,
          xOffset: 0,
          width: 10,
        },
        {
          item: 2,
          line: 0,
          xOffset: 15,
          width: 100,
        },
      ]);
    });
  });
});
