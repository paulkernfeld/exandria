#!/usr/bin/env node

var hypercore = require('hypercore')
var argv = require('minimist')(process.argv.slice(2))

var NestLevels = require('../lib/nest-levels')
var utils = require('../lib/utils')

var nest = NestLevels(utils.getDbPath(argv.db))
var core = hypercore(nest.db('hypercore'))
var feedKey = Buffer(argv._[0], 'hex')

var feed = core.createFeed(feedKey)
utils.joinSwarm(feed, {})
