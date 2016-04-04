var fs = require('fs')

var BurnStream = require('burn-stream')
var debug = require('debug')('exandria')
var through2 = require('through2')

function IdentityStream (nest) {
  if (!(this instanceof IdentityStream)) return new IdentityStream(nest)
  // Load the config from a JSON file
  var config = JSON.parse(fs.readFileSync('app-config.json'))
  debug('config', config)

  // Log data out when we get it
  this.bs = BurnStream({
    config: config,
    db: nest.db('burn-stream')
  })

  var transform = function (data, enc, next) {
    debug('data', data)
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
  this.bs.stream.pipe(this.stream)
}

IdentityStream.prototype.start = function () {
  this.bs.start()
}
module.exports.IdentityStream = IdentityStream
