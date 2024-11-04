const { Readable } = require('stream')

module.exports = class BaseCodec {

  /**
   * @typedef EncodeResult
   * @property {Readable} encodedData
   * @property {Record<string,string>} codeTable
   * @property {number} dataLength
   */

  /**
   * @param {String} data 
   * @returns {EncodeResult} encodedData
   * */
  encode(data) {
    throw new Error('not implemented')
  }

  decode(encodedData) {
    throw new Error('not implemented')
  }

  bitStringToBuffer(bitChars) {
    const bytes = []
    let byte = 0
    let bitIndex = 7
    for (const bitStr of bitChars) {
      const bit = parseInt(bitStr)
      byte |= bit << bitIndex
      bitIndex--
      if (bitIndex < 0) {
        bytes.push(byte)
        byte = 0
        bitIndex = 7
      }
    }
    if (bitIndex !== 7) {
      bytes.push(byte)
    }
    return bytes
  }

  /** @param {Buffer} buf */
  readBitsFromBuffer(buf) {
    const bits = []
    for (let i = 0; i < buf.length; i++) {
      const byte = buf.readUint8(i)
      for (let j = 7; j >= 0; j--) {
        if ((byte >> j) & 1) {
          bits.push('1')
        } else {
          bits.push('0')
        }
      }
    }
    debugger
    return bits
  }


}