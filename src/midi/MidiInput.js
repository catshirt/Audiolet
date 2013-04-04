/*!
 * @depends ../core/AudioletClass.js
 */

/**
 * A MIDIInput accepts a `MIDIGroup` on instantiation,
 * and exposes a `send` method which maps MIDI messages to the input's `MIDIGroup`.
 */
var MIDIInput = AudioletClass.extend({

    /*
     * Constructor
     *
     * @param {MIDIGroup} node The MIDIGroup to map MIDI events onto.
     */
    constructor: function(node) {
        AudioletClass.apply(this);
        this.node = node;
    },

    /**
     * Given a MIDI event, `send` will execute a method of the input's `MIDIGroup`,
     * where the method is a property of the MIDIGroup whose key matches
     * the event name or type. For instance:
     * `midiIn.send(new MIDI.Events.NoteOn(60, 127));` will execute
     * `.noteOn(60, 127);` on the input's MIDIGroup.
     */
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