#!/usr/bin/env node

var assert = require('assert')
var fs = require('fs')
var path = require('path')

var hypercore = require('hypercore')
var argv = require('minimist')(process.argv.slice(2))
var sprintf = require('sprintf-js').sprintf

var NestLevels = require('../lib/nest-levels')
var set = require('../lib/set')
var utils = require('../lib/utils')

var nest = NestLevels(utils.getDbPath(argv.db))
var core = hypercore(nest.db('hypercore'))

var filesPath = path.join(utils.getDbPath(argv.db), 'files')

assert.equal(argv._.length, 1)
var fullName = argv._[0]

var setStream = set.SetStream(nest)
setStream.on('synced', function () {
  var fileInfo = setStream.files[fullName]
  assert(fileInfo, sprintf('File named "%s" not found', fullName))

  var keyHex = fileInfo.hash.toString('hex')
  var fileFeed = utils.getFileFeed(core, filesPath, keyHex)
  utils.joinFeedSwarm(fileFeed)
  fileFeed.get(0, function (err, block) {
    assert.ifError(err)
    assert(block)

    if (!fs.existsSync('./files')) {
      fs.mkdirSync('./files')
    }
    var linkPath = path.join('./files', fullName)
    if (fs.existsSync(linkPath)) {
      fs.unlinkSync(linkPath)
    }
    fs.symlinkSync(path.join('..', filesPath, keyHex), linkPath)
    process.exit(0)
  })
})

setStream.start()
