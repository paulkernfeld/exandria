var crypto = require('crypto')
var fs = require('fs')
var path = require('path')

var deasync = require('deasync')
var hyperdrive = require('hyperdrive')
var memdb = require('memdb')
var toArray = require('stream-to-array')
var tape = require('tape')
var temp = require('temp').track()

var Archive = require('../lib/archive')

tape('getArchivesDirPath', function (t) {
  t.same(Archive.getArchivesDirPath(), 'main.nest/archives')
  t.end()
})

tape('make, get, and name archive', function (t) {
  var drive = hyperdrive(memdb())
  var archivesDir = temp.mkdirSync()
  var namedDir = temp.mkdirSync()

  // Make a new archive
  var expected = fs.readFileSync('./README.md')
  var archive1Hash = deasync(Archive.makeArchive)(drive, archivesDir, ['./README.md'])
  t.ok(archive1Hash, 'archive 1 hash')
  var pathInArchive = path.join(archivesDir, archive1Hash.toString('hex'), 'README.md')
  t.same(fs.readFileSync(pathInArchive), expected, 'saved file matches')

  // Get the same archive
  var archive2 = Archive.getArchive(drive, archivesDir, archive1Hash)
  t.ok(archive2, 'archive 2')

  var entries = deasync(archive2.archive.list).call(archive2.archive)
  t.same(entries.length, 1, 'single entry')

  var arr = deasync(toArray)(archive2.archive.createFileReadStream(entries[0]))
  t.ok(arr.length, 'README has array items')
  t.same(arr[0], expected, 'file stream matches')

  // Name the archive w/ a symlinked directory
  deasync(archive2.name).call(archive2, 'myArchive', namedDir, archivesDir)
  t.ok(fs.statSync(path.join(namedDir, './myArchive')).isDirectory(), 'named archive is dir')
  var named = fs.readFileSync(path.join(namedDir, './myArchive/README.md'))
  t.same(named, expected, 'named file matches')

  deasync(archive2.close).call(archive2)

  t.end()
})

tape('wait done', function (t) {
  var drive = hyperdrive(memdb())
  var archivesDir = temp.mkdirSync()
  var archive1Hash = deasync(Archive.makeArchive)(drive, archivesDir, ['./README.md'])
  var archive2 = Archive.getArchive(drive, archivesDir, archive1Hash)

  t.plan(2)
  archive2.waitDone(100, function (err) {
    t.error(err)
  })

  var archive3 = Archive.getArchive(drive, archivesDir, crypto.randomBytes(32))
  archive3.waitDone(100, function (err) {
    t.ok(err)
  })
})
