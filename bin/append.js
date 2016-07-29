#!/usr/bin/env node
var argv = require('minimist')(process.argv.slice(2))
var deasync = require('deasync')
var glob = require('glob')
var hypercore = require('hypercore')
var hyperdrive = require('hyperdrive')
var prompt = require('prompt')
// TODO: remove temp dir

var Archive = require('../lib/archive')
var Feed = require('../lib/feed')
var identities = require('../lib/identities')
var NestLevels = require('../lib/nest-levels')
var utils = require('../lib/utils')

var nest = NestLevels(utils.getDbPath(argv.db))

var archivesDir = Archive.getArchivesDirPath(argv.db)
var keypair = identities.getKeypair()
var core = hypercore(nest.db('hypercore'))
var drive = hyperdrive(nest.db('hyperdrive'))

var feed = Feed.myFeed(core)
console.log('Identity:', keypair.publicKey.toString('hex'))

var files = glob.sync(argv.path)
var archiveName = argv.name || argv.path
console.log('files:', files)

var archiveHash = deasync(Archive.makeArchive)(drive, archivesDir, files)
console.log('Archive make')

var addArchive = {
  name: archiveName,
  hash: archiveHash
}
console.log(addArchive)

var result = deasync(prompt.get)(['write'])
if (result.write !== 'y') {
  console.log('not appending')
  process.exit(1)
}

// Save the archive's metadata into the main feed
deasync(feed.append).call(feed, addArchive)
console.log('Wrote successfully')
