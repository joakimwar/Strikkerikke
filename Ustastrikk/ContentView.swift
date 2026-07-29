//
//  ContentView.swift
//  Ustastrikk (Strikkerikke)
//

import SwiftUI

/// Rot-visningen med en fanelinje nederst, slik at både prosjekter og
/// rad-telleren alltid er ett trykk unna.
struct ContentView: View {
    var body: some View {
        TabView {
            NavigationStack {
                ProsjektListeView()
            }
            .tabItem {
                Label("Prosjekter", systemImage: "square.stack.3d.up.fill")
            }

            NavigationStack {
                RadTellerView()
            }
            .tabItem {
                Label("Rad-teller", systemImage: "number.circle.fill")
            }
        }
        .tint(Theme.accent)
        .fontDesign(.rounded)
        .preferredColorScheme(.light)
    }
}

#Preview {
    ContentView()
        .environment(StrikkeStore())
}
