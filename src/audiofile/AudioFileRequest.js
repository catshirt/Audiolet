import { WAVDecoder, AIFFDecoder } from '.';

class AudioFileRequest {

  constructor(url, async) {
    this.url = url;
    if (typeof async == 'undefined' || async == null) {
      async = true;
    }
    this.async = async;
    var splitURL = url.split('.');
    this.extension = splitURL[splitURL.length - 1].toLowerCase();
  }

  onSuccess(decoded) {

  }

  onFailure(decoded) {

  }

  send() {
    if (this.extension != 'wav' &&
        this.extension != 'aiff' &&
        this.extension != 'aif') {
        this.onFailure();
      return;
    }

    var request = new XMLHttpRequest();
    request.open('GET', this.url, this.async);
    request.overrideMimeType('text/plain; charset=x-user-defined');
    request.onreadystatechange = function(event) {
      if (request.readyState == 4) {
        if (request.status == 200 || request.status == 0) {
          this.handleResponse(request.responseText);
        }
        else {
          this.onFailure();
        }
      }
    }.bind(this);
    request.send(null);
  }

  handleResponse(data) {
    var decoder, decoded;
    if (this.extension == 'wav') {
      decoder = new WAVDecoder();
      decoded = decoder.decode(data);
    }
    else if (this.extension == 'aiff' || this.extension == 'aif') {
      decoder = new AIFFDecoder();
      decoded = decoder.decode(data);
    }
    this.onSuccess(decoded);
  }

}

export default { AudioFileRequest };
