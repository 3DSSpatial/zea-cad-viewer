class ChannelMessenger {
  constructor(viewer) {
    this.listeners = {}

    const channel = new MessageChannel()
    this.port1 = channel.port1

    // Wait for the viewer to load
    viewer.addEventListener('load', () => {
      // Listen for messages on port1
      this.port1.onmessage = onMessage

      // Transfer port2 to the viewer
      viewer.contentWindow.postMessage('init', '*', [channel.port2])
    })

    // Handle messages received on port1
    const onMessage = (e) => {
      if (e.data == 'ready') {
        this.emit('ready')
      } else {
        if (!Array.isArray(e.data) || e.data.length != 2) throw 'Invalid message: ' + e.data
        const key = e.data[0]
        const data = e.data[1]

        this.emit(key, data)
      }
    }
  }

  send(msg, payload) {
    this.port1.postMessage([msg, payload])
  }

  /**
   * Adds a listener function for a given event name.
   *
   * @param {string} eventName - The name of the event.
   * @param {function} listener - The listener function(callback).
   * @return {number} - Id to reference the listener.
   */
  on(eventName, listener) {
    if (!listener) {
      throw new Error('Missing callback function (listener).')
    }

    if (!this.listeners[eventName]) {
      this.listeners[eventName] = []
    }

    const listeners = this.listeners[eventName]

    if (listeners.includes(listener)) {
      throw new Error(`Listener "${listener.name}" already connected to event "${eventName}".`)
    }

    // TODO: Deprecate alongside #addListener.
    const id = listeners.length
    listeners[id] = listener

    return id
  }

  /**
   * Similar to the `on` method with the difference that when the event is triggered,
   * it is automatically unregistered meaning that the event listener will be triggered at most one time.
   *
   * Useful for events that we expect to trigger one time, such as when assets load.
   * ```javascript
   * const asset = new Asset();
   * asset.once('loaded', () => {
   *   console.log("Yay! the asset is loaded")
   * })
   * ```
   *
   * @param {string} eventName - The eventName value
   * @param {function} listener - The listener value
   */
  once(eventName, listener) {
    const cb = (event) => {
      listener(event)
      this.off(eventName, cb)
    }

    this.on(eventName, cb)
  }

  /**
   * Removes a listener function from the specified event, using either the function or the index id. Depends on what is passed in.
   *
   * @param {string} eventName - The name of the event.
   * @param {function|number} listener - The listener function or the id number.
   */
  off(eventName, listener) {
    if (!listener) {
      throw new Error('Missing callback function (listener).')
    }

    if (typeof listener == 'number') {
      console.warn('Deprecated. Un-register using the original listener instead.')
      this.removeListenerById(eventName, listener)
      return
    }

    const listeners = this.listeners[eventName] || []

    const ids = []

    listeners.forEach((e, i) => {
      if (e === listener) {
        ids.push(i)
      }
    })

    if (ids.length == 0) {
      throw new Error(`Listener "${listener.name}" is not connected to "${eventName}" event`)
    } else {
      for (const id of ids) {
        listeners[id] = undefined
      }
    }
  }

  /**
   * Triggers all listener functions in an event.
   *
   * @param {string} eventName - The name of the event.
   * @param {object|string|any} event - The data you want to pass down to all listener functions as parameter.
   */
  emit(eventName, event) {
    const listeners = this.listeners[eventName] || []

    listeners.forEach((fn) => {
      // Skip disconnected listeners.
      if (fn) {
        fn(event)
      }
    })
  }
}

export { ChannelMessenger }
