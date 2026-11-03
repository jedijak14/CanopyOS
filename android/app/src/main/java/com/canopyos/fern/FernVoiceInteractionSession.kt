package com.canopyos.fern

import android.content.Intent
import android.os.Bundle
import android.service.voice.VoiceInteractionSession

/** Bridges the system assistant gesture into Fern's assistant-mode UI. */
class FernVoiceInteractionSession(private val serviceContext: android.content.Context) : VoiceInteractionSession(serviceContext) {
    override fun onPrepareShow(args: Bundle?, showFlags: Int) {
        super.onPrepareShow(args, showFlags)
        setUiEnabled(false)
    }

    override fun onShow(args: Bundle?, showFlags: Int) {
        super.onShow(args, showFlags)
        val launch = Intent(serviceContext, MainActivity::class.java).apply {
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP)
            putExtra(MainActivity.EXTRA_ASSISTANT_LAUNCH, true)
        }
        startAssistantActivity(launch)
        hide()
    }
}
