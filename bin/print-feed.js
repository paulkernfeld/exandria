#!/usr/bin/env node

var assert = require('assert')

var hypercore = require('hypercore')
var mapStream = require('map-stream')
var argv = require('minimist')(process.argv.slice(2))

var NestLevels = require('../lib/nest-levels')
var utils = require('../lib/utils')

var nest = NestLevels(utils.getDbPath(argv.db))
var core = hypercore(nest.db('hypercore'))

var feedKey = utils.getKeypair().publicKey
if (argv._[0]) {
  feedKey = Buffer(argv._[0], 'hex')
}

var metaFeed = core.createFeed({key: feedKey})

var transform = function (message, cb) {
  console.log('Raw:', message.toString('hex'))
  try {
    var decoded = utils.decodeMessage(message)
    assert(decoded.type === 'AddArchive')
    console.log('Name:', decoded.message.name)
    if (decoded.message.hash) {
      console.log('Hash:', decoded.message.hash.toString('hex'))
    } else {
      console.log('Hash:', decoded.message.hash)
    }
  } catch (e) {
    console.log(e)
  }
  console.log()
  cb()
}

console.log('Printing feed:', feedKey.toString('hex'))
var mappy = mapStream(transform)
core.createReadStream(metaFeed, {live: false}).pipe(mappy)
