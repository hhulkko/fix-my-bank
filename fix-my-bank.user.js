// ==UserScript==
// @name Fix my bank
// @include https://solo1.nordea.fi/nsp*
// @require https://ajax.googleapis.com/ajax/libs/jquery/1.5.0/jquery.min.js
// @require https://github.com/hhulkko/fix-my-bank/raw/master/js/rx.js
// @require https://github.com/hhulkko/fix-my-bank/raw/master/js/rx.jQuery.js
// @require https://github.com/hhulkko/fix-my-bank/raw/master/js/rx.html.js
// @require https://github.com/hhulkko/fix-my-bank/raw/master/js/rx.aggregates.js
// @require https://github.com/hhulkko/fix-my-bank/raw/master/js/rx.joins.js
// ==UserScript==

$(document).ready(function() {
  $('<style type="text/css">.hh-highlight {background: yellow !important;}</style>').appendTo('head')

  var rx = Rx.Observable
  var key = { j:74, k:75, m:77, enter:13 }

  var paymentTemplates = keyUps(key.m).Where(ctrlDown)
  var enter            = keyUps(key.enter).Where(ctrlDown)
  var down             = keyUps(key.j).Where(ctrlDown).Select(always(1))
  var up               = keyUps(key.k).Where(ctrlDown).Select(always(-1))

  var loadPaymentTemplates = paymentTemplates
    .Select(always(document))
    .SelectMany(find("a:contains('Muut maksuasiat')"))
    .SelectMany(href)
    .SelectMany(loadHtml)
    .SelectMany(find("a:contains('Maksupohjat')"))
    .SelectMany(href)
    .SelectMany(loadHtml)
    .SelectMany(find('#paymentlogsearch'))
    .Select(serializeForm)
    .SelectMany(post)

  var rows = $('#paymentlogsearch').find("tr:has(a:contains('Muuta'))")
  var selectedPayment = down.Merge(up)
    .Scan(-1, function(total, x) { return total + x })
    .Select(asIndexOf(rows))
    .Select(function(i) { return rows[i] })
    .Replay()

  var paymentOnEnter = selectedPayment.TakeUntil(enter).Final()
    .SelectMany(find("a:contains('Muuta')"))
    .SelectMany(href)
    .OnErrorResumeNext()
    .Repeat()

  loadPaymentTemplates.Subscribe(justReloadThePage)
  selectedPayment.Subscribe(highlight)
  selectedPayment.Zip(selectedPayment.Skip(1), fst).Subscribe(unhighlight)
  paymentOnEnter.Subscribe(gotoUrl)

  selectedPayment.Connect()

  // String -> Observable String
  function loadHtml(url) {
    return $.ajaxAsObservable({url: url, dataType: 'html'})
      .Select(function(d) { return d.data == undefined ? '' : d.data })
      .Catch(rx.Return('error'))
  }

  // element -> Observable String
  function href(e) { return option($(e).attr('href')) }

  // a -> Observable a
  function option(x) {
    if (isDefined(x)) return rx.Return(x)
    else return rx.Empty()
  }

  // String -> (String -> Observable element)
  function find(selector) {
     return function(doc) {
      return option($(doc).find(selector))
    }
  }

  // (String, String) -> Observable Response
  function post(f) {
    return $.postAsObservable(f.url, f.data)
  }

  function serializeForm(f) { return { url: f.attr('action'), data: f.serialize() } }
  function ctrlDown(e) { return e.keyCode == 17 || e.ctrlKey == 1 }
  function keyUps(code) { return keyUpsOn($(document), code) }
  function keyUpsOn(elem, code) { return elem.toObservable("keyup").Where(function(e) { return e.keyCode == code }) }
  function always(x) { return function() { return x }}
  function asIndexOf(e) { return function(x) { return (e.length + (x % e.length)) % e.length }}
  function fst(x, y) { return x }
  function highlight(elem) { $(elem).addClass('hh-highlight') }
  function unhighlight(elem) { $(elem).removeClass('hh-highlight') }
  function trace(x) { GM_log(x) }
  function gotoUrl(u) { window.location.replace(u) }
  function justReloadThePage() { window.location.reload() }
  function isDefined(x) { return typeof x != 'undefined' }
})
