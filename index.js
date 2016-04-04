var debug = require('debug')('exandria')

function BurnSet (burnStream, makeDynamicFeed) {
  this.burnStream = burnStream
  this.makeDynamicFeed = makeDynamicFeed

  this.dynamicFeeds = {}

  this.burnStream.stream.on('data', this._onBurn.bind(this))
}

BurnSet.prototype._onBurn = function (data) {
  var self = this

  debug(data.toString('hex'))

  // Check the version byte
  if (data.message[0] !== 0) return

  var feedId = data.message.slice(1)
  var feed = this.makeDynamicFeed(feedId)
  var feedObject = {
    feed: feed,
    weight: data.satoshis,
    data: []
  }
  self.dynamicFeeds[feedId.toString('hex')] = feedObject

  feed.on('data', function (data) {
    self._onData(feedObject, data)
  })
}

BurnSet.prototype._onData = function (feedObject, data) {
  feedObject.data.push(data)
}

module.exports = BurnSet
