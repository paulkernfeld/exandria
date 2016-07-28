var assert = require('assert')

var debug = require('debug')('exandria')
var mapStream = require('map-stream')
var sprintf = require('sprintf-js').sprintf

var identities = require('./identities')
var messages = require('./messages')

var decodeMessage = function (message) {
  if (message[0] !== 2) {
    throw sprintf('Unrecognized message prefix: %s', message[0])
  } else {
    return {
      'type': 'AddArchive',
      'message': messages.AddArchive.decode(message.slice(1))
    }
  }
}

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
      var decoded = decodeMessage(message)
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

var myFeed = function (core) {
  var keypair = identities.getKeypair()

  return Feed(core, {
    key: keypair.publicKey,
    secretKey: keypair.secretKey
  })
}

module.exports.decodeMessage = decodeMessage
module.exports.Feed = Feed
module.exports.myFeed = myFeed
