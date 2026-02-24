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

const htmlPath = path.join(
    __dirname,
    '..',
    '..',
    'CopyToMarkdown',
    'SelectionToMarkdownContextMenu.sample.html'
);
const expectedPath = path.join(
    __dirname,
    '..',
    '..',
    'CopyToMarkdown',
    'SelectionToMarkdownContextMenu.original.md'
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
