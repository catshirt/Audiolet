var MIDI = function(header, tracks) {
  var decoded;
  
  if (typeof header == 'string') {
    decoded = MIDI.decode(header);
    header = decoded.header;
    tracks = decoded.tracks;
  }

  this.header = header;
  this.tracks = tracks;
};

MIDI.prototype.encode = function() {
  return MIDI.encode(this);
};