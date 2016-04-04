#!/usr/bin/env node

var assert = require('assert')
var fs = require('fs')
var path = require('path')

var argv = require('minimist')(process.argv.slice(2))
var deasync = require('deasync')
var hypercore = require('hypercore')
var memdb = require('memdb')
var prompt = require('prompt')
var raf = require('random-access-file')

var messages = require('../lib/messages')
var NestLevels = require('../lib/nest-levels')
var utils = require('../lib/utils')

var nest = NestLevels(utils.getDbPath(argv.db))

var keypair = utils.getKeypair()
var core = hypercore(nest.db('hypercore'))

var metaFeed = core.createFeed({
  key: keypair.publicKey,
  secretKey: keypair.secretKey
})

assert(argv._.length)
var files = []
argv._.forEach(function (filePath) {
  var content = fs.readFileSync(filePath)

  var fileFeed = hypercore(memdb()).createFeed({live: false})
  deasync(fileFeed.append).call(fileFeed, content)
  deasync(fileFeed.finalize).call(fileFeed)

  var ext = path.extname(filePath)
  var file = {
    path: filePath,
    name: path.basename(filePath, ext),
    extension: ext.slice(1),
    hash: fileFeed.key
  }
  files.push(file)
  console.log(file)
})

var result = deasync(prompt.get)(['write'])
if (result.write !== 'y') {
  console.log('not appending')
  process.exit(1)
}

var filesDir = path.join(utils.getDbPath(argv.db), 'files')
if (!fs.existsSync(filesDir)) {
  fs.mkdirSync(filesDir)
}
files.forEach(function (file) {
  var dest = path.join(filesDir, file.hash.toString('hex'))

  // Make an individual feed for this file
  var content = fs.readFileSync(file.path)
  var fileFeed = core.createFeed({
    live: false,
    storage: raf(dest)
  })
  deasync(fileFeed.append).call(fileFeed, content)
  deasync(fileFeed.finalize).call(fileFeed)
  assert(fileFeed.key)

  // Save the file's metadata into the main feed
  var toWrite = messages.AddFile.encode(file)
  deasync(metaFeed.append).call(metaFeed, toWrite)
})
