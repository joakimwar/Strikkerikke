//
//  Theme.swift
//  Ustastrikk (Strikkerikke)
//
//  Farger, font og små hjelpere for et varmt, koselig utseende.
//

import SwiftUI
#if os(iOS)
import UIKit
#elseif os(macOS)
import AppKit
#endif

/// Varm, koselig palett hentet fra app-ikonet (turkis garn, karamellbrun hund,
/// salviegrønn plante på en kremfarget bakgrunn).
enum Theme {
    /// Myk, varm kremfarget bakgrunn.
    static let background = Color(red: 0.96, green: 0.93, blue: 0.85)
    /// Turkis som garnet – hovedaksent.
    static let accent = Color(red: 0.24, green: 0.66, blue: 0.69)
    /// Varm karamellbrun som hunden – sekundærfarge.
    static let secondary = Color(red: 0.78, green: 0.50, blue: 0.29)
    /// Rolig salviegrønn som planten.
    static let tertiary = Color(red: 0.52, green: 0.63, blue: 0.42)
    /// Mørk, varm brun til tekst og overskrifter.
    static let text = Color(red: 0.28, green: 0.20, blue: 0.14)
    /// Farge for kort/rader oppå bakgrunnen.
    static let card = Color(red: 0.99, green: 0.98, blue: 0.95)
}

extension View {
    /// Gir en skjerm den varme bakgrunnen og skjuler standard listebakgrunn.
    func cozyScreen() -> some View {
        self
            .scrollContentBackground(.hidden)
            .background(Theme.background.ignoresSafeArea())
    }

    /// Pakker innhold inn i et mykt, avrundet kort.
    func cozyCard() -> some View {
        self
            .padding()
            .background(Theme.card, in: RoundedRectangle(cornerRadius: 16, style: .continuous))
    }
}

/// Formaterer et tidsintervall som mm:ss eller t:mm:ss.
func formatDuration(_ interval: TimeInterval) -> String {
    let total = max(0, Int(interval))
    let hours = total / 3600
    let minutes = (total % 3600) / 60
    let seconds = total % 60
    if hours > 0 {
        return String(format: "%d:%02d:%02d", hours, minutes, seconds)
    }
    return String(format: "%02d:%02d", minutes, seconds)
}

/// Lager et SwiftUI-`Image` fra rådata, på tvers av plattformer.
func imageFromData(_ data: Data) -> Image? {
    #if os(iOS)
    return UIImage(data: data).map { Image(uiImage: $0) }
    #elseif os(macOS)
    return NSImage(data: data).map { Image(nsImage: $0) }
    #else
    return nil
    #endif
}

/// Skalerer ned og komprimerer et bilde så det ikke tar unødig mye plass i lagringen.
func downscaledImageData(_ data: Data, maxDimension: CGFloat = 1200) -> Data {
    #if os(iOS)
    guard let image = UIImage(data: data) else { return data }
    let maxSide = max(image.size.width, image.size.height)
    guard maxSide > maxDimension else {
        return image.jpegData(compressionQuality: 0.7) ?? data
    }
    let scale = maxDimension / maxSide
    let newSize = CGSize(width: image.size.width * scale, height: image.size.height * scale)
    let renderer = UIGraphicsImageRenderer(size: newSize)
    let resized = renderer.image { _ in
        image.draw(in: CGRect(origin: .zero, size: newSize))
    }
    return resized.jpegData(compressionQuality: 0.7) ?? data
    #else
    return data
    #endif
}
