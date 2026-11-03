package com.canopyos.fern

import android.content.Context
import android.media.AudioAttributes
import android.media.AudioFormat
import android.media.AudioTrack
import com.k2fsa.sherpa.onnx.GenerationConfig
import com.k2fsa.sherpa.onnx.OfflineTts
import com.k2fsa.sherpa.onnx.OfflineTtsConfig
import com.k2fsa.sherpa.onnx.OfflineTtsKokoroModelConfig
import com.k2fsa.sherpa.onnx.OfflineTtsModelConfig
import org.apache.commons.compress.compressors.bzip2.BZip2CompressorInputStream
import org.apache.commons.compress.archivers.tar.TarArchiveInputStream
import java.io.BufferedInputStream
import java.io.File
import java.io.FileInputStream
import java.io.FileOutputStream
import java.net.HttpURLConnection
import java.net.URL
import java.security.MessageDigest
import java.util.concurrent.Executors

/** Offline Kokoro voice. The Android system TTS engine is deliberately never used. */
class FernKokoroVoice(context: Context, private val onState: (String) -> Unit) {
    private val appContext = context.applicationContext
    private val executor = Executors.newSingleThreadExecutor { task -> Thread(task, "fern-kokoro-tts") }
    private val voiceRoot = File(appContext.filesDir, "fern-voice")
    private val modelDir = File(voiceRoot, MODEL_DIRECTORY)
    @Volatile var status: String = "missing"
        private set
    @Volatile private var closed = false
    private var tts: OfflineTts? = null

    fun prepare() {
        if (closed || status == "ready" || status == "downloading" || status == "installing") return
        executor.execute {
            try {
                ensureModel()
                loadModel()
                setStatus("ready")
            } catch (_: Exception) {
                setStatus("error")
            }
        }
    }

    fun speak(text: String) {
        val cleanText = text.trim().take(MAX_CHARS)
        if (closed || cleanText.isEmpty()) return
        executor.execute {
            try {
                ensureModel()
                val engine = loadModel()
                val generation = GenerationConfig().apply {
                    setSid(FERN_SPEAKER_ID)
                    setSpeed(1.0f)
                    setSilenceScale(0.2f)
                }
                val audio = engine.generateWithConfigAndCallback(cleanText, generation) { 1 }
                val samples = audio.samples
                if (samples.isEmpty()) throw IllegalStateException("Kokoro returned no audio")
                setStatus("ready")
                onState("speaking")
                play(samples, audio.sampleRate)
                onState("idle")
            } catch (_: Exception) {
                onState("idle")
                setStatus("error")
            }
        }
    }

    private fun loadModel(): OfflineTts {
        tts?.let { return it }
        val config = OfflineTtsConfig().apply {
            val kokoro = OfflineTtsKokoroModelConfig().apply {
                setModel(File(modelDir, "model.onnx").absolutePath)
                setVoices(File(modelDir, "voices.bin").absolutePath)
                setTokens(File(modelDir, "tokens.txt").absolutePath)
                setDataDir(File(modelDir, "espeak-ng-data").absolutePath)
            }
            val model = OfflineTtsModelConfig().apply {
                setKokoro(kokoro)
                setNumThreads(2)
                setDebug(false)
                setProvider("cpu")
            }
            setModel(model)
            setMaxNumSentences(1)
        }
        return OfflineTts(config).also { tts = it }
    }

    private fun ensureModel() {
        if (validModelDirectory(modelDir)) {
            setStatus("ready")
            return
        }
        voiceRoot.mkdirs()
        val archive = File(appContext.cacheDir, "$MODEL_DIRECTORY.tar.bz2.part")
        if (!archive.exists() || sha256(archive) != MODEL_SHA256) {
            archive.delete()
            setStatus("downloading")
            downloadModel(archive)
        }
        if (sha256(archive) != MODEL_SHA256) {
            archive.delete()
            throw IllegalStateException("Fern voice model checksum did not match")
        }
        setStatus("installing")
        val extraction = File(voiceRoot, "extracting").apply { deleteRecursively(); mkdirs() }
        try {
            extractSafely(archive, extraction)
            val modelFile = extraction.walkTopDown().firstOrNull { it.isFile && (it.name == "model.onnx" || it.name == "model.int8.onnx") }
                ?: throw IllegalStateException("Kokoro model was not in the archive")
            val extractedModel = modelFile.parentFile ?: throw IllegalStateException("Kokoro model directory was not found")
            if (modelFile.name == "model.int8.onnx" && !modelFile.renameTo(File(extractedModel, "model.onnx"))) {
                throw IllegalStateException("Could not prepare the quantized Kokoro model")
            }
            if (!validModelDirectory(extractedModel)) throw IllegalStateException("Kokoro archive is incomplete")
            modelDir.deleteRecursively()
            if (!extractedModel.renameTo(modelDir)) throw IllegalStateException("Could not install Fern voice files")
        } finally {
            extraction.deleteRecursively()
            archive.delete()
        }
        if (!validModelDirectory(modelDir)) throw IllegalStateException("Fern voice installation is incomplete")
        setStatus("ready")
    }

    private fun downloadModel(destination: File) {
        val connection = (URL(MODEL_URL).openConnection() as HttpURLConnection).apply {
            connectTimeout = 20_000
            readTimeout = 45_000
            instanceFollowRedirects = true
            setRequestProperty("User-Agent", "CanopyOS-Fern-Android/1.0")
        }
        try {
            connection.connect()
            if (connection.responseCode !in 200..299) throw IllegalStateException("Voice download failed (${connection.responseCode})")
            connection.inputStream.use { input ->
                FileOutputStream(destination).use { output ->
                    val buffer = ByteArray(64 * 1024)
                    while (true) {
                        if (closed) throw InterruptedException("Fern is closing")
                        val count = input.read(buffer)
                        if (count < 0) break
                        output.write(buffer, 0, count)
                    }
                    output.fd.sync()
                }
            }
        } finally {
            connection.disconnect()
        }
    }

    private fun extractSafely(archive: File, destination: File) {
        val root = destination.canonicalFile
        TarArchiveInputStream(BufferedInputStream(BZip2CompressorInputStream(BufferedInputStream(FileInputStream(archive))))).use { tar ->
            var entry = tar.nextTarEntry
            val buffer = ByteArray(64 * 1024)
            while (entry != null) {
                if (closed) throw InterruptedException("Fern is closing")
                val normalized = entry.name.replace('\\', '/')
                if (normalized.startsWith("/") || normalized.split('/').any { it == ".." }) {
                    throw IllegalStateException("Unsafe path in voice archive")
                }
                val output = File(destination, normalized).canonicalFile
                if (!output.path.startsWith(root.path + File.separator)) throw IllegalStateException("Unsafe voice archive entry")
                if (entry.isDirectory) output.mkdirs()
                else if (entry.isFile) {
                    output.parentFile?.mkdirs()
                    FileOutputStream(output).use { stream ->
                        while (true) {
                            val read = tar.read(buffer)
                            if (read < 0) break
                            stream.write(buffer, 0, read)
                        }
                    }
                }
                entry = tar.nextTarEntry
            }
        }
    }

    private fun validModelDirectory(directory: File): Boolean =
        File(directory, "model.onnx").isFile &&
            File(directory, "voices.bin").isFile &&
            File(directory, "tokens.txt").isFile &&
            File(directory, "espeak-ng-data").isDirectory

    private fun sha256(file: File): String {
        val digest = MessageDigest.getInstance("SHA-256")
        FileInputStream(file).use { input ->
            val buffer = ByteArray(128 * 1024)
            while (true) {
                val count = input.read(buffer)
                if (count < 0) break
                digest.update(buffer, 0, count)
            }
        }
        return digest.digest().joinToString("") { "%02x".format(it) }
    }

    private fun play(samples: FloatArray, sampleRate: Int) {
        val minBuffer = AudioTrack.getMinBufferSize(sampleRate, AudioFormat.CHANNEL_OUT_MONO, AudioFormat.ENCODING_PCM_FLOAT)
        val track = AudioTrack.Builder()
            .setAudioAttributes(AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_ASSISTANT)
                .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
                .build())
            .setAudioFormat(AudioFormat.Builder()
                .setSampleRate(sampleRate)
                .setEncoding(AudioFormat.ENCODING_PCM_FLOAT)
                .setChannelMask(AudioFormat.CHANNEL_OUT_MONO)
                .build())
            .setBufferSizeInBytes(maxOf(minBuffer, sampleRate * Float.SIZE_BYTES))
            .setTransferMode(AudioTrack.MODE_STREAM)
            .build()
        try {
            track.play()
            var offset = 0
            while (offset < samples.size && !closed) {
                val written = track.write(samples, offset, samples.size - offset, AudioTrack.WRITE_BLOCKING)
                if (written <= 0) break
                offset += written
            }
            try { track.stop() } catch (_: IllegalStateException) { }
        } finally {
            track.release()
        }
    }

    private fun setStatus(value: String) {
        status = value
        onState(value)
    }

    fun close() {
        closed = true
        try { executor.execute { tts?.release(); tts = null } } catch (_: Exception) { }
        executor.shutdown()
    }

    companion object {
        private const val MODEL_DIRECTORY = "kokoro-en-v0_19"
        private const val MODEL_URL = "https://github.com/k2-fsa/sherpa-onnx/releases/download/tts-models/kokoro-int8-en-v0_19.tar.bz2"
        private const val MODEL_SHA256 = "c9f0dd393615805b0bab050c340834d5e684e732aec91c0e860cd30e982c08bd"
        private const val FERN_SPEAKER_ID = 3 // Kokoro v0.19 af_sarah; one consistent Fern voice.
        private const val MAX_CHARS = 1200
    }
}
