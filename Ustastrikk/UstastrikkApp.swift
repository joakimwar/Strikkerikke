//
//  UstastrikkApp.swift
//  Ustastrikk (Strikkerikke)
//

import SwiftUI
#if os(iOS)
import UIKit
#endif

@main
struct UstastrikkApp: App {
    @State private var store = StrikkeStore()

    init() {
        configureAppearance()
    }

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environment(store)
        }
    }
}

/// Gir navigasjons- og fanelinjene et koselig, avrundet uttrykk som matcher temaet.
private func configureAppearance() {
    #if os(iOS)
    let titleColor = UIColor(Theme.text)

    let navAppearance = UINavigationBarAppearance()
    navAppearance.configureWithOpaqueBackground()
    navAppearance.backgroundColor = UIColor(Theme.background)
    navAppearance.shadowColor = .clear
    navAppearance.largeTitleTextAttributes = [
        .font: roundedUIFont(size: 34, weight: .bold),
        .foregroundColor: titleColor
    ]
    navAppearance.titleTextAttributes = [
        .font: roundedUIFont(size: 18, weight: .semibold),
        .foregroundColor: titleColor
    ]

    UINavigationBar.appearance().standardAppearance = navAppearance
    UINavigationBar.appearance().scrollEdgeAppearance = navAppearance
    UINavigationBar.appearance().compactAppearance = navAppearance

    let tabAppearance = UITabBarAppearance()
    tabAppearance.configureWithOpaqueBackground()
    tabAppearance.backgroundColor = UIColor(Theme.background)
    tabAppearance.shadowColor = .clear

    UITabBar.appearance().standardAppearance = tabAppearance
    UITabBar.appearance().scrollEdgeAppearance = tabAppearance
    #endif
}

#if os(iOS)
/// Lager en systemfont med avrundet design ("SF Rounded").
private func roundedUIFont(size: CGFloat, weight: UIFont.Weight) -> UIFont {
    let base = UIFont.systemFont(ofSize: size, weight: weight)
    if let descriptor = base.fontDescriptor.withDesign(.rounded) {
        return UIFont(descriptor: descriptor, size: size)
    }
    return base
}
#endif
