const BaseCodec = require('../utils/BaseCodec')
const { Readable } = require('stream')

module.exports = class RLECodec extends BaseCodec {

  async encode(descriptor) {
    const reader = descriptor.getReader()
    const encodedData = Readable.from(this.encodeByChunk(reader))
    debugger
    return {
      encodedData,
      codeTable: '',
      dataLength: '',
    }
  }

  async* encodeByChunk(reader) {
    for await (const chunk of reader) {
      const encoded = []
      let count = 1
      const text = chunk.toString()
      for (let i = 0; i < text.length; i++) {
        if (i + 1 < text.length && text[i] === text[i + 1]) {
          count++;
        } else {
          encoded.push((count > 1 ? count : '') + text[i]);
          count = 1;
        }
      }
      yield encoded.join('')
    }
  }

  async decode(reader) {
    return Readable.from(async function* () {
      for await (const chunk of reader) {
        yield this.decodeChunk(chunk)
      }
    }.call(this))
  }

  decodeChunk(chunk) {
    let decoded = [];
    let count = [];
    let inNumber = false;
    const encoded = chunk.toString()
    for (let i = 0; i < encoded.length; i++) {
      if (encoded[i] >= '0' && encoded[i] <= '9') {
        count.push(encoded[i]);
        inNumber = true;
      } else {
        if (inNumber) {
          decoded.push(encoded[i].repeat(parseInt(count.join(''))));
          count = [];
          inNumber = false;
        } else {
          decoded.push(encoded[i]);
        }
      }
    }
    return decoded.join('');
  }

}