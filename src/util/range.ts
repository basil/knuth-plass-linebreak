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

declare global {
  interface Range {
    intersectsNode(node: Node): boolean;
  }
}

/**
 * Return a list of `Text` nodes in `range`.
 *
 * `filter` is called with each node in document order in the subtree rooted
 * at `range.commonAncestorContainer`. If it returns false, that node and its
 * children are skipped.
 */
export function textNodesInRange(range: Range, filter: (n: Node) => boolean) {
  const root = range.commonAncestorContainer;
  const nodeIter = root.ownerDocument!.createTreeWalker(root, NodeFilter.SHOW_ALL, {
    acceptNode(node: Node) {
      if (filter(node)) {
        return NodeFilter.FILTER_ACCEPT;
      } else {
        return NodeFilter.FILTER_REJECT;
      }
    },
  });

  let currentNode: Node | null = nodeIter.currentNode;
  let nodes: Text[] = [];

  while (currentNode) {
    if (range.intersectsNode(currentNode) && currentNode instanceof Text) {
      nodes.push(currentNode);
    }
    currentNode = nodeIter.nextNode();
  }
  return nodes;
}
