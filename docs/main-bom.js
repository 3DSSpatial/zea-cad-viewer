import { Logger } from './Logger.js'
import { ChannelMessenger } from './ChannelMessenger.js'

const logger = new Logger('output')

const viewer = document.getElementById('zea-svelte-app')
const client = new ChannelMessenger(viewer)
let loaded = false
client.on('ready', (data) => {
  logger.log('Ready')
  loaded = true

  const base = document.location.href.substring(
    0,
    document.location.href.lastIndexOf('/')
  )
  client
    .do('loadCADFile', {
      url: base + '/data/CreoTrailer/1000.asm.1.zcad',
    })
    .then((data) => {
      logger.logJson('modelStructure', data)
    })
})

client.on('selectionChanged', (data) => {
  logger.logJson('selectionChanged:', data)
})
