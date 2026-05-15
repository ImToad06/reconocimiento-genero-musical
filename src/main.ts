import './style.css'
import '@tensorflow/tfjs'
import * as speechCommands from '@tensorflow-models/speech-commands'

interface GenrePrediction {
  genre: string;
  confidence: number;
}

const app = document.querySelector<HTMLDivElement>('#app')!

app.innerHTML = `
  <div class="container">
    <header>
      <h1>Clasificador de Géneros Musicales</h1>
      <p>Sube una canción y la IA clasificará su género con Teachable Machine</p>
      <div class="genres-chips">
        <span class="chip chip-rock">Rock</span>
        <span class="chip chip-salsa">Salsa</span>
        <span class="chip chip-vallenato">Vallenato</span>
        <span class="chip chip-ruido">Ruido de fondo</span>
      </div>
    </header>

    <main>
      <section class="upload-section card elevation-2">
        <div class="upload-area" id="uploadArea">
          <svg class="upload-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="17 8 12 3 7 8"/>
            <line x1="12" y1="3" x2="12" y2="15"/>
          </svg>
          <p class="upload-text">Arrastra tu archivo de audio aquí o haz clic para seleccionar</p>
          <p class="upload-hint">Soporta MP3, WAV, OGG</p>
          <input type="file" id="fileInput" accept="audio/*" hidden />
        </div>
      </section>

      <section class="model-section card elevation-2">
        <div id="modelStatus" class="model-status">Cargando modelo...</div>
      </section>

      <section class="player-section card elevation-2" id="playerSection" style="display: none;">
        <div class="audio-player">
          <audio id="audioPlayer" controls></audio>
        </div>
        <div class="classify-controls">
          <div class="time-selector">
            <label for="analysisTime">Punto de análisis (segundos):</label>
            <input type="range" id="analysisTime" min="0" max="10" value="5" step="1" />
            <span id="timeDisplay">5s</span>
          </div>
          <button id="classifyBtn" class="btn btn-primary" disabled>
            <span class="btn-text">Clasificar Género</span>
            <span class="spinner" style="display: none;"></span>
          </button>
        </div>
      </section>

      <section class="results-section card elevation-2" id="resultsSection" style="display: none;">
        <h2>Resultados de la Clasificación</h2>
        <div id="predictions" class="predictions"></div>
      </section>
    </main>

    <footer>
      <p>Desarrollado con TensorFlow.js y Teachable Machine</p>
    </footer>
  </div>
`

let recognizer: speechCommands.SpeechCommandRecognizer | null = null
let labels: string[] = []

const fileInput = document.getElementById('fileInput') as HTMLInputElement
const uploadArea = document.getElementById('uploadArea') as HTMLDivElement
const audioPlayer = document.getElementById('audioPlayer') as HTMLAudioElement
const playerSection = document.getElementById('playerSection') as HTMLElement
const classifyBtn = document.getElementById('classifyBtn') as HTMLButtonElement
const resultsSection = document.getElementById('resultsSection') as HTMLElement
const predictionsDiv = document.getElementById('predictions') as HTMLDivElement
const modelStatus = document.getElementById('modelStatus') as HTMLDivElement
const analysisTimeSlider = document.getElementById('analysisTime') as HTMLInputElement
const timeDisplay = document.getElementById('timeDisplay') as HTMLSpanElement

// Cargar modelo local automáticamente al iniciar
const MODEL_URL = window.location.origin + '/tm-my-audio-model/'

async function loadLocalModel() {
  modelStatus.textContent = 'Cargando modelo...'
  modelStatus.classList.remove('loaded', 'error')

  try {
    const newRecognizer = speechCommands.create(
      'BROWSER_FFT',
      undefined,
      MODEL_URL + 'model.json',
      MODEL_URL + 'metadata.json'
    )

    await newRecognizer.ensureModelLoaded()

    recognizer = newRecognizer
    labels = newRecognizer.wordLabels()

    modelStatus.textContent = `Modelo listo: ${labels.length} clases (${labels.join(', ')})`
    modelStatus.classList.add('loaded')
    modelStatus.classList.remove('error')
    classifyBtn.disabled = !audioPlayer.src

    console.log('Modelo cargado con etiquetas:', labels)
  } catch (error) {
    console.error('Error cargando modelo:', error)
    modelStatus.textContent = 'Error al cargar el modelo local.'
    modelStatus.classList.add('error')
    modelStatus.classList.remove('loaded')
  }
}

// Iniciar carga del modelo inmediatamente
loadLocalModel()

// Interacciones del área de subida
uploadArea.addEventListener('click', () => fileInput.click())

uploadArea.addEventListener('dragover', (e) => {
  e.preventDefault()
  uploadArea.classList.add('dragover')
})

uploadArea.addEventListener('dragleave', () => {
  uploadArea.classList.remove('dragover')
})

uploadArea.addEventListener('drop', (e) => {
  e.preventDefault()
  uploadArea.classList.remove('dragover')
  const files = e.dataTransfer?.files
  if (files && files.length > 0) {
    handleFile(files[0])
  }
})

fileInput.addEventListener('change', () => {
  if (fileInput.files && fileInput.files.length > 0) {
    handleFile(fileInput.files[0])
  }
})

// Slider de tiempo
analysisTimeSlider.addEventListener('input', () => {
  timeDisplay.textContent = analysisTimeSlider.value + 's'
})

function handleFile(file: File) {
  if (!file.type.startsWith('audio/')) {
    alert('Por favor sube un archivo de audio')
    return
  }

  const url = URL.createObjectURL(file)
  audioPlayer.src = url
  playerSection.style.display = 'block'
  resultsSection.style.display = 'none'
  classifyBtn.disabled = !recognizer
}

audioPlayer.addEventListener('loadedmetadata', () => {
  const duration = Math.floor(audioPlayer.duration)
  analysisTimeSlider.max = String(Math.max(duration - 1, 0))
  analysisTimeSlider.value = String(Math.min(5, Math.floor(duration / 2)))
  timeDisplay.textContent = analysisTimeSlider.value + 's'
})

// Clasificar audio
classifyBtn.addEventListener('click', classifyAudio)

async function classifyAudio() {
  if (!recognizer || !audioPlayer.src) return

  classifyBtn.disabled = true
  const btnText = classifyBtn.querySelector('.btn-text') as HTMLSpanElement
  const spinner = classifyBtn.querySelector('.spinner') as HTMLSpanElement
  btnText.textContent = 'Analizando...'
  spinner.style.display = 'inline-block'

  try {
    const analysisTime = parseInt(analysisTimeSlider.value)
    const predictions = await analyzeAudio(audioPlayer.src, analysisTime)
    displayResults(predictions)
  } catch (error) {
    console.error('Error de clasificación:', error)
    alert('Error durante la clasificación. Revisa la consola para más detalles.')
  } finally {
    classifyBtn.disabled = false
    btnText.textContent = 'Clasificar Género'
    spinner.style.display = 'none'
  }
}

async function analyzeAudio(audioUrl: string, startTimeSeconds: number): Promise<GenrePrediction[]> {
  // Crear contexto de audio
  const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()

  // Obtener y decodificar audio
  const response = await fetch(audioUrl)
  const arrayBuffer = await response.arrayBuffer()
  const buffer = await ctx.decodeAudioData(arrayBuffer)

  // Obtener audio en mono
  let audioData: Float32Array
  if (buffer.numberOfChannels === 1) {
    audioData = buffer.getChannelData(0)
  } else {
    const left = buffer.getChannelData(0)
    const right = buffer.getChannelData(1)
    audioData = new Float32Array(left.length)
    for (let i = 0; i < left.length; i++) {
      audioData[i] = (left[i] + right[i]) / 2
    }
  }

  // Extraer 1 segundo desde startTimeSeconds
  const sampleRate = buffer.sampleRate
  const startSample = Math.floor(startTimeSeconds * sampleRate)
  const durationSamples = Math.floor(sampleRate) // 1 segundo
  const endSample = Math.min(startSample + durationSamples, audioData.length)

  if (startSample >= audioData.length) {
    throw new Error('El tiempo de inicio excede la duración del audio')
  }

  const oneSecondData = audioData.slice(startSample, endSample)

  // Rellenar con ceros si es menos de 1 segundo
  const paddedData = new Float32Array(durationSamples)
  paddedData.set(oneSecondData)

  // Cerrar el contexto
  await ctx.close()

  // Obtener parámetros del modelo
  const params = recognizer!.params()
  const inputShape = recognizer!.modelInputShape()
  const modelSampleRate = params.sampleRateHz || 44100
  const fftSize = params.fftSize || 1024
  const numFrames = inputShape[1]
  const numFreqBins = inputShape[2]

  // Remuestrear a la tasa del modelo si es necesario
  let finalData = paddedData
  if (sampleRate !== modelSampleRate) {
    finalData = resampleAudio(paddedData, sampleRate, modelSampleRate)
  }

  // Generar espectrograma que coincida con las expectativas del modelo
  const spectrogram = generateSpectrogram(finalData, modelSampleRate, fftSize, numFrames, numFreqBins)

  // Validar tamaño
  const expectedElements = numFrames * numFreqBins * inputShape[3]

  if (spectrogram.length !== expectedElements) {
    console.warn(`Tamaño de espectrograma no coincide: obtuve ${spectrogram.length}, esperaba ${expectedElements}`)
    const adjusted = new Float32Array(expectedElements)
    adjusted.set(spectrogram.slice(0, Math.min(spectrogram.length, expectedElements)))

    const result = await recognizer!.recognize(adjusted)
    const scores = Array.from(result.scores as number[])

    return labels.map((label, i) => ({
      genre: label,
      confidence: scores[i] || 0
    })).sort((a, b) => b.confidence - a.confidence)
  }

  // Usar el reconocedor para clasificar
  const result = await recognizer!.recognize(spectrogram)
  const scores = Array.from(result.scores as number[])

  return labels.map((label, i) => ({
    genre: label,
    confidence: scores[i] || 0
  })).sort((a, b) => b.confidence - a.confidence)
}

function resampleAudio(input: Float32Array, inputRate: number, outputRate: number): Float32Array {
  const ratio = outputRate / inputRate
  const outputLength = Math.floor(input.length * ratio)
  const output = new Float32Array(outputLength)

  for (let i = 0; i < outputLength; i++) {
    const srcIdx = i / ratio
    const idx0 = Math.floor(srcIdx)
    const idx1 = Math.min(idx0 + 1, input.length - 1)
    const frac = srcIdx - idx0
    output[i] = input[idx0] * (1 - frac) + input[idx1] * frac
  }

  return output
}

function generateSpectrogram(
  audioData: Float32Array,
  sampleRate: number,
  fftSize: number,
  numFrames: number,
  numFreqBins: number
): Float32Array {
  // Calcular salto para el número deseado de frames
  const hopLength = Math.floor(audioData.length / numFrames)

  // Calcular frames del espectrograma
  const frames: Float32Array[] = []

  for (let frame = 0; frame < numFrames; frame++) {
    const start = frame * hopLength
    if (start + fftSize > audioData.length) break

    // Extraer frame
    const frameData = audioData.slice(start, start + fftSize)

    // Aplicar ventana Hanning
    const windowed = applyWindow(frameData, 'hann')

    // Calcular FFT
    const fftResult = computeFFT(windowed)

    // Obtener espectro de magnitudes (primera mitad)
    const magnitudes = new Float32Array(fftSize / 2)
    for (let k = 0; k < fftSize / 2; k++) {
      magnitudes[k] = Math.sqrt(fftResult.real[k] * fftResult.real[k] + fftResult.imag[k] * fftResult.imag[k])
    }

    // Convertir a escala dB y normalizar
    const dbValues = new Float32Array(numFreqBins)
    for (let k = 0; k < numFreqBins; k++) {
      const srcIdx = Math.floor(k * (fftSize / 2) / numFreqBins)
      const mag = magnitudes[srcIdx] || 0
      const db = 20 * Math.log10(mag + 1e-10)
      // Normalizar al rango [-10, 10] similar al preprocesamiento de speech-commands
      dbValues[k] = Math.max(-10, Math.min(10, db / 10))
    }

    frames.push(dbValues)
  }

  // Aplanar frames en un solo arreglo
  const totalLength = numFrames * numFreqBins
  const spectrogram = new Float32Array(totalLength)

  for (let i = 0; i < frames.length; i++) {
    spectrogram.set(frames[i], i * numFreqBins)
  }

  return spectrogram
}

function applyWindow(data: Float32Array, type: string): Float32Array {
  const result = new Float32Array(data.length)

  if (type === 'hann') {
    for (let i = 0; i < data.length; i++) {
      result[i] = data[i] * (0.5 * (1 - Math.cos((2 * Math.PI * i) / (data.length - 1))))
    }
  } else {
    result.set(data)
  }

  return result
}

function computeFFT(input: Float32Array): { real: Float32Array; imag: Float32Array } {
  const N = input.length
  const real = new Float32Array(N)
  const imag = new Float32Array(N)

  real.set(input)

  // Permutación por inversión de bits
  for (let i = 0; i < N; i++) {
    let j = 0
    let bit = N >> 1
    let ii = i
    while (bit > 0) {
      if (ii & 1) j |= bit
      ii >>= 1
      bit >>= 1
    }
    if (j > i) {
      const temp = real[i]
      real[i] = real[j]
      real[j] = temp
    }
  }

  // FFT iterativa Cooley-Tukey
  for (let len = 2; len <= N; len <<= 1) {
    const angle = -2 * Math.PI / len
    const wlenReal = Math.cos(angle)
    const wlenImag = Math.sin(angle)

    for (let i = 0; i < N; i += len) {
      let wReal = 1
      let wImag = 0

      for (let j = 0; j < len / 2; j++) {
        const uReal = real[i + j]
        const uImag = imag[i + j]
        const vReal = real[i + j + len / 2] * wReal - imag[i + j + len / 2] * wImag
        const vImag = real[i + j + len / 2] * wImag + imag[i + j + len / 2] * wReal

        real[i + j] = uReal + vReal
        imag[i + j] = uImag + vImag
        real[i + j + len / 2] = uReal - vReal
        imag[i + j + len / 2] = uImag - vImag

        const nextWReal = wReal * wlenReal - wImag * wlenImag
        const nextWImag = wReal * wlenImag + wImag * wlenReal
        wReal = nextWReal
        wImag = nextWImag
      }
    }
  }

  return { real, imag }
}

function displayResults(predictions: GenrePrediction[]) {
  predictionsDiv.innerHTML = ''

  const topPrediction = predictions[0]

  // Resultado principal
  const topResultDiv = document.createElement('div')
  topResultDiv.className = 'top-result'
  topResultDiv.innerHTML = `
    <div class="genre-label">${topPrediction.genre}</div>
    <div class="confidence">${(topPrediction.confidence * 100).toFixed(1)}%</div>
    <div class="confidence-bar">
      <div class="confidence-fill" style="width: ${topPrediction.confidence * 100}%"></div>
    </div>
  `
  predictionsDiv.appendChild(topResultDiv)

  // Todos los resultados
  const allResultsDiv = document.createElement('div')
  allResultsDiv.className = 'all-results'

  predictions.forEach((pred, index) => {
    const row = document.createElement('div')
    row.className = 'prediction-row'
    row.innerHTML = `
      <span class="rank">#${index + 1}</span>
      <span class="genre">${pred.genre}</span>
      <div class="bar-container">
        <div class="bar" style="width: ${pred.confidence * 100}%"></div>
      </div>
      <span class="percent">${(pred.confidence * 100).toFixed(1)}%</span>
    `
    allResultsDiv.appendChild(row)
  })

  predictionsDiv.appendChild(allResultsDiv)
  resultsSection.style.display = 'block'

  // Desplazar a resultados
  setTimeout(() => {
    resultsSection.scrollIntoView({ behavior: 'smooth' })
  }, 100)
}
