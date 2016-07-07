#!/usr/bin/env node

var assert = require('assert')
var fs = require('fs')
var path = require('path')

var deasync = require('deasync')
var hypercore = require('hypercore')
var argv = require('minimist')(process.argv.slice(2))

var NestLevels = require('../lib/nest-levels')
var utils = require('../lib/utils')

var nest = NestLevels(utils.getDbPath(argv.db))

var core = hypercore(nest.db('hypercore'))

var feeds = {}
var filesPath = path.join(utils.getDbPath(argv.db), 'files')
if (!fs.existsSync(filesPath)) {
  fs.mkdirSync(filesPath)
}
var paths = fs.readdirSync(filesPath)
if (!paths) {
  console.log('Warning: no files found')
}
paths.forEach(function (filePath) {
  var fileFeed = utils.getFileFeed(core, filesPath, filePath, {writable: false})
  var block = deasync(fileFeed.get).call(fileFeed, 0)
  assert(block)
  feeds[filePath] = fileFeed
  utils.joinFeedSwarm(fileFeed)
})

core.list(function (err, feedKeys) {
  assert.ifError(err)
  feedKeys.forEach(function (feedKey) {
    var feedKeyHex = feedKey.toString('hex')
    if (feeds[feedKeyHex]) {
      // This is a file feed, and we already joined its swarm above
      return
    }
    var feed = core.createFeed({key: Buffer(feedKeyHex, 'hex')})
    utils.joinFeedSwarm(feed)
  })
})
