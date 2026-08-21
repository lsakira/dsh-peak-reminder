// DeepSeek Harness (dsh) client plugin: peak-hour reminder + mode indicator + balance card.
// 浏览器端：按北京时间每 5 分钟检查一次；
//   1) 距高峰开始 ≤10 分钟时，弹网页右下角通知条 + 系统通知（仅提醒，绝不强制）
//   2) 左下角常驻"模式指示灯"：梁文峰（高峰·精简）/ 梁文谷（非高峰·正常）
//   3) 指示灯上方"余额卡片"：每 5 分钟从 /dsh-balance 拉一次余额显示
//
// 手写 lazy-CJS bundle 协议（window.__ModuleLoader__.load + factory），
// 与 modlens 同款结构：无构建步骤、不依赖 dsh 客户端包。
window.__ModuleLoader__.load({
  id: '@local/dsh-peak-reminder',
  factory: (require) => {
    var module = { exports: {} }
    var exports = module.exports

    // ═════════════════════════════════════════════════════════════
    //  ⚙️ 用户设置区：改这里的数字和文字就行，不用懂代码
    // ═════════════════════════════════════════════════════════════
    var ADVANCE_MIN = 10 // 提前几分钟提醒（高峰开始前几分钟弹出提醒）
    var REMIND_TITLE = '梁文峰要来了' // 提醒的标题
    var REMIND_TEXT = '建议停下手头上的工作，等待梁文谷回归。' // 提醒的具体内容
    var BALANCE_RED_BELOW = 2 // 余额低于多少元时，余额卡片变红提醒充值
    // ═════════════════════════════════════════════════════════════

    // 高峰时段（北京时间，一般不用改）：9:00-12:00 与 14:00-18:00
    var WINDOWS = [
      { start: 9 * 60, end: 12 * 60 },
      { start: 14 * 60, end: 18 * 60 },
    ]
    var CHECK_MS = 5 * 60 * 1000 // 检查间隔（毫秒），一般不用改
    var TOAST_MS = 10000 // 提醒条显示时长（毫秒），一般不用改
    var reminded = {}

    function get(parts, type) {
      var p = parts.find(function (x) { return x.type === type })
      return p ? parseInt(p.value, 10) : 0
    }

    function beijingNow() {
      var parts
      try {
        parts = new Intl.DateTimeFormat('en-US', {
          timeZone: 'Asia/Shanghai',
          hourCycle: 'h23',
          hour: '2-digit', minute: '2-digit', second: '2-digit',
          year: 'numeric', month: '2-digit', day: '2-digit',
        }).formatToParts(new Date())
      } catch (e) {
        return null
      }
      return {
        y: get(parts, 'year'), mo: get(parts, 'month'), d: get(parts, 'day'),
        h: get(parts, 'hour'), m: get(parts, 'minute'),
      }
    }

    function minutesOf(now) { return now.h * 60 + now.m }
    function dateKey(now) { return now.y + '-' + now.mo + '-' + now.d }
    function inPeak(mins) {
      return WINDOWS.some(function (w) { return mins >= w.start && mins < w.end })
    }

    // ---------- 模式指示灯（左下角常驻） ----------
    function ensureBadge() {
      if (document.getElementById('peak-mode-badge')) return
      var b = document.createElement('div')
      b.id = 'peak-mode-badge'
      b.style.cssText =
        'position:fixed;left:96px;bottom:14px;z-index:2147483646;padding:4px 12px;' +
        'border-radius:999px;font:12px/1.5 system-ui,sans-serif;letter-spacing:.5px;' +
        'box-shadow:0 2px 8px rgba(0,0,0,.25);user-select:none;pointer-events:none;' +
        'opacity:.9;transition:background .3s,color .3s'
      document.body.appendChild(b)
    }

    function updateBadge(now) {
      ensureBadge()
      var b = document.getElementById('peak-mode-badge')
      if (!b) return
      if (inPeak(minutesOf(now))) {
        b.textContent = '梁文峰 · 高峰'
        b.style.background = '#7f1d1d'
        b.style.color = '#fecaca'
        b.style.border = '1px solid #991b1b'
      } else {
        b.textContent = '梁文谷 · 非高峰'
        b.style.background = '#14532d'
        b.style.color = '#bbf7d0'
        b.style.border = '1px solid #166534'
      }
    }

    // ---------- 余额卡片（指示灯上方） ----------
    function ensureBalanceCard() {
      if (document.getElementById('peak-balance-card')) return
      var c = document.createElement('div')
      c.id = 'peak-balance-card'
      c.style.cssText =
        'position:fixed;left:96px;bottom:46px;z-index:2147483646;padding:4px 10px;' +
        'border-radius:8px;font:12px/1.5 system-ui,sans-serif;' +
        'background:#111827;border:1px solid #374151;color:#9ca3af;' +
        'box-shadow:0 2px 8px rgba(0,0,0,.25);user-select:none;pointer-events:none;' +
        'opacity:.9'
      document.body.appendChild(c)
    }

    function renderBalance(d) {
      ensureBalanceCard()
      var c = document.getElementById('peak-balance-card')
      if (!c) return
      if (d && d.ok && d.balance != null) {
        var symbol = d.currency === 'CNY' ? '¥' : (d.currency ? d.currency + ' ' : '')
        var value = parseFloat(d.balance)
        c.textContent = '余额 ' + symbol + d.balance
        c.style.color = '#4ade80'
        if (!isNaN(value) && value < BALANCE_RED_BELOW) {
          c.style.background = '#7f1d1d'
          c.style.border = '1px solid #991b1b'
        } else {
          c.style.background = '#111827'
          c.style.border = '1px solid #374151'
        }
      } else {
        c.textContent = '余额 --'
        c.style.color = '#f87171'
        c.style.background = '#111827'
        c.style.border = '1px solid #374151'
      }
    }

    function refreshBalance() {
      ensureBalanceCard()
      fetch('/dsh-balance', { headers: { accept: 'application/json' } })
        .then(function (r) { return r.json() })
        .then(function (d) { renderBalance(d) })
        .catch(function () { renderBalance(null) })
    }

    // ---------- 提醒 ----------
    function ensureToastStyle() {
      if (document.getElementById('peak-reminder-style')) return
      var style = document.createElement('style')
      style.id = 'peak-reminder-style'
      style.textContent = [
        '#peak-reminder-toast{position:fixed;right:16px;bottom:16px;z-index:2147483647;max-width:340px;padding:14px 16px;border-radius:10px;box-shadow:0 4px 16px rgba(0,0,0,.3);font:13px/1.7 system-ui,sans-serif;color:#fff;background:#1f2937;border:1px solid #374151;opacity:0;transform:translateY(8px);transition:opacity .25s,transform .25s}',
        '#peak-reminder-toast.show{opacity:1;transform:none}',
        '#peak-reminder-toast b{font-size:15px}',
      ].join('')
      document.head.appendChild(style)
    }

    function showToast() {
      ensureToastStyle()
      var old = document.getElementById('peak-reminder-toast')
      if (old) old.remove()
      var el = document.createElement('div')
      el.id = 'peak-reminder-toast'
      var title = document.createElement('b')
      title.textContent = REMIND_TITLE
      el.appendChild(title)
      el.appendChild(document.createElement('br'))
      el.appendChild(document.createTextNode(REMIND_TEXT))
      document.body.appendChild(el)
      requestAnimationFrame(function () { el.classList.add('show') })
      setTimeout(function () {
        el.classList.remove('show')
        setTimeout(function () { el.remove() }, 300)
      }, TOAST_MS)
    }

    function systemNotify() {
      if (typeof Notification === 'undefined') return
      if (Notification.permission === 'default') {
        try { Notification.requestPermission() } catch (e) {}
        return
      }
      if (Notification.permission === 'granted') {
        try {
          new Notification(REMIND_TITLE, {
            body: REMIND_TEXT,
          })
        } catch (e) {}
      }
    }

    function remind() {
      showToast()
      systemNotify()
    }

    function tick() {
      var now = beijingNow()
      if (!now) return
      var key = dateKey(now)
      var mins = minutesOf(now)
      WINDOWS.forEach(function (w, i) {
        if (mins >= w.start - ADVANCE_MIN && mins < w.start) {
          var rk = key + ':' + i
          if (!reminded[rk]) {
            reminded[rk] = true
            remind()
          }
        }
        if (mins >= w.start) {
          delete reminded[key + ':' + i]
        }
      })
      for (var k in reminded) {
        if (k.indexOf(key) !== 0) delete reminded[k]
      }
      updateBadge(now)
      refreshBalance()
    }

    function apply(ctx) {
      tick()
      var timer = setInterval(tick, CHECK_MS)
      if (typeof ctx.effect === 'function') {
        ctx.effect(function () {
          return function () {
            clearInterval(timer)
            var b = document.getElementById('peak-mode-badge')
            if (b) b.remove()
            var c = document.getElementById('peak-balance-card')
            if (c) c.remove()
          }
        }, 'dsh-peak-reminder: timer')
      }
    }

    exports.apply = apply
    exports.inject = []
    return module.exports
  },
})
