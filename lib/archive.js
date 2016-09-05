var assert = require('assert')
var fs = require('fs')
var mkdirp = require('mkdirp')
var path = require('path')
var timers = require('timers')

var async = require('async')
var deasync = require('deasync')
var debug = require('debug')('exandria')
var raf = require('random-access-file')
var temp = require('temp').track()

var utils = require('./utils')

var getArchivesDirPath = function (argvDb) {
  var dirPath = path.join(utils.getDbPath(argvDb), 'archives')
  mkdirp.sync(dirPath)
  return dirPath
}

function Archive (archive) {
  if (!(this instanceof Archive)) return new Archive(archive)

  this.archive = archive
}

Archive.prototype.close = function (cb) {
  this.archive.close(cb)
}

Archive.prototype.waitDone = function (timeout, cb) {
  var self = this

  // TODO: reset timeout on download
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

  self.archive.list(function (err) {
    assert.ifError(err)

    var rs = self.archive.content.createReadStream({live: false})
    rs.on('data', function () {})
    rs.on('end', imDone)
  })
}

Archive.prototype.name = function (archiveName, namedDir, archivesDir, cb) {
  namedDir = path.resolve(process.cwd(), namedDir)
  archivesDir = path.resolve(process.cwd(), archivesDir)

  var keyHex = this.archive.key.toString('hex')
  var archivePath = path.join(archivesDir, keyHex)

  assert(fs.statSync(archivePath).isDirectory())
  mkdirp.sync(namedDir)
  var namedPath = path.join(namedDir, archiveName)
  try {
    fs.unlinkSync(namedPath)
  } catch (e) {
    // Fine if no link was there already
  }
  var pathToOriginal = path.relative(namedDir, archivePath)
  assert(fs.statSync(path.resolve(namedDir, pathToOriginal)).isDirectory())
  fs.symlinkSync(pathToOriginal, namedPath)
  cb()
}

var makeArchive = function (drive, archivesDir, files, cb) {
  assert(files.length, 'No files found')

  // Make the new archive in a temp directory
  var tmpDirPath = temp.mkdirSync()
  var archive = drive.createArchive({
    live: false,
    file: function (name) {
      return raf(path.join(tmpDirPath, name))
    }
  })

  // Add all matching files into the archive
  deasync(async.map)(files, function (filePath, cb) {
    var ws = archive.createFileWriteStream(filePath)
    fs.createReadStream(filePath).pipe(ws)
    ws.on('end', cb)
  })

  // Compute the content hash of the archive
  deasync(archive.finalize).call(archive)

  // Move the archive from the temp folder into a folder named w/ the content hash
  // of the archive.
  var archivePath = path.join(archivesDir, archive.key.toString('hex'))
  if (fs.existsSync(archivePath)) {
    console.log('archive path already exists, skipping archive creation')
  } else {
    fs.renameSync(tmpDirPath, archivePath)
  }

  deasync(archive.close).call(archive)
  cb(null, archive.key)
}

var getArchive = function (drive, archivesDir, key) {
  var archive = drive.createArchive(key, {
    live: false,
    file: function (name) {
      return raf(path.join(archivesDir, key.toString('hex'), name))
    }
  })

  archive.once('download-finished', function () {
    debug('archive downloaded', key.toString('hex'))
  })
  return Archive(archive)
}

module.exports.getArchivesDirPath = getArchivesDirPath
module.exports.Archive = Archive
module.exports.makeArchive = makeArchive
module.exports.getArchive = getArchive
