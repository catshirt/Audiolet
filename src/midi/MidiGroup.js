/*!
 * @depends ../core/AudioletGroup.js
 */

/**
 * A MIDIGroup is an AudioletGroup with additional `midiIn` and `midiOut`
 * properties. `midiIn` is responsible for taking inbound MIDI messages and mapping
 * them to instance methods, and `midiOut` is responsible for giving the `MIDIGroup`
 * a method for sending MIDI messages to other groups.
 */
var MIDIGroup = AudioletGroup.extend({

    /*
     * Constructor
     *
     * @param {Audiolet} audiolet The audiolet object.
     * @param {Number} numberOfInputs The number of inputs.
     * @param {Number} numberOfOutputs The number of outputs.
     */
    constructor: function(audiolet, numberOfInputs, numberOfOutputs) {
        AudioletGroup.apply(this, arguments);
        this.midiIn = new MIDIInput(this);
        this.midiOut = new MIDIOutput(this);
    }

});