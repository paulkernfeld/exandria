#!/usr/bin/env node
var assert = require('assert')

var hyperdrive = require('hyperdrive')
var argv = require('minimist')(process.argv.slice(2))

var Archive = require('../lib/archive')
var NestLevels = require('../lib/nest-levels')
var utils = require('../lib/utils')

var nest = NestLevels(utils.getDbPath(argv.db))
var drive = hyperdrive(nest.db('hyperdrive'))
var archivesDir = Archive.getArchivesDirPath(argv.db)

var archiveName = argv._[0]

var set = require('../lib/set')

var setStream = set.SetStream(nest)
setStream.once('synced', function () {
  var archiveObj = setStream.archives[archiveName]
  if (!archiveObj) {
    console.log('Found no archives named ' + archiveName)
    process.exit(1)
  }

  var archive = Archive.getArchive(drive, archivesDir, archiveObj.hash)
  utils.joinSwarm(archive.archive, {})

  if (archiveName) {
    archive.waitDone(30000, function (err) {
      assert.ifError(err)

      archive.name(archiveName, './archives', archivesDir, function (err) {
        if (err) {
          console.log(err)
          process.exit(1)
        }
        console.log('Archive synced')
        process.exit(0)
      })
    })
  }
})

setStream.start()
