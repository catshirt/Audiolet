import { AudioletNode } from './AudioletNode';
import { AudioletParameter } from './AudioletParameter';

/**
 * A type of AudioletNode designed to allow AudioletGroups to exactly replicate
 * the behaviour of AudioletParameters.  By linking one of the group's inputs
 * to the ParameterNode's input, and calling `this.parameterName =
 * parameterNode` in the group's constructor, `this.parameterName` will behave
 * as if it were an AudioletParameter contained within an AudioletNode.
 *
 * **Inputs**
 *
 * - Parameter input
 *
 * **Outputs**
 *
 * - Parameter value
 *
 * **Parameters**
 *
 * - parameter The contained parameter.  Linked to input 0.
 */
class ParameterNode extends AudioletNode {

  /*
   * @constructor
   * @extends AudioletNode
   * @param {Audiolet} audiolet The audiolet object.
   * @param {Number} value The initial static value of the parameter.
   */
  constructor(audiolet, value) {
    super(audiolet, 1, 1);
    this.parameter = new AudioletParameter(this, 0, value);
  }

  /**
   * Process samples
   */
  generate() {
    this.outputs[0].samples[0] = this.parameter.getValue();
  }

  /**
   * toString
   *
   * @return {String} String representation.
   */
  toString() {
    return 'Parameter Node';
  }

}

export default { ParameterNode };
