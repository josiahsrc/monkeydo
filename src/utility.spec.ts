import { getContentBeforeChange } from './utility';
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
