import { Caption } from '../types'

type TranscriptCallback = (caption: Partial<Caption>) => void

export class DeepgramService {
  private socket: WebSocket | null = null
  private apiKey: string
  private language: string
  private onTranscript: TranscriptCallback
  private speaker: 'them' | 'you'
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private isConnecting = false
  private sampleRate: number

  constructor(
    apiKey: string,
    language: string,
    speaker: 'them' | 'you',
    onTranscript: TranscriptCallback,
    sampleRate: number = 48000
  ) {
    this.apiKey = apiKey
    this.language = language
    this.speaker = speaker
    this.onTranscript = onTranscript
    this.sampleRate = sampleRate
  }

  async connect(): Promise<void> {
    if (this.isConnecting || this.socket?.readyState === WebSocket.OPEN) {
      return
    }

    this.isConnecting = true

    return new Promise((resolve, reject) => {
      try {
        // Deepgram WebSocket URL with parameters
        const url = new URL('wss://api.deepgram.com/v1/listen')
        url.searchParams.set('model', 'nova-2')
        url.searchParams.set('language', this.language)
        url.searchParams.set('punctuate', 'true')
        url.searchParams.set('interim_results', 'true')
        url.searchParams.set('endpointing', '300')
        url.searchParams.set('encoding', 'linear16')
        url.searchParams.set('sample_rate', this.sampleRate.toString())
        url.searchParams.set('channels', '1')

        console.log(`[Deepgram ${this.speaker}] Connecting with sample rate: ${this.sampleRate}`)
        this.socket = new WebSocket(url.toString(), ['token', this.apiKey])

        this.socket.onopen = () => {
          console.log(`[Deepgram ${this.speaker}] Connected`)
          this.isConnecting = false
          this.reconnectAttempts = 0
          resolve()
        }

        this.socket.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data)
            console.log(`[Deepgram ${this.speaker}] Message:`, data.type, data)

            if (data.type === 'Results' && data.channel?.alternatives?.[0]) {
              const alternative = data.channel.alternatives[0]
              const transcript = alternative.transcript

              if (transcript && transcript.trim()) {
                console.log(`[Deepgram ${this.speaker}] Transcript:`, transcript, 'isFinal:', data.is_final)
                this.onTranscript({
                  id: `${this.speaker}-${Date.now()}`,
                  text: transcript,
                  timestamp: new Date(),
                  speaker: this.speaker,
                  isFinal: data.is_final === true
                })
              }
            }
          } catch (error) {
            console.error('[Deepgram] Error parsing message:', error)
          }
        }

        this.socket.onerror = (error) => {
          console.error(`[Deepgram ${this.speaker}] Error:`, error)
          this.isConnecting = false
          reject(error)
        }

        this.socket.onclose = (event) => {
          console.log(`[Deepgram ${this.speaker}] Closed:`, event.code, event.reason)
          this.isConnecting = false

          // Auto-reconnect if not intentionally closed
          if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++
            console.log(`[Deepgram ${this.speaker}] Reconnecting... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`)
            setTimeout(() => this.connect(), 1000 * this.reconnectAttempts)
          }
        }
      } catch (error) {
        this.isConnecting = false
        reject(error)
      }
    })
  }

  private audioPacketCount = 0

  sendAudio(audioData: ArrayBuffer): void {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(audioData)
      this.audioPacketCount++
      if (this.audioPacketCount % 50 === 0) {
        console.log(`[Deepgram ${this.speaker}] Sent ${this.audioPacketCount} audio packets`)
      }
    } else {
      console.warn(`[Deepgram ${this.speaker}] Socket not open, state:`, this.socket?.readyState)
    }
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.close(1000, 'Client disconnected')
      this.socket = null
    }
    this.reconnectAttempts = this.maxReconnectAttempts // Prevent auto-reconnect
  }

  isConnected(): boolean {
    return this.socket?.readyState === WebSocket.OPEN
  }
}
