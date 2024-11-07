const { Readable } = require("node:stream");
const BaseCodec = require("../utils/BaseCodec");

module.exports = class ShannonFanoCodec extends BaseCodec {

  /** @type { Record < string, string >} */
  codeTable

  constructor() {
    super()
    this.codeTable = {};
  }

  async encode(descriptor) {
    const reader = descriptor.getReader()

    const frequencies = await this.calculateFrequencies(reader);
    await reader.close()

    const tree = this.buildShannonFanoTree(frequencies);
    this.buildCodeTable(tree);

    const probabilities = this.calculateProbabilities(frequencies)
    const averageSymbLength = this.calculateAverageSymbLength(probabilities)
    const relativeEffectivenes = this.calculateRelativeEffectivenesCoef(probabilities, averageSymbLength)
    const statisticShrinking = this.calculateStatisticShrinking(averageSymbLength)
    this.logStatistics(statisticShrinking, relativeEffectivenes)

    const newReader = descriptor.getReader()
    const encodedData = await this.encodeData(newReader);

    const dataLength = Object.keys(frequencies).reduce((acc, charCode) => {
      const codeLen = this.codeTable[charCode].length
      const allSymbLens = frequencies[charCode] * codeLen
      return acc += allSymbLens
    }, 0)

    return { encodedData, dataLength, codeTable: this.codeTable };
  }

  logStatistics(staticShrinking, relativeEffectivenes) {
    console.log('Коэфициент статистического сжатия: ', staticShrinking)
    console.log('Коэфициент относительной эффективности: ', relativeEffectivenes)
  }

  calculateProbabilities(frequencies) {
    const allCount = Object.values(frequencies).reduce((acc, cur) => acc += cur, 0)
    const probabilities = {}
    for (const symb in frequencies) {
      const probability = frequencies[symb] / allCount
      probabilities[symb] = (probability * this.codeTable[symb].length)
    }
    return probabilities
  }

  calculateAverageSymbLength(probabilities) {
    return Object.keys(this.codeTable).reduce((averageLength, symb) => {
      return averageLength += probabilities[symb]
    }, 0.0)
  }

  calculateStatisticShrinking(averageSymbLength) {
    return Math.log2(Object.keys(this.codeTable).length) / averageSymbLength
  }

  calculateRelativeEffectivenesCoef(probabilities, averageSymbLength) {
    const entropy = Object.values(probabilities).reduce((entropy, probability) => {
      return entropy -= (probability * Math.log2(probability))
    }, 0.0)
    return entropy / averageSymbLength
  }

  async decode(encodedStream, codeTable, dataBitsLen) {
    codeTable = this.traverseCodeTable(codeTable)
    const generator = this.decodeByChunk(encodedStream, codeTable, dataBitsLen)
    return Readable.from(generator)
  }

  async* decodeByChunk(encodedStream, codeTable, dataBitsLen) {
    let currentCode = '';
    let decodedData = [];
    let lines = 0


    for await (const chunk of encodedStream) {
      const bits = this.readBitsFromBuffer(chunk)
      for (const bit of bits) {
        if (dataBitsLen === 0) {
          break
        }
        dataBitsLen--
        currentCode += bit
        if (codeTable[currentCode]) {
          if (codeTable[currentCode] === '10') {
            lines++
          }
          decodedData.push(String.fromCharCode(codeTable[currentCode]))
          currentCode = ''
        }
      }

      yield decodedData.join('')
      decodedData = []
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


    nodes.sort((a, b) => b.frequency - a.frequency);

    while (nodes.length > 1) {

      const node1 = nodes.pop();
      const node2 = nodes.pop();


      const newNode = {
        symbol: `${node1.symbol}${node2.symbol}`,
        frequency: node1.frequency + node2.frequency,
        left: node1,
        right: node2,
      };


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
    let lastBitIndex
    let lastByte
    async function* encodeChunk() {
      for await (const chunk of reader) {

        const s = chunk.toString().split('')
        const bitChars = s.flatMap(symb => {
          try {
            return this.codeTable[symb.charCodeAt(0)].toString(2).split('')
          } catch (err) {
            console.error(err)
            console.error(symb, symb.charCodeAt(0), this.codeTable[symb], this.codeTable)
          }
        })

        const data = this.bitStringToBuffer(bitChars, lastByte, lastBitIndex)
        lastBitIndex = data.bitIndex
        lastByte = data.byte
        yield Buffer.from(data.bytes)
      }
      if (lastBitIndex !== undefined || lastByte !== undefined) {
        yield Buffer.from([lastByte])
      }
    }
    return Readable.from(encodeChunk.call(this))
  }
};
