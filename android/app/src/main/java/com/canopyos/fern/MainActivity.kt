package com.canopyos.fern

import android.Manifest
import android.app.Activity
import android.app.AlertDialog
import android.app.role.RoleManager
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.provider.Settings
import android.speech.RecognitionListener
import android.speech.RecognizerIntent
import android.speech.SpeechRecognizer
import android.view.View
import android.view.WindowManager
import android.webkit.JavascriptInterface
import android.webkit.PermissionRequest
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Toast
import androidx.webkit.WebViewAssetLoader
import org.json.JSONObject
import java.util.Locale

class MainActivity : Activity() {
    private lateinit var webView: WebView
    private lateinit var assetLoader: WebViewAssetLoader
    private lateinit var fernVoice: FernKokoroVoice
    private var speechRecognizer: SpeechRecognizer? = null
    private var wantsRecognition = false
    private var assistantLaunch = false
    private val mainHandler = Handler(Looper.getMainLooper())

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        window.addFlags(WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS)
        window.statusBarColor = android.graphics.Color.rgb(7, 8, 12)
        window.navigationBarColor = android.graphics.Color.rgb(7, 8, 12)
        window.decorView.systemUiVisibility = View.SYSTEM_UI_FLAG_LAYOUT_STABLE

        assistantLaunch = intent.getBooleanExtra(EXTRA_ASSISTANT_LAUNCH, false)
        fernVoice = FernKokoroVoice(applicationContext) { state -> notifyVoiceState(state) }
        assetLoader = WebViewAssetLoader.Builder()
            .addPathHandler("/assets/", WebViewAssetLoader.AssetsPathHandler(this))
            .build()

        webView = WebView(this)
        webView.setBackgroundColor(android.graphics.Color.rgb(7, 8, 12))
        webView.settings.javaScriptEnabled = true
        webView.settings.domStorageEnabled = true
        webView.settings.databaseEnabled = true
        webView.settings.allowFileAccess = false
        webView.settings.allowContentAccess = false
        webView.settings.javaScriptCanOpenWindowsAutomatically = false
        webView.settings.setSupportMultipleWindows(false)
        webView.addJavascriptInterface(FernBridge(), "FernNative")
        webView.webViewClient = object : WebViewClient() {
            override fun shouldInterceptRequest(view: WebView?, request: WebResourceRequest?) =
                request?.url?.let { assetLoader.shouldInterceptRequest(it) }
                    ?: super.shouldInterceptRequest(view, request)
        }
        webView.webChromeClient = object : WebChromeClient() {
            override fun onPermissionRequest(request: PermissionRequest) {
                runOnUiThread {
                    val audioPermission = checkSelfPermission(Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED
                    if (audioPermission && request.resources.contains(PermissionRequest.RESOURCE_AUDIO_CAPTURE)) {
                        request.grant(arrayOf(PermissionRequest.RESOURCE_AUDIO_CAPTURE))
                    } else request.deny()
                }
            }
        }
        setContentView(webView)
        loadCanopy(assistantLaunch)
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        assistantLaunch = intent.getBooleanExtra(EXTRA_ASSISTANT_LAUNCH, false)
        loadCanopy(assistantLaunch)
    }

    private fun loadCanopy(asAssistant: Boolean) {
        val suffix = if (asAssistant) "?assistant=1" else ""
        webView.loadUrl("https://appassets.androidplatform.net/assets/index.html$suffix")
    }

    inner class FernBridge {
        @JavascriptInterface fun isNativeAssistant(): Boolean = true
        @JavascriptInterface fun voiceModelStatus(): String = fernVoice.status
        @JavascriptInterface fun prepareVoiceModel() {
            runOnUiThread { Toast.makeText(this@MainActivity, "Preparing Fern's offline voice (about 100 MB, one time)", Toast.LENGTH_LONG).show() }
            fernVoice.prepare()
        }
        @JavascriptInterface fun speak(text: String) {
            if (fernVoice.status != "ready") runOnUiThread {
                Toast.makeText(this@MainActivity, "Fern is downloading its offline voice model (about 100 MB, once)", Toast.LENGTH_LONG).show()
            }
            fernVoice.speak(text.take(MAX_SPEECH_CHARS))
        }
        @JavascriptInterface fun startListening() { beginRecognition() }
        @JavascriptInterface fun stopListening() { runOnUiThread {
            wantsRecognition = false
            try { speechRecognizer?.cancel(); speechRecognizer?.destroy() } catch (_: Exception) { }
            speechRecognizer = null
        } }
        @JavascriptInterface fun openAssistantSettings() { runOnUiThread { requestAssistantRole() } }
    }

    private fun requestAssistantRole() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            val roles = getSystemService(RoleManager::class.java)
            if (roles != null && roles.isRoleAvailable(RoleManager.ROLE_ASSISTANT)) {
                if (roles.isRoleHeld(RoleManager.ROLE_ASSISTANT)) {
                    Toast.makeText(this, "Fern is already your selected assistant", Toast.LENGTH_SHORT).show()
                    return
                }
                try {
                    startActivityForResult(roles.createRequestRoleIntent(RoleManager.ROLE_ASSISTANT), REQUEST_ASSISTANT_ROLE)
                    return
                } catch (_: Exception) {
                    // Some Android builds expose the assistant chooser but do not
                    // allow apps to request the role directly; use system settings.
                }
            }
        }
        try {
            startActivity(Intent(Settings.ACTION_VOICE_INPUT_SETTINGS))
        } catch (_: Exception) {
            AlertDialog.Builder(this)
                .setTitle("Choose Fern as your assistant")
                .setMessage("Open Android Settings → Apps → Default apps → Digital assistant app, then select Fern. The menu names vary by phone maker.")
                .setPositiveButton("OK", null)
                .show()
        }
    }

    private fun beginRecognition() {
        runOnUiThread {
            wantsRecognition = true
            if (checkSelfPermission(Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
                requestPermissions(arrayOf(Manifest.permission.RECORD_AUDIO), REQUEST_MICROPHONE)
                return@runOnUiThread
            }
            startRecognizer()
        }
    }

    private fun startRecognizer() {
        if (!SpeechRecognizer.isRecognitionAvailable(this)) {
            wantsRecognition = false
            dispatchJs("window.fernNativeSpeechError && window.fernNativeSpeechError('unavailable')")
            return
        }
        try {
            speechRecognizer?.destroy()
            val recognizer = SpeechRecognizer.createSpeechRecognizer(this)
            speechRecognizer = recognizer
            recognizer.setRecognitionListener(object : RecognitionListener {
                override fun onReadyForSpeech(params: Bundle?) { if (wantsRecognition && speechRecognizer === recognizer) notifyVoiceState("listening") }
                override fun onBeginningOfSpeech() = Unit
                override fun onRmsChanged(rmsdB: Float) = Unit
                override fun onBufferReceived(buffer: ByteArray?) = Unit
                override fun onEndOfSpeech() = Unit
                override fun onEvent(eventType: Int, params: Bundle?) = Unit
                override fun onPartialResults(partialResults: Bundle?) {
                    val text = partialResults?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)?.firstOrNull()
                    if (wantsRecognition && speechRecognizer === recognizer && !text.isNullOrBlank()) dispatchTranscript(text, false)
                }
                override fun onResults(results: Bundle?) {
                    val text = results?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)?.firstOrNull()
                    if (wantsRecognition && speechRecognizer === recognizer) {
                        if (!text.isNullOrBlank()) dispatchTranscript(text, true) else dispatchSpeechError("empty")
                        wantsRecognition = false
                    }
                    releaseRecognizer(recognizer)
                }
                override fun onError(error: Int) {
                    if (wantsRecognition && speechRecognizer === recognizer) { dispatchSpeechError(error.toString()); wantsRecognition = false }
                    releaseRecognizer(recognizer)
                }
            })
            val request = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
                putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
                putExtra(RecognizerIntent.EXTRA_LANGUAGE, Locale.getDefault().toLanguageTag())
                putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true)
                putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 1)
                putExtra(RecognizerIntent.EXTRA_CALLING_PACKAGE, packageName)
            }
            recognizer.startListening(request)
        } catch (_: Exception) {
            wantsRecognition = false
            dispatchSpeechError("start-failed")
            speechRecognizer?.destroy()
            speechRecognizer = null
        }
    }

    private fun releaseRecognizer(target: SpeechRecognizer) {
        mainHandler.post {
            if (speechRecognizer === target) speechRecognizer = null
            try { target.destroy() } catch (_: Exception) { }
        }
    }

    private fun dispatchTranscript(text: String, isFinal: Boolean) {
        val encoded = JSONObject.quote(text)
        dispatchJs("window.fernNativeTranscript && window.fernNativeTranscript($encoded,$isFinal)")
    }

    private fun dispatchSpeechError(error: String) {
        dispatchJs("window.fernNativeSpeechError && window.fernNativeSpeechError(${JSONObject.quote(error)})")
    }

    private fun notifyVoiceState(state: String) {
        dispatchJs("window.fernNativeSpeechState && window.fernNativeSpeechState(${JSONObject.quote(state)})")
    }

    private fun dispatchJs(script: String) {
        if (!::webView.isInitialized) return
        mainHandler.post { if (!isFinishing && !isDestroyed) webView.evaluateJavascript(script, null) }
    }

    override fun onRequestPermissionsResult(requestCode: Int, permissions: Array<out String>, grantResults: IntArray) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode == REQUEST_MICROPHONE) {
            if (!wantsRecognition) return
            if (grantResults.firstOrNull() == PackageManager.PERMISSION_GRANTED) startRecognizer()
            else { wantsRecognition = false; dispatchSpeechError("permission-denied") }
        }
    }

    override fun onDestroy() {
        wantsRecognition = false
        try { speechRecognizer?.cancel(); speechRecognizer?.destroy() } catch (_: Exception) { }
        speechRecognizer = null
        if (::webView.isInitialized) {
            webView.removeJavascriptInterface("FernNative")
            webView.stopLoading()
            webView.destroy()
        }
        if (::fernVoice.isInitialized) fernVoice.close()
        super.onDestroy()
    }

    companion object {
        const val EXTRA_ASSISTANT_LAUNCH = "com.canopyos.fern.ASSISTANT_LAUNCH"
        private const val REQUEST_MICROPHONE = 41
        private const val REQUEST_ASSISTANT_ROLE = 42
        private const val MAX_SPEECH_CHARS = 1200
    }
}
