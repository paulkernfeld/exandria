#!/usr/bin/env node

var debug = require('debug')('exandria')
var argv = require('minimist')(process.argv.slice(2))

var NestLevels = require('../lib/nest-levels')
var set = require('../lib/set')
var utils = require('../lib/utils')

var nest = NestLevels(utils.getDbPath(argv.db))
var setStream = set.SetStream(nest)
setStream.once('synced', function () {
  for (var archiveName in setStream.archives) {
    debug('archive', archiveName, setStream.archives[archiveName])
    console.log(archiveName, setStream.archives[archiveName].hash.toString('hex'))
  }
  process.exit(0)
})

setStream.start()
