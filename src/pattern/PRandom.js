import { Pattern } from './Pattern';

/**
 * Sequence of random numbers.
 */
class PRandom extends Pattern {

  /*
   * @constructor
   * @extends Pattern
   * @param {Number|Pattern} low Lowest possible value.
   * @param {Number|Pattern} high Highest possible value.
   * @param {Number} repeats Number of values to generate.
   */
  constructor(low, high, repeats) {
    super();
    this.low = low;
    this.high = high;
    this.repeats = repeats;
    this.position = 0;
  }

  /**
   * Generate the next value in the pattern.
   *
   * @return {Number} The next value.
   */
  next() {
    var returnValue;
    if (this.position < this.repeats) {
      var low = this.valueOf(this.low);
      var high = this.valueOf(this.high);
      if (low != null && high != null) {
        returnValue = low + Math.random() * (high - low);
        this.position += 1;
      }
      else {
        returnValue = null;
      }
    }
    else {
      returnValue = null;
    }
    return (returnValue);
  }

  /**
   * Reset the pattern
   */
  reset() {
    this.position = 0;
  }

}

export default { PRandom };
