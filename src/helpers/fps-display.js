export class FPSDisplay extends HTMLElement {
  constructor() {
    super()
    const shadowRoot = this.attachShadow({ mode: 'open' })

    this.div = document.createElement('div')
    this.div.classList.add('fps-display')
    shadowRoot.appendChild(this.div)

    const styleTag = document.createElement('style')
    styleTag.appendChild(
      document.createTextNode(`
      .fps-display {
        position: absolute;
        bottom: 10px;
        right: 10px;
        color: #000000;
      }
    `)
    )
    shadowRoot.appendChild(styleTag)
  }

  set renderer(renderer) {
    let frameCounter = 0
    let fps = 0
    renderer.on('redrawOccurred', () => {
      frameCounter++
    })

    setInterval(() => {
      if (fps != frameCounter * 2) {
        fps = frameCounter * 2
        this.div.textContent = `FPS: ${fps}`
      }
      frameCounter = 0
    }, 500)
  }
}

customElements.define('fps-display', FPSDisplay)
