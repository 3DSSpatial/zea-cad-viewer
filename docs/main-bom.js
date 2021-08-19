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
      url: base + '/data/SolidworksTrailor/2034.sldasm.zcad',
    })
    .then((data) => {
      logger.logJson('modelStructure', data)
      buildPartMapping(data.modelStructure)
    })
})

client.on('selectionChanged', (data) => {
  logger.logJson('selectionChanged:', data)
  hilightPartsInBOM(data.selection)
})

const partMapping = {}
const pathMapping = {}
const buildPartMapping = (modelStructure) => {
  const traverse = (item, parentpath) => {
    const path = [...parentpath, item.name]
    if (!(item.name in partMapping)) partMapping[item.name] = []
    partMapping[item.name].push(path)

    pathMapping[path] = item.name

    if (item.children) {
      item.children.forEach((child) => {
        traverse(child, path)
      })
    }
  }
  traverse(modelStructure, [])
}

const hilightPartsInBOM = (selection) => {
  selection.forEach((path) => {
    if (path[path.length - 1].startsWith('Body')) path.pop()
    const partNumber = pathMapping[path]
    bom.selectPart(partNumber)
  })
}

// //////////////////////////////////////////
// BOM Display
import { BOM } from './src/display-bom.js'
const table = document.getElementById('BOM-table')
const bom = new BOM(table, './data/BOM1.json')
bom.addListener('rowSelected', (event) => {
  if (event.PartNumber in partMapping) {
    client.do('selectItems', {
      paths: partMapping[event.PartNumber],
    })
  }
})
bom.addListener('rowDeselected', (event) => {
  if (event.PartNumber in partMapping) {
    client.do('deselectItems', {
      paths: partMapping[event.PartNumber],
    })
  }
})
