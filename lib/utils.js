var assert = require('assert')
var fs = require('fs')
var path = require('path')
var timers = require('timers')

var debug = require('debug')('exandria')
var webrtc = require('electron-webrtc')
var raf = require('random-access-file')
var signalhub = require('signalhub')
var signatures = require('sodium-signatures')
var sprintf = require('sprintf-js').sprintf
var Swarm = require('webrtc-swarm')

var messages = require('./messages')

var signalhubUrl = 'https://exandria-signalhub.herokuapp.com/'

var wrtc
var makeWrtc = function () {
  if (!wrtc) wrtc = webrtc()
  return wrtc
}

var getDbPath = function (argvDb) {
  return argvDb || './main.nest'
}

var getArchivesDirPath = function (argvDb) {
  var dirPath = path.join(getDbPath(argvDb), 'archives')
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath)
  }
  return dirPath
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

var getArchive = function (nest, drive, archivesPath, key) {
  var archive = drive.createArchive({
    key: key,
    live: false,
    file: function (name) {
      return raf(path.join(archivesPath, key.toString('hex'), name))
    }
  })

  archive.once('download-finished', function () {
    debug('archive downloaded', key.toString('hex'))
    nest.db('complete-archives').put(archive.key, true, { sync: true })
  })
  return archive
}

var onArchiveDone = function (nest, archive, cb) {
  var db = nest.db('complete-archives')
  db.get(archive.key, function (err, value) {
    if (err) {
      assert(err.notFound)
      archive.once('download-finished', cb)
    } else {
      cb()
    }
  })
}

var waitForArchive = function (nest, archive, cb) {
  var timeout = 30000
  var done = false

  var imDone = function (err) {
    if (!done) {
      done = true
      cb(err)
    }
  }

  timers.setTimeout(function () {
    imDone(new Error('Timeout'))
  }, timeout)

  onArchiveDone(nest, archive, imDone)
}

var downloadArchive = function (nest, archive, archiveName, archivesDir, cb) {
  waitForArchive(nest, archive, function (err) {
    if (err) {
      return cb(err)
    }

    if (typeof archiveName !== 'undefined') {
      if (!fs.existsSync('./archives')) {
        fs.mkdirSync('./archives')
      }
      var linkPath = path.join('./archives', archiveName)
      try {
        fs.unlinkSync(linkPath)
      } catch (e) {}
      fs.symlinkSync(path.join('..', archivesDir, archive.key.toString('hex')), linkPath)
    }
    cb()
  })
}

var makeSwarm = function (key) {
  var hub = signalhub(key, [signalhubUrl])
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
module.exports.decodeMessage = decodeMessage
module.exports.getDbPath = getDbPath
module.exports.getArchivesDirPath = getArchivesDirPath
module.exports.getKeypair = getKeypair
module.exports.getArchive = getArchive
module.exports.waitForArchive = waitForArchive
module.exports.downloadArchive = downloadArchive
module.exports.makeSwarm = makeSwarm
module.exports.joinSwarm = joinSwarm
