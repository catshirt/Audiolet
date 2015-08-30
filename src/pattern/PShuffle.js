import { Pattern } from './Pattern';

/**
 * Reorder an array, then iterate through it's values.
 */
class PShuffle extends Pattern {

  /*
   * @constructor
   * @extends Pattern
   * @param {Object[]} list Array of values.
   * @param {Number} repeats Number of times to loop through the array.
   */
  constructor(list, repeats) {
    super()
    this.list = [];
    // Shuffle values into new list
    while (list.length) {
      var index = Math.floor(Math.random() * list.length);
      var value = list.splice(index, 1);
      this.list.push(value);
    }
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
    if (this.position < this.repeats * this.list.length) {
      var index = (this.position + this.offset) % this.list.length;
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
  }

}

export default { PShuffle };
