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

module.exports.Feed = Feed
module.exports.myFeed = function (core) {
  var keypair = utils.getKeypair()

  return Feed(core, {
    key: keypair.publicKey,
    secretKey: keypair.secretKey
  })
}
