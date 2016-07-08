var tape = require('tape')

var debug = require('../lib/throttled-debug')

var argumentsCollecter = function () {
  var collected = []

  var collect = function () {
    var asArray = []
    for (var i = 0; i < arguments.length; i++) {
      asArray.push(arguments[i])
    }
    collected.push(asArray)
  }

  var get = function () {
    return collected
  }

  return {
    collect: collect,
    get: get
  }
}

tape('Short interval', function (t) {
  var collecter = argumentsCollecter()
  var d = debug(collecter.collect)
  d('Hello', 1)
  d('Hello', 2)
  t.same(collecter.get(), [['Hello', 1]])
  t.end()
})

tape('Long interval', function (t) {
  var collecter = argumentsCollecter()
  var d = debug(collecter.collect, {interval: 0})
  d('Hello', 1)
  d('Hello', 2)
  t.same(collecter.get(), [['Hello', 1], ['Hello', 2]])
  t.end()
})

tape('Different string', function (t) {
  var collecter = argumentsCollecter()
  var d = debug(collecter.collect)
  d('Hello', 1)
  d('World', 2)
  t.same(collecter.get(), [['Hello', 1], ['World', 2]])
  t.end()
})
