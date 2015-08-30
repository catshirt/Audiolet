/**
 * Class representing a single output of an AudioletNode
 */
class AudioletOutput {

  /**
   * @constructor
   * @param {AudioletNode} node The node which the input belongs to.
   * @param {Number} index The index of the input.
   */
  constructor(node, index) {
    this.node = node;
    this.index = index;
    this.connectedTo = [];
    this.samples = [];

    this.linkedInput = null;
    this.numberOfChannels = 1;
  }

  /**
   * Connect the output to an input
   *
   * @param {AudioletInput} input The input to connect to.
   */
  connect(input) {
    this.connectedTo.push(input);
  }

  /**
   * Disconnect the output from an input
   *
   * @param {AudioletInput} input The input to disconnect from.
   */
  disconnect(input) {
    var numberOfStreams = this.connectedTo.length;
    for (var i = 0; i < numberOfStreams; i++) {
      if (input == this.connectedTo[i]) {
        this.connectedTo.splice(i, 1);
        break;
      }
    }
  }

  /**
   * Link the output to an input, forcing the output to always contain the
   * same number of channels as the input.
   *
   * @param {AudioletInput} input The input to link to.
   */
  linkNumberOfChannels(input) {
    this.linkedInput = input;
  }

  /**
   * Unlink the output from its linked input
   */
  unlinkNumberOfChannels() {
    this.linkedInput = null;
  }

  /**
   * Get the number of output channels, taking the value from the input if the
   * output is linked.
   *
   * @return {Number} The number of output channels.
   */
  getNumberOfChannels() {
    if (this.linkedInput && this.linkedInput.connectedFrom.length) {
      return (this.linkedInput.samples.length);
    }
    return (this.numberOfChannels);
  }

  /**
   * toString
   *
   * @return {String} String representation.
   */
  toString() {
    return this.node.toString() + 'Output #' + this.index + ' - ';
  }

}

export default { AudioletOutput };
