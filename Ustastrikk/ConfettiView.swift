//
//  ConfettiView.swift
//  Ustastrikk (Strikkerikke)
//
//  En raus konfetti-effekt bygget kun med SwiftUI (ingen eksterne pakker).
//

import SwiftUI

/// Viser en engangs-«burst» med masse konfetti – både fargede biter og
/// 🐶/🧶-emojier – som daler nedover skjermen når visningen dukker opp.
struct ConfettiView: View {

    /// Beskrivelsen av én konfettibit. Genereres én gang så den ikke endrer seg ved omtegning.
    private struct Piece: Identifiable {
        let id = UUID()
        let xFraction: CGFloat
        let color: Color
        let width: CGFloat
        let height: CGFloat
        let delay: Double
        let spin: Double
        let isCircle: Bool
        let duration: Double
        /// Hvis satt, tegnes denne emojien i stedet for en farget figur.
        let emoji: String?
        let emojiSize: CGFloat
    }

    private let pieces: [Piece]

    init(count: Int = 340) {
        let colors: [Color] = [
            .red, .orange, .yellow, .green, .mint, .teal,
            .blue, .indigo, .purple, .pink,
            Theme.accent, Theme.secondary, Theme.tertiary
        ]
        let emojis = ["🐶", "🧶"]

        pieces = (0..<count).map { _ in
            // Omtrent hver femte bit er en emoji, resten er fargede figurer.
            let emoji: String? = Int.random(in: 0..<5) == 0 ? emojis.randomElement() : nil
            return Piece(
                xFraction: .random(in: 0...1),
                color: colors.randomElement() ?? .pink,
                width: .random(in: 7...14),
                height: .random(in: 10...20),
                delay: .random(in: 0...1.0),
                spin: .random(in: 180...1080) * (Bool.random() ? 1 : -1),
                isCircle: Bool.random(),
                duration: .random(in: 2.4...3.6),
                emoji: emoji,
                emojiSize: .random(in: 26...46)
            )
        }
    }

    var body: some View {
        GeometryReader { geo in
            ZStack {
                ForEach(pieces) { piece in
                    ConfettiPiece(piece: piece, size: geo.size)
                }
            }
        }
        .allowsHitTesting(false)
    }

    /// En enkelt konfettibit (figur eller emoji) som animerer fra toppen og ut av bunnen.
    private struct ConfettiPiece: View {
        let piece: Piece
        let size: CGSize

        @State private var isFalling = false

        var body: some View {
            visual
                .rotationEffect(.degrees(isFalling ? piece.spin : 0))
                .position(
                    x: piece.xFraction * size.width,
                    y: isFalling ? size.height + 60 : -60
                )
                .opacity(isFalling ? 0 : 1)
                .onAppear {
                    withAnimation(.easeIn(duration: piece.duration).delay(piece.delay)) {
                        isFalling = true
                    }
                }
        }

        @ViewBuilder
        private var visual: some View {
            if let emoji = piece.emoji {
                Text(emoji)
                    .font(.system(size: piece.emojiSize))
            } else {
                shape
                    .fill(piece.color)
                    .frame(width: piece.width, height: piece.height)
            }
        }

        private var shape: AnyShape {
            piece.isCircle ? AnyShape(Circle()) : AnyShape(RoundedRectangle(cornerRadius: 2))
        }
    }
}

#Preview {
    ZStack {
        Color.gray.opacity(0.15)
        Text("🎉")
            .font(.system(size: 80))
        ConfettiView()
    }
    .ignoresSafeArea()
}
