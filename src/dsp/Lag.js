import { AudioletNode } from '../core/AudioletNode';
import { AudioletParameter } from '../core/AudioletParameter';

/**
 * Exponential lag for smoothing signals.
 *
 * **Inputs**
 *
 * - Value
 * - Lag time
 *
 * **Outputs**
 *
 * - Lagged value
 *
 * **Parameters**
 *
 * - value The value to lag.  Linked to input 0.
 * - lag The 60dB lag time. Linked to input 1.
 */
class Lag extends AudioletNode {

  /*
   * @constructor
   * @extends AudioletNode
   * @param {Audiolet} audiolet The audiolet object.
   * @param {Number} [value=0] The initial value.
   * @param {Number} [lagTime=1] The initial lag time.
   */
  constructor(audiolet, value, lagTime) {
    super(audiolet, 2, 1);
    this.value = new AudioletParameter(this, 0, value || 0);
    this.lag = new AudioletParameter(this, 1, lagTime || 1);
    this.lastValue = 0;

    this.log001 = Math.log(0.001);
  }

  /**
   * Process samples
   */
  generate() {
    var input = this.inputs[0];
    var output = this.outputs[0];

    var sampleRate = this.audiolet.device.sampleRate;

    var value = this.value.getValue();
    var lag = this.lag.getValue();
    var coefficient = Math.exp(this.log001 / (lag * sampleRate));

    var outputValue = ((1 - coefficient) * value) +
                      (coefficient * this.lastValue);
    output.samples[0] = outputValue;
    this.lastValue = outputValue;
  }

  /**
   * toString
   *
   * @return {String} String representation.
   */
  toString() {
    return 'Lag';
  }

}

export default { Lag };
