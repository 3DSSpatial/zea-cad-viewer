import { Color, Vec3, Xfo, Mat4, TreeItem, resourceLoader } from '@zeainc/zea-engine'
import { CADAsset } from '@zeainc/zea-cad'

function checkStatus(response) {
  if (!response.ok) {
    return false
  }

  return response
}

export function loadProductStructure(url) {
  const folder = url.lastIndexOf('/') > -1 ? url.substring(0, url.lastIndexOf('/')) + '/' : ''
  const filename = url.lastIndexOf('/') > -1 ? url.substring(url.lastIndexOf('/') + 1) : ''
  const stem = filename.substring(0, filename.lastIndexOf('.'))

  const productStructure = new TreeItem('ProductStructure')

  const references = {}

  resourceLoader.incrementWorkload(2) // load and parse
  fetch(url)
    .then((response) => {
      resourceLoader.incrementWorkDone(1) // load complete
      if (!checkStatus(response))
        throw new Error(`Unable to load Product Structure: ${url}. ${response.status} - ${response.statusText}`)
      return response.json()
    })
    .then((json) => {
      parseExportInfo(json['Export_Info']).then(() => {
        const root = parseTreeItem(json['Root'])
        productStructure.addChild(root)

        resourceLoader.incrementWorkDone(1) // parse complete
        productStructure.emit('loaded')
      })
    })

  const parseExportInfo = (json) => {
    return new Promise((resolve) => {
      parseReferenceList(json['Reference List']).then(() => {
        resolve()
      })
    })
  }
  const parseReferenceList = (json) => {
    return new Promise((resolve) => {
      const loadPromises = []
      json.forEach((refJson) => loadPromises.push(parseReference(refJson)))

      Promise.all(loadPromises).then(() => {
        resolve()
      })
    })
  }
  const parseReference = (json) => {
    const url = folder + json.Name + '_Rep.zcad'
    const asset = new CADAsset()
    asset.getParameter('FilePath').setValue(url)

    references[json.Name] = {
      asset: asset,
      refs: 0, // Now many times this asset has been referenced in the tree.
    }
    return new Promise((resolve) => {
      asset.on('loaded', () => {
        resolve(asset)
      })
    })
  }
  const parseTreeItem = (json) => {
    const name = json.Instance ? json.Instance.instanceName : json.referenceName
    let treeItem

    // If this item references an asset we loaded earlier, then we use/clone the asset
    if (json.Reference && json.Reference.referenceName in references) {
      const reference = references[json.Reference.referenceName]
      const asset = reference.asset
      if (reference.refs == 0) {
        treeItem = asset
      } else {
        // After the first reference, we clone.
        // Note: this is a shallow clone and all the geometry data will be shared(instanced)
        treeItem = asset.clone()
      }
      reference.refs++
    } else {
      treeItem = new TreeItem(name)
    }

    if (json.matrix) {
      const mat4 = new Mat4()
      const d = json.matrix
      // mat4.set(d[0], d[1], d[2], 1, d[3], d[4], d[5], 1, d[6], d[7], d[8], 1, d[9], d[10], d[11], 1)
      mat4.set(d[0], d[1], d[2], d[3], d[4], d[5], d[6], d[7], d[8], d[9], d[10], d[11], 0, 0, 0, 0)
      mat4.transposeInPlace()
      const xfo = new Xfo()
      xfo.setFromMat4(mat4)
      // xfo.tr.scaleInPlace(1 / 1000) // convert from millimeters to meters (optional)
      treeItem.getParameter('LocalXfo').setValue(xfo)
    }

    if (json.children) {
      json.children.forEach((childJson) => {
        const child = parseTreeItem(childJson)
        treeItem.addChild(child, false) // << false to keep the local xfo
      })
    }
    return treeItem
  }

  return productStructure
}
