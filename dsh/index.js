// DeepSeek Harness (dsh) plugin: peak-hour reminder + API balance card.
// 服务端半边：
//   1) 高峰提醒的客户端逻辑在 dsh/client.js（浏览器端）
//   2) 余额查询路由 /dsh-balance：密钥只留在服务端，浏览器只拿到余额数字
export const name = 'dsh-peak-reminder'
export const inject = ['credentials', 'webServer']

const BALANCE_URL = 'https://api.deepseek.com/user/balance'

export function apply(ctx) {
  ctx.webServer.register({
    name: 'dsh-balance',
    kind: 'exact',
    path: '/dsh-balance',
    handler: async (req, res) => {
      const send = (payload) => {
        res.writeHead(200, { 'content-type': 'application/json' })
        res.end(JSON.stringify(payload))
      }
      try {
        const cred = await ctx.credentials.resolve('DEEPSEEK_API_KEY')
        if (!cred || !cred.value) {
          send({ ok: false, error: 'no-key' })
          return
        }
        const ctrl = new AbortController()
        const timer = setTimeout(() => ctrl.abort(), 15000)
        let upstream
        try {
          upstream = await fetch(BALANCE_URL, {
            headers: { Authorization: 'Bearer ' + cred.value },
            signal: ctrl.signal,
          })
        } finally {
          clearTimeout(timer)
        }
        if (!upstream.ok) {
          send({ ok: false, error: 'http-' + upstream.status })
          return
        }
        const data = await upstream.json()
        const info = (data.balance_infos || [])[0] || null
        send({
          ok: true,
          available: !!data.is_available,
          balance: info ? info.total_balance : null,
          currency: info ? info.currency : null,
        })
      } catch (e) {
        send({ ok: false, error: String((e && e.message) || e) })
      }
    },
  })
}
