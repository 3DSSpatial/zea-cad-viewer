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
setupLoadBtn(
  'Gearbox',
  document.location.origin + `/data/gear_box_final_asm.zcad`
)
setupLoadBtn(
  'Hospital_Structural',
  document.location.origin + '/data/Hospital/Autodesk_Hospital_Structural.zcad'
)
setupLoadBtn(
  'Hospital_HVAC',
  document.location.origin + '/data/Hospital/Autodesk_Hospital_HVAC.zcad'
)

/* Background color */
document
  .getElementById('background-color')
  .addEventListener('input', (event) => {
    if (loaded) {
      client.do('setBackgroundColor', { color: event.target.value })
    }
  })

document
  .getElementById('highlight-color')
  .addEventListener('input', (event) => {
    if (loaded) {
      console.log('setHighlightColor')
      client.do('setHighlightColor', { color: event.target.value })
    }
  })
document.getElementById('render-modes').addEventListener('change', (event) => {
  if (loaded) {
    client.do('setRenderMode', { mode: event.target.value })
  }
})
document.getElementById('camera-modes').addEventListener('change', (event) => {
  if (loaded) {
    client.do('setCameraManipulationMode', { mode: event.target.value })
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
