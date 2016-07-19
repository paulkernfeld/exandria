var rimraf = require('rimraf')
var tape = require('tape')
var timers = require('timers')

var NestLevels = require('../lib/nest-levels')
var set = require('../lib/set')

rimraf.sync('./test.nest')

var nest = NestLevels('./test.nest')

tape('get archives', function (t) {
  t.on('end', function () {
    timers.setImmediate(process.exit)
  })

  var setStream = set.SetStream(nest)
  setStream.once('synced', function () {
    t.ok(Object.keys(setStream.archives).length > 0)
    t.end()
  })

  setStream.start()
})
