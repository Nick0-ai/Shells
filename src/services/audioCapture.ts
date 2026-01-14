type AudioDataCallback = (data: ArrayBuffer) => void

export class AudioCaptureService {
  private mediaStream: MediaStream | null = null
  private audioContext: AudioContext | null = null
  private processor: ScriptProcessorNode | null = null
  private source: MediaStreamAudioSourceNode | null = null
  private onAudioData: AudioDataCallback
  private isCapturing = false

  constructor(onAudioData: AudioDataCallback) {
    this.onAudioData = onAudioData
  }

  // Capture microphone audio
  async startMicrophoneCapture(): Promise<void> {
    if (this.isCapturing) {
      return
    }

    try {
      // Request microphone access
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 16000,
        },
        video: false,
      })

      this.setupAudioProcessing()
      this.isCapturing = true
      console.log('[AudioCapture] Microphone capture started')
    } catch (error) {
      console.error('[AudioCapture] Failed to start microphone:', error)
      throw error
    }
  }

  // Capture system audio (from screen/window share)
  async startSystemCapture(sourceId: string): Promise<void> {
    if (this.isCapturing) {
      return
    }

    try {
      // Use desktopCapturer to get system audio
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          // @ts-ignore - Electron-specific constraint
          mandatory: {
            chromeMediaSource: 'desktop',
            chromeMediaSourceId: sourceId,
          },
        },
        video: {
          // @ts-ignore
          mandatory: {
            chromeMediaSource: 'desktop',
            chromeMediaSourceId: sourceId,
          },
        },
      })

      // We only need audio, stop video track
      this.mediaStream.getVideoTracks().forEach(track => track.stop())

      this.setupAudioProcessing()
      this.isCapturing = true
      console.log('[AudioCapture] System capture started')
    } catch (error) {
      console.error('[AudioCapture] Failed to start system capture:', error)
      throw error
    }
  }

  // Alternative: capture from display media (works without sourceId)
  async startDisplayCapture(): Promise<void> {
    if (this.isCapturing) {
      return
    }

    try {
      // @ts-ignore - getDisplayMedia with audio
      this.mediaStream = await navigator.mediaDevices.getDisplayMedia({
        audio: true,
        video: true, // Required for getDisplayMedia
      })

      // Stop video track, we only need audio
      this.mediaStream.getVideoTracks().forEach(track => track.stop())

      if (this.mediaStream.getAudioTracks().length === 0) {
        throw new Error('No audio track available. Make sure to share audio.')
      }

      this.setupAudioProcessing()
      this.isCapturing = true
      console.log('[AudioCapture] Display capture started')
    } catch (error) {
      console.error('[AudioCapture] Failed to start display capture:', error)
      throw error
    }
  }

  private setupAudioProcessing(): void {
    if (!this.mediaStream) return

    // Create audio context
    this.audioContext = new AudioContext({ sampleRate: 16000 })
    this.source = this.audioContext.createMediaStreamSource(this.mediaStream)

    // Create processor node (using ScriptProcessorNode for compatibility)
    // Buffer size of 4096 gives good balance of latency vs CPU
    this.processor = this.audioContext.createScriptProcessor(4096, 1, 1)

    this.processor.onaudioprocess = (event) => {
      const inputData = event.inputBuffer.getChannelData(0)

      // Convert Float32 to Int16 for Deepgram
      const int16Data = this.float32ToInt16(inputData)

      this.onAudioData(int16Data.buffer)
    }

    // Connect nodes
    this.source.connect(this.processor)
    this.processor.connect(this.audioContext.destination)
  }

  private float32ToInt16(float32Array: Float32Array): Int16Array {
    const int16Array = new Int16Array(float32Array.length)

    for (let i = 0; i < float32Array.length; i++) {
      // Clamp and convert
      const s = Math.max(-1, Math.min(1, float32Array[i]))
      int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7fff
    }

    return int16Array
  }

  stop(): void {
    this.isCapturing = false

    if (this.processor) {
      this.processor.disconnect()
      this.processor = null
    }

    if (this.source) {
      this.source.disconnect()
      this.source = null
    }

    if (this.audioContext) {
      this.audioContext.close()
      this.audioContext = null
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop())
      this.mediaStream = null
    }

    console.log('[AudioCapture] Stopped')
  }

  isActive(): boolean {
    return this.isCapturing
  }

  // Get audio level for visualization
  getAudioLevel(): number {
    // This would need to be implemented with an AnalyserNode
    // for real-time audio level monitoring
    return 0
  }
}
