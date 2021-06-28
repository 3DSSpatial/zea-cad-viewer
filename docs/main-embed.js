import { Logger } from './Logger.js'
import { ChannelMessenger } from './ChannelMessenger.js'

const logger = new Logger('output')

const viewer = document.getElementById('zea-svelte-app')
const client = new ChannelMessenger(viewer)
let loaded = false
client.on('ready', (data) => {
  logger.log('Ready')
  loaded = true
})

const setupLoadBtn = (name, url) => {
  const btn = document.getElementById(name)
  btn.addEventListener('click', () => {
    client
      .do('loadCADFile', {
        url,
      })
      .then((data) => {
        logger.logJson('modelStructure', data)
      })
  })
}
setupLoadBtn('Gearbox', `/data/gear_box_final_asm-visu.zcad`)
setupLoadBtn(
  'Hospital_Structural',
  '/data/Hospital/Autodesk_Hospital_Structural.zcad'
)
setupLoadBtn('Hospital_HVAC', '/data/Hospital/Autodesk_Hospital_HVAC.zcad')

/* Background color */
const colorPicker = document.getElementById('background-color')

colorPicker.addEventListener('input', (event) => {
  const backgroundColor = event.target.value
  if (loaded) {
    client.do('setBackgroundColor', { color: backgroundColor })
  }
})

client.on('ready', (data) => {
  client.do('getModelStructure').then((data) => {
    logger.logJson('getModelStructure:', data)
  })
})

client.on('selectionChanged', (data) => {
  logger.logJson('selectionChanged:', data)
})
