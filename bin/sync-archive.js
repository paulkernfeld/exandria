#!/usr/bin/env node

var hyperdrive = require('hyperdrive')
var argv = require('minimist')(process.argv.slice(2))

var NestLevels = require('../lib/nest-levels')
var utils = require('../lib/utils')

var nest = NestLevels(utils.getDbPath(argv.db))
var drive = hyperdrive(nest.db('hyperdrive'))
var archivesDir = utils.getArchivesDirPath(argv.db)

var archiveKey = Buffer(argv._[0], 'hex')

var archive = utils.getArchive(drive, archivesDir, archiveKey)
utils.joinSwarm(archive, {})
archive.on('download', function (data) {
  console.log('downloaded data of length', data.length)
})
