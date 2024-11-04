const Archivator = require("./archivator")
const ShannonFanoCodec = require("./codecs/SchannonFanoCodec")
const FileDescriptor = require('./utils/FileDescriptor')

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
  const codec = new ShannonFanoCodec()
  const archivator = new Archivator(codec)
  await archivator[operation](filePath, outputPath)
}

main()
  .then(() => console.log('ALL DONE'))
  .catch(err => {
    console.error('ERROR')
    console.error(err)
  })