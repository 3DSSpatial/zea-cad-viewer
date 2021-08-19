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

client.on('selectionChanged', (data) => {
  logger.logJson('selectionChanged:', data)
  selectionChanged(data.selection, data.deselection)
})

const partMapping = {}
const pathMapping = {}
const buildPartMapping = (modelStructure) => {
  const traverse = (item, parentpath) => {
    const path = [...parentpath, item.name]
    if (item.name == '2013') {
      console.log(item.name, path)
    }
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

const selectionChanged = (selection, deselection) => {
  selection.forEach((path) => {
    if (path[path.length - 1].startsWith('Body')) path.pop()
    const partNumber = pathMapping[path]
    bom.selectPart(partNumber)
  })
  deselection.forEach((path) => {
    if (path[path.length - 1].startsWith('Body')) path.pop()
    const partNumber = pathMapping[path]
    bom.deselectPart(partNumber)
  })
}
// //////////////////////////////////////////
// BOM Display
import { BOM } from './src/BOM.js'

const table = document.getElementById('BOM-table')
const bom = new BOM(table)

const urlParams = new URLSearchParams(window.location.search)
if (urlParams.has('BOM')) {
  bom
    .load(document.location.origin + urlParams.get('BOM'))
    .then((resources) => {
      console.log(resources)
      const loadCAD = () => {
        client
          .do('loadCADFile', {
            url:
              document.location.origin +
              '/data/SolidworksTrailor/2034.sldasm.zcad',
            resources,
          })
          .then((data) => {
            logger.logJson('modelStructure', data)
            buildPartMapping(data.modelStructure)
          })
      }
      if (!loaded) {
        client.on('ready', loadCAD)
      } else {
        loadCAD()
      }
    })
}
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
