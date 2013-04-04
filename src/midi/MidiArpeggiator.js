/*!
 * @depends MidiGroup.js
 */

 /**
 * An Arpeggiator is a MidiGroup which modifies the MIDI messages on
 * input 0, and forwards the newly generated messages on output 0.
 */
var MidiArpeggiator = MidiGroup.extend({

    /*
     * Constructor
     * @param {Audiolet} audiolet The audiolet object.
     */
    constructor: function(audiolet, tempo, octaves, pattern) {
        MidiGroup.call(this, audiolet, 1, 1, 0, 0);
        this.tempo = tempo || 1/8;
        this.octaves = octaves || 1;
        this.pattern = pattern || 'up';
        this._events = [];
        this._pattern = new PProxy([], Infinity);
        this._lastE = null;
    },

    noteOn: function(e) { 
        if (!this._events.length) {
            this._playing = this.play(e);
        }
        this._events.push(e);
        this._pattern.pattern = this[this.pattern]();
    },

    noteOff: function(e) {
        // remove old event
        for (var i = 0; i < this._events.length; i++) {
            if (this._events[i].number == e.number) {
                this._events.splice(i);
                break;
            }
        }
        if (!this._events.length) {
            this.stop();
        } else {
            this._pattern.pattern = this[this.pattern]();
        }
    },

    play: function(e) {
        var self = this,
            pattern = this._pattern,
            scheduler = this.audiolet.scheduler,
            tempo = this.tempo,
            midiOut = this.midiOut;

        return scheduler.play([pattern], 4 * tempo, function(cur_num) {
            var vel = (self._lastE || e).velocity;

            if (self._lastE) {
                var last_num = self._lastE.number;
                midiOut.send(new MIDI.Events.NoteOff(last_num, vel));
            }

            self._lastE = new MIDI.Events.NoteOn(cur_num, vel);
            midiOut.send(self._lastE);  
        });
    },

    stop: function() {
        var scheduler = this.audiolet.scheduler,
            e = this._lastE,
            playing = this._playing,
            midiOut = this.midiOut;

        scheduler.stop(playing);
        midiOut.send(new MIDI.Events.NoteOff(e.number, e.velocity));
    },

    up: function() {
        var events = this._events,
            pattern = new PSequence([], Infinity),
            e;

        for (var i = 0; i < events.length; i++) {
            e = events[i];
            for (var j = 0; j < this.octaves + 1; j++) {
                pattern.list.push(e.number + (12 * (j + 1)));
            }
        }

        pattern.list.sort();

        return pattern;
    },

    down: function() {
        var pattern = this.up();
        pattern.list.reverse();
        return pattern;
    },

    excl: function() {
        var up = this.up().list,
            down = this.down().list;
        up.pop();
        down.pop();
        return new PSequence(up.concat(down), Infinity);
    },

    incl: function() {  
        var up = this.up().list,
            down = this.down().list;
        return new PSequence(up.concat(down), Infinity);
    },

    // todo: finish patterns
    order: function(e) {
        // order is not relevant until arp handles simultaneous noteon
        // order merges different sequences of many octaves, ie.
        // [0, 12, 24], [40, 52, 64] would become
        // [0, 40, 12, 52, 24, 64]
    },

    random: function(e) {
        // how to create random?
    }

});