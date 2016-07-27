var assert = require('assert')

var debug = require('debug')('exandria')
var mapStream = require('map-stream')

var messages = require('./messages')
var utils = require('./utils')

// The metadata feed for an identity
function Feed (core, keys) {
  if (!(this instanceof Feed)) return new Feed(core, keys)

  this.feed = core.createFeed(keys)
}

Feed.prototype.append = function (addArchive, cb) {
  var toWrite = Buffer.concat([Buffer([2]), messages.AddArchive.encode(addArchive)])
  this.feed.append(toWrite, cb)
}

Feed.prototype.read = function () {
  var transform = function (message, cb) {
    try {
      var decoded = utils.decodeMessage(message)
      assert.equal(decoded.type, 'AddArchive')
      assert.equal(typeof decoded.message.name, 'string')
      assert(Buffer.isBuffer(decoded.message.hash))
      assert(decoded.message.hash.length === 32)
      cb(null, decoded)
    } catch (e) {
      debug(e)
      cb()
    }
  }

  var mappy = mapStream(transform)
  var feedRead = this.feed._core.createReadStream(this.feed, {live: false})
  feedRead.pipe(mappy)
  return mappy
}

module.exports.Feed = Feed
module.exports.myFeed = function (core) {
  var keypair = utils.getKeypair()

  return Feed(core, {
    key: keypair.publicKey,
    secretKey: keypair.secretKey
  })
}
