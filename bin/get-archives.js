#!/usr/bin/env node

var assert = require('assert')
var fs = require('fs')
var path = require('path')

var debug = require('debug')('exandria')
var hyperdrive = require('hyperdrive')
var minimatch = require('minimatch')
var argv = require('minimist')(process.argv.slice(2))
var sprintf = require('sprintf-js').sprintf

var NestLevels = require('../lib/nest-levels')
var set = require('../lib/set')
var utils = require('../lib/utils')

var nest = NestLevels(utils.getDbPath(argv.db))
var drive = hyperdrive(nest.db('hyperdrive'))

var archivesDir = utils.getArchivesDirPath(argv.db)

var match = argv._[0] || '*'
var swarms = {}

var setStream = set.SetStream(nest)
setStream.once('synced', function () {
  var toGet = {}
  var archiveName
  for (archiveName in setStream.archives) {
    if (minimatch(archiveName, match, {nocase: true})) {
      toGet[archiveName] = setStream.archives[archiveName]
    }
  }

  assert(Object.keys(toGet).length > 0, sprintf('No archives matched "%s"', match))

  for (archiveName in toGet) {
    var addArchive = toGet[archiveName]
    var keyHex = addArchive.hash.toString('hex')
    var archive = utils.getArchive(drive, archivesDir, addArchive.hash)
    utils.joinSwarm(archive, swarms)
    archive.list({live: false}, function (err, entries) {
      assert.ifError(err)
      console.log(entries)
      process.exit()
    })

    archive.get(0, function (err, block) {
      assert.ifError(err)
      assert(block)
      debug('got archive', archiveName)

      if (!fs.existsSync('./archives')) {
        fs.mkdirSync('./archives')
      }
      var linkPath = path.join('./archives', archiveName)
      if (fs.existsSync(linkPath)) {
        debug('replacing existing archive', linkPath)
        fs.unlinkSync(linkPath)
      }
      fs.symlinkSync(path.join('..', archivesDir, keyHex), linkPath)
      process.exit(0)
    })
  }
})

setStream.start()
