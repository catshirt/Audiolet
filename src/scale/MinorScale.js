import { Scale } from './Scale';

/**
 * Minor scale.
 */
class MinorScale extends Scale {

  /*
   * @constructor
   * @extends Scale
   */
  constructor() {
    super([0, 2, 3, 5, 7, 8, 10]);
  }

}

export default { MinorScale };
