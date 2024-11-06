const Archivator = require("./archivator")
const { CODECS } = require('./codecs')

const ARGS = [
  { field: 'codec', options: CODECS },
  { field: 'operation', options: ['compress', 'decompress'] },
  { field: 'filePath' },
  { field: 'outputPath' }
]

function parseArgv() {
  const args = {}
  for (let i = 0; i < ARGS.length; i++) {
    const indexInArgv = i + 2
    const position = i + 1
    const config = ARGS[i]
    const input = process.argv[indexInArgv]
    if (!input) {
      throw new Error(`Pass "${config.field}" as argument in position ${position}`)
    }
    if (config.options && !config.options.some(option => option === input)) {
      throw new Error(`"${config.field}" must be "${config.options.join('" or "')}" at position ${position}`)
    }
    args[config.field] = input
  }
  return args
}

async function main() {
  const { filePath, outputPath, operation, codec } = parseArgv()
  const archivator = new Archivator(codec)
  await archivator[operation](filePath, outputPath)
}

main()
  .then(() => console.log('ALL DONE'))
  .catch(err => {
    console.error('ERROR')
    console.error(err)
  })