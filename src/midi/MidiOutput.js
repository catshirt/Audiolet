/*!
 * @depends ../core/AudioletClass.js
 */

/**
 * A MIDIOutput accepts a `MIDIGroup` on instantiation,
 * and exposes a `send` method which sends MIDI events to
 * the input that this output is connected to.
 */
var MIDIOutput = AudioletClass.extend({

    /*
     * Constructor
     *
     * @param {MIDIGroup} node The MIDIGroup the output belongs to.
     */
    constructor: function(node) {
        AudioletClass.apply(this);
        this.node = node;
    },

    /**
     * Connects the output to a midi input,
     * ensuring any value sent on this output
     * is sent to that input.
     */
    connect: function(midiIn) {
        this.connectedTo = midiIn;
    },

    /**
     * Forward a message to the connected input.
     */
    send: function(e) {
        this.connectedTo.send(e);
    }

});