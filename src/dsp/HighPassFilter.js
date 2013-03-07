/*!
 * @depends BiquadFilter.js
 */

/**
 * High-pass filter
 *
 * **Inputs**
 *
 * - Audio
 * - Filter frequency
 *
 * **Outputs**
 *
 * - Filtered audio
 *
 * **Parameters**
 *
 * - frequency The filter frequency.  Linked to input 1.
 */
var HighPassFilter = BiquadFilter.extend({

    /**
     * Constructor
     *
     * @extends BiquadFilter
     * @param {Audiolet} audiolet The audiolet object.
     * @param {Number} frequency The initial frequency.
     */
    constructor: function(audiolet, frequency) {
        BiquadFilter.call(this, audiolet, frequency);
    },

    /**
     * Calculate the biquad filter coefficients using maths from
     * http://www.musicdsp.org/files/Audio-EQ-Cookbook.txt
     *
     * @param {Number} frequency The filter frequency.
     */
    calculateCoefficients: function(frequency) {
        var w0 = 2 * Math.PI * frequency /
                 this.audiolet.device.sampleRate;
        var cosw0 = Math.cos(w0);
        var sinw0 = Math.sin(w0);
        var alpha = sinw0 / (2 / Math.sqrt(2));

        this.b0 = (1 + cosw0) / 2;
        this.b1 = - (1 + cosw0);
        this.b2 = this.b0;
        this.a0 = 1 + alpha;
        this.a1 = -2 * cosw0;
        this.a2 = 1 - alpha;
    },

    /**
     * toString
     *
     * @return {String} String representation.
     */
    toString: function() {
        return 'High Pass Filter';
    }

});