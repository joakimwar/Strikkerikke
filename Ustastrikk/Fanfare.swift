//
//  Fanfare.swift
//  Ustastrikk (Strikkerikke)
//
//  En kort, feststemt fanfare som genereres i koden (ingen lydfil trengs).
//

import Foundation
import AVFoundation

/// Spiller en liten oppadgående fanfare når et prosjekt fullføres.
enum Fanfare {

    /// Holder på spilleren så den ikke frigjøres mens lyden spilles.
    private static var player: AVAudioPlayer?

    static func play() {
        #if os(iOS)
        // .ambient respekterer stillebryteren, så vi ikke skremmer noen.
        let session = AVAudioSession.sharedInstance()
        try? session.setCategory(.ambient, options: [])
        try? session.setActive(true)
        #endif

        guard let data = makeWav() else { return }
        do {
            let newPlayer = try AVAudioPlayer(data: data)
            newPlayer.prepareToPlay()
            newPlayer.play()
            player = newPlayer
        } catch {
            // Lyden er «nice to have» – vi ignorerer feil i stillhet.
        }
    }

    // MARK: - Lydgenerering

    /// Bygger en liten fanfare (C-dur-oppgang som ender i en oktav) som PCM-WAV-data.
    private static func makeWav() -> Data? {
        let sampleRate = 44_100.0
        let duration = 1.4
        let totalSamples = Int(sampleRate * duration)
        var samples = [Double](repeating: 0, count: totalSamples)

        // (frekvens, starttid i sekunder, lengde i sekunder)
        let notes: [(freq: Double, start: Double, length: Double)] = [
            (523.25, 0.00, 1.0),   // C5
            (659.25, 0.12, 0.9),   // E5
            (783.99, 0.24, 0.9),   // G5
            (1046.50, 0.40, 1.0)   // C6
        ]

        for note in notes {
            let startIndex = Int(note.start * sampleRate)
            let noteSamples = Int(note.length * sampleRate)
            for i in 0..<noteSamples {
                let index = startIndex + i
                if index >= totalSamples { break }
                let t = Double(i) / sampleRate
                // Mild decay-envelope for en klokkeaktig tone.
                let envelope = exp(-3.0 * t)
                // Grunntone + litt 2. harmonisk gir en lysere, festligere klang.
                let tone = sin(2 * .pi * note.freq * t) * 0.7
                         + sin(2 * .pi * note.freq * 2 * t) * 0.2
                samples[index] += tone * envelope * 0.28
            }
        }

        // Konverter til 16-bit og pakk i en WAV-beholder.
        var pcm = [Int16](repeating: 0, count: totalSamples)
        for i in 0..<totalSamples {
            let clamped = max(-1.0, min(1.0, samples[i]))
            pcm[i] = Int16(clamped * Double(Int16.max))
        }
        return wavData(from: pcm, sampleRate: Int(sampleRate))
    }

    /// Pakker 16-bit mono-PCM inn i en gyldig WAV-fil.
    private static func wavData(from samples: [Int16], sampleRate: Int) -> Data {
        let channels = 1
        let bitsPerSample = 16
        let byteRate = sampleRate * channels * bitsPerSample / 8
        let blockAlign = channels * bitsPerSample / 8
        let dataSize = samples.count * bitsPerSample / 8

        var data = Data()
        func appendString(_ string: String) { data.append(contentsOf: Array(string.utf8)) }
        func appendUInt32(_ value: UInt32) {
            var v = value.littleEndian
            withUnsafeBytes(of: &v) { data.append(contentsOf: $0) }
        }
        func appendUInt16(_ value: UInt16) {
            var v = value.littleEndian
            withUnsafeBytes(of: &v) { data.append(contentsOf: $0) }
        }

        appendString("RIFF")
        appendUInt32(UInt32(36 + dataSize))
        appendString("WAVE")
        appendString("fmt ")
        appendUInt32(16)                       // fmt-blokkens lengde
        appendUInt16(1)                        // PCM-format
        appendUInt16(UInt16(channels))
        appendUInt32(UInt32(sampleRate))
        appendUInt32(UInt32(byteRate))
        appendUInt16(UInt16(blockAlign))
        appendUInt16(UInt16(bitsPerSample))
        appendString("data")
        appendUInt32(UInt32(dataSize))
        for sample in samples {
            var v = sample.littleEndian
            withUnsafeBytes(of: &v) { data.append(contentsOf: $0) }
        }
        return data
    }
}
