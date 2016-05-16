var assert = require('assert')
var EventEmitter = require('events')
var inherits = require('inherits')
var timers = require('timers')

var debug = require('debug')('exandria')
var webrtc = require('electron-webrtc')()
var hypercore = require('hypercore')
var signalhub = require('signalhub')
var through2 = require('through2')
var Swarm = require('webrtc-swarm')

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

  self.swarms = {}
  self.files = {}
  self.readStreams = {}

  self.synced = false
  var starting = true
  var metaFeedsWaiting = {}

  var transformTx = function (obj, enc, next) {
    var feedKey = obj.key.toString('hex')
    if (!self.swarms[feedKey]) {
      var hub = signalhub(feedKey, [utils.signalhubUrl])
      var swarm = Swarm(hub, { wrtc: webrtc })
      resetMetaFeedWait(feedKey, 10000)
      var feed = self.core.createFeed(obj.key)
      swarm.on('peer', function (peer) {
        debug('connected to peer', feedKey)
        resetMetaFeedWait(feedKey, 10000)
        peer.pipe(feed.replicate()).pipe(peer)

        makeMetaFeedReadStream()
      })

      var makeMetaFeedReadStream = function (err) {
        assert.ifError(err)

        if (self.readStreams[feedKey]) return

        var transformMeta = function (chunk, enc, next) {
          var decoded = messages.AddFile.decode(chunk)
          decoded.feed = obj.key
          // TODO extension may only contain lower-case alphanumeric
          var fullName = decoded.name + '.' + decoded.extension
          debug('file', fullName)
          if (!self.files[fullName]) {
            // TODO handle overwriting
            self.files[fullName] = decoded
          }
          resetMetaFeedWait(feedKey, 10000)
        }

        var processMetaFeedStream = through2(transformMeta)
        var metaFeedStream = self.core.createReadStream(feed, { live: true })
        metaFeedStream.pipe(processMetaFeedStream)
        self.readStreams[feedKey] = processMetaFeedStream
      }

      feed.on('open', makeMetaFeedReadStream)

      self.swarms[feedKey] = swarm
    }

    next()
  }
  self.fromStream = through2.obj(transformTx)

  self.identityStream = identities.IdentityStream(nest)
  self.identityStream.stream.pipe(self.fromStream)

  var txsTime = 0

  var resetMetaFeedWait = function (key, millis) {
    if (metaFeedsWaiting[key]) {
      timers.clearTimeout(metaFeedsWaiting[key])
    }
    metaFeedsWaiting[key] = timers.setTimeout(function () {
      delete metaFeedsWaiting[key]
      doneWithFeed(key)
    }, millis)
  }

  setTimeout(function () {
    starting = false
    amISynced()
  }, 1000)

  self.identityStream.burnStream.burnie.on('txs', function (block) {
    txsTime = block.header.timestamp
    amISynced()
  })

  var amISynced = function () {
    // TODO: emit unsynced event
    if (self.synced) {
      return
    }

    if (starting) {
      return debug('starting')
    }

    var txsDelay = Math.round(new Date().getTime() / 1000 - txsTime)
    if (txsDelay > MAX_TXS_DELAY_SECONDS) {
      return
    }
    if (Object.keys(metaFeedsWaiting).length > 0) {
      return debug('feed not joined', Object.keys(metaFeedsWaiting)[0])
    }
    self.synced = true
    debug('synced')
    self.emit('synced')
  }

  var doneWithFeed = function (feedKey) {
    debug('done with feed', feedKey)
    amISynced()
  }
}
inherits(SetStream, EventEmitter)

SetStream.prototype.start = function () {
  this.identityStream.start()
}
module.exports.SetStream = SetStream
