import GUI from 'https://cdn.jsdelivr.net/npm/lil-gui@0.17/+esm'
import * as THREE from 'three'

import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'

/*
  // Schema notes

  // Not sure
  2000 0000 ?

  // position info of the tetrahedron
  0000 36FC 0000 0000   b  x? z y? null  0   -970    0
  0000 5FFB 68FF 0000   t1 x? z y? null  0   -1185   -152
  7DFF 5FFB 4C00 0000   t2 x? z y? null  -131  -1185   76
  8300 5FFB 4C00 0000   t3 x? z y? null  131   -1185   76

  // Not sure - probably related to colour / vertex position count
  0000 0000 0000 ?
  0000 0400 0000 ?

  // Colors - Complete
  vertex index   --   color  ?
  0    1    2         0      ?  1      ?  2      ?
  0800 1000 1800 0000 FFFF00 30 9B7800 00 FFD800 00
  0000 1800 1000 0000 332700 30 FFD800 00 9B7800 00
  0000 0800 1800 0000 332700 30 FFFF00 00 FFD800 00
  0000 1000 0800 0000 332700 30 9B7800 00 FFFF00 00

0x0E 5FFB Top Left vertical position - 16bit

*/

let markDat
let markDat16
let tetraGeom
let camera
let controls
let mixer

// Settings for the 3D display model
const settings = {
  'Top height': 0,
  'Bottom height': 0,
  'Triangle size': 0,
  'Rotate Scene': true,
  'Rotate Mark': true,
  'Top 1': [255, 0, 0], // '#FFFF00',
  'Top 2': [0, 255, 0], // '#9B7800',
  'Top 3': [0, 0, 255], // '#FFD800',
  Bottom: [0, 0, 0], // '#332700'
  'Top 1 X': 0,
  'Top 1 Y': 0,
  'Top 1 Z': 0,
  'Top 2 X': 0,
  'Top 2 Y': 0,
  'Top 2 Z': 0,
  'Top 3 X': 0,
  'Top 3 Y': 0,
  'Top 3 Z': 0,
  'Bottom X': 0,
  'Bottom Y': 0,
  'Bottom Z': 0
}
// References to the byte indexes in mark.dat for the various settings
const schema = {
  'Top 1': [0x38, 0x64, 0x7c],
  'Top 2': [0x3c, 0x54, 0x78],
  'Top 3': [0x40, 0x50, 0x68],
  Bottom: [0x4c, 0x60, 0x74],
  'Bottom X': 0x04,
  'Bottom Y': 0x06,
  'Bottom Z': 0x08,
  'Top 1 X': 0x0c,
  'Top 1 Y': 0x0e,
  'Top 1 Z': 0x10,
  'Top 2 X': 0x14,
  'Top 2 Y': 0x16,
  'Top 2 Z': 0x18,
  'Top 3 X': 0x1c,
  'Top 3 Y': 0x1e,
  'Top 3 Z': 0x20
}

const vertexPositions = [
  'Bottom', 'Top 1', 'Top 2',
  'Top 3', 'Top 2', 'Top 1',
  'Top 3', 'Top 1', 'Bottom',
  'Top 3', 'Bottom', 'Top 2'
]

const setVertexColors = () => {
  // For the triangle model
  const vertexColors = vertexPositions.map(colorKey => settings[colorKey])
  // console.log('tetraGeom.attributes.color', tetraGeom.attributes.color)
  for (const [i, color] of vertexColors.entries()) {
    tetraGeom.attributes.color.setXYZ(i, color[0] / 255, color[1] / 255, color[2] / 255)
  }
  tetraGeom.attributes.color.needsUpdate = true
}
const setSimpleTopHeight = (val) => {
  settings['Top 1 Y'] = val
  settings['Top 2 Y'] = val
  settings['Top 3 Y'] = val
  setVertexPositions()
}

const setSimpleBottomHeight = (val) => {
  settings['Bottom Y'] = val
  setVertexPositions()
}
const setTriangleSize = (val) => {
  const angle = 180 - 120
  const x = Math.trunc(Math.sin(angle * Math.PI / 180) * val)
  const z = Math.trunc(Math.cos(angle * Math.PI / 180) * val)

  settings['Top 1 X'] = 0
  settings['Top 1 Z'] = -val
  settings['Top 2 X'] = -x
  settings['Top 2 Z'] = z
  settings['Top 3 X'] = x
  settings['Top 3 Z'] = z
  setVertexPositions()
  console.log('setTriangleSize', val, x, z)
}
const setVertexPositions = () => {
  // For the triangle model
  // Note, inverted positions and xyz orientation
  for (const [i, posKey] of vertexPositions.entries()) {
    tetraGeom.attributes.position.setXYZ(i, settings[`${posKey} Z`] * -1, settings[`${posKey} Y`] * -1, settings[`${posKey} X`] * -1)
  }
  tetraGeom.attributes.position.needsUpdate = true
  tetraGeom.computeBoundingBox()
  tetraGeom.computeBoundingSphere()
}

const createScene = () => {
  // Scene
  const scene = new THREE.Scene()
  camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 1, 60000)
  camera.position.set(3150, 1920, 2430)
  const renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setClearColor('#000000')
  renderer.setSize(window.innerWidth, window.innerHeight)
  renderer.outputEncoding = THREE.sRGBEncoding

  document.body.appendChild(renderer.domElement)

  controls = new OrbitControls(camera, renderer.domElement)
  controls.minDistance = 1200
  controls.maxDistance = 5500
  controls.maxPolarAngle = Math.PI / 1.77
  controls.autoRotate = true
  controls.autoRotateSpeed = -3
  controls.target = new THREE.Vector3(0, 1000, 0)

  // Triangle
  tetraGeom = new THREE.BufferGeometry()
  const vertices = new Float32Array(12 * 3)
  tetraGeom.setAttribute('position', new THREE.BufferAttribute(vertices, 3))

  tetraGeom.setAttribute('color', new THREE.BufferAttribute(new Float32Array(12 * 3), 3))
  const meshMaterial = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide })
  const selectionTriangle = new THREE.Mesh(tetraGeom, meshMaterial)
  scene.add(selectionTriangle)

  // console.log('tetraGeom', tetraGeom)
  const loader = new GLTFLoader()
  loader.load(
    'https://kujata-data-dg.netlify.app/data/battle/battle.lgp/opaa.hrc.gltf',
    (gltf) => {
      scene.add(gltf.scene)
    }
  )
  loader.load(
    'https://kujata-data-dg.netlify.app/data/battle/battle.lgp/rtaa.hrc.gltf',
    (gltf) => {
      mixer = new THREE.AnimationMixer(gltf.scene)
      gltf.scene.position.y = -gltf.animations[0].tracks[0].values[1]
      for (const anim of gltf.animations) {
        for (const track of anim.tracks) {
          track.optimize()
        }
      }
      const action = mixer.clipAction(gltf.animations[0])
      action.play()
      scene.add(gltf.scene)
    }
  )
  scene.add(new THREE.AxesHelper(100))
  const clock = new THREE.Clock()

  // GUI Config
  const gui = new GUI()
  const colorFolder = gui.addFolder('Colors')
  const positionsSimpleFolder = gui.addFolder('Positions Simple')
  const positionsFolder = gui.addFolder('Positions')
  const miscFolder = gui.addFolder('Misc')

  for (const colorKey of ['Top 1', 'Top 2', 'Top 3', 'Bottom']) {
    colorFolder.addColor(settings, colorKey, 255).onChange(setVertexColors).listen()
  }
  for (const posKey of ['Top 1', 'Top 2', 'Top 3', 'Bottom']) {
    positionsFolder.add(settings, `${posKey} X`, -1000, 1000, 1).onChange(setVertexPositions).listen()
    positionsFolder.add(settings, `${posKey} Y`, -2000, 2000, 1).onChange(setVertexPositions).listen()
    positionsFolder.add(settings, `${posKey} Z`, -1000, 1000, 1).onChange(setVertexPositions).listen()
  }
  positionsSimpleFolder.add(settings, 'Top height', -2000, 2000, 1).onChange(setSimpleTopHeight).listen()
  positionsSimpleFolder.add(settings, 'Bottom height', -2000, 2000, 1).onChange(setSimpleBottomHeight).listen()
  positionsSimpleFolder.add(settings, 'Triangle size', 0, 700, 1).onChange(setTriangleSize).listen()

  const loadSaveFolder = gui.addFolder('Load/Save')
  const loadSaveFolderObj = {
    'Load mark.dat': () => { document.querySelector('.mark-dat-upload').click() },
    'Downlad mark.dat': () => { saveDat() }
  }
  loadSaveFolder.add(loadSaveFolderObj, 'Load mark.dat')
  loadSaveFolder.add(loadSaveFolderObj, 'Downlad mark.dat')

  miscFolder.add(settings, 'Rotate Scene').onChange((e) => { controls.autoRotate = e })
  miscFolder.add(settings, 'Rotate Mark')

  // Render loop
  const render = function () {
    window.requestAnimationFrame(render)
    const delta = clock.getDelta()
    if (mixer) mixer.update(delta)
    if (settings['Rotate Mark']) selectionTriangle.rotation.y -= 0.04
    controls.update()
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
  for (const posKey of ['Top 1', 'Top 2', 'Top 3', 'Bottom']) {
    settings[`${posKey} X`] = markDat16[schema[`${posKey} X`] / 2]
    settings[`${posKey} Y`] = markDat16[schema[`${posKey} Y`] / 2]
    settings[`${posKey} Z`] = markDat16[schema[`${posKey} Z`] / 2]
    if (posKey === 'Top 1') {
      settings['Top height'] = markDat16[schema[`${posKey} Y`] / 2]
    }
    if (posKey === 'Bottom') settings['Bottom height'] = markDat16[schema[`${posKey} Y`] / 2]
  }
  settings['Triangle size'] = new THREE.Vector2(0, 0)
    .distanceTo(new THREE.Vector2(markDat16[schema['Top 1 X'] / 2], markDat16[schema['Top 1 Z'] / 2]))

  // console.log('updateDataFromLoadedDat', settings, markDat, tetraGeom.attributes.color)
  setVertexColors()
  setVertexPositions()
}
const saveDat = () => {
  // console.log('saveDat', settings, markDat)
  // Set colors onto arrayBuffer
  for (const colorKey of ['Top 1', 'Top 2', 'Top 3', 'Bottom']) {
    for (const byteIndex of schema[colorKey]) {
      markDat[byteIndex] = settings[colorKey][0]
      markDat[byteIndex + 1] = settings[colorKey][1]
      markDat[byteIndex + 2] = settings[colorKey][2]
    }
  }
  for (const posKey of ['Top 1', 'Top 2', 'Top 3', 'Bottom']) {
    markDat16[schema[`${posKey} X`] / 2] = settings[`${posKey} X`]
    markDat16[schema[`${posKey} Y`] / 2] = settings[`${posKey} Y`]
    markDat16[schema[`${posKey} Z`] / 2] = settings[`${posKey} Z`]
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
  markDat16 = new Int16Array(markDatBuf)
  // console.log('markDat', markDat, markDat16, markDat16[0x06 / 2])
  updateDataFromLoadedDat()
}
const addFileInput = () => {
  // Trigger change on loading an external mark.dat file
  document.querySelector('.mark-dat-upload').addEventListener('change', async function () {
    if (this.files.length !== 1) { window.alert('Please select only a single mark.dat file'); return }
    const file = await this.files[0].arrayBuffer()
    if (file.byteLength !== 132) { window.alert('Mark.dat must be 132 bytes exactly'); return }
    markDat = new Uint8Array(file)
    markDat16 = new Uint16Array(file)
    updateDataFromLoadedDat()
  })
}
const init = async () => {
  createScene()
  loadDefaultMarkDat()
  addFileInput()
}
init()
