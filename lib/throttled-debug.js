var _ = require('lodash')

var throttledDebug = function (debug, opts) {
  var lastString
  var lastTime = 0

  opts = _.defaults(opts, {interval: 1000})

  return function () {
    var currentTime = process.hrtime()[0]
    if (lastString !== arguments[0] || currentTime >= lastTime + opts.interval) {
      lastString = arguments[0]
      lastTime = currentTime
      debug.apply(debug, arguments)
    }
  }
}

module.exports = throttledDebug
