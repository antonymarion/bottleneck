global.TEST = true
var Bottleneck = require('../lib/index.js')
var assert = require('assert')

module.exports = function (options) {
  var mustEqual = function (a, b) {
    var strA = JSON.stringify(a)
    var strB = JSON.stringify(b)
    if (strA !== strB) {
      console.log(strA + ' !== ' + strB, (new Error('').stack))
      assert(strA === strB)
    }
  }

  // OTHERS
  var start = Date.now()
  var calls = []
  var limiter = new Bottleneck(options)
  var getResults = function () {
    return {
      elapsed: Date.now() - start,
      callsDuration: calls.length > 0 ? calls[calls.length - 1].time : null,
      calls: calls
    }
  }

  var context = {
    job: function (err, ...result) {
      var cb = result.pop()
      calls.push({err: err, result: result, time: Date.now()-start})
      if (process.env.DEBUG) console.log(result, calls)
      cb.apply({}, [err].concat(result))
    },
    promise: function (err, ...result) {
      return new Promise(function (resolve, reject) {
        if (process.env.DEBUG) console.log('In c.promise. Result: ', result)
        calls.push({err: err, result: result, time: Date.now()-start})
        if (process.env.DEBUG) console.log(result, calls)
        if (err == null) {
          return resolve(result)
        } else {
          return reject(err)
        }
      })
    },
    slowPromise: function (duration, err, ...result) {
      return new Promise(function (resolve, reject) {
        setTimeout(function () {
          if (process.env.DEBUG) console.log('In c.slowPromise. Result: ', result)
          calls.push({err: err, result: result, time: Date.now()-start})
          if (process.env.DEBUG) console.log(result, calls)
          if (err == null) {
            return resolve(result)
          } else {
            return reject(err)
          }
        }, duration)
      })
    },
    pNoErrVal: function (promise, ...expected) {
      if (process.env.DEBUG) console.log('In c.pNoErrVal. Expected:', expected)
      promise.then(function (actual) {
        mustEqual(actual, expected)
      }).catch(function (err) {
        console.error(err)
      })
    },
    noErrVal: function (...expected) {
      return function (err, ...actual) {
        mustEqual(err, null)
        mustEqual(actual, expected)
      }
    },
    last: function (cb, options) {
      var opt = options != null ? options : {}
      limiter.submit(opt, function (cb) {cb(null, getResults())}, cb)
    },
    limiter: limiter,
    mustEqual: mustEqual,
    mustExist: function (a) { assert(a != null) },
    results: getResults,
    checkResultsOrder: function (order) {
      mustEqual(order.length, calls.length)
      for (var i = 0; i < Math.max(calls.length, order.length); i++) {
        mustEqual(order[i], calls[i].result)
      }
    },
    checkDuration: function (shouldBe) {
      var results = getResults()
      var min = shouldBe - 10
      var max = shouldBe + 50
      if (!(results.callsDuration > min && results.callsDuration < max)) {
        console.error('Duration not around ' + shouldBe + '. Was ' + results.callsDuration)
      }
      assert(results.callsDuration > min && results.callsDuration < max)
    }
  }

  return context
}
