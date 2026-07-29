//
//  OmgangerView.swift
//  Ustastrikk (Strikkerikke)
//
//  Skjermer for å administrere prosjekter og strikke gjennom omgangene deres.
//

import SwiftUI
import PhotosUI

/// Liste over alle prosjektene dine, med mulighet til å legge til nye.
struct ProsjektListeView: View {
    @Environment(StrikkeStore.self) private var store

    @State private var showingAddDialog = false
    @State private var newProjectName = ""

    var body: some View {
        @Bindable var store = store

        List {
            ForEach($store.projects) { $project in
                NavigationLink {
                    ProsjektDetaljView(project: $project)
                } label: {
                    HStack(spacing: 14) {
                        thumbnail(for: project)
                        VStack(alignment: .leading, spacing: 4) {
                            Text(project.name.isEmpty ? "Uten navn" : project.name)
                                .font(.headline)
                            Text(statusText(for: project))
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                    }
                }
            }
            .onDelete { store.projects.remove(atOffsets: $0) }
        }
        .navigationTitle("Prosjekter")
        .cozyScreen()
        .overlay {
            if store.projects.isEmpty {
                ContentUnavailableView(
                    "Ingen prosjekter",
                    systemImage: "square.stack.3d.up",
                    description: Text("Trykk på + for å lage ditt første prosjekt.")
                )
            }
        }
        .toolbar {
            ToolbarItem(placement: .primaryAction) {
                Button {
                    showingAddDialog = true
                } label: {
                    Image(systemName: "plus")
                }
            }
        }
        .alert("Nytt prosjekt", isPresented: $showingAddDialog) {
            TextField("Navn", text: $newProjectName)
            Button("Legg til") {
                let name = newProjectName.trimmingCharacters(in: .whitespacesAndNewlines)
                store.projects.append(Project(name: name))
                newProjectName = ""
            }
            Button("Avbryt", role: .cancel) {
                newProjectName = ""
            }
        } message: {
            Text("Gi prosjektet et navn.")
        }
    }

    @ViewBuilder
    private func thumbnail(for project: Project) -> some View {
        if let data = project.imageData, let image = imageFromData(data) {
            image
                .resizable()
                .scaledToFill()
                .frame(width: 48, height: 48)
                .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
        } else {
            RoundedRectangle(cornerRadius: 10, style: .continuous)
                .fill(Theme.secondary.opacity(0.25))
                .frame(width: 48, height: 48)
                .overlay {
                    Image(systemName: "scissors")
                        .foregroundStyle(Theme.secondary)
                }
        }
    }

    private func statusText(for project: Project) -> String {
        if project.rounds.isEmpty {
            return "Ingen omganger ennå"
        }
        if project.currentRoundIndex >= project.rounds.count {
            return "Fullført · \(project.rounds.count) omganger"
        }
        return "Omgang \(project.currentRoundIndex + 1) av \(project.rounds.count)"
    }
}

/// Detaljer for ett prosjekt: rediger navn, bilde, notater, omganger og strikketid.
struct ProsjektDetaljView: View {
    @Binding var project: Project

    @State private var photoItem: PhotosPickerItem?

    var body: some View {
        List {
            Section("Navn") {
                TextField("Prosjektnavn", text: $project.name)
            }

            Section("Bilde") {
                if let data = project.imageData, let image = imageFromData(data) {
                    image
                        .resizable()
                        .scaledToFill()
                        .frame(maxWidth: .infinity)
                        .frame(height: 200)
                        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                        .listRowInsets(EdgeInsets())
                        .padding(.vertical, 4)
                }

                PhotosPicker(selection: $photoItem, matching: .images) {
                    Label(
                        project.imageData == nil ? "Legg til bilde" : "Bytt bilde",
                        systemImage: "photo"
                    )
                }

                if project.imageData != nil {
                    Button("Fjern bilde", role: .destructive) {
                        project.imageData = nil
                        photoItem = nil
                    }
                }
            }

            Section("Notater") {
                TextField(
                    "Skriv notater om prosjektet …",
                    text: $project.notes,
                    axis: .vertical
                )
                .lineLimit(3...10)
            }

            Section {
                HStack(spacing: 12) {
                    Image(systemName: "timer")
                        .foregroundStyle(Theme.secondary)
                    ElapsedTimeView(stopwatch: project.stopwatch)
                    Spacer()
                    Button("Nullstill", role: .destructive) {
                        project.stopwatch.reset()
                    }
                    .font(.subheadline)
                    .disabled(project.stopwatch.elapsed(at: .now) == 0)
                }
            } header: {
                Text("Strikketid")
            } footer: {
                Text("Timeren starter automatisk når du trykker «Start strikking», og pauses når du går tilbake hit.")
            }

            Section {
                ForEach(Array(project.rounds.enumerated()), id: \.element.id) { index, _ in
                    VStack(alignment: .leading, spacing: 4) {
                        Text("Omgang \(index + 1)")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                        TextField(
                            "Mønster for denne omgangen",
                            text: $project.rounds[index].pattern,
                            axis: .vertical
                        )
                    }
                }
                .onDelete { offsets in
                    project.rounds.remove(atOffsets: offsets)
                    clampCurrentIndex()
                }
                .onMove { source, destination in
                    project.rounds.move(fromOffsets: source, toOffset: destination)
                }

                Button {
                    project.rounds.append(Round())
                } label: {
                    Label("Legg til omgang", systemImage: "plus")
                }
            } header: {
                Text("Omganger")
            } footer: {
                if project.rounds.isEmpty {
                    Text("Legg til omgangene du vil følge. Skriv mønsteret i hvert felt.")
                }
            }

            Section {
                NavigationLink {
                    OmgangKjorView(project: $project)
                } label: {
                    Label("Start strikking", systemImage: "play.fill")
                }
                .disabled(project.rounds.isEmpty)
            }
        }
        .cozyScreen()
        .navigationTitle(project.name.isEmpty ? "Prosjekt" : project.name)
        .inlineTitleIfAvailable()
        .onChange(of: photoItem) { _, newItem in
            guard let newItem else { return }
            Task {
                if let data = try? await newItem.loadTransferable(type: Data.self) {
                    project.imageData = downscaledImageData(data)
                }
            }
        }
        #if os(iOS)
        .toolbar {
            EditButton()
        }
        #endif
    }

    /// Sørger for at gjeldende omgang ikke peker utenfor listen etter sletting.
    private func clampCurrentIndex() {
        if project.currentRoundIndex > project.rounds.count {
            project.currentRoundIndex = project.rounds.count
        }
    }
}

/// «Kjøre»-modus: viser omgangnummer, mønster, strikketid og en knapp for å fullføre omgangen.
struct OmgangKjorView: View {
    @Binding var project: Project

    private var isFinished: Bool {
        !project.rounds.isEmpty && project.currentRoundIndex >= project.rounds.count
    }

    var body: some View {
        ZStack {
            content

            if isFinished {
                ConfettiView()
                    .ignoresSafeArea()
            }
        }
        .cozyScreen()
        .navigationTitle("Strikking")
        .inlineTitleIfAvailable()
        .onAppear {
            // Start strikketimeren automatisk (med mindre prosjektet allerede er ferdig).
            if !isFinished {
                project.stopwatch.start(at: .now)
            }
        }
        .onDisappear {
            // Pauser når du går tilbake, slik at tiden samles opp mellom øktene.
            project.stopwatch.pause(at: .now)
        }
    }

    @ViewBuilder
    private var content: some View {
        VStack(spacing: 28) {
            if project.rounds.isEmpty {
                ContentUnavailableView(
                    "Ingen omganger",
                    systemImage: "list.number",
                    description: Text("Legg til omganger først.")
                )
            } else if isFinished {
                VStack(spacing: 24) {
                    Image(systemName: "checkmark.circle.fill")
                        .font(.system(size: 80))
                        .foregroundStyle(Theme.secondary)
                    Text("Ferdig!")
                        .font(.largeTitle.bold())
                    Text("Du har fullført alle \(project.rounds.count) omgangene.")
                        .foregroundStyle(.secondary)
                    Button("Start på nytt") {
                        project.currentRoundIndex = 0
                    }
                    .buttonStyle(.borderedProminent)
                    .controlSize(.large)
                }
            } else {
                let index = project.currentRoundIndex

                HStack(spacing: 10) {
                    Image(systemName: "timer")
                        .foregroundStyle(Theme.accent)
                    ElapsedTimeView(stopwatch: project.stopwatch)
                }
                .cozyCard()
                .padding(.horizontal)

                Spacer()

                Text("Omgang \(index + 1) av \(project.rounds.count)")
                    .font(.headline)
                    .foregroundStyle(.secondary)

                Text(project.rounds[index].pattern.isEmpty ? "—" : project.rounds[index].pattern)
                    .font(.system(size: 34, weight: .semibold, design: .rounded))
                    .multilineTextAlignment(.center)
                    .frame(maxWidth: .infinity)
                    .padding(.horizontal)

                Spacer()

                Button {
                    withAnimation(.snappy) {
                        project.currentRoundIndex += 1
                    }
                    // Stopp timeren og feire når hele prosjektet er fullført.
                    if isFinished {
                        project.stopwatch.pause(at: .now)
                        Fanfare.play()
                    }
                } label: {
                    Text("Fullfør omgang")
                        .font(.title2.bold())
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 8)
                }
                .buttonStyle(.borderedProminent)
                .controlSize(.large)
                .padding(.horizontal)

                if index > 0 {
                    Button("Angre forrige omgang") {
                        project.currentRoundIndex -= 1
                    }
                    .font(.subheadline)
                }
            }
        }
        .padding(.vertical, 32)
    }
}

#Preview {
    NavigationStack {
        ProsjektListeView()
    }
    .environment(StrikkeStore())
    .tint(Theme.accent)
}
