// Wrapper for accessing strings through sequential reads
var Stream = function(str) {
  this.str = str;
  this.position = 0;
};
  
Stream.prototype.read = function(length) {
  var result = this.str.substr(this.position, length);
  this.position += length;
  return result;
};
  
Stream.prototype.readInt32 = function() {
  var str = this.str,
    position = this.position,
    result = (
      (str.charCodeAt(position) << 24)
      + (str.charCodeAt(position + 1) << 16)
      + (str.charCodeAt(position + 2) << 8)
      + str.charCodeAt(position + 3));
  this.position += 4;
  return result;
};

Stream.prototype.readInt16 = function() {
  var str = this.str,
    position = this.position,
    result = (
      (str.charCodeAt(position) << 8)
      + str.charCodeAt(position + 1));
  this.position += 2;
  return result;
};

Stream.prototype.readInt8 = function(signed) {
  var result = this.str.charCodeAt(this.position);
  if (signed && result > 127) result -= 256;
  this.position += 1;
  return result;
};

Stream.prototype.eof = function() {
  return this.position >= this.str.length;
};

// read a MIDI-style variable-length integer
// (big-endian value in groups of 7 bits,
// with top bit set to signify that another byte follows) 
Stream.prototype.readVarInt = function() {
  var result = 0;
  while (true) {
    var b = this.readInt8();
    if (b & 0x80) {
      result += (b & 0x7f);
      result <<= 7;
    } else {
      return result + b;
    }
  }
};

var meta_events = {

  0x00: function(length, stream, time) {
    if (length != 2) throw 'Expected length for sequenceNumber event is 2, got ' + length;
    return new MIDI.Events.SequenceNumber(stream.readInt16(), time);
  },

  0x01: function(length, stream, time) {
    return new MIDI.Events.Text(stream.read(length), time);
  },

  0x02: function(length, stream, time) {
    return new MIDI.Events.CopyrightNotice(stream.read(length), time);
  },

  0x03: function(length, stream, time) {
    return new MIDI.Events.TrackName(stream.read(length), time);
  },

  0x04: function(length, stream, time) {
    return new MIDI.Events.InstrumentName(stream.read(length), time);
  },

  0x05: function(length, stream, time) {
    return new MIDI.Events.Lyrics(stream.read(length), time);
  },

  0x06: function(length, stream, time) {
    return new MIDI.Events.Marker(stream.read(length), time);
  },

  0x07: function(length, stream, time) {
    return new MIDI.Events.CuePoint(stream.read(length), time);
  },

  0x20: function(length, stream, time) {
    if (length != 1) throw "Expected length for midiChannelPrefix event is 1, got " + length;
    return new MIDI.Events.ChannelPrefix(stream.readInt8(), time);
  },

  0x2f: function(length, stream, time) {
    if (length != 0) throw "Expected length for endOfTrack event is 0, got " + length;
    return MIDI.Events.EndOfTrack(time);
  },

  0x51: function(length, stream, time) {
    if (length != 3) throw "Expected length for setTempo event is 3, got " + length;
    return new MIDI.Events.SetTempo((
      (stream.readInt8() << 16)
      + (stream.readInt8() << 8)
      + stream.readInt8()
    ), time);
  },

  0x54: function(length, stream, time) {
    if (length != 5) throw "Expected length for smpteOffset event is 5, got " + length;
    var hour_byte = stream.readInt8(),
      frame_rate = { 0x00: 24, 0x20: 25, 0x40: 29, 0x60: 30 }[hour_byte & 0x60];
    return new SMPTEOffset(frame_rate, hour_byte & 0x1f,
      stream.readInt8(), stream.readInt8(), stream.readInt8(), stream.readInt8(), time);
  },

  0x58: function(length, stream, time) {
    if (length != 4) throw "Expected length for timeSignature event is 4, got " + length;
    return new MIDI.Events.TimeSignature(stream.readInt8(), Math.pow(2, stream.readInt8()),
        stream.readInt8(), stream.readInt8(), time);
  },

  0x59: function(length, stream, time) {
    if (length != 2) throw "Expected length for keySignature event is 2, got " + length;
    return new MIDI.Events.KeySignature(stream.readInt8(true), stream.readInt8(), time);
  },

  0x7f: function(length, stream, time) {
    return new MIDI.Events.SequencerSpecific(stream.read(length), time);
  }

};

var channel_events = {

  0x08: function(param, stream, time) {
    return new MIDI.Events.NoteOff(param, stream.readInt8(), time);
  },

  0x09: function(param, stream, time) {
    var velocity = stream.readInt8(),
      event_name = velocity? 'NoteOn': 'NoteOff';
    return new MIDI.Events[event_name](param, velocity, time);
  },

  0x0a: function(param, stream, time) {
    return new MIDI.Events.NoteAftertouch(param, stream.readInt8(), time);
  },

  0x0b: function(param, stream, time) {
    return new MIDI.Events.Controller(param, stream.readInt8(), time);
  },

  0x0c: function(param, stream, time) {
    return new MIDI.Events.ProgramChange(param, time);
  },

  0x0d: function(param, stream, time) {
    return new MIDI.Events.ChannelAftertouch(param, time);
  },

  0x0e: function(param, stream, time) {
    return new MIDI.Events.PitchBend(param + (stream.readInt8() << 7), time);
  }

};

var meta_or_system_events = {

  0xff: function(stream, time) {
    var nameByte = stream.readInt8(),
      length = stream.readVarInt(),
      create_event = meta_events[nameByte];
    return create_event? create_event(length, stream, time): {
      type: 'unknown',
      time: time,
      data: stream.read(length)
    };
  },

  0xf0: function(stream, time) {
    var length = stream.readVarInt();
    return new MIDI.Events.SysEx(stream.read(length), time);
  },

  0xf7: function(stream, time) {
    var length = stream.readVarInt();
    return new MIDI.Events.DividedSysEx(stream.read(length), time);
  }

};

var MIDI = MIDI || {};

MIDI.decode = function(data) {
  
  var lastEventTypeByte;
  
  function readChunk(stream) {
    var id = stream.read(4),
      length = stream.readInt32(),
      data = stream.read(length);

    return {
      'id': id,
      'length': length,
      'data': data
    };
  };

  function readMetaEvent(stream, time, eventTypeByte) {
    var create_event = meta_or_system_events[eventTypeByte];
    return create_event? create_event(stream, time): {
      type: 'unknown',
      time: time
    };
  };

  function readChannelEvent(stream, time, eventTypeByte) {
    var param,
      eventType,
      channel,
      create_event;

    if ((eventTypeByte & 0x80) == 0) {
      param = eventTypeByte;
      eventTypeByte = lastEventTypeByte;

    } else {
      param = stream.readInt8();
      lastEventTypeByte = eventTypeByte;
    }

    // todo: add channel # attr to channel events
    eventType = eventTypeByte >> 4;
    channel = eventTypeByte & 0x0f;
    create_event = channel_events[eventType];
    return create_event? create_event(param, stream, time): {
      type: 'unknown',
      time: time,
      channel: channel
    };
  };

  function readEvent(stream) {
    var time = stream.readVarInt(),
      eventTypeByte = stream.readInt8();

    if ((eventTypeByte & 0xf0) == 0xf0) {
      return readMetaEvent(stream, time, eventTypeByte);

    } else {
      return readChannelEvent(stream, time, eventTypeByte);
    }
  }
  
  var stream = new Stream(data),
    header_chunk = readChunk(stream);

  if (header_chunk.id != 'MThd' || header_chunk.length != 6) {
    throw "Bad .mid file - header not found";
  }

  var header = new Stream(header_chunk.data),
    formatType = header.readInt16(),
    trackCount = header.readInt16(),
    ticksPerBeat = header.readInt16();
  
  if (ticksPerBeat & 0x8000) {
    throw 'Expressing time division in SMTPE frames is not supported yet';
  }

  return new MIDI({
    'formatType': formatType,
    'trackCount': trackCount,
    'ticksPerBeat': ticksPerBeat
  }, (function() {
  
    var tracks = [],
      track, track_chunk, track_invalid, track_stream;

    for (var i = 0; i < trackCount; i++) {
      track = tracks[i] = [];
      track_chunk = readChunk(stream);
      track_id = track_chunk.id;
      unexpected = track_id != 'MTrk';

      if (unexpected) {
        throw 'Unexpected chunk. Expected MTrk, got ' + track_id + '.';
      }

      track_stream = new Stream(track_chunk.data);

      while (!track_stream.eof()) {
        track.push(readEvent(track_stream));
      }
    }

    return tracks;

  })());
};