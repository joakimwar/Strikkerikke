//
//  StopwatchView.swift
//  Ustastrikk (Strikkerikke)
//
//  Gjenbrukbar tidsvisning for strikketid.
//

import SwiftUI

/// Viser tiden fra en `Stopwatch` og oppdateres hvert sekund mens den går.
/// Rent lesevisning – start/pause styres automatisk av skjermene.
struct ElapsedTimeView: View {
    let stopwatch: Stopwatch
    var font: Font = .system(.title2, design: .rounded).weight(.semibold)

    var body: some View {
        // Oppdaterer visningen hvert sekund uten Combine.
        TimelineView(.periodic(from: .now, by: 1)) { context in
            Text(formatDuration(stopwatch.elapsed(at: context.date)))
                .font(font.monospacedDigit())
                .contentTransition(.numericText())
        }
    }
}

#Preview {
    ElapsedTimeView(stopwatch: Stopwatch(accumulated: 3725))
        .cozyCard()
        .padding()
}
