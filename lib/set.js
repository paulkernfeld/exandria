var assert = require('assert')
var EventEmitter = require('events')
var inherits = require('inherits')

var debug = require('debug')('exandria')
var webrtc = require('electron-webrtc')()
var hypercore = require('hypercore')
var signalhub = require('signalhub')
var through2 = require('through2')
var Swarm = require('webrtc-swarm')

var identities = require('./identities')
var messages = require('./messages')
var utils = require('./utils')

var SetStream = function (nest) {
  if (!(this instanceof SetStream)) { return new SetStream(nest) }
  EventEmitter.call(this)

  var self = this

  // TODO: use a sublevel of db
  self.core = hypercore(nest.db('hypercore'))

  self.swarms = {}
  self.files = {}

  self.openFeedStreams = {}

  var feedSynced = function (feedKey) {
    assert(openFeedStreams[feedKey])
    delete openFeedStreams[feedKey]
    self.emit('synced')
  }

  var openFeedStreams = {}

  var transform = function (obj, enc, next) {
    var feedKey = obj.key.toString('hex')
    if (!self.swarms[feedKey]) {
      openFeedStreams[feedKey] = true
      var hub = signalhub(feedKey, [utils.signalhubUrl])
      var swarm = Swarm(hub, { wrtc: webrtc })
      swarm.on('peer', function (peer) {
        debug('connected to peer', feedKey)
        var feed = self.core.createFeed(obj.key)
        peer.pipe(feed.replicate()).pipe(peer)
      })
      self.swarms[feedKey] = swarm
      var transform = function (chunk, enc, next) {
        var decoded = messages.AddFile.decode(chunk)
        // TODO extension may only contain lower-case alphanumeric
        var fullName = decoded.name + '.' + decoded.extension
        if (!self.files[fullName]) {
          // TODO handle overwriting
          self.files[fullName] = decoded
        }
      }

      var stream = through2(transform)
      var feedStream = self.core.createReadStream(obj.key, {live: false})
      feedStream.on('end', function () {
        feedSynced(feedKey)
      })
      feedStream.pipe(stream)
    }

    next()
  }
  self.fromStream = through2.obj(transform)

  self.IdentityStream = identities.IdentityStream(nest)
  self.IdentityStream.stream.pipe(self.fromStream)
}
inherits(SetStream, EventEmitter)

SetStream.prototype.start = function () {
  this.IdentityStream.start()
}
module.exports.SetStream = SetStream
