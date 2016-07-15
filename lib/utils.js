var fs = require('fs')
var path = require('path')

var debug = require('debug')('exandria')
var Swarm = require('discovery-swarm')
var raf = require('random-access-file')
var signatures = require('sodium-signatures')
var sprintf = require('sprintf-js').sprintf

var messages = require('./messages')

var getDbPath = function (argvDb) {
  return argvDb || './main.nest'
}

var getArchivesDirPath = function (argvDb) {
  return path.join(getDbPath(argvDb), 'archives')
}

var bubbleError = function (from, to, name) {
  from.on('error', function (err) {
    console.log('error:', name)
    to.emit('error', err)
  })
}

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

var getArchive = function (drive, archivesPath, key) {
  return drive.createArchive({
    key: key,
    live: false,
    file: function (name) {
      return raf(path.join(archivesPath, key.toString('hex'), name))
    }
  })
}

var makeSwarm = function (key) {
  var swarm = Swarm()
  swarm.listen()
  swarm.join(key)
  return swarm
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
  debug('looking for swarm', keyHex, 'i am', swarm.id.toString('hex'))

  swarm.on('connection', function (peer, peerInfo) {
    debug(
      'connection to',
      peerInfo.host,
      peerInfo.port,
      peerInfo.id.toString('hex'),
      keyHex
    )
    feed.on('upload', function (block, data) {
      debug('uploaded', data.length, 'bytes', keyHex)
    })
    feed.on('download', function (block, data) {
      debug('downloaded', data.length, 'bytes', keyHex)
    })
    feed.on('download-finished', function () {
      debug('download finished', keyHex)
    })
    peer.pipe(feed.replicate()).pipe(peer)
  })
  swarms[keyHex] = swarm
  return swarm
}

module.exports.bubbleError = bubbleError
module.exports.decodeMessage = decodeMessage
module.exports.getDbPath = getDbPath
module.exports.getArchivesDirPath = getArchivesDirPath
module.exports.getKeypair = getKeypair
module.exports.getArchive = getArchive
module.exports.makeSwarm = makeSwarm
module.exports.joinSwarm = joinSwarm
