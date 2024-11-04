const { once, on } = require("events");
const BaseCodec = require("./utils/BaseCodec");
const fs = require('fs')
const fsPromise = require('fs/promises')
const readline = require('readline');
const { pipeline } = require('stream/promises');
const FileDescriptor = require("./utils/FileDescriptor");
const { decode } = require("punycode");


const ENCODING = 'utf-8'

module.exports = class Archivator {

  /** @typedef {BaseCodec} */
  codec

  /** @param {BaseCodec} codec */
  constructor(codec) {
    this.codec = codec
  }

  async compress(filePath, outputPath) {
    const descriptor = new FileDescriptor(filePath)
    const { encodedData, codeTable, dataLength } = await this.codec.encode(descriptor);

    const output = new FileDescriptor(outputPath).getWriter()
    const meta = this.buildMeta(codeTable, dataLength)
    await output.writeBuf(Buffer.from(meta))
    output.pipe(encodedData)
    await once(encodedData, 'end')
    await output.end()
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
    // 1. Читаем архив
    // 2. Извлекаем метаданные
    // 3. Декодируем данные
    debugger
    const { codeTable, metaLength, dataBitsLen } = await this.readCodeTable(archivePath)
    // for await (const chunk of inputReader) {
    //   debugger
    //   console.error(chunk.toString())
    // }
    console.error(codeTable)
    const outputDescriptor = new FileDescriptor(outputPath)
    const inputDescriptor = new FileDescriptor(archivePath)
    const inputReader = inputDescriptor.getReader(metaLength)
    const decodedStream = await this.codec.decode(inputReader, codeTable, dataBitsLen);
    debugger
    //await on(decodedStream, 'data', console.error)
    const outputWriter = outputDescriptor.getWriter()
    outputWriter.pipe(decodedStream)
    await once(decodedStream, 'end')
    console.error('awaited end')
    await outputWriter.end()
  }

  /** @returns {Promise<{ metaLength: number, codeTable: Record<string,string>, dataBitsLen: number }>} */
  async readCodeTable(filePath) {
    const stream = fs.createReadStream(filePath)
    const rl = readline.createInterface({
      input: stream,
      //crlfDelay: Infinity
    });

    let bitsLenRaw
    let codeTableRaw
    await new Promise(res => rl.on('line', input => {
      debugger
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
      console.error('som line ', input)
    }))
    await once(stream, 'close')

    debugger
    console.error(codeTableRaw)
    stream.close()

    const metaRaw = this.buildMeta(JSON.parse(codeTableRaw), bitsLenRaw)
    //return codeTable
    return { codeTable: JSON.parse(codeTableRaw), dataBitsLen: parseInt(bitsLenRaw), metaLength: Buffer.from(metaRaw).byteLength }
  }
}