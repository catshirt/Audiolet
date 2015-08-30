import { Pattern } from './Pattern';

/**
 * Proxy pattern.  Holds a pattern which can safely be replaced by a different
 * pattern while it is running.
 */
class PProxy extends Pattern {

  /*
   * @constructor
   * @extends Pattern
   * @param {Pattern} pattern The initial pattern.
   */
  constructor(pattern) {
    super();
    if (pattern) {
      this.pattern = pattern;
    }
  }

  /**
   * Generate the next value in the pattern.
   *
   * @return {Number} The next value.
   */
  next() {
    var returnValue;
    if (this.pattern) {
      var returnValue = this.pattern.next();
    }
    else {
      returnValue = null;
    }
    return returnValue;
  }

}

export default { PProxy };
