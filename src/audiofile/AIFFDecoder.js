import { Decoder } from './Decoder';

class AIFFDecoder extends Decoder {

  decode(data) {
    var decoded = {};
    var offset = 0;
    // Header
    var chunk = this.readChunkHeaderB(data, offset);
    offset += 8;
    if (chunk.name != 'FORM') {
      console.error('File is not an AIFF');
      return null;
    }

    var fileLength = chunk.length;
    fileLength += 8;

    var aiff = this.readString(data, offset, 4);
    offset += 4;
    if (aiff != 'AIFF') {
      console.error('File is not an AIFF');
      return null;
    }

    while (offset < fileLength) {
      var chunk = this.readChunkHeaderB(data, offset);
      offset += 8;
      if (chunk.name == 'COMM') {
        // Number of channels
        var numberOfChannels = this.readIntB(data, offset, 2);
        offset += 2;

        // Number of samples
        var length = this.readIntB(data, offset, 4);
        offset += 4;

        var channels = [];
        for (var i = 0; i < numberOfChannels; i++) {
          channels.push(new Float32Array(length));
        }

        // Bit depth
        var bitDepth = this.readIntB(data, offset, 2);
        var bytesPerSample = bitDepth / 8;
        offset += 2;

        // Sample rate
        var sampleRate = this.readFloatB(data, offset);
        offset += 10;
      }
      else if (chunk.name == 'SSND') {
        // Data offset
        var dataOffset = this.readIntB(data, offset, 4);
        offset += 4;

        // Ignore block size
        offset += 4;

        // Skip over data offset
        offset += dataOffset;

        for (var i = 0; i < numberOfChannels; i++) {
          var channel = channels[i];
          for (var j = 0; j < length; j++) {
            var index = offset;
            index += (j * numberOfChannels + i) * bytesPerSample;
            // Sample
            var value = this.readIntB(data, index, bytesPerSample);
            // Scale range from 0 to 2**bitDepth -> -2**(bitDepth-1) to
            // 2**(bitDepth-1)
            var range = 1 << bitDepth - 1;
            if (value >= range) {
              value |= ~(range - 1);
            }
            // Scale range to -1 to 1
            channel[j] = value / range;
          }
        }
        offset += chunk.length - dataOffset - 8;
      }
      else {
        offset += chunk.length;
      }
    }
    decoded.sampleRate = sampleRate;
    decoded.bitDepth = bitDepth;
    decoded.channels = channels;
    decoded.length = length;
    return decoded;
  }

}

export default { AIFFDecoder };
