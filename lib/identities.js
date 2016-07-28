var fs = require('fs')

var BurnStream = require('burn-stream')
var debug = require('debug')('exandria')
var EventEmitter = require('events')
var inherits = require('inherits')
var signatures = require('sodium-signatures')
var through2 = require('through2')

var utils = require('./utils')

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

function IdentityStream (nest) {
  if (!(this instanceof IdentityStream)) return new IdentityStream(nest)
  EventEmitter.call(this)

  // Load the config from a JSON file
  var config = JSON.parse(fs.readFileSync('app-config.json'))
  debug('config', config)

  // Log data out when we get it
  this.burnStream = BurnStream({
    config: config,
    db: nest.db('burn-stream')
  })

  var transform = function (data, enc, next) {
    if (data.message[0] !== 0) {
      debug('skipping bad version:', data.message.toString('hex'))
      return next()
    }
    var key = data.message.slice(1)
    if (key.length !== 32) {
      debug('skipping wrong-length key', data.message.toString('hex'))
      return next()
    }
    this.push({
      key: key,
      burnStream: data
    })
    next()
  }
  this.stream = through2.obj(transform)
  this.burnStream.stream.pipe(this.stream)

  utils.bubbleError(this.stream, this, 'transform stream')
  utils.bubbleError(this.burnStream.stream, this, 'burn-stream')
}
inherits(IdentityStream, EventEmitter)

IdentityStream.prototype.start = function () {
  this.burnStream.start()
}

module.exports.getKeypair = getKeypair
module.exports.IdentityStream = IdentityStream
