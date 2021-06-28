const createClient = () => {
  const { EventEmitter } = window.zeaEngine

  class ChannelMessenger extends EventEmitter {
    constructor() {
      super()

      // Listen for the initial port transfer message
      window.addEventListener('message', (e) => {
        console.log('=====initPort=========')
        // Setup the transferred port
        this.port2 = e.ports[0]
        if (!this.port2) {
          return
        }
        this.port2.onmessage = onMessage
        this.port2.postMessage('ready')
      })

      // Handle messages received on port2
      const onMessage = (e) => {
        console.info('Message received by IFrame:')
        console.info(e.data)

        if (!Array.isArray(e.data) || e.data.length != 2) {
          throw new Error(`Invalid message: ${e.data}`)
        }
        const key = e.data[0]
        const data = e.data[1]

        this.emit(key, data)
      }
    }

    send(msg, payload) {
      if (this.port2) {
        this.port2.postMessage([msg, payload])
      }
    }
  }

  const client = new ChannelMessenger()

  return client
}

export { createClient }
