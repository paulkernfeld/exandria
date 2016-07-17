var EventEmitter = require('events')
var inherits = require('inherits')
var timers = require('timers')

var debugWrapped = require('debug')('exandria')
var hypercore = require('hypercore')
var mapStream = require('map-stream')
var moment = require('moment')
var through2 = require('through2')

var debug = require('./throttled-debug')(debugWrapped)
var identities = require('./identities')
var utils = require('./utils')

var MAX_TXS_DELAY_SECONDS = 7200

var SetStream = function (nest) {
  if (!(this instanceof SetStream)) { return new SetStream(nest) }
  EventEmitter.call(this)

  var self = this

  // TODO: use a sublevel of db
  self.core = hypercore(nest.db('hypercore'))
  self.archives = {}

  var txsTime = 0
  var swarms = {}
  var readStreams = {}
  var synced = false
  var seenAtLeastOneIdentity = false
  var feedsWaiting = {}

  var amISynced = function () {
    // TODO: emit unsynced event

    // Only emit the synced event once ever
    if (synced) {
      return debug('not synced: already synced')
    }

    var txsDelay = Math.round(new Date().getTime() / 1000 - txsTime)
    if (txsDelay > MAX_TXS_DELAY_SECONDS) {
      return debug('not synced: waiting for txs', moment(txsTime * 1000).fromNow())
    }

    if (!seenAtLeastOneIdentity) {
      return debug('not synced: no identities seen')
    }

    if (Object.keys(feedsWaiting).length > 0) {
      return debug('not synced: waiting for feed', Object.keys(feedsWaiting)[0])
    }
    synced = true
    debug('synced')
    self.emit('synced')
  }

  var onTxs = function (block) {
    txsTime = block.header.timestamp
    amISynced()
  }

  var doneWithFeed = function (feedKey) {
    debug('done with feed', feedKey)
    amISynced()
  }

  // This makes us wait N milliseconds after the most recent activity on a particular feed.
  // The timer is reset on important events, e.g. connecting to the swarm for that feed.
  var resetFeedWait = function (key, millis) {
    if (feedsWaiting[key]) {
      timers.clearTimeout(feedsWaiting[key])
    }
    feedsWaiting[key] = timers.setTimeout(function () {
      delete feedsWaiting[key]
      doneWithFeed(key)
    }, millis)
  }

  // This streams all of the archive metadata for a particular feed
  var makeFeedReadStream = function (feed) {
    var feedKey = feed.key.toString('hex')

    if (readStreams[feedKey]) return debug('feed read stream already open', feedKey)

    var transform = function (chunk, cb) {
      var decoded
      try {
        decoded = utils.decodeMessage(chunk)
      } catch (e) {
        debug('decoding error', e)
        return cb()
      }

      if (decoded.type !== 'AddArchive') {
        debug('weird type', decoded.type)
        return cb()
      }

      var message = decoded.message
      if (!(message.hash && message.hash.length === 32)) {
        debug('invalid archive hash', message.hash)
        return cb()
      }

      debug('archive', message.name, message.hash.toString('hex'))
      if (!self.archives[message.name]) {
        // TODO handle overwriting
        self.archives[message.name] = message
      }
      resetFeedWait(feedKey, 10000)
      cb()
    }

    var feedThrough = mapStream(transform)
    var feedStream = self.core.createReadStream(feed, { live: true })
    feedStream.pipe(feedThrough)
    readStreams[feedKey] = feedThrough

    utils.bubbleError(feedThrough, self, 'feed through ' + feedKey)
    utils.bubbleError(feedStream, self, 'feed stream ' + feedKey)
  }

  var transformTx = function (obj, enc, next) {
    seenAtLeastOneIdentity = true

    var feedKey = obj.key.toString('hex')
    debug('saw identity', feedKey)

    if (!swarms[feedKey]) {
      // Initialize swarm
      var feed = self.core.createFeed(obj.key)
      var swarm = utils.joinSwarm(feed, swarms)
      resetFeedWait(feedKey, 10000)
      debug('initialized swarm', feedKey)

      makeFeedReadStream(feed)

      utils.bubbleError(swarm, self, 'swarm ' + feedKey)
      utils.bubbleError(feed, self, 'feed ' + feedKey)
    }

    next()
  }

  self.fromStream = through2.obj(transformTx)
  self.identityStream = identities.IdentityStream(nest)
  self.identityStream.stream.pipe(self.fromStream)

  self.identityStream.burnStream.burnie.on('txs', onTxs)

  utils.bubbleError(self.fromStream, self, 'from stream')
  utils.bubbleError(self.identityStream, self, 'identity stream')
}
inherits(SetStream, EventEmitter)

SetStream.prototype.start = function () {
  this.identityStream.start()
}
module.exports.SetStream = SetStream
