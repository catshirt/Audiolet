import { Multiply } from '../operators/Multiply';

/**
 * Simple gain control
 *
 * **Inputs**
 *
 * - Audio
 * - Gain
 *
 * **Outputs**
 *
 * - Audio
 *
 * **Parameters**
 *
 * - gain The amount of gain.  Linked to input 1.
 */
class Gain extends Multiply {

  /*
   * @constructor
   * @extends AudioletNode
   * @param {Audiolet} audiolet The audiolet object.
   * @param {Number} [gain=1] Initial gain.
   */
  constructor(audiolet, gain) {
    // Same DSP as operators/Multiply.js, but different parameter name
    super(audiolet, gain);
    this.gain = this.value;
  }

  /**
   * toString
   *
   * @return {String} String representation.
   */
  toString() {
    return ('Gain');
  }

}

export default { Gain };
