var MIDI = MIDI || {};

MIDI.Events = {

  SequenceNumber: function(number, time) {
    this.type = 'meta';
    this.name = 'sequenceNumber';
    this.number = number;
    this.time = time || 0;
  },

  Text: function(text, time) {
    this.type = 'meta';
    this.name = 'text';
    this.text = text;
    this.time = time || 0;
  },

  CopyrightNotice: function(text, time) {
    this.type = 'meta';
    this.name = 'copyrightNotice';
    this.text = text;
    this.time = time || 0;
  },

  TrackName: function(text, time) {
    this.type = 'meta';
    this.name = 'trackName';
    this.text = text;
    this.time = time || 0;
  },

  InstrumentName: function(text, time) {
    this.type = 'meta';
    this.name = 'instrumentName';
    this.text = text;
    this.time = time || 0;
  },

  Lyrics: function(text, time) {
    this.name = 'lyrics';
    this.text = text;
    this.time = time || 0;
  },

  Marker: function(text, time) {
    this.type = 'meta';
    this.name = 'marker';
    this.text = text;
    this.time = time || 0;
  },

  CuePoint: function(text, time) {
    this.type = 'meta';
    this.name = 'cuePoint';
    this.text = text;
    this.time = time || 0;
  },

  ChannelPrefix: function(channel, time) {
    this.type = 'meta';
    this.name = 'channelPrefix';
    this.channel = channel;
    this.time = time || 0;
  },

  EndOfTrack: function(time) {
    this.type = 'meta';
    this.name = 'endOfTrack';
    this.time = time || 0;
  },

  SetTempo: function(microseconds, time) {
    this.type = 'meta';
    this.name = 'setTempo';
    this.microseconds = microseconds;
    this.time = time || 0;
  },

  SMPTEOffset: function(frameRate, hour, min, sec, frame, subframe, time) {
    this.type = 'meta';
    this.name = 'smpteOffset';
    this.frameRate = frameRate;
    this.hour = hour;
    this.min = min;
    this.sec = sec;
    this.frame = frame;
    this.subframe = subframe;
    this.time = time || 0;
  },

  TimeSignature: function(numerator, denominator, metronome, thirtyseconds, time) {
    this.type = 'meta';
    this.name = 'timeSignature';
    this.numerator = numerator;
    this.denominator = denominator;
    this.metronome = metronome;
    this.thirtyseconds = thirtyseconds;
    this.time = time || 0;
  },

  KeySignature: function(key, scale, time) {
    this.type = 'meta';
    this.name = 'keySignature';
    this.key = key;
    this.scale = scale;
    this.time = time || 0;
  },

  SequencerSpecific: function(data, time) {
    this.type = 'meta';
    this.name = 'sequencerSpecific';
    this.data = data;
    this.time = time || 0;
  },

  NoteOn: function(number, velocity, time) {
    this.type = 'channel';
    this.name = 'noteOn';
    this.number  = number;
    this.velocity = velocity;
    this.time = time || 0;
  },

  NoteOff: function(number, velocity, time) {
    this.type = 'channel';
    this.name = 'noteOff';
    this.number = number;
    this.velocity = velocity;
    this.time = time || 0;
  },

  NoteAftertouch: function(number, amount, time) {
    this.type = 'channel';
    this.name = 'noteAftertouch';
    this.number = number;
    this.amount = amount;
    this.time = time || 0;
  },

  Controller: function(controller, value, time) {
    this.type = 'channel';
    this.name = 'controller';
    this.controller = controller;
    this.value = value;
    this.time = time || 0;
  },

  ProgramChange: function(number, time) {
    this.type = 'channel';
    this.name = 'programChange';
    this.number = number;
    this.time = time || 0;
  },

  ChannelAftertouch: function(amount, time) {
    this.type = 'channel';
    this.name = 'channelAftertouch';
    this.amount = amount;
    this.time = time || 0;
  },

  PitchBend: function(value, time) {
    this.type = 'channel';
    this.controller = controller;
    this.value = value;
    this.time = time || 0;
  }

};