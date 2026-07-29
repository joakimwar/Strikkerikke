/**
 * Felleselementer for skjermene: topplinje, fanelinje, tomtilstand, meny og
 * dialog. Erstatter SwiftUI-ens navigationTitle/toolbar/Menu/alert.
 */

import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { ChevronLeft } from '../icons'
import { goBack } from '../hooks'

export function Navbar({
  title,
  large = false,
  back = false,
  trailing,
}: {
  title: string
  large?: boolean
  back?: boolean
  trailing?: ReactNode
}) {
  return (
    <header className={large ? 'navbar navbar--large' : 'navbar'}>
      {!large && (
        <div className="navbar__leading">
          {back && (
            <button type="button" className="iconbutton" onClick={goBack}>
              <ChevronLeft />
              <span className="visually-hidden">Tilbake</span>
            </button>
          )}
        </div>
      )}
      <h1 className="navbar__title">{title}</h1>
      <div className="navbar__trailing">{trailing}</div>
    </header>
  )
}

export function EmptyState({
  icon,
  title,
  body,
}: {
  icon: ReactNode
  title: string
  body: string
}) {
  return (
    <div className="empty">
      <div className="empty__icon">{icon}</div>
      <p className="empty__title">{title}</p>
      <p className="empty__body">{body}</p>
    </div>
  )
}

export function Section({
  header,
  footer,
  card = true,
  children,
}: {
  header?: string
  footer?: ReactNode
  card?: boolean
  children: ReactNode
}) {
  return (
    <section className="section">
      {header && <h2 className="section__header">{header}</h2>}
      {card ? <div className="card">{children}</div> : children}
      {footer && <p className="section__footer">{footer}</p>}
    </section>
  )
}

/** Nedtrekksmeny, som SwiftUI-ens Menu i verktøylinja. */
export function Menu({ label, children }: { label: ReactNode; children: ReactNode }) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  return (
    <div className="menu">
      <button
        type="button"
        className="iconbutton"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        {label}
      </button>
      {open && (
        <>
          <button
            type="button"
            className="scrim"
            aria-label="Lukk meny"
            onClick={() => setOpen(false)}
          />
          <div className="menu__panel" role="menu" onClick={() => setOpen(false)}>
            {children}
          </div>
        </>
      )}
    </div>
  )
}

export function MenuItem({
  icon,
  children,
  onClick,
  disabled,
  destructive,
}: {
  icon?: ReactNode
  children: ReactNode
  onClick: () => void
  disabled?: boolean
  destructive?: boolean
}) {
  return (
    <button
      type="button"
      role="menuitem"
      className={destructive ? 'menu__item menu__item--destructive' : 'menu__item'}
      onClick={onClick}
      disabled={disabled}
    >
      {icon}
      <span>{children}</span>
    </button>
  )
}

/**
 * Dialog med valgfritt tekstfelt – dekker både «Nytt prosjekt»-alerten og
 * bekreftelse før sletting.
 */
export function Dialog({
  title,
  message,
  placeholder,
  confirmLabel,
  cancelLabel = 'Avbryt',
  destructive = false,
  onConfirm,
  onCancel,
}: {
  title: string
  message?: string
  placeholder?: string
  confirmLabel: string
  cancelLabel?: string
  destructive?: boolean
  onConfirm: (value: string) => void
  onCancel: () => void
}) {
  const [value, setValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const titleId = useId()
  const hasInput = placeholder !== undefined

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onCancel])

  return (
    <div className="dialog-backdrop" onClick={onCancel}>
      <div
        className="dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(event) => event.stopPropagation()}
      >
        <h2 className="dialog__title" id={titleId}>
          {title}
        </h2>
        {message && <p className="dialog__message">{message}</p>}
        {hasInput && (
          <form
            onSubmit={(event) => {
              event.preventDefault()
              onConfirm(value)
            }}
          >
            <input
              ref={inputRef}
              className="dialog__input"
              placeholder={placeholder}
              value={value}
              onChange={(event) => setValue(event.target.value)}
            />
          </form>
        )}
        <div className="dialog__actions">
          <button
            type="button"
            className={
              destructive ? 'button button--plain button--destructive' : 'button button--plain'
            }
            onClick={() => onConfirm(value)}
          >
            {confirmLabel}
          </button>
          <button type="button" className="button button--plain" onClick={onCancel}>
            {cancelLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
