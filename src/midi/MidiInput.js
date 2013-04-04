/*!
 * @depends ../core/AudioletClass.js
 */

/**
 * Class representing a midi input of a MidiGroup
 */
var MidiInput = AudioletClass.extend({

    constructor: function(node) {
        AudioletClass.apply(this);
        this.node = node;
    },

    send: function(e) {
        var name = e.name || e.type,
            node = this.node,
            action = node[name];

        // subclasses of MIDIGroup can selectively apply
        // MIDI method names (noteOn, noteOff, etc) which will be
        // executed only if they exist.
        action && action.apply(node, [e]);
    }

});