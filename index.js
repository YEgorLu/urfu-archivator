const Archivator = require("./archivator")
const ShannonFanoCodec = require("./codecs/ShannonFanoCodec")
const ShannonFanoCodec2 = require("./codecs/SchannonFanoCodecAnother")
const fs = require('fs')
const FileDescriptor = require('./utils/FileDescriptor')
const { isUint8ClampedArray } = require("util/types")

function parseArgv() {
  const operation = process.argv[2]
  const filePath = process.argv[3]
  const outputPath = process.argv[4]
  if (!operation) {
    throw new Error('Pass operation as first argument')
  }
  if (operation !== 'compress' && operation !== 'decompress') {
    throw new Error('Operation must be "compress" or "decompress"')
  }
  if (!filePath) {
    throw new Error('Pass file path as second argument')
  }
  if (!outputPath) {
    throw new Error('Pass output path as third argument')
  }

  return { filePath, outputPath, operation }
}

async function main() {
  //const contents = fs.readFileSync('./asd', 'utf-8')
  //console.error(contents)
  const { filePath, outputPath, operation } = parseArgv()
  const codec = new ShannonFanoCodec2()
  const archivator = new Archivator(codec)
  await archivator[operation](filePath, outputPath)
}

async function main2() {
  const { Buffer } = require('buffer');

  // Класс для узла дерева Шеннона-Фано
  class Node {
    constructor(symbol, probability, left = null, right = null) {
      this.symbol = symbol;
      this.probability = probability;
      this.left = left;
      this.right = right;
    }
  }

  // Функция для создания дерева Шеннона-Фано
  function buildShannonFanoTree(symbols, probabilities) {
    const nodes = symbols.map((symbol, index) => new Node(symbol, probabilities[index]));

    // Сортируем узлы по вероятности
    nodes.sort((a, b) => b.probability - a.probability);

    // Рекурсивно строим дерево
    function buildTree(nodes) {
      if (nodes.length === 1) {
        return nodes[0];
      }

      const middle = Math.floor(nodes.length / 2);
      const left = buildTree(nodes.slice(0, middle));
      const right = buildTree(nodes.slice(middle));

      const totalProbability = nodes.reduce((sum, node) => sum + node.probability, 0);

      return new Node(null, totalProbability, left, right);
    }

    return buildTree(nodes);
  }

  // Функция для получения кодов Шеннона-Фано для каждого символа
  function getShannonFanoCodes(root) {
    const codes = {};

    function traverse(node, code = '') {
      if (node.symbol) {
        codes[node.symbol] = code;
      } else {
        traverse(node.left, code + '0');
        traverse(node.right, code + '1');
      }
    }

    traverse(root);
    return codes;
  }

  // Функция для кодирования текста по Шеннону-Фано
  function encodeShannonFano(text, codes) {
    let encodedBytes = Buffer.alloc(0);
    let currentByte = 0;
    let bitIndex = 7;

    for (let i = 0; i < text.length; i++) {
      const code = codes[text[i]];
      for (let j = 0; j < code.length; j++) {
        currentByte |= (code[j] === '1' ? 1 : 0) << bitIndex;
        bitIndex--;
        if (bitIndex === -1) {
          encodedBytes = Buffer.concat([encodedBytes, Buffer.from([currentByte])]);
          currentByte = 0;
          bitIndex = 7;
        }
      }
    }

    if (bitIndex !== 7) {
      encodedBytes = Buffer.concat([encodedBytes, Buffer.from([currentByte])]);
    }

    return encodedBytes;
  }

  // Функция для декодирования текста по Шеннону-Фано
  function decodeShannonFano(encodedBytes, codes) {
    codes = Object.fromEntries(Object.entries(codes).map(([k, v]) => [v, k]))
    let decodedText = '';
    let currentByte = encodedBytes[0];
    let bitIndex = 7;
    let currentCode = '';
    console.error('codes', codes)
    let root = Object.values(codes)[0]; // Используем любой символ для получения корня

    for (let i = 0; i < encodedBytes.length; i++) {
      for (let j = 7; j >= 0; j--) {
        currentCode += (currentByte & (1 << j)) ? '1' : '0';

        const symbol = codes[currentCode]
        if (symbol) {
          decodedText += symbol;
          currentCode = '';
        }
      }

      currentByte = encodedBytes[i + 1] || 0;
    }

    return decodedText;
  }

  // Функция для поиска символа по коду в дереве Шеннона-Фано
  function findSymbolByCode(node, code) {
    console.error('curNode', node)
    if (node.symbol) {
      return node.symbol;
    } else if (code[0] === '0') {
      return findSymbolByCode(node.left, code.slice(1));
    } else if (code[0] === '1') {
      return findSymbolByCode(node.right, code.slice(1));
    }
  }

  // Пример использования
  const text = 'Пример текста для кодирования Шеннона-Фано';
  const symbols = [...new Set(text)].sort();
  const probabilities = symbols.map(symbol => text.split(symbol).length - 1)
    .map(count => count / text.length);

  const root = buildShannonFanoTree(symbols, probabilities);
  const codes = getShannonFanoCodes(root);
  console.log('Коды Шеннона-Фано:', codes);

  const encodedBytes = encodeShannonFano(text, codes);
  console.log('Закодированные байты:', encodedBytes);

  const decodedText = decodeShannonFano(encodedBytes, codes);
  console.log('Декодированный текст:', decodedText);

}

async function main3() {
  const filePath = './asd.txt'
  const input = new FileDescriptor(filePath)
  const output = new FileDescriptor('./asd1.txt')
  const reader = input.getReader()
  const writer = output.getWriter()
  for await (const chunk of reader) {
    writer.writeBuf(Buffer.from(chunk))
  }
  await writer.end()
  await reader.close()
}

class FileReader {
  constructor(filePath) {
    this.filePath = filePath
  }

  rStream

  nextChunk() {
    if (!rStream) {

    }
  }
}

main()
  .then(() => console.log('ALL DONE'))
  .catch(err => {
    console.error('ERROR')
    console.error(err)
  })