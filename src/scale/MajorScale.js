import { Scale } from './Scale';

/**
 * Major scale.
 */
class MinorScale extends Scale {

  /*
   * @constructor
   * @extends Scale
   */
  constructor() {
    super([0, 2, 4, 5, 7, 9, 11]);
  }

}

export default { MajorScale };
