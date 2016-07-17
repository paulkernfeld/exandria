#!/usr/bin/env node

var fs = require('fs')
var path = require('path')

var async = require('async')
var argv = require('minimist')(process.argv.slice(2))
var deasync = require('deasync')
var glob = require('glob')
var hypercore = require('hypercore')
var hyperdrive = require('hyperdrive')
var prompt = require('prompt')
var raf = require('random-access-file')
var temp = require('temp').track()
// TODO: remove temp dir

var messages = require('../lib/messages')
var NestLevels = require('../lib/nest-levels')
var utils = require('../lib/utils')

var nest = NestLevels(utils.getDbPath(argv.db))

var keypair = utils.getKeypair()
var core = hypercore(nest.db('hypercore'))
var drive = hyperdrive(nest.db('hyperdrive'))

var metaFeed = core.createFeed({
  key: keypair.publicKey,
  secretKey: keypair.secretKey
})

console.log('Identity:', keypair.publicKey.toString('hex'))

var files = glob.sync(argv.path)
var archiveName = argv.name || argv.path
console.log('files:', files)

// Make the new archive in a temp directory
var tmpDirPath = temp.mkdirSync()
var archive = drive.createArchive({live: false, file: function (name) {
  return raf(path.join(tmpDirPath, name))
}})

// Add all matching files into the archive
deasync(async.map)(files, function (filePath, cb) {
  var ws = archive.createFileWriteStream(filePath)
  fs.createReadStream(filePath).pipe(ws)
  ws.on('end', cb)
})

// Compute the content hash of the archive
deasync(archive.finalize).call(archive)
var link = archive.key.toString('hex')

var addArchive = {
  name: archiveName,
  hash: archive.key
}
console.log(addArchive)

var result = deasync(prompt.get)(['write'])
if (result.write !== 'y') {
  console.log('not appending')
  process.exit(1)
}

// Move the archive from the temp folder into a folder named w/ the content hash
// of the archive.
var archivesDir = utils.getArchivesDirPath(argv.db)

var archivePath = path.join(archivesDir, link)
if (fs.existsSync(archivePath)) {
  console.log('archive path already exists, skipping archive creation')
} else {
  fs.renameSync(tmpDirPath, archivePath)
}

// Mark the archive as complete
nest.db('complete-archives').put(archive.key, true, {sync: true})

// Save the archive's metadata into the main feed
var toWrite = Buffer.concat([Buffer([2]), messages.AddArchive.encode(addArchive)])
deasync(metaFeed.append).call(metaFeed, toWrite)
console.log('Wrote successfully')
