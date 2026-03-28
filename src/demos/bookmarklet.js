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

javascript:(async function() {
/* 1. Save the contents of this file as the URL of a new bookmark in your
      browser.
   2. Visit a website and activate the bookmark. */
var lib = await import('https://cdn.jsdelivr.net/npm/knuth-plass-linebreak/+esm');
var dict = await import('https://cdn.jsdelivr.net/npm/hyphenation.en-us/+esm');
var h = lib.createHyphenator(dict.default);
var paras = [...document.querySelectorAll('p')];
lib.justifyContent(paras, h);
})().catch(err => console.error(err))
