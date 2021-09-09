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
const partSelCounts = {}
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

const selectionChanged = (selection, deselection) => {
  deselection.forEach((path) => {
    const partNumber = pathMapping[path]
    if (!(partNumber in partSelCounts)) partSelCounts[partNumber] = 0
    partSelCounts[partNumber]--
  })
  selection.forEach((path) => {
    const partNumber = pathMapping[path]
    if (!(partNumber in partSelCounts)) partSelCounts[partNumber] = 0
    partSelCounts[partNumber]++
  })
  for (let partNumber in partSelCounts) {
    if (partSelCounts[partNumber] > 0) {
      bom.selectPart(partNumber)
    } else {
      bom.deselectPart(partNumber)
    }
  }
}
// //////////////////////////////////////////
// BOM Display
import { BOM } from './src/BOM.js'

const table = document.getElementById('BOM-table')
const bom = new BOM(table)

const urlParams = new URLSearchParams(window.location.search)
if (urlParams.has('BOM')) {
  const currURL = location.protocol + '//' + location.host + location.pathname
  const base = currURL.substring(0, currURL.lastIndexOf('/'))
  bom.load(base + urlParams.get('BOM')).then((resources) => {
    const loadCAD = () => {
      client
        .do('loadCADFile', {
          url: basePath + '/data/SolidworksTrailor/2034.sldasm.zcad',
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
  const { PartNumber } = event
  if (PartNumber in partMapping) {
    if (!(PartNumber in partSelCounts)) partSelCounts[PartNumber] = 0
    partSelCounts[PartNumber] += partMapping[PartNumber].length
    client.do('selectItems', {
      paths: partMapping[PartNumber],
    })
  }
})
bom.addListener('rowDeselected', (event) => {
  const { PartNumber } = event
  if (PartNumber in partMapping) {
    if (!(PartNumber in partSelCounts)) partSelCounts[PartNumber] = 0
    partSelCounts[PartNumber] -= partMapping[PartNumber].length
    client.do('deselectItems', {
      paths: partMapping[PartNumber],
    })
  }
})
