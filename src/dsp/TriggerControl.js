import { AudioletNode } from '../core/AudioletNode';
import { AudioletParameter } from '../core/AudioletParameter';

/**
 * Simple trigger which allows you to set a single sample to be 1 and then
 * resets itself.
 *
 * **Outputs**
 *
 * - Triggers
 *
 * **Parameters**
 *
 * - trigger Set to 1 to fire a trigger.
 */
class TriggerControl extends AudioletNode {

  /*
   * @constructor
   * @extends AudioletNode
   * @param {Audiolet} audiolet The audiolet object.
   * @param {Number} [trigger=0] The initial trigger state.
   */
  constructor(audiolet, trigger) {
    super(audiolet, 0, 1);
    this.trigger = new AudioletParameter(this, null, trigger || 0);
  }

  /**
   * Process samples
   */
  generate() {
    if (this.trigger.getValue() > 0) {
      this.outputs[0].samples[0] = 1;
      this.trigger.setValue(0);
    }
    else {
      this.outputs[0].samples[0] = 0;
    }
  }

  /**
   * toString
   *
   * @return {String} String representation.
   */
  toString() {
    return 'Trigger Control';
  }

}

export default { TriggerControl };
