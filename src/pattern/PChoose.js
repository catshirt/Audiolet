import { Pattern } from './Pattern';

/**
 * Choose a random value from an array.
 */
class PChoose extends Pattern {

  /*
   * @constructor
   * @extends Pattern
   * @param {Object[]} list Array of items to choose from.
   * @param {Number} [repeats=1] Number of values to generate.
   */
  constructor(list, repeats) {
    super()
    this.list = list;
    this.repeats = repeats || 1;
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
      var index = Math.floor(Math.random() * this.list.length);
      var item = this.list[index];
      var value = this.valueOf(item);
      if (value != null) {
        if (!(item instanceof Pattern)) {
          this.position += 1;
        }
        returnValue = value;
      }
      else {
        if (item instanceof Pattern) {
          item.reset();
        }
        this.position += 1;
        returnValue = this.next();
      }
    }
    else {
      returnValue = null;
    }
    return (returnValue);
  };

  /**
   * Reset the pattern
   */
  reset() {
    this.position = 0;
    for (var i = 0; i < this.list.length; i++) {
      var item = this.list[i];
      if (item instanceof Pattern) {
        item.reset();
      }
    }
  }

}

export default { PChoose };
