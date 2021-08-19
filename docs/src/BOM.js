function resizableGrid(table) {
  const row = table.getElementsByTagName('tr')[0]
  const cols = row ? row.children : undefined
  if (!cols) return

  table.style.overflow = 'hidden'

  const tableHeight = table.offsetHeight

  for (let i = 0; i < cols.length; i++) {
    const div = createDiv(tableHeight)
    cols[i].appendChild(div)
    cols[i].style.position = 'relative'
    setListeners(div)
  }

  function setListeners(div) {
    let pageX, curCol, nxtCol, curColWidth, nxtColWidth

    div.addEventListener('mousedown', function (e) {
      curCol = e.target.parentElement
      nxtCol = curCol.nextElementSibling
      pageX = e.pageX

      const padding = paddingDiff(curCol)

      curColWidth = curCol.offsetWidth - padding
      if (nxtCol) nxtColWidth = nxtCol.offsetWidth - padding
    })

    div.addEventListener('mouseover', function (e) {
      e.target.style.borderRight = '2px solid #0000ff'
    })

    div.addEventListener('mouseout', function (e) {
      e.target.style.borderRight = ''
    })

    document.addEventListener('mousemove', function (e) {
      if (curCol) {
        let diffX = e.pageX - pageX

        if (nxtCol) nxtCol.style.width = nxtColWidth - diffX + 'px'

        curCol.style.width = curColWidth + diffX + 'px'
      }
    })

    document.addEventListener('mouseup', function (e) {
      curCol = undefined
      nxtCol = undefined
      pageX = undefined
      nxtColWidth = undefined
      curColWidth = undefined
    })
  }

  function createDiv(height) {
    let div = document.createElement('div')
    div.style.top = 0
    div.style.right = 0
    div.style.width = '5px'
    div.style.position = 'absolute'
    div.style.cursor = 'col-resize'
    div.style.userSelect = 'none'
    div.style.height = height + 'px'
    return div
  }

  function paddingDiff(col) {
    if (getStyleVal(col, 'box-sizing') == 'border-box') {
      return 0
    }

    let padLeft = getStyleVal(col, 'padding-left')
    let padRight = getStyleVal(col, 'padding-right')
    return parseInt(padLeft) + parseInt(padRight)
  }

  function getStyleVal(elm, css) {
    return window.getComputedStyle(elm, null).getPropertyValue(css)
  }
}

class BOM {
  constructor(table) {
    this.table = table
    // //////////////////////////////////////////
    // BOM Display

    // Create an empty <tr> element and add it to the 1st position of the table:
    this.partMapping = {}
    this.parts = []
    this.parts = []

    resizableGrid(table)

    this.listeners = {}
  }

  // addRow(['1234', 'Screw12', 'Brass 12inch Screw', 12, '$0.1'])
  load(bomURL) {
    console.log('Loading BOM:', bomURL)
    return new Promise((resolve, reject) => {
      fetch(bomURL)
        .then((response) => response.json())
        .then((rows) => {
          // Now we simulate a chackout process in a PLM software.
          // Typically this would involve copying the CAD files for each part
          // in the BOM into some target folder so that the when the assemblies
          // are loaded they can resolve these cad files.
          // In this example, we instead provide a resolution mapping that
          // tells the viewer how to find each cad file.
          const resources = {}

          const base = bomURL.substring(0, bomURL.lastIndexOf('/'))

          rows.forEach((row) => {
            if (row.Path) {
              // When the viewer looks for a file, provide where it can find it.
              // You can provide a mapping to any file here.
              resources[row.Path.file] = base + row.Path.url
              delete row.Path
            }
            this.addRow(row)
          })
          resolve(resources)
        })
    })
  }

  // Insert new cells (<td> elements) at the 1st and 2nd position of the "new" <tr> element:
  addRow(rowData) {
    const row = this.table.insertRow(-1)
    // Add some text to the new cells:
    const cb = document.createElement('input')
    cb.type = 'checkbox'
    // cb.appendChild(document.createTextNode(cap))
    row.insertCell(0).appendChild(cb)
    let cellindex = 1
    for (let key in rowData) {
      const cell = row.insertCell(cellindex)
      cell.innerHTML = rowData[key]
      cellindex++
    }

    row.addEventListener('mousedown', (e) => {
      if (!this.parts[index].hilighted) {
        row.classList.add('row_highlight')
        this.parts[index].hilighted = true
        this.emit('rowSelected', { PartNumber: rowData['PartNumber'] })
      } else {
        row.classList.remove('row_highlight')
        this.parts[index].hilighted = false
        this.emit('rowDeselected', { PartNumber: rowData['PartNumber'] })
      }
    })

    const index = this.parts.length
    this.partMapping[rowData['PartNumber']] = index
    this.parts.push({
      row,
      hilighted: false,
    })
  }

  selectPart(partNumber) {
    const index = this.partMapping[partNumber]

    const row = this.parts[index].row
    if (!this.parts[index].hilighted) {
      row.classList.add('row_highlight')
      this.parts[index].hilighted = true
    }
    row.scrollIntoView({ behavior: 'smooth', block: 'end', inline: 'nearest' })
  }

  deselectPart(partNumber) {
    const index = this.partMapping[partNumber]

    const row = this.parts[index].row
    if (this.parts[index].hilighted) {
      row.classList.remove('row_highlight')
      this.parts[index].hilighted = false
    }
  }

  addListener(eventName, listener) {
    if (!listener) {
      throw new Error('Missing listener.')
    }

    if (!this.listeners[eventName]) {
      this.listeners[eventName] = []
    }

    const listeners = this.listeners[eventName]

    if (listeners.includes(listener)) {
      throw new Error(
        `Listener "${listener.name}" already connected to event "${eventName}".`
      )
    }

    // TODO: Deprecate alongside #addListener.
    const id = listeners.length
    listeners[id] = listener

    return id
  }

  removeListener(eventName, listener) {
    if (!listener) {
      throw new Error('Missing callback function (listener).')
    }

    if (typeof listener == 'number') {
      console.warn(
        'Deprecated. Un-register using the original listener instead.'
      )
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
      throw new Error(
        `Listener "${listener.name}" is not connected to "${eventName}" event`
      )
    } else {
      for (const id of ids) {
        listeners[id] = undefined
      }
    }
  }

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
export { BOM }
