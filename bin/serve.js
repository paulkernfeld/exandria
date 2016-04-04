#!/usr/bin/env node

var assert = require('assert')
var fs = require('fs')
var path = require('path')

var hypercore = require('hypercore')
var argv = require('minimist')(process.argv.slice(2))

var NestLevels = require('../lib/nest-levels')
var utils = require('../lib/utils')

var nest = NestLevels(utils.getDbPath(argv.db))

var keypair = utils.getKeypair()
var core = hypercore(nest.db('hypercore'))

var metaFeed = core.createFeed({
  key: keypair.publicKey,
  secretKey: keypair.secretKey
})
utils.joinFeedSwarm(metaFeed)

var filesPath = path.join(utils.getDbPath(argv.db), 'files')
var paths = fs.readdirSync(filesPath)
paths.forEach(function (filePath) {
  var fileFeed = utils.getFileFeed(core, filesPath, filePath, {writable: false})
  fileFeed.get(0, function (err, block) {
    assert.ifError(err)
    assert(block)
    utils.joinFeedSwarm(fileFeed)
  })
})
