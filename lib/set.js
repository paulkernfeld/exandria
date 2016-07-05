var assert = require('assert')
var EventEmitter = require('events')
var inherits = require('inherits')
var timers = require('timers')

var debug = require('debug')('exandria')
var hypercore = require('hypercore')
var through2 = require('through2')

var identities = require('./identities')
var messages = require('./messages')
var utils = require('./utils')

var MAX_TXS_DELAY_SECONDS = 7200

var SetStream = function (nest) {
  if (!(this instanceof SetStream)) { return new SetStream(nest) }
  EventEmitter.call(this)

  var self = this

  // TODO: use a sublevel of db
  self.core = hypercore(nest.db('hypercore'))
  self.files = {}

  var txsTime = 0
  var swarms = {}
  var readStreams = {}
  var synced = false
  var starting = true
  var feedsWaiting = {}

  var amISynced = function () {
    // TODO: emit unsynced event

    // Only emit the synced event once ever
    if (synced) {
      return debug('not synced: already synced')
    }

    if (starting) {
      return debug('not synced: still starting up')
    }

    var txsDelay = Math.round(new Date().getTime() / 1000 - txsTime)
    if (txsDelay > MAX_TXS_DELAY_SECONDS) {
      return debug('not synced: waiting for txs', txsDelay)
    }
    if (Object.keys(feedsWaiting).length > 0) {
      return debug('not synced: waiting for feed', Object.keys(feedsWaiting)[0])
    }
    synced = true
    debug('synced')
    self.emit('synced')
  }

  var started = function () {
    starting = false
    amISynced()
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

  // This streams all of the file metadata for a particular feed
  var makeFeedReadStream = function (feed) {
    var feedKey = feed.key.toString('hex')

    if (readStreams[feedKey]) return debug('feed read stream already open', feedKey)

    var transform = function (chunk, enc, next) {
      var decoded = messages.AddFile.decode(chunk)
      decoded.feed = feed.key
      // TODO extension may only contain lower-case alphanumeric
      var fullName = decoded.name + '.' + decoded.extension
      debug('file', fullName)
      if (!self.files[fullName]) {
        // TODO handle overwriting
        self.files[fullName] = decoded
      }
      resetFeedWait(feedKey, 10000)
    }

    var feedThrough = through2(transform)
    var feedStream = self.core.createReadStream(feed, { live: true })
    feedStream.pipe(feedThrough)
    readStreams[feedKey] = feedThrough

    utils.bubbleError(feedThrough, self, 'feed through ' + feedKey)
    utils.bubbleError(feedStream, self, 'feed stream ' + feedKey)
  }

  var transformTx = function (obj, enc, next) {
    var feedKey = obj.key.toString('hex')
    if (!swarms[feedKey]) {
      // Initialize swarm
      var swarm = utils.makeSwarm(feedKey)
      swarms[feedKey] = swarm
      resetFeedWait(feedKey, 10000)
      debug('initialized swarm', feedKey)

      // Start the feed's read stream when either:
      // 1. We connect to a peer, or...
      var feed = self.core.createFeed(obj.key)
      swarm.on('connection', function (peer) {
        debug('connected to peer', feedKey)
        resetFeedWait(feedKey, 10000)
        peer.pipe(feed.replicate()).pipe(peer)

        makeFeedReadStream(feed)
      })

      // 2. ...the hypercore feed is opened
      feed.on('open', function (err) {
        assert.ifError(err)
        makeFeedReadStream(feed)
      })

      utils.bubbleError(swarm, self, 'swarm ' + feedKey)
      utils.bubbleError(feed, self, 'feed ' + feedKey)
    }

    next()
  }

  self.fromStream = through2.obj(transformTx)
  self.identityStream = identities.IdentityStream(nest)
  self.identityStream.stream.pipe(self.fromStream)

  // This keeps the set from emitting the sync event too soon
  setTimeout(started, 1000)

  self.identityStream.burnStream.burnie.on('txs', onTxs)

  utils.bubbleError(self.fromStream, self, 'identity stream')
  utils.bubbleError(self.identityStream, self, 'identity stream')
}
inherits(SetStream, EventEmitter)

SetStream.prototype.start = function () {
  this.identityStream.start()
}
module.exports.SetStream = SetStream
