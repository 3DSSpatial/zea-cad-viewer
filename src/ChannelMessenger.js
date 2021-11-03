import { EventEmitter } from '@zeainc/zea-engine'
const createClient = () => {
  class ChannelMessenger extends EventEmitter {
    constructor() {
      super()
      console.log('iframe ChannelMessenger')

      let pingBack = false
      let portInitialized = false
      // Listen for the initial port transfer message
      window.addEventListener('message', (event) => {
        if (event.data == 'ping') {
          if (!pingBack && !portInitialized) {
            pingBack = true
            event.source.postMessage('ping', '*')
          }
        } else if (event.data == 'initPort') {
          console.log('=====initPort=========')
          portInitialized = true
          // Setup the transferred port
          this.port2 = event.ports[0]
          if (!this.port2) {
            return
          }
          this.port2.onmessage = onMessage
          this.port2.postMessage('ready')
        }
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
