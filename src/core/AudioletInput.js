/**
 * Class representing a single input of an AudioletNode
 */
class AudioletInput {

  /**
   * @constructor
   * @param {AudioletNode} node The node which the input belongs to.
   * @param {Number} index The index of the input.
   */
  constructor(node, index) {
    this.node = node;
    this.index = index;
    this.connectedFrom = [];
    // Minimum sized buffer, which we can resize from accordingly
    this.samples = [];
  }

  /**
   * Connect the input to an output
   *
   * @param {AudioletOutput} output The output to connect to.
   */
  connect(output) {
    this.connectedFrom.push(output);
  }

  /**
   * Disconnect the input from an output
   *
   * @param {AudioletOutput} output The output to disconnect from.
   */
  disconnect(output) {
    var numberOfStreams = this.connectedFrom.length;
    for (var i = 0; i < numberOfStreams; i++) {
      if (output == this.connectedFrom[i]) {
        this.connectedFrom.splice(i, 1);
        break;
      }
    }
    if (this.connectedFrom.length == 0) {
      this.samples = [];
    }
  }

  /**
   * toString
   *
   * @return {String} String representation.
   */
  toString() {
    return this.node.toString() + 'Input #' + this.index;
  }

}

export default { AudioletInput };
