import './style.css'
import { App } from './ui/App'

declare global {
  interface Window {
    mxBasePath: string
    mxLoadResources: boolean
    mxForceIncludes: boolean
    mxLoadStylesheets: boolean
    mxClient: any
  }
}

// Wait for mxGraph to load
function waitForMxGraph(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window.mxClient !== 'undefined') {
      resolve()
      return
    }

    let attempts = 0
    const maxAttempts = 50
    const checkInterval = setInterval(() => {
      attempts++
      if (typeof window.mxClient !== 'undefined') {
        clearInterval(checkInterval)
        resolve()
      } else if (attempts >= maxAttempts) {
        clearInterval(checkInterval)
        reject(new Error('mxGraph failed to load'))
      }
    }, 100)
  })
}

// Initialize the application after mxGraph loads
waitForMxGraph().then(() => {
  console.log('mxGraph loaded successfully')
  initApp()
}).catch((error) => {
  console.error('Failed to load mxGraph:', error)
  document.body.innerHTML = `
    <div style="padding: 20px; color: red;">
      Failed to load mxGraph library. Please check the console for details.
    </div>
  `
})

function initApp() {
  const appHTML = `
    <div class="header">
      <h1>Sequence Diagram Editor</h1>
      <div class="header-actions">
        <button class="btn btn-success" id="btn-export">Export</button>
        <button class="btn btn-danger" id="btn-clear">Clear</button>
      </div>
    </div>
    <div class="main-content">
      <div id="toolbar" class="toolbar"></div>
      <div class="graph-panel">
        <div id="graph-container"></div>
      </div>
      <div class="side-panel">
        <div class="panel-tabs">
          <button class="panel-tab active" data-panel="properties">Properties</button>
          <button class="panel-tab" data-panel="code">Code</button>
        </div>
        <div class="panel-content active" id="properties-content">
          <div id="properties-panel" class="properties-panel"></div>
        </div>
        <div class="panel-content" id="code-content">
          <div class="editor-panel">
            <textarea id="text-editor" spellcheck="false"></textarea>
          </div>
        </div>
      </div>
    </div>
  `

  const appElement = document.querySelector<HTMLDivElement>('#app')!
  appElement.innerHTML = appHTML

  const graphContainer = document.querySelector<HTMLDivElement>('#graph-container')!
  const textEditor = document.querySelector<HTMLTextAreaElement>('#text-editor')!
  const toolbarContainer = document.querySelector<HTMLDivElement>('#toolbar')!
  const propertiesContainer = document.querySelector<HTMLDivElement>('#properties-panel')!

  // Create the app
  const app = new App(graphContainer, textEditor, toolbarContainer, propertiesContainer)

  // Setup panel tabs
  document.querySelectorAll('.panel-tab').forEach(tab => {
    tab.addEventListener('click', (e) => {
      const target = e.target as HTMLElement
      const panel = target.dataset.panel

      // Update tabs
      document.querySelectorAll('.panel-tab').forEach(t => t.classList.remove('active'))
      target.classList.add('active')

      // Update content
      document.querySelectorAll('.panel-content').forEach(c => c.classList.remove('active'))
      if (panel === 'properties') {
        document.getElementById('properties-content')?.classList.add('active')
      } else if (panel === 'code') {
        document.getElementById('code-content')?.classList.add('active')
      }
    })
  })

  // Setup header actions
  document.getElementById('btn-export')?.addEventListener('click', () => {
    const text = textEditor.value
    const blob = new Blob([text], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'sequence-diagram.mmd'
    a.click()
    URL.revokeObjectURL(url)
  })

  document.getElementById('btn-clear')?.addEventListener('click', () => {
    if (confirm('Clear the diagram?')) {
      textEditor.value = 'sequenceDiagram\n'
      textEditor.dispatchEvent(new Event('input'))
    }
  })

  // Store app instance globally for debugging
  ;(window as any).app = app

  console.log('Sequence Diagram Editor initialized!')
}
