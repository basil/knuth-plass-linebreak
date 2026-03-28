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

import { assert, describe, it, beforeEach, afterEach } from 'vitest';

import { textNodesInRange } from '../../src/util/range';

function acceptAllNodes() {
  return true;
}

describe('range', () => {
  let para: HTMLParagraphElement;
  beforeEach(() => {
    para = document.createElement('p');
    document.body.appendChild(para);
  });

  afterEach(() => {
    para.remove();
  });

  describe('textNodesInRange', () => {
    it('returns all text nodes in range', () => {
      const texts = [new Text('first'), new Text('second')];

      texts.forEach((t) => para.appendChild(t));
      const range = document.createRange();
      range.selectNode(para);

      assert.deepEqual(textNodesInRange(range, acceptAllNodes), texts);
    });

    it('does not return non-Text nodes', () => {
      para.innerHTML = 'foo <b>bar</b> baz <!-- meep !-->';

      const range = document.createRange();
      range.selectNode(para);
      const texts = textNodesInRange(range, acceptAllNodes);

      texts.forEach((t) => assert.instanceOf(t, Text));
    });

    it('returns text nodes in a range with only one node', () => {
      para.innerHTML = 'test';

      const range = document.createRange();
      range.setStart(para.childNodes[0], 1);
      range.setEnd(para.childNodes[0], 3);

      assert.deepEqual(textNodesInRange(range, acceptAllNodes), [para.childNodes[0]]);
    });

    it('does not return text nodes outside of range', () => {
      const texts = [new Text('one'), new Text('two'), new Text('three')];
      texts.forEach((t) => para.appendChild(t));

      const range = document.createRange();
      range.setStart(para, 1);
      range.setEnd(para, 2);

      assert.deepEqual(textNodesInRange(range, acceptAllNodes), [texts[1]]);
    });

    it('skips subtrees which are filtered out', () => {
      const texts = [new Text('first'), new Text('second'), new Text('third')];

      const child = document.createElement('span');
      child.appendChild(texts[1]);

      para.appendChild(texts[0]);
      para.appendChild(child);
      para.appendChild(texts[2]);
      const range = document.createRange();
      range.selectNode(para);

      const rejectSpans = (node: Node) => {
        if (!(node instanceof Element)) {
          return true;
        }
        return node.tagName !== 'SPAN';
      };

      assert.deepEqual(textNodesInRange(range, rejectSpans), [texts[0], texts[2]]);
    });
  });
});
