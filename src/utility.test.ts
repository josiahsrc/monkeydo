import { getContentBeforeChange } from './utility';
import { describe, test, expect } from '@jest/globals';

describe('getContentBeforeChange', () => {
  test('works for basic case', () => {
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
    expect(actual).toBe('Hello Universe');
  });

  test('works for empty change', () => {
    const actual = getContentBeforeChange({
      document: {
        getText: () => 'Hello World',
      } as any,
      contentChanges: [],
    } as any);
    expect(actual).toBe('Hello World');
  });

  test('works for multiple changes', () => {
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
    expect(actual).toBe('Hi Universe');
  });
});
