const Archivator = require('../Archivator')
const { CODECS } = require('../codecs')
const fsPromise = require('fs/promises')
const { Dirent } = require('fs')
const path = require("path")

async function main() {
  console.log('STARTING COMPRESSION OF ALL FILES IN FOLDER\n\n')
  /** @type {Dirent[]} */
  const dirents = await fsPromise.readdir(process.cwd(), { withFileTypes: true })
  for (const dirent of dirents) {
    if (process.argv[2] === 'clear') {
      if (dirent.name.endsWith('_encoded')) {
        await fsPromise.rm(path.join(process.cwd(), dirent.name))
      }
      continue
    }
    if (!dirent.name.endsWith('.txt')) {
      continue
    }
    const inputPath = path.join(process.cwd(), dirent.name)

    for (const codec of CODECS) {
      const outputPath = path.join(process.cwd(), dirent.name.slice(0, dirent.name.length - 4) + `_${codec}_encoded`)
      const archivator = new Archivator(codec)
      console.log('FILE: ', dirent.name, ' CODEC: ', codec)
      await archivator.compress(inputPath, outputPath)
      console.log('\n')
    }
  }
}

main().then(() => console.log('ALL DONE')).catch(err => {
  console.error('ERROR')
  console.error(err)
})