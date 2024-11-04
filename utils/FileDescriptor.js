const fs = require('fs')
const { Readable } = require('stream')

module.exports = class FileDescriptor {
  constructor(filePath) {
    this.filePath = filePath
  }

  getReader(skipBytes) {
    const rStream = fs.createReadStream(this.filePath, { start: skipBytes })
    return {
      stream: rStream,
      async *[Symbol.asyncIterator]() {
        for await (const chunk of rStream) {
          yield chunk
        }
      },
      async [Symbol.asyncDispose]() {
        await this.close()
      },
      close() {
        return new Promise((res, rej) => rStream.close(() => res()))
      }
    }
  }

  /**
   * 
   * @param {BufferEncoding | WriteStreamOptions} writerOpts  
   */
  getWriter(writerOpts = {}) {
    let wStream = fs.createWriteStream(this.filePath, writerOpts)
    return {
      /** @param {Readable} readable  */
      pipe(readable) {
        readable.pipe(wStream)
      },
      writeBuf(buf) {
        return new Promise(res => wStream.write(buf, () => res()))
      },
      end() {
        return new Promise(res => wStream.end(() => res()))
      }
    }
  }
}