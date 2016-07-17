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

  var doneWith = function (archiveName) {
    debug('done with archive', archiveName)
    delete toGet[archiveName]
    if (Object.keys(toGet).length === 0) {
      process.exit()
    }
  }

  Object.keys(setStream.archives).forEach(function (archiveName) {
    if (minimatch(archiveName, match, {nocase: true})) {
      toGet[archiveName] = setStream.archives[archiveName]
      console.log('Getting archive', archiveName)
    }
  })

  assert(Object.keys(toGet).length > 0, sprintf('No archives matched "%s"', match))

  Object.keys(toGet).forEach(function (archiveName) {
    var addArchive = toGet[archiveName]
    var keyHex = addArchive.hash.toString('hex')
    var archive = utils.getArchive(drive, archivesDir, addArchive.hash)
    utils.joinSwarm(archive, swarms)

    utils.downloadArchive(archive, function (err) {
      if (err) {
        console.log('Error downloading archive', keyHex, err)
        doneWith(archiveName)
        return
      }

      if (!fs.existsSync('./archives')) {
        fs.mkdirSync('./archives')
      }
      var linkPath = path.join('./archives', archiveName)
      try {
        fs.unlinkSync(linkPath)
      } catch (e) {}
      fs.symlinkSync(path.join('..', archivesDir, keyHex), linkPath)

      console.log('Got archive', archiveName)

      doneWith(archiveName)
    })
  })
})

setStream.start()
