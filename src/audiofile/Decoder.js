class Decoder {

  readString(data, offset, length) {
    return data.slice(offset, offset + length);
  }

  readIntL(data, offset, length) {
    var value = 0;
    for (var i = 0; i < length; i++) {
      value = value + ((data.charCodeAt(offset + i) & 0xFF) *
                       Math.pow(2, 8 * i));
    }
    return value;
  }

  readChunkHeaderL(data, offset) {
    var chunk = {};
    chunk.name = this.readString(data, offset, 4);
    chunk.length = this.readIntL(data, offset + 4, 4);
    return chunk;
  }

  readIntB(data, offset, length) {
    var value = 0;
    for (var i = 0; i < length; i++) {
      value = value + ((data.charCodeAt(offset + i) & 0xFF) *
                       Math.pow(2, 8 * (length - i - 1)));
    }
    return value;
  }

  readChunkHeaderB(data, offset) {
    var chunk = {};
    chunk.name = this.readString(data, offset, 4);
    chunk.length = this.readIntB(data, offset + 4, 4);
    return chunk;
  }

  readFloatB(data, offset) {
    var expon = this.readIntB(data, offset, 2);
    var range = 1 << 16 - 1;
    if (expon >= range) {
      expon |= ~(range - 1);
    }

    var sign = 1;
    if (expon < 0) {
      sign = -1;
      expon += range;
    }

    var himant = this.readIntB(data, offset + 2, 4);
    var lomant = this.readIntB(data, offset + 6, 4);
    var value;
    if (expon == himant == lomant == 0) {
      value = 0;
    }
    else if (expon == 0x7FFF) {
      value = Number.MAX_VALUE;
    }
    else {
      expon -= 16383;
      value = (himant * 0x100000000 + lomant) * Math.pow(2, expon - 63);
    }
    return sign * value;
  }

}

export default { Decoder };
