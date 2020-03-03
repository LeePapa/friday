import Hapi, { Request, ResponseToolkit }    from '@hapi/hapi'
import {
  Wechaty,
  UrlLink,
  UrlLinkPayload,
}                   from 'wechaty'

import {
  log,
  PORT,
  VERSION,
}             from './config'

import { Chatops } from './chatops'

async function webhookHandler (
  request: Request,
  h: ResponseToolkit,
) {
  log.info('startWeb', 'webhookHandler()')

  let payload: UrlLinkPayload

  switch (request.method) {
    case 'get':
      payload = { ...request.query } as any
      break

    case 'post':
      payload = request.payload as any
      break

    default:
      throw Error(`method is neither get nor post: ${request.method}`)
  }

  const urlLink = new UrlLink(payload)

  await Chatops.instance().homeBraodcast(urlLink)

  const html = [
    'webhook succeed!',
    JSON.stringify(payload),
  ].join('<hr />')

  return h.response(html)
}

async function chatopsHandler (request: Request, response: ResponseToolkit) {
  log.info('startWeb', 'chatopsHandler()')

  const payload: {
    chatops: string,
  } = request.payload as any

  await Chatops.instance().say(payload.chatops)

  return response.redirect('/')
}

export async function startWeb (bot: Wechaty): Promise<void> {
  log.verbose('startWeb', 'startWeb(%s)', bot)

  let qrcodeValue : undefined | string
  let userName    : undefined | string

  const server =  new Hapi.Server({
    port: PORT,
  })

  const FORM_HTML = `
    <form action="/chatops/" method="post">
      <label for="chatops">ChatOps: </label>
      <input id="chatops" type="text" name="chatops" value="Hello, BOT5.">
      <input type="submit" value="ChatOps">
    </form>
  `
  const rootHandler = async () => {
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
      let roomList = await bot.Room.findAll()
      let roomHtml = `The rooms I have joined are as follows: <ol>`
      for (let room of roomList) {
        const topic = await room.topic()
        const roomId = room.id
        roomHtml = roomHtml + `<li> ${topic} / ${roomId} </li>\n`
      }
      roomHtml = roomHtml + `</ol>`

      html = [
        `<p> BOT5 v${VERSION} User ${userName} logined. </p>`,
        FORM_HTML,
        roomHtml,
      ].join('')

    } else {

      html = `BOT5 v${VERSION} Hello, come back later please.`

    }
    return html
  }

  const rootRoute = {
    handler: rootHandler,
    method : 'GET',
    path   : '/',
  }

  const chatopsRoute = {
    handler: chatopsHandler,
    method : 'POST',
    path   : '/chatops/',
  }

  const webhookRoute = {
    handler: webhookHandler,
    method : ['GET', 'POST'],
    path   : '/webhook/',
  }

  const routeList = [
    rootRoute,
    chatopsRoute,
    webhookRoute,
  ]

  server.route(routeList)

  bot.on('scan', qrcode => {
    qrcodeValue = qrcode
    userName    = undefined
  })
  bot.on('login', user => {
    qrcodeValue = undefined
    userName    = user.name()
  })
  bot.on('logout', () => {
    userName = undefined
  })

  await server.start()
  log.info('startWeb', 'startWeb() listening to http://localhost:%d', PORT)
}
