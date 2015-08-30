import { AudioletNode } from '../core/AudioletNode';
import { AudioletParameter } from '../core/AudioletParameter';

/**
 * A white noise source
 *
 * **Outputs**
 *
 * - White noise
 */
class WhiteNoise extends AudioletNode {

  /*
   * @constructor
   * @extends AudioletNode
   * @param {Audiolet} audiolet The audiolet object.
   */
  constructor(audiolet) {
    super(audiolet, 0, 1);
  }

  /**
   * Process samples
   */
  generate() {
    this.outputs[0].samples[0] = Math.random() * 2 - 1;
  }

  /**
   * toString
   *
   * @return {String} String representation.
   */
  toString() {
    return 'White Noise';
  }

}

export default { WhiteNoise };
