import { AudioletNode } from '../core/AudioletNode';
import { AudioletParameter } from '../core/AudioletParameter';

/**
 * Reduce the bitrate of incoming audio
 *
 * **Inputs**
 *
 * - Audio 1
 * - Number of bits
 *
 * **Outputs**
 *
 * - Bit Crushed Audio
 *
 * **Parameters**
 *
 * - bits The number of bit to reduce to.  Linked to input 1.
 */
class BitCrusher extends AudioletNode {

  /*
   * @constructor
   * @extends AudioletNode
   * @param {Audiolet} audiolet The audiolet object.
   * @param {Number} bits The initial number of bits.
   */
  constructor(audiolet, bits) {
    super(audiolet, 2, 1);
    this.linkNumberOfOutputChannels(0, 0);
    this.bits = new AudioletParameter(this, 1, bits);
  }

  /**
   * Process samples
   */
  generate() {
    var input = this.inputs[0];

    var maxValue = Math.pow(2, this.bits.getValue()) - 1;

    var numberOfChannels = input.samples.length;
    for (var i = 0; i < numberOfChannels; i++) {
      this.outputs[0].samples[i] = Math.floor(input.samples[i] * maxValue) /
                                   maxValue;
    }
  }

  /**
   * toString
   *
   * @return {String} String representation.
   */
  toString() {
    return 'BitCrusher';
  }

}

export default { BitCrusher };
