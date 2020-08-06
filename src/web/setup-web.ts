import http from 'http'

import express from 'express'

import {
  Wechaty,
  log,
}                   from 'wechaty'

import {
  WEB_PORT,
  VERSION,
}             from '../config'

import { FRIDAY_ROOM_ID } from '../database'

type Stopper = () => void

export async function startWeb (wechaty: Wechaty): Promise<Stopper> {
  log.verbose('startWeb', 'startWeb(%s)', wechaty)

  let qrcodeValue : undefined | string
  let userName    : undefined | string

  const app =  express()

  const FORM_HTML = `
    <form action="/chatops/" method="post">
      <label for="chatops">ChatOps: </label>
      <input id="chatops" type="text" name="chatops" value="Hello, BOT5.">
      <input type="submit" value="ChatOps">
    </form>
  `
  const rootHandler = async (_req: express.Request, res: express.Response) => {
    let html

    if (qrcodeValue) {

      html = [
        `<h1>BOT5 v${VERSION}</h1>`,
        'Scan QR Code: <br />',
        qrcodeValue + '<br />',
        '<a href="http://goqr.me/" target="_blank">http://goqr.me/</a><br />',
        '\n\n',
        '<image src="',
        'https://api.qrserver.com/v1/create-qr-code/?data=',
        encodeURIComponent(qrcodeValue),
        '">',
      ].join('')

    } else if (userName) {
      const roomList = await wechaty.Room.findAll()
      let roomHtml = 'The rooms I have joined are as follows: <ol>'
      for (const room of roomList) {
        const topic = await room.topic()
        const roomId = room.id
        roomHtml = roomHtml + `<li> ${topic} / ${roomId} </li>\n`
      }
      roomHtml = roomHtml + '</ol>'

      html = [
        `<p> BOT5 v${VERSION} User ${userName} logged in. </p>`,
        FORM_HTML,
        roomHtml,
      ].join('')

    } else {

      html = `BOT5 v${VERSION} Hello, come back later please.`

    }
    res.end(html)
  }

  app.get('/', rootHandler)
  app.get('/chatops/', chatopsHandler)

  wechaty.on('scan', qrcode => {
    qrcodeValue = qrcode
    userName    = undefined
  })
  wechaty.on('login', user => {
    qrcodeValue = undefined
    userName    = user.name()
  })
  wechaty.on('logout', () => {
    userName = undefined
  })

  const server = http.createServer(app).listen(WEB_PORT)

  log.info('startWeb', 'startWeb() listening to http://localhost:%d', WEB_PORT)

  return () => server.close()

  async function chatopsHandler (request: express.Request, response: express.Response) {
    log.info('startWeb', 'chatopsHandler()')

    const payload: {
      chatops: string,
    } = request.params as any

    if (wechaty) {
      await wechaty.Room.load(FRIDAY_ROOM_ID).say(payload.chatops)
    }

    return response.redirect('/')
  }

}
