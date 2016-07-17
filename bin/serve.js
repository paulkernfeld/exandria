#!/usr/bin/env node

var assert = require('assert')
var fs = require('fs')

var hypercore = require('hypercore')
var hyperdrive = require('hyperdrive')
var argv = require('minimist')(process.argv.slice(2))

var NestLevels = require('../lib/nest-levels')
var utils = require('../lib/utils')

var nest = NestLevels(utils.getDbPath(argv.db))

var core = hypercore(nest.db('hypercore'))
var drive = hyperdrive(nest.db('hyperdrive'))

var swarms = {}

var archivesDir = utils.getArchivesDirPath(argv.db)
// TODO: look inside hyperdrive's hypercore, not on the fs, perhaps
var paths = fs.readdirSync(archivesDir)
if (!paths) {
  console.log('Warning: no archives found')
}
paths.forEach(function (archivePath) {
  var archive = utils.getArchive(nest, drive, archivesDir, Buffer(archivePath, 'hex'))
  utils.joinSwarm(archive, swarms)
})

core.list(function (err, feedKeys) {
  assert.ifError(err)
  feedKeys.forEach(function (feedKey) {
    var feed = core.createFeed({key: feedKey})
    utils.joinSwarm(feed, swarms)
  })
})
