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

javascript:(function() {
/* 1. Save the contents of this file as the URL of a new bookmark in your
      browser.
   2. Visit a website and activate the bookmark. */
var libScript = document.createElement('script');
libScript.src = 'https://unpkg.com/knuth-plass-linebreak';
document.body.appendChild(libScript);

var dictScript = document.createElement('script');
dictScript.src = 'https://unpkg.com/knuth-plass-linebreak/dist/hyphens_en-us.js';
document.body.appendChild(dictScript);

var libLoaded = new Promise(resolve => libScript.onload=resolve);
var dictLoaded = new Promise(resolve => dictScript.onload=resolve);

Promise.all([libLoaded, dictLoaded]).then(() => {
  var lib = window.texLineBreak_lib;
  var h = lib.createHyphenator(window['texLineBreak_hyphens_en-us']);
  var paras = [...document.querySelectorAll('p')];
  lib.justifyContent(paras, h);
}).catch(err => console.error(err));
})()
