#!/usr/bin/env node
var hyperdrive = require('hyperdrive')
var argv = require('minimist')(process.argv.slice(2))

var NestLevels = require('../lib/nest-levels')
var utils = require('../lib/utils')

var nest = NestLevels(utils.getDbPath(argv.db))
var drive = hyperdrive(nest.db('hyperdrive'))
var archivesDir = utils.getArchivesDirPath(argv.db)

var archiveName = argv._[0]

var set = require('../lib/set')

var setStream = set.SetStream(nest)
setStream.once('synced', function () {
  var archiveObj = setStream.archives[archiveName]
  if (!archiveObj) {
    console.log('Found no archives named ' + archiveName)
    process.exit(1)
  }

  var archive = utils.getArchive(nest, drive, archivesDir, archiveObj.hash)
  utils.joinSwarm(archive, {})

  utils.downloadArchive(nest, archive, archiveName, archivesDir, function (err) {
    if (err) {
      console.log(err)
      process.exit(1)
    }
    console.log('Archive synced')
    process.exit(0)
  })
})

setStream.start()
