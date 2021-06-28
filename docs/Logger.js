export class Logger {
  output

  constructor(selector) {
    this.output = document.getElementById('output')
  }
  logJson(key, jsonMessage) {
    this.log(key + ':' + JSON.stringify(jsonMessage, null, 2))
  }
  log(message) {
    output.textContent = message
  }

  clear() {
    output.textContent = ''
  }
}
