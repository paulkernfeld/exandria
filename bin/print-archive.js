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

var archiveKey = Buffer(argv._[0], 'hex')

var archive = Archive.getArchive(drive, archivesDir, archiveKey)
archive.waitDone(100, function (err) {
  assert.ifError(err)

  archive.archive.list(function (err, entries) {
    assert.ifError(err)
    entries.forEach(function (entry) {
      console.log('Name:', entry.name)
      console.log('Size:', entry.length)
      console.log()
    })
    process.exit(0)
  })
})
