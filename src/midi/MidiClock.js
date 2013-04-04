/*!
 * @depends ../core/AudioletClass.js
 */

var MIDIClock = AudioletClass.extend({

  // todo: figure out midi clock slave and master
  constructor: function(scheduler) {
    AudioletClass.apply(this);
    this.scheduler = scheduler;
  },

  // todo: this should be part of a midi group
  sequence: function(events, cb, ticksPerBeat) {
    // midi clock ticks 24 (or n) times per beat
    var tick = 1 / (ticksPerBeat || 96),
      sequence = new PSequence(events, Infinity),
      relative_tick = 0;
    this.scheduler.play([], tick, function() {
      var to_process = [],
        processing, type, method;
      while (sequence.peek().time == relative_tick) {
        to_process.push(sequence.next());
      };
      if (to_process.length) {
        for (var i = 0; i < to_process.length; i++) {
          cb(to_process[i]);
        }
        relative_tick = 0;
      } else {
        relative_tick++;
      }
    });
  }

});