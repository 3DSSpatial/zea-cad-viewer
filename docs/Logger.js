export class Logger {
  constructor(selector) {
    this.output = document.getElementById('output')
  }
  logJson(key, jsonMessage) {
    this.log(key + ':' + JSON.stringify(jsonMessage, null, 2))
  }
  log(message) {
    if (this.output) {
      this.output.textContent = message
    }
  }

  clear() {
    if (this.output) {
      this.output.textContent = ''
    }
  }
}
