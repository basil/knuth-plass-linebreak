/*
 * MIT License
 *
 * Copyright (c) 2018 Robert Knight
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

import { Box, Glue, Penalty } from '../src/layout';
import { TextInputItem } from '../src/helpers';

export function box(w: number): Box {
  return { type: 'box', width: w };
}

export function glue(w: number, shrink: number, stretch: number): Glue {
  return { type: 'glue', width: w, shrink, stretch };
}

export function penalty(w: number, cost: number, flagged: boolean): Penalty {
  return { type: 'penalty', width: w, cost, flagged };
}

export function itemString(item: TextInputItem) {
  switch (item.type) {
    case 'box':
      return item.text;
    case 'glue':
      return ' ';
    case 'penalty':
      return item.flagged ? '-' : '';
  }
}

export function lineStrings(items: TextInputItem[], breakpoints: number[]): string[] {
  const pieces = items.map(itemString);
  const start = (pos: number) => (pos === 0 ? 0 : pos + 1);
  return chunk(breakpoints, 2).map(([a, b]) =>
    pieces
      .slice(start(a), b + 1)
      .filter((w, i, ary) => w !== '-' || i === ary.length - 1)
      .join('')
      .trim(),
  );
}

export function chunk<T>(arr: T[], width: number) {
  let chunks: T[][] = [];
  for (let i = 0; i <= arr.length - width; i++) {
    chunks.push(arr.slice(i, i + width));
  }
  return chunks;
}
