import { AudioletNode } from '../core/AudioletNode';
import { AudioletParameter } from '../core/AudioletParameter';

/**
 * Linear cross-fade between two signals
 *
 * **Inputs**
 *
 * - Audio 1
 * - Audio 2
 * - Fade Position
 *
 * **Outputs**
 *
 * - Mixed audio
 *
 * **Parameters**
 *
 * - position The fade position.  Values between 0 (Audio 1 only) and 1 (Audio
 * 2 only).  Linked to input 2.
 */
class LinearCrossFade extends AudioletNode {

  /*
   * @constructor
   * @extends AudioletNode
   * @param {Audiolet} audiolet The audiolet object.
   * @param {Number} [position=0.5] The initial fade position.
   */
  constructor(audiolet, position) {
    super(audiolet, 3, 1);
    this.linkNumberOfOutputChannels(0, 0);
    this.position = new AudioletParameter(this, 2, position || 0.5);
  }

  /**
   * Process samples
   */
  generate() {
    var inputA = this.inputs[0];
    var inputB = this.inputs[1];
    var output = this.outputs[0];

    var position = this.position.getValue();

    var gainA = 1 - position;
    var gainB = position;

    var numberOfChannels = output.samples.length;
    for (var i = 0; i < numberOfChannels; i++) {
      var valueA = inputA.samples[i] || 0;
      var valueB = inputB.samples[i] || 0;
      output.samples[i] = valueA * gainA + valueB * gainB;
    }
  }

  /**
   * toString
   *
   * @return {String} String representation.
   */
  toString() {
    return 'Linear Cross Fader';
  }

}

export default { LinearCrossFade };
