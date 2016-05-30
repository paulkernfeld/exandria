var fs = require('fs')
var path = require('path')

var debug = require('debug')('exandria')
var webrtc = require('electron-webrtc')()
var raf = require('random-access-file')
var signalhub = require('signalhub')
var signatures = require('sodium-signatures')
var Swarm = require('webrtc-swarm')

var signalhubUrl = 'https://exandria-signalhub.herokuapp.com/'

var getDbPath = function (argvDb) {
  return argvDb || './main.nest'
}

var bubbleError = function (from, to, name) {
  from.on('error', function (err) {
    console.log('error:', name)
    to.emit('error', err)
  })
}

var getKeypair = function () {
  var secretPath = './secret.json'
  var keypair
  if (!fs.existsSync(secretPath)) {
    keypair = signatures.keyPair()
    fs.writeFileSync(secretPath, JSON.stringify({
      publicKey: keypair.publicKey.toString('hex'),
      secretKey: keypair.secretKey.toString('hex')
    }))
    return keypair
  }
  keypair = JSON.parse(fs.readFileSync(secretPath))
  return {
    publicKey: Buffer(keypair.publicKey, 'hex'),
    secretKey: Buffer(keypair.secretKey, 'hex')
  }
}

var getFileFeed = function (core, filesPath, keyHex, storageOpts) {
  var key = Buffer(keyHex, 'hex')
  return core.createFeed({
    key: key,
    live: false,
    storage: raf(path.join(filesPath, keyHex), storageOpts)
  })
}

var joinFeedSwarm = function (feed) {
  var keyHex = feed.key.toString('hex')
  var hub = signalhub(keyHex, [signalhubUrl])
  var swarm = Swarm(hub, {wrtc: webrtc})
  debug('looking for swarm', keyHex)
  swarm.on('peer', function (peer) {
    debug('connected to peer', keyHex)
    peer.pipe(feed.replicate()).pipe(peer)
  })
}

module.exports.signalhubUrl = signalhubUrl
module.exports.bubbleError = bubbleError
module.exports.getDbPath = getDbPath
module.exports.getKeypair = getKeypair
module.exports.getFileFeed = getFileFeed
module.exports.joinFeedSwarm = joinFeedSwarm
