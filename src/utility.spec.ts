import mockVscode from 'mock-require';

mockVscode('vscode', {
  window: {
    createOutputChannel: () => ({ appendLine: () => { } }),
  },
  lm: {
    selectChatModels: async () => [],
  },
  LanguageModelChatMessage: {
    User: (msg: string) => ({ role: 'user', content: msg }),
    Assistant: (msg: string) => ({ role: 'assistant', content: msg }),
  },
  LanguageModelTextPart: function (value: string) { throw new Error('Not implemented'); },
  LanguageModelToolResult: function (parts: any[]) { throw new Error('Not implemented'); },
  workspace: {},
});

import { clipMaxLines, getContentBeforeChange } from './utility';
import { equal } from "assert";

describe('getContentBeforeChange', () => {
  it('works for basic case', () => {
    const actual = getContentBeforeChange({
      document: {
        getText: () => 'Hello World',
      } as any,
      contentChanges: [
        {
          rangeOffset: 6,
          rangeLength: 5,
          text: 'Universe',
        },
      ],
    } as any);
    // expect(actual).to.equal('Hello Universe');
    equal(actual, 'Hello Universe');
  });

  it('works for empty change', () => {
    const actual = getContentBeforeChange({
      document: {
        getText: () => 'Hello World',
      } as any,
      contentChanges: [],
    } as any);
    equal(actual, 'Hello World');
  });

  it('works for multiple changes', () => {
    const actual = getContentBeforeChange({
      document: {
        getText: () => 'Hello World',
      } as any,
      contentChanges: [
        {
          rangeOffset: 6,
          rangeLength: 5,
          text: 'Universe',
        },
        {
          rangeOffset: 0,
          rangeLength: 5,
          text: 'Hi',
        },
      ],
    } as any);
    equal(actual, 'Hi Universe');
  });
});

describe('clipMaxLines', () => {
  it('clips to max lines', () => {
    const text = 'Line 1\nLine 2\nLine 3\nLine 4\nLine 5';
    const maxLines = 3;
    const expected = 'Line 1\nLine 2\nLine 3';
    const actual = clipMaxLines(text, maxLines);
    equal(actual, expected);
  });

  it('does not clip if within limit', () => {
    const text = 'Line 1\nLine 2\nLine 3';
    const maxLines = 5;
    const actual = clipMaxLines(text, maxLines);
    equal(actual, text);
  });

  it('returns empty string for empty input', () => {
    const text = '';
    const maxLines = 3;
    const actual = clipMaxLines(text, maxLines);
    equal(actual, '');
  });
});
