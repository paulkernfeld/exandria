#!/usr/bin/env node

var argv = require('minimist')(process.argv.slice(2))

var NestLevels = require('../lib/nest-levels')
var set = require('../lib/set')
var utils = require('../lib/utils')

var nest = NestLevels(utils.getDbPath(argv.db))
var setStream = set.SetStream(nest)
setStream.on('synced', function () {
  for (var fullName in setStream.files) {
    console.log(fullName)
  }
  process.exit(0)
})

setStream.start()
