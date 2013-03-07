/*!
 * @depends ../core/AudioletNode.js
 */

/**
 * Add values
 *
 * **Inputs**
 *
 * - Audio 1
 * - Audio 2
 *
 * **Outputs**
 *
 * - Summed audio
 *
 * **Parameters**
 *
 * - value The value to add.  Linked to input 1.
 */
var Add = AudioletNode.extend({

    parameters: {
        value: [1, 0]
    },

    /**
     * Constructor
     *
     * @extends AudioletNode
     * @param {Audiolet} audiolet The audiolet object.
     * @param {Number} [value=0] The initial value to add.
     */
    constructor: function(audiolet, value) {
        AudioletNode.call(this, audiolet, 2, 1, {
            value: value
        });
        this.linkNumberOfOutputChannels(0, 0);
    },

    /**
     * Process samples
     */
    generate: function() {
        var input = this.inputs[0];
        var output = this.outputs[0];

        var value = this.value.getValue();

        var numberOfChannels = input.samples.length;
        for (var i = 0; i < numberOfChannels; i++) {
            output.samples[i] = input.samples[i] + value;
        }
    },

    /**
     * toString
     *
     * @return {String} String representation.
     */
    toString: function() {
        return 'Add';
    }

});