package com.canopyos.fern

import android.content.Intent
import android.os.Bundle
import android.speech.RecognitionListener
import android.speech.RecognitionService
import android.speech.SpeechRecognizer

/**
 * Android requires assistant providers to advertise a RecognitionService.
 * Actual in-app capture is handled by MainActivity; this adapter forwards
 * framework recognition requests to the device's configured recognizer.
 */
class FernRecognitionService : RecognitionService() {
    private var recognizer: SpeechRecognizer? = null

    override fun onStartListening(recognizerIntent: Intent?, callback: Callback?) {
        if (callback == null || !SpeechRecognizer.isRecognitionAvailable(this)) {
            callback?.error(SpeechRecognizer.ERROR_CLIENT)
            return
        }
        try {
            recognizer?.destroy()
            val delegate = SpeechRecognizer.createSpeechRecognizer(this)
            recognizer = delegate
            delegate.setRecognitionListener(object : RecognitionListener {
                override fun onReadyForSpeech(params: Bundle?) { callback.readyForSpeech(params ?: Bundle.EMPTY) }
                override fun onBeginningOfSpeech() { callback.beginningOfSpeech() }
                override fun onRmsChanged(rmsdB: Float) { callback.rmsChanged(rmsdB) }
                override fun onBufferReceived(buffer: ByteArray?) { if (buffer != null) callback.bufferReceived(buffer) }
                override fun onEndOfSpeech() { callback.endOfSpeech() }
                override fun onError(error: Int) { callback.error(error); release(delegate) }
                override fun onResults(results: Bundle?) { callback.results(results ?: Bundle.EMPTY); release(delegate) }
                override fun onPartialResults(partialResults: Bundle?) { callback.partialResults(partialResults ?: Bundle.EMPTY) }
                override fun onEvent(eventType: Int, params: Bundle?) = Unit
            })
            delegate.startListening(recognizerIntent ?: Intent())
        } catch (_: Exception) {
            callback.error(SpeechRecognizer.ERROR_CLIENT)
            recognizer?.destroy()
            recognizer = null
        }
    }

    override fun onStopListening(callback: Callback?) {
        try { recognizer?.stopListening() } catch (_: Exception) { callback?.error(SpeechRecognizer.ERROR_CLIENT) }
    }

    override fun onCancel(callback: Callback?) {
        try { recognizer?.cancel() } catch (_: Exception) { }
        recognizer?.destroy()
        recognizer = null
    }

    private fun release(target: SpeechRecognizer) {
        if (recognizer === target) recognizer = null
        try { target.destroy() } catch (_: Exception) { }
    }

    override fun onDestroy() {
        try { recognizer?.cancel(); recognizer?.destroy() } catch (_: Exception) { }
        recognizer = null
        super.onDestroy()
    }
}
