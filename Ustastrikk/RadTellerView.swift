//
//  RadTellerView.swift
//  Ustastrikk (Strikkerikke)
//

import SwiftUI

/// Rad-teller med stoppeklokke og tidsoversikt.
/// Timeren styres av knappene: Start → (+1 / Pause) → Fortsett.
struct RadTellerView: View {
    @Environment(StrikkeStore.self) private var store

    /// Timeren går akkurat nå.
    private var isRunning: Bool {
        store.rowStopwatch.isRunning
    }

    /// Ingenting er startet ennå (frisk skjerm).
    private var notStarted: Bool {
        !isRunning && store.rowStopwatch.accumulated == 0
    }

    var body: some View {
        VStack(spacing: 28) {
            Spacer()

            Text("Rad")
                .font(.title3)
                .foregroundStyle(.secondary)

            Text("\(store.rowCount)")
                .font(.system(size: 120, weight: .bold, design: .rounded))
                .foregroundStyle(Theme.accent)
                .contentTransition(.numericText())
                .animation(.snappy, value: store.rowCount)

            Spacer()

            // Tidsoversikt: inneværende rad, snitt per rad og total.
            TimelineView(.periodic(from: .now, by: 1)) { context in
                let total = store.rowStopwatch.elapsed(at: context.date)
                let current = store.currentRowStopwatch.elapsed(at: context.date)
                let average = store.rowCount > 0 ? total / Double(store.rowCount) : 0

                HStack(spacing: 12) {
                    statCard("Denne raden", current, color: Theme.accent, icon: "timer")
                    statCard("Snitt/rad", average, color: Theme.tertiary, icon: "chart.bar.fill")
                    statCard("Totalt", total, color: Theme.secondary, icon: "clock.fill")
                }
            }
            .padding(.horizontal)

            controls
                .padding(.horizontal)
        }
        .padding(.vertical, 32)
        .cozyScreen()
        .navigationTitle("Rad-teller")
        .inlineTitleIfAvailable()
        .toolbar {
            ToolbarItem(placement: .primaryAction) {
                Menu {
                    Button {
                        if store.rowCount > 0 { store.rowCount -= 1 }
                    } label: {
                        Label("Trekk fra én rad", systemImage: "minus")
                    }
                    .disabled(store.rowCount == 0)

                    Button(role: .destructive) {
                        withAnimation(.snappy) {
                            store.rowCount = 0
                            store.rowStopwatch.reset()
                            store.currentRowStopwatch.reset()
                        }
                    } label: {
                        Label("Nullstill alt", systemImage: "arrow.counterclockwise")
                    }
                } label: {
                    Image(systemName: "ellipsis.circle")
                }
            }
        }
    }

    /// Knappene nederst, avhengig av om timeren går.
    @ViewBuilder
    private var controls: some View {
        if isRunning {
            VStack(spacing: 12) {
                Button {
                    withAnimation(.snappy) {
                        store.rowCount += 1
                        store.currentRowStopwatch.restart(at: .now)
                    }
                } label: {
                    Text("+1")
                        .font(.system(size: 40, weight: .bold, design: .rounded))
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 16)
                }
                .buttonStyle(.borderedProminent)
                .controlSize(.large)

                Button {
                    withAnimation(.snappy) {
                        store.rowStopwatch.pause(at: .now)
                        store.currentRowStopwatch.pause(at: .now)
                    }
                } label: {
                    Label("Pause", systemImage: "pause.fill")
                        .frame(maxWidth: .infinity)
                }
                .buttonStyle(.bordered)
                .controlSize(.large)
            }
        } else {
            Button {
                withAnimation(.snappy) {
                    store.rowStopwatch.start(at: .now)
                    store.currentRowStopwatch.start(at: .now)
                }
            } label: {
                Label(notStarted ? "Start" : "Fortsett", systemImage: "play.fill")
                    .font(.system(size: 32, weight: .bold, design: .rounded))
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 16)
            }
            .buttonStyle(.borderedProminent)
            .controlSize(.large)
        }
    }

    private func statCard(_ title: String, _ time: TimeInterval, color: Color, icon: String) -> some View {
        VStack(spacing: 6) {
            Image(systemName: icon)
                .foregroundStyle(color)
            Text(title)
                .font(.caption)
                .foregroundStyle(.secondary)
            Text(formatDuration(time))
                .font(.system(.headline, design: .rounded).monospacedDigit())
                .contentTransition(.numericText())
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 14)
        .background(Theme.card, in: RoundedRectangle(cornerRadius: 16, style: .continuous))
    }
}

#Preview {
    NavigationStack {
        RadTellerView()
    }
    .environment(StrikkeStore())
    .tint(Theme.accent)
}
