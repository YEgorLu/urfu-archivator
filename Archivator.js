const { once, on } = require("events");
const BaseCodec = require("./utils/BaseCodec");
const fs = require('fs')
const fsPromise = require('fs/promises')
const readline = require('readline');
const { pipeline } = require('stream/promises');
const FileDescriptor = require("./utils/FileDescriptor");
const { decode } = require("punycode");
const { CODEC_MAP } = require('./codecs')



module.exports = class Archivator {

  /** @typedef {BaseCodec} */
  codec

  /** @param {BaseCodec | string} codec */
  constructor(codec) {
    if (typeof codec === 'string') {
      this.codec = new CODEC_MAP[codec]()
    } else {
      this.codec = codec
    }
  }

  async compress(filePath, outputPath) {
    const descriptor = new FileDescriptor(filePath)
    const sizeBefore = (await fsPromise.stat(filePath)).size

    const { encodedData, codeTable, dataLength } = await this.codec.encode(descriptor);

    const output = new FileDescriptor(outputPath).getWriter()
    const meta = this.buildMeta(codeTable, dataLength)
    await output.writeBuf(Buffer.from(meta))
    output.pipe(encodedData)
    await once(encodedData, 'end')
    await output.end()

    const sizeAfter = (await fsPromise.stat(outputPath)).size
    console.log(`Коэфициент сжатия: ${sizeAfter / sizeBefore}`)
  }

  buildMeta(codeTable, dataBitsLen) {
    return [
      dataBitsLen.toString(),
      '\n',
      JSON.stringify(codeTable),
      '\n',
    ].join('')
  }

  async decompress(archivePath, outputPath) {
    const { codeTable, metaLength, dataBitsLen } = await this.readCodeTable(archivePath)

    const outputDescriptor = new FileDescriptor(outputPath)
    const inputDescriptor = new FileDescriptor(archivePath)
    const inputReader = inputDescriptor.getReader(metaLength)
    const decodedStream = await this.codec.decode(inputReader, codeTable, dataBitsLen);

    const outputWriter = outputDescriptor.getWriter()
    outputWriter.pipe(decodedStream)
    await once(decodedStream, 'end')
    await outputWriter.end()
  }

  /** @returns {Promise<{ metaLength: number, codeTable: Record<string,string>, dataBitsLen: number }>} */
  async readCodeTable(filePath) {
    const stream = fs.createReadStream(filePath)
    const rl = readline.createInterface({
      input: stream,
    });

    let bitsLenRaw
    let codeTableRaw
    await new Promise(res => rl.on('line', input => {
      if (bitsLenRaw === undefined) {
        bitsLenRaw = input
        return
      }
      if (codeTableRaw === undefined) {
        codeTableRaw = input
        stream.close()
        res()
        return
      }
    }))
    await once(stream, 'close')
    stream.close()

    const metaRaw = this.buildMeta(JSON.parse(codeTableRaw), bitsLenRaw)
    return { codeTable: JSON.parse(codeTableRaw), dataBitsLen: parseInt(bitsLenRaw), metaLength: Buffer.from(metaRaw).byteLength }
  }
}