const { TreeItem } = window.zeaEngine

const buildTree = (treeItem) => {
  const __c = (treeItem, json, depth) => {
    const children = treeItem.getChildren()

    for (const childItem of children) {
      if (childItem) {
        const childJson = __t(childItem, depth + 1)
        if (childJson == false) continue

        if (!json.children) json.children = []
        json.children.push(childJson)
      }
    }
  }

  const __t = (treeItem, depth) => {
    const name = treeItem.getName()
    if (name.startsWith('Mesh') || name.startsWith('Edge') || name.startsWith('TreeItem')) {
      return false
    }
    const json = {
      name,
    }
    if (treeItem instanceof TreeItem) __c(treeItem, json, depth)
    return json
  }

  return __t(treeItem, null, 1)
}

export default buildTree
