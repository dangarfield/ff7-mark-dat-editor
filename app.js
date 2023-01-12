import GUI from 'https://cdn.jsdelivr.net/npm/lil-gui@0.17/+esm'
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.147.0/build/three.module.js'

/*
  // Schema notes
  // Not sure, hopefully position info of the tetrahedron
  2000 0000 0000 36FC 0000 0000
  0000 5FFB 68FF 0000 7DFF 5FFB
  4C00 0000 8300 5FFB 4C00 0000
  0000 0000 0000 0000 0400 0000

  // Colors - Complete
  vertex index   --   color  ?
  0    1    2         0      ?  1      ?  2      ?
  0800 1000 1800 0000 FFFF00 30 9B7800 00 FFD800 00
  0000 1800 1000 0000 332700 30 FFD800 00 9B7800 00
  0000 0800 1800 0000 332700 30 FFFF00 00 FFD800 00
  0000 1000 0800 0000 332700 30 9B7800 00 FFFF00 00
*/

let markDat
let tetraGeom

// Settings for the 3D display model
const settings = {
  'Top 1': [0, 0, 0], // '#FFFF00',
  'Top 2': [0, 0, 0], // '#9B7800',
  'Top 3': [0, 0, 0], // '#FFD800',
  Bottom: [0, 0, 0]// '#332700'
}
// References to the byte indexes in mark.dat for the various settings
const schema = {
  'Top 1': [0x38, 0x64, 0x7c],
  'Top 2': [0x3c, 0x54, 0x78],
  'Top 3': [0x40, 0x50, 0x68],
  Bottom: [0x4c, 0x60, 0x74]
}

const setVertexColors = () => {
  // For the triangle model
  const vertexColors = [
    settings.Bottom, settings['Top 1'], settings['Top 2'],
    settings['Top 3'], settings['Top 2'], settings['Top 1'],
    settings['Top 3'], settings['Top 1'], settings.Bottom,
    settings['Top 3'], settings.Bottom, settings['Top 2']
  ]
  // console.log('tetraGeom.attributes.color', tetraGeom.attributes.color)
  for (const [i, color] of vertexColors.entries()) {
    tetraGeom.attributes.color.setXYZ(i, color[0] / 255, color[1] / 255, color[2] / 255)
  }
  tetraGeom.attributes.color.needsUpdate = true
}

const createScene = () => {
  // Scene
  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000)
  camera.position.z = 4
  camera.position.y = 1.5
  camera.lookAt(new THREE.Vector3(0, 0, 0))
  const renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setClearColor('#222222')
  renderer.setSize(window.innerWidth, window.innerHeight)
  document.body.appendChild(renderer.domElement)

  // Triangle
  const size = 1
  tetraGeom = new THREE.TetrahedronGeometry(size, 0)
  tetraGeom.setAttribute('color', new THREE.BufferAttribute(new Float32Array(12 * 3), 3))
  tetraGeom.applyMatrix4(new THREE.Matrix4().makeRotationAxis(new THREE.Vector3(1, 0, 1).normalize(), Math.atan(Math.sqrt(2))))
  tetraGeom.translate(0, size / 3, 0)
  const meshMaterial = new THREE.MeshBasicMaterial({ vertexColors: true })
  const selectionTriangle = new THREE.Mesh(tetraGeom, meshMaterial)
  scene.add(selectionTriangle)

  // GUI Config
  const gui = new GUI()
  const colorFolder = gui.addFolder('Colors')

  colorFolder.addColor(settings, 'Top 1', 255).onChange(setVertexColors).listen()
  colorFolder.addColor(settings, 'Top 2', 255).onChange(setVertexColors).listen()
  colorFolder.addColor(settings, 'Top 3', 255).onChange(setVertexColors).listen()
  colorFolder.addColor(settings, 'Bottom', 255).onChange(setVertexColors).listen()

  const loadSaveFolder = gui.addFolder('Load/Save')
  const loadSaveFolderObj = {
    'Load mark.dat': () => { document.querySelector('.mark-dat-upload').click() },
    'Downlad mark.dat': () => { saveDat() }
  }
  loadSaveFolder.add(loadSaveFolderObj, 'Load mark.dat')
  loadSaveFolder.add(loadSaveFolderObj, 'Downlad mark.dat')

  // Render loop
  const render = function () {
    window.requestAnimationFrame(render)
    selectionTriangle.rotation.y -= 0.04
    renderer.render(scene, camera)
  }

  // Handle window resize
  window.addEventListener('resize', function () {
    const width = window.innerWidth
    const height = window.innerHeight
    renderer.setSize(width, height)
    camera.aspect = width / height
    camera.updateProjectionMatrix()
  })

  render()
}

const updateDataFromLoadedDat = () => {
  // Set colors of model using first occurance as defined in schema
  for (const colorKey of ['Top 1', 'Top 2', 'Top 3', 'Bottom']) {
    settings[colorKey][0] = markDat[schema[colorKey][0]]
    settings[colorKey][1] = markDat[schema[colorKey][0] + 1]
    settings[colorKey][2] = markDat[schema[colorKey][0] + 2]
  }
  // console.log('updateDataFromLoadedDat', settings, markDat, tetraGeom.attributes.color)
  setVertexColors()
}
const saveDat = () => {
  // console.log('saveDat', settings, markDat)
  // Set colors onto arrayBuffer
  for (const colorKey of ['Top 1', 'Top 2', 'Top 3', 'Bottom']) {
    console.log('colorKey', colorKey, schema[colorKey])
    for (const byteIndex of schema[colorKey]) {
      markDat[byteIndex] = settings[colorKey][0]
      markDat[byteIndex + 1] = settings[colorKey][1]
      markDat[byteIndex + 2] = settings[colorKey][2]
      console.log('colorKey', colorKey, byteIndex, '->', markDat[byteIndex], markDat[byteIndex + 1], markDat[byteIndex + 2])
    }
  }

  // Download file
  const blob = new window.Blob([markDat], { type: 'application/octet-stream' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  document.body.appendChild(a)
  a.style = 'display: none'
  a.href = url
  a.download = 'mark.dat'
  a.click()
  window.URL.revokeObjectURL(url)
}
const loadDefaultMarkDat = async () => {
  // Fetch data
  const markDatRes = await window.fetch('mark.dat')
  const markDatBlob = await markDatRes.blob()
  const markDatBuf = await markDatBlob.arrayBuffer()
  markDat = new Uint8Array(markDatBuf)
  updateDataFromLoadedDat()
}
const addFileInput = () => {
  // Trigger change on loading an external mark.dat file
  document.querySelector('.mark-dat-upload').addEventListener('change', async function () {
    if (this.files.length !== 1) { window.alert('Please select only a single mark.dat file'); return }
    const file = await this.files[0].arrayBuffer()
    if (file.byteLength !== 132) { window.alert('Mark.dat must be 132 bytes exactly'); return }
    markDat = new Uint8Array(file)
    updateDataFromLoadedDat()
  })
}
const init = async () => {
  createScene()
  loadDefaultMarkDat()
  addFileInput()
}
init()
