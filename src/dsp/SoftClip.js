import { AudioletNode } from '../core/AudioletNode';

/**
 * A soft-clipper, which distorts at values over +-0.5.
 *
 * **Inputs**
 *
 * - Audio
 *
 * **Outputs**
 *
 * - Clipped audio
 */
class SoftClip extends AudioletNode {

  /*
   * @constructor
   * @extends AudioletNode
   * @param {Audiolet} audiolet The audiolet object.
   */

  constructor(audiolet) {
    super(audiolet, 1, 1);
    this.linkNumberOfOutputChannels(0, 0);
  }

  /**
   * Process samples
   */
  generate() {
    var input = this.inputs[0];
    var output = this.outputs[0];

    var numberOfChannels = input.samples.length;
    for (var i = 0; i < numberOfChannels; i++) {
      var value = input.samples[i];
      if (value > 0.5 || value < -0.5) {
        output.samples[i] = (Math.abs(value) - 0.25) / value;
      }
      else {
        output.samples[i] = value;
      }
    }
  }

  /**
   * toString
   *
   * @return {String} String representation.
   */
  toString() {
    return ('SoftClip');
  }

}

export default { SoftClip };
