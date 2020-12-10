import {
  Wechaty,
  log,
}               from 'wechaty'

import { countRoomMembers } from './count-room-members'

import { MetricBots } from './types'

import {
  submitMessagesSentCount,
  submitMessagesReceivedCount,
  submitMembersCount,
}                               from './submitters'

const metrics = {
  mo: 0,
  mt: 0,
}

function startStatusPageMetricUpdater (
  bots: MetricBots,
) {
  Object.values(bots)
    .forEach((bot: Wechaty) => bot.on('message', m => {
      if (m.self()) {
        metrics.mo += 1
      } else {
        metrics.mt += 1
      }
    }))

  setInterval(async () => {
    /**
     * MO / MT
     */
    log.verbose('status-page/updater', 'startUpdater/srtInterval mo/mt: %s/%s', metrics.mo, metrics.mt)
    const future = Promise.all([
      submitMessagesSentCount(metrics.mo),
      submitMessagesReceivedCount(metrics.mt),
    ])
    metrics.mo = 0
    metrics.mt = 0
    await future

    /**
     * Count Members
     */
    const membersNumber = await countRoomMembers(bots)
    await submitMembersCount(membersNumber)
    log.verbose('status-page/updater', 'startUpdater/srtInterval membersNumber: %s', membersNumber)

  }, 60 * 1000)
}

export {
  startStatusPageMetricUpdater,
}
