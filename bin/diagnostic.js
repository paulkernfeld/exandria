#!/usr/bin/env node

var timers = require('timers')

var hypercore = require('hypercore')
var memdb = require('memdb')

var utils = require('../lib/utils')

var nRemaining = 0
var finish = function () {
  nRemaining--
  if (nRemaining === 0) {
    process.exit()
  }
}

var diagnose = function (name, timeout, doWork) {
  var done = false
  nRemaining++

  var workCb = function (err) {
    if (err) {
      console.log(name, 'failed', err)
    } else {
      console.log(name, 'succeeded')
    }
    done = true
    finish()
  }

  doWork(workCb)
  timers.setTimeout(function () {
    if (!done) {
      console.log(name, 'timed out')
      finish()
    }
  }, timeout)
}

diagnose('Connect to swarm', 30000, function (cb) {
  var core = hypercore(memdb())
  var feedKey = '17e21c55e5405e76726640352a1c5ee8e317866e838ec14e33f74a162241bedc'
  var feed = core.createFeed(feedKey)
  var swarm = utils.joinFeedSwarm(feed)
  swarm.once('peer', function () {
    feed.close()
    cb()
  })
})
