/*!
 * @depends ../core/AudioletClass.js
 */

/**
 * Class representing a midi input of a MidiGroup
 */
var MidiOutput = AudioletClass.extend({

    constructor: function(node) {
        AudioletClass.apply(this);
        this.node = node;
    },

    connect: function(midiIn) {
        this.midiIn = midiIn;
    },

    send: function(e) {
        this.midiIn.send(e);
    }

});