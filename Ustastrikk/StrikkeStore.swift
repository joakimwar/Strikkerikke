//
//  StrikkeStore.swift
//  Ustastrikk (Strikkerikke)
//
//  Datamodell og lagring for appen.
//

import Foundation
import Observation
import SwiftUI

extension View {
    /// Bruker inline-tittel på iOS, uten å feile på plattformer der modifieren ikke finnes.
    func inlineTitleIfAvailable() -> some View {
        #if os(iOS)
        return navigationBarTitleDisplayMode(.inline)
        #else
        return self
        #endif
    }
}

/// En stoppeklokke som kan pauses og gjenopptas. Lagrer akkumulert tid pluss
/// tidspunktet den sist ble startet, så den viser riktig tid selv etter en pause.
struct Stopwatch: Codable, Hashable {
    var accumulated: TimeInterval = 0
    var startedAt: Date? = nil

    var isRunning: Bool { startedAt != nil }

    /// Total tid frem til `now`, inkludert pågående kjøring.
    func elapsed(at now: Date) -> TimeInterval {
        accumulated + (startedAt.map { now.timeIntervalSince($0) } ?? 0)
    }

    /// Starter klokka hvis den står stille (ellers gjør ingenting).
    mutating func start(at now: Date) {
        if startedAt == nil { startedAt = now }
    }

    /// Pauser klokka og legger pågående tid til det akkumulerte (ellers ingenting).
    mutating func pause(at now: Date) {
        if let startedAt {
            accumulated += now.timeIntervalSince(startedAt)
            self.startedAt = nil
        }
    }

    /// Nullstiller tiden og starter på nytt fra `now`.
    mutating func restart(at now: Date) {
        accumulated = 0
        startedAt = now
    }

    mutating func reset() {
        accumulated = 0
        startedAt = nil
    }
}

/// En enkelt omgang med et mønster/en kommentar som beskriver hva du skal strikke.
struct Round: Identifiable, Codable, Hashable {
    var id = UUID()
    var pattern: String = ""
}

/// Et strikkeprosjekt med navn, egne omganger, notater, bilde, fremdrift og strikketid.
struct Project: Identifiable, Codable, Hashable {
    var id = UUID()
    var name: String = ""
    var rounds: [Round] = []
    /// Hvilken omgang du er på nå (0-basert). Blir lik `rounds.count` når prosjektet er fullført.
    var currentRoundIndex: Int = 0
    var notes: String = ""
    var imageData: Data? = nil
    var stopwatch = Stopwatch()
}

/// Sentralt lager for appens tilstand. Lagres automatisk til `UserDefaults`
/// slik at du ikke mister fremgangen når appen lukkes.
@Observable
final class StrikkeStore {

    /// Alle strikkeprosjektene dine.
    var projects: [Project] = [] {
        didSet { save() }
    }

    /// Verdien i rad-telleren (delt på tvers av prosjekter).
    var rowCount: Int = 0 {
        didSet { save() }
    }

    /// Total strikketid for rad-telleren.
    var rowStopwatch = Stopwatch() {
        didSet { save() }
    }

    /// Tid brukt på den inneværende raden (nullstilles hver gang du øker rad-tallet).
    var currentRowStopwatch = Stopwatch() {
        didSet { save() }
    }

    // MARK: - Lagring

    private static let storageKey = "strikkerikke.state.v3"

    /// Kodbar representasjon av hele tilstanden. Dekoding er tolerant for nye felt,
    /// slik at eksisterende data ikke går tapt når modellen utvides.
    private struct Snapshot: Codable {
        var projects: [Project]
        var rowCount: Int
        var rowStopwatch: Stopwatch
        var currentRowStopwatch: Stopwatch

        enum CodingKeys: String, CodingKey {
            case projects, rowCount, rowStopwatch, currentRowStopwatch
        }

        init(projects: [Project], rowCount: Int, rowStopwatch: Stopwatch, currentRowStopwatch: Stopwatch) {
            self.projects = projects
            self.rowCount = rowCount
            self.rowStopwatch = rowStopwatch
            self.currentRowStopwatch = currentRowStopwatch
        }

        init(from decoder: Decoder) throws {
            let container = try decoder.container(keyedBy: CodingKeys.self)
            projects = try container.decode([Project].self, forKey: .projects)
            rowCount = try container.decode(Int.self, forKey: .rowCount)
            rowStopwatch = (try? container.decode(Stopwatch.self, forKey: .rowStopwatch)) ?? Stopwatch()
            currentRowStopwatch = (try? container.decode(Stopwatch.self, forKey: .currentRowStopwatch)) ?? Stopwatch()
        }
    }

    init() {
        guard
            let data = UserDefaults.standard.data(forKey: Self.storageKey),
            let snapshot = try? JSONDecoder().decode(Snapshot.self, from: data)
        else { return }

        // Direkte tilordning i init utløser ikke `didSet`, så vi lagrer ikke unødvendig her.
        projects = snapshot.projects
        rowCount = snapshot.rowCount
        rowStopwatch = snapshot.rowStopwatch
        currentRowStopwatch = snapshot.currentRowStopwatch
    }

    private func save() {
        let snapshot = Snapshot(
            projects: projects,
            rowCount: rowCount,
            rowStopwatch: rowStopwatch,
            currentRowStopwatch: currentRowStopwatch
        )
        if let data = try? JSONEncoder().encode(snapshot) {
            UserDefaults.standard.set(data, forKey: Self.storageKey)
        }
    }
}
