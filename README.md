# Clasificador de Géneros Musicales

Aplicación web para clasificar canciones por género musical usando TensorFlow.js y un modelo entrenado en Teachable Machine incluido localmente.

## Géneros soportados

- **Rock**
- **Salsa**
- **Vallenato**
- **Ruido de fondo**

## Características

- Modelo de Teachable Machine embebido localmente (sin necesidad de URL externa)
- Subida de archivos de audio (MP3, WAV, OGG)
- Clasificación por género con IA
- Visualización de resultados con confianza
- Selección del punto de análisis en la canción
- Diseño Material Design

## Cómo usar

1. Abre la aplicación en tu navegador (`npm run dev`)
2. Espera a que el modelo se cargue automáticamente (verás "Modelo listo" en la barra de estado)
3. Sube una canción arrastrándola o seleccionándola
4. Selecciona el punto de la canción que quieres analizar
5. Haz clic en **Clasificar Género**
6. Verás los resultados con el género más probable

## Desarrollo

```bash
# Instalar dependencias
npm install

# Iniciar servidor de desarrollo
npm run dev

# Compilar para producción
npm run build
```

## Estructura del modelo

El modelo entrenado en Teachable Machine está en `public/tm-my-audio-model/`:
- `model.json` - Topología del modelo
- `metadata.json` - Metadatos y etiquetas
- `weights.bin` - Pesos entrenados

Para reemplazar el modelo, sobrescribe estos archivos con uno nuevo exportado desde Teachable Machine como TensorFlow.js.

## Tecnologías

- [Vite](https://vitejs.dev/)
- [TypeScript](https://www.typescriptlang.org/)
- [TensorFlow.js](https://www.tensorflow.org/js)
- [Speech Commands](https://github.com/tensorflow/tfjs-models/tree/master/speech-commands)
- [Teachable Machine](https://teachablemachine.withgoogle.com/)

## Notas importantes

- El modelo debe ser de tipo **Audio** en Teachable Machine
- La aplicación analiza 1 segundo de audio en el punto seleccionado
- Para mejores resultados, entrena el modelo con muestras variadas y de buena calidad
- El género `_background_noise_` ayuda al modelo a diferenciar música de silencio/ruido
