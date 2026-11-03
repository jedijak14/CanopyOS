package com.canopyos.fern

import android.service.voice.VoiceInteractionService

/** Android keeps this lightweight service bound while Fern is the selected assistant. */
class FernVoiceInteractionService : VoiceInteractionService() {
    override fun onReady() {
        super.onReady()
        // Hotword listening is intentionally not enabled. Android's assistant
        // gesture/button launches Fern without keeping a microphone open.
    }
}
