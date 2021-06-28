const components = []

class ComponentRegistry {
  registerComponent(queryCb, component) {
    components.push({
      queryCb,
      component,
    })
  }

  selectComponent(parameter) {
    // Iterate from the end of the list back to the start
    // and pick the first component that returns true when queried.
    for (let i = components.length - 1; i >= 0; i--) {
      if (components[i].queryCb(parameter)) return components[i].component
    }
  }
}

const componentRegistry = new ComponentRegistry()

export { componentRegistry }
