'use strict';

// This test validates the exact GitHub-rendered HTML -> Markdown round-trip
// for a known sample. It deliberately compares byte-for-byte output to ensure
// the conversion keeps indentation, horizontal rules, and task list markers
// identical to the original authoring style.

const fs = require('fs');
const path = require('path');
const assert = require('assert');
const { JSDOM } = require('jsdom');

const dom = new JSDOM('<!doctype html><html><body></body></html>');
global.window = dom.window;
global.DOMParser = dom.window.DOMParser;

const html2markdown = require('../lib/html2markdown.cjs');

// 測試資料與 userscript 原始碼一起放在 dev/Readability/ 底下（commit ca7a9de 以
// `*.testdata.*` 的檔名加入）。原本的路徑指向 repo 中從未存在過的 dev/CopyToMarkdown/ 目錄與舊檔名，
// 導致測試一執行就因 ENOENT 失敗，等於完全沒有在保護 lib/html2markdown.cjs 的輸出格式。
const htmlPath = path.join(
    __dirname,
    '..',
    'SelectionToMarkdownContextMenu.testdata.sample.html'
);
const expectedPath = path.join(
    __dirname,
    '..',
    'SelectionToMarkdownContextMenu.testdata.original.md'
);

const html = fs.readFileSync(htmlPath, 'utf8');
const expected = fs.readFileSync(expectedPath, 'utf8');
const actual = html2markdown(html);

assert.strictEqual(
    actual,
    expected,
    'html2markdown should exactly reproduce the original Markdown for the sample HTML.'
);

console.log('html2markdown sample test passed.');
