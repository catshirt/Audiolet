/*!
 * @depends ../core/AudioletGroup.js
 */

/**
 * A MidiGroup is almost identical to an AudioletGroup, except it
 * let's you define which input and output index represent MidiInputs
 * and MidIOutputs. It additionally provides a `onMidi` method which
 * maps midi messages to instance methods. `.onMidi(144, 44, 255)` for instance,
 * will trigger .noteOn(44, 255);.
 *
 * The MidiInput, MidiOutput, and MidiGroup nodes all behave the same as Audiolet
 * objects for routing purposes- but `MidiOutput` has a unique method; `send`.
 * `send` will send a midi message to the node that output is connected to.
 */
var MidiGroup = AudioletGroup.extend({

    /*
     * Constructor
     *
     * @param {Audiolet} audiolet The audiolet object.
     * @param {Number} numberOfInputs The number of inputs.
     * @param {Number} numberOfOutputs The number of outputs.
     * @param {Number} midiIn The input index to use for midi in.
     * @param {Number} midiOut The output index to use for midi out.
     */
    constructor: function(audiolet, numberOfInputs, numberOfOutputs) {
        AudioletGroup.apply(this, arguments);
        this.midiIn = new MidiInput(this);
        this.midiOut = new MidiOutput(this);
    }

});