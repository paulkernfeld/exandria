var join = require('path').join

var mkdirp = require('mkdirp')
var levelup = require('levelup')

function NestLevels (path) {
  if (!(this instanceof NestLevels)) return new NestLevels(path)
  this.path = path

  this.dbs = {}
  this.subnests = {}

  mkdirp.sync(path)
}

NestLevels.prototype.db = function (path) {
  if (!this.dbs[path]) {
    this.dbs[path] = levelup(join(this.path, path))
  }
  return this.dbs[path]
}

NestLevels.prototype.subnest = function (path) {
  if (!this.subnests[path]) {
    this.subnests[path] = NestLevels(join(this.path, path))
  }
  return this.subnests[path]
}

module.exports = NestLevels
