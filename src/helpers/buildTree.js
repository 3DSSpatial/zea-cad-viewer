import { TreeItem, InstanceItem, Registry } from '@zeainc/zea-engine'
import { CADBody, CADPart, XRef } from '@zeainc/zea-cad'

const buildTree = (treeItem) => {
  const __t = (treeItem, depth, parentpath) => {
    const path = [...parentpath, treeItem.getName()]
    const json = {
      name: treeItem.getName(),
    }

    const metaDataValues = ['Revision', 'Rev', 'InstanceName']
    metaDataValues.forEach((name) => {
      if (treeItem.hasParameter(name)) {
        json[name] = treeItem.getParameter(name).getValue()
      }
    })

    // Stop traversing at the part level
    if (treeItem instanceof CADPart) {
      return json
    }

    if (treeItem.getNumChildren() > 0) {
      const children = treeItem.getChildren()
      json.children = []
      for (const childItem of children) {
        if (childItem) {
          json.children.push(__t(childItem, depth + 1, path))
        }
      }
    }
    return json
  }

  return __t(treeItem, 1, [])
}

export default buildTree
