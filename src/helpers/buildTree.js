const { CADBody, CADPart } = window.zeaCad
const { TreeItem, InstanceItem } = window.zeaEngine

const buildTree = (treeItem) => {
  const __c = (treeItem, json, depth) => {
    const children = treeItem.getChildren()

    for (const childItem of children) {
      if (childItem) {
        const childJson = __t(childItem, depth + 1)
        if (!childJson) continue
        if (!json.children) json.children = []
        json.children.push(childJson)
      }
    }
  }

  const __t = (treeItem, depth) => {
    const json = {
      name: treeItem.getName(),
    }

    const metaDataValues = ['Revision', 'Rev', 'InstanceName']
    metaDataValues.forEach((name) => {
      if (treeItem.hasParameter(name)) {
        json[name] = treeItem.getParameter(name).getValue()
      }
    })

    // Skip all the bodies and surfaces.
    if (treeItem instanceof CADPart) {
      return json
    }

    const isBody = treeItem instanceof CADBody
    const isInstancedBody =
      treeItem instanceof InstanceItem &&
      treeItem.getSrcTree() instanceof CADBody
    const hasChildren =
      treeItem.getNumChildren() > 0 && !isBody && !isInstancedBody
    if (hasChildren) __c(treeItem, json, depth)
    return json
  }

  return __t(treeItem, null, 1)
}

export default buildTree
