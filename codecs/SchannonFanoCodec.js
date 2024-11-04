const { Stream, Readable } = require("node:stream");
const BaseCodec = require("../utils/BaseCodec");

const chunk = require('lodash/chunk');
const FileDescriptor = require("../utils/FileDescriptor");

const ENCODE_CHUNK_LENGHTH = 1000

module.exports = class ShannonFanoCodec extends BaseCodec {

  /** @type { Record < string, string >} */
  codeTable

  constructor() {
    super()
    this.codeTable = {};
  }

  async encode(descriptor) {
    const reader = descriptor.getReader()
    // 1. Подсчет частоты символов
    const frequencies = await this.calculateFrequencies(reader);
    await reader.close()

    // 2. Создание дерева Шеннона-Фано
    const tree = this.buildShannonFanoTree(frequencies);

    // 3. Создание таблицы кодов
    this.buildCodeTable(tree);

    // 4. Кодирование данных
    const newReader = descriptor.getReader()
    const encodedData = await this.encodeData(newReader);
    //await newReader.close()

    // 5. Возврат закодированных данных и таблицы кодов

    const dataLength = Object.keys(frequencies).reduce((acc, charCode) => {
      const codeLen = this.codeTable[charCode].length
      const allSymbLens = frequencies[charCode] * codeLen
      return acc += allSymbLens
    }, 0)

    return { encodedData, dataLength, codeTable: this.codeTable };
  }

  async decode(encodedStream, codeTable, dataBitsLen) {
    codeTable = this.traverseCodeTable(codeTable)
    const generator = this.decodeByChunk(encodedStream, codeTable, dataBitsLen)
    return Readable.from(generator)
  }

  async* decodeByChunk(encodedStream, codeTable, dataBitsLen) {
    let currentCode = '';
    let decodedData = '';
    debugger

    for await (const chunk of encodedStream) {
      const bits = this.readBitsFromBuffer(chunk)
      for (const bit of bits) {
        if (dataBitsLen === 0) {
          break
        }
        dataBitsLen--
        currentCode += bit
        if (codeTable[currentCode]) {
          decodedData += String.fromCharCode(codeTable[currentCode])
          currentCode = ''
        }
      }
      yield decodedData
    }
  }

  traverseCodeTable(codeTable) {
    return Object.fromEntries(Object.entries(codeTable).map(([charCode, binaryCode]) => [binaryCode, charCode]))
  }

  /*
  * 
  * @param {*} data
  * @returns
  */
  async calculateFrequencies(reader) {
    const frequencies = {};
    for await (const chunk of reader) {
      for (let i = 0; i < chunk.length; i++) {
        const char = chunk[i];
        frequencies[char] = (frequencies[char] || 0) + 1;
      }
    }
    return frequencies;
  }
  buildShannonFanoTree(frequencies) {
    const nodes = Object.entries(frequencies).map(([symbol, frequency]) => ({
      symbol,
      frequency,
    }));

    // Сортировка по убыванию частоты
    nodes.sort((a, b) => b.frequency - a.frequency);

    //console.error(nodes)

    while (nodes.length > 1) {
      // Выбираем два узла с наименьшими частотами
      const node1 = nodes.pop();
      const node2 = nodes.pop();

      // Создание нового узла
      const newNode = {
        symbol: `${node1.symbol}${node2.symbol}`,
        frequency: node1.frequency + node2.frequency,
        left: node1,
        right: node2,
      };

      // Вставка нового узла в массив
      const insertIndex = nodes.findIndex(
        (node) => newNode.frequency > node.frequency
      );
      if (insertIndex >= 0) {
        nodes.splice(insertIndex, 0, newNode);
      } else {
        nodes.push(newNode);
      }
    }
    return nodes[0];
  }

  buildCodeTable(node) {
    debugger
    const buildTable = (node, code = []) => {
      if (node.left) {
        buildTable(node.left, [...code, '0']);
      }
      if (node.right) {
        buildTable(node.right, [...code, '1']);
      }
      if (!node.left && !node.right) {
        this.codeTable[node.symbol] = code.join('');
      }
    }
    buildTable(node)
  }

  async encodeData(reader) {
    async function* sss() {
      let encodedData = Buffer.alloc(0);
      let currentByte = 0;
      let bitIndex = 7;
      let codeLength = 0;

      for await (const chunk of reader) {
        debugger
        const s = chunk.toString().split('')
        console.error(s)
        const bitChars = s.flatMap(symb => this.codeTable[symb.charCodeAt(0)].toString(2).split(''))
        debugger
        const bytes = this.bitStringToBuffer(bitChars)
        console.error('bytes', bytes, s, bitChars)
        yield Buffer.from(bytes)
      }

    }
    return Readable.from(sss.call(this))
  }
};
