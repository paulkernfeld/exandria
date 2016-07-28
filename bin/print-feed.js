#!/usr/bin/env node
var hypercore = require('hypercore')
var argv = require('minimist')(process.argv.slice(2))

var Feed = require('../lib/feed')
var identities = require('../lib/identities')
var NestLevels = require('../lib/nest-levels')
var utils = require('../lib/utils')

var nest = NestLevels(utils.getDbPath(argv.db))
var core = hypercore(nest.db('hypercore'))

var feedKey = identities.getKeypair().publicKey
if (argv._[0]) {
  feedKey = Buffer(argv._[0], 'hex')
}

var feed = Feed.Feed(core, {key: feedKey})

console.log('Feed:', feedKey.toString('hex'))
console.log()

feed.read().on('data', function (decoded) {
  console.log('Type:', decoded.type)
  console.log('Name:', decoded.message.name)
  console.log('Hash:', decoded.message.hash.toString('hex'))
  console.log()
})
