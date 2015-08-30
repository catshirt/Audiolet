import { AudioletNode } from '../core/AudioletNode';
import { AudioletParameter } from '../core/AudioletParameter';

/*
 * Multiply values
 *
 * **Inputs**
 *
 * - Audio 1
 * - Audio 2
 *
 * **Outputs**
 *
 * - Multiplied audio
 *
 * **Parameters**
 *
 * - value The value to multiply by.  Linked to input 1.
 */
class Multiply extends AudioletNode {

  /*
   * @constructor
   * @extends AudioletNode
   * @param {Audiolet} audiolet The audiolet object.
   * @param {Number} [value=1] The initial value to multiply by.
   */
  constructor(audiolet, value) {
    super(audiolet, 2, 1);
    this.linkNumberOfOutputChannels(0, 0);
    this.value = new AudioletParameter(this, 1, value || 1);
  }

  /**
   * Process samples
   */
  generate() {
    var value = this.value.getValue();
    var input = this.inputs[0];
    var numberOfChannels = input.samples.length;
    for (var i = 0; i < numberOfChannels; i++) {
      this.outputs[0].samples[i] = input.samples[i] * value;
    }
  }

  /**
   * toString
   *
   * @return {String} String representation.
   */
  toString() {
    return 'Multiply';
  }

}

export default { Multiply };
