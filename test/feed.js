var deasync = require('deasync')
var hypercore = require('hypercore')
var memdb = require('memdb')
var toArray = require('stream-to-array')
var tape = require('tape')

var Feed = require('../lib/feed')

tape('append and read', function (t) {
  var core = hypercore(memdb())
  var feed = Feed.Feed(core)
  var addArchive = {
    'name': 'test.txt',
    'hash': Buffer('0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef', 'hex')
  }
  deasync(feed.append).call(feed, addArchive)

  toArray(feed.read(), function (err, arr) {
    t.error(err, 'error on read')
    t.ok(arr, 'array exists')

    t.same(arr.length, 1, 'single elt in array')
    t.same(arr[0], {
      type: 'AddArchive',
      message: addArchive
    })
    t.end()
  })
})

tape('myFeed', function (t) {
  var core = hypercore(memdb())

  var feed1 = Feed.myFeed(core)
  var feed2 = Feed.myFeed(core)
  t.ok(feed1)
  t.ok(feed2)
  t.same(feed1, feed2)
  t.end()
})
