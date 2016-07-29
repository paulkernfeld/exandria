var debug = require('debug')('exandria')
var webrtc = require('electron-webrtc')
var signalhub = require('signalhub')
var Swarm = require('webrtc-swarm')

var signalhubUrls = [
  'https://exandria-signalhub.herokuapp.com',
  'http://localhost:24144'
]

var wrtc
var makeWrtc = function () {
  if (!wrtc) wrtc = webrtc()
  return wrtc
}

var getDbPath = function (argvDb) {
  return argvDb || './main.nest'
}

var bubbleError = function (from, to, name) {
  from.on('error', function (err) {
    console.log('error:', name)
    to.emit('error', err)
  })
}

var makeSwarm = function (key) {
  var hub = signalhub(key, signalhubUrls)
  return Swarm(hub, {wrtc: makeWrtc()})
}

var joinSwarm = function (feed, swarms) {
  // This method should work on:
  // 1. A hypercore feed
  // 2. A hyperdrive archive
  var keyHex = feed.key.toString('hex')
  if (swarms[keyHex]) {
    return swarms[keyHex]
  }
  var swarm = makeSwarm(keyHex)
  debug('looking for swarm', keyHex)

  swarm.on('peer', function (peer, id) {
    debug('connection to', id, keyHex)
    feed.on('upload', function (block, data) {
      debug('uploaded', !data || data.length, 'bytes', keyHex)
    })
    feed.on('download', function (block, data) {
      debug('downloaded', !data || data.length, 'bytes', keyHex)
    })
    feed.on('download-finished', function () {
      debug('download finished', keyHex)
    })
    var replicate = feed.replicate()
    replicate.on('error', function (err) {
      debug('replication error', keyHex, id, err.message)
    })
    peer.pipe(replicate).pipe(peer)
  })
  swarms[keyHex] = swarm
  return swarm
}

module.exports.bubbleError = bubbleError
module.exports.getDbPath = getDbPath
module.exports.makeSwarm = makeSwarm
module.exports.joinSwarm = joinSwarm
