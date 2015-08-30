import { AudioletNode } from '../core/AudioletNode';

/**
 * Reciprocal (1/x) of values
 *
 * **Inputs**
 *
 * - Audio
 *
 * **Outputs**
 *
 * - Reciprocal audio
 */
class Reciprocal extends AudioletNode {

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
      output.samples[i] = 1 / input.samples[i];
    }
  }

  /**
   * toString
   *
   * @return {String} String representation.
   */
  toString() {
    return 'Reciprocal';
  }

}

export default { Reciprocal };
