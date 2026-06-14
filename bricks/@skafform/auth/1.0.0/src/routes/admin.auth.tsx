import { redirect, useSearchParams } from "react-router"
import type { LoaderFunctionArgs, ActionFunctionArgs } from "react-router"
import { useState } from "react"
import { getAdapter } from "@skafform/core/runtime"
import { db } from "@skafform/core/db"
import { skafformAuthSettings, skafformAuthMessages } from "../db/schema"

type MessageType = "welcome" | "verification" | "reset-password"

type MessageEntry = { type: string; language: string; subject: string; html: string }

const MESSAGE_TYPES: { value: MessageType; label: string }[] = [
  { value: "welcome",        label: "Bienvenue" },
  { value: "verification",   label: "Vérification d'email" },
  { value: "reset-password", label: "Réinitialisation du mot de passe" },
]

const LANG_LABELS: Record<string, string> = {
  en: "English",
  fr: "Français",
  es: "Español",
  de: "Deutsch",
  pt: "Português",
  it: "Italiano",
  nl: "Nederlands",
  ja: "日本語",
  zh: "中文",
}

const DEFAULT_MESSAGES: Record<MessageType, { subject: string; html: string }> = {
  "welcome": {
    subject: "Welcome to {{site_name}}!",
    html: `<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 32px; color: #111;">
  <h2 style="font-size: 24px; font-weight: 700; margin-bottom: 16px;">Welcome, {{name}}!</h2>
  <p>Your account has been created successfully. We're glad to have you on board.</p>
  <a href="{{link}}" style="display: inline-block; margin: 24px 0; padding: 12px 24px; background: #000; color: #fff; text-decoration: none; border-radius: 6px; font-weight: 600;">Go to your account</a>
  <p style="color: #666; font-size: 14px;">If you have any questions, feel free to reach out.</p>
</div>`,
  },
  "verification": {
    subject: "Verify your email",
    html: `<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 32px; color: #111;">
  <h2 style="font-size: 24px; font-weight: 700; margin-bottom: 16px;">Verify your email</h2>
  <p>Hello {{name}},</p>
  <p>Click the link below to verify your email address.</p>
  <a href="{{link}}" style="display: inline-block; margin: 24px 0; padding: 12px 24px; background: #000; color: #fff; text-decoration: none; border-radius: 6px; font-weight: 600;">Verify email</a>
  <p style="color: #666; font-size: 14px;">If you didn't create an account, you can ignore this email.</p>
</div>`,
  },
  "reset-password": {
    subject: "Reset your password",
    html: `<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 32px; color: #111;">
  <h2 style="font-size: 24px; font-weight: 700; margin-bottom: 16px;">Reset your password</h2>
  <p>Hello {{name}},</p>
  <p>Click the link below to reset your password. This link expires in 1 hour.</p>
  <a href="{{link}}" style="display: inline-block; margin: 24px 0; padding: 12px 24px; background: #000; color: #fff; text-decoration: none; border-radius: 6px; font-weight: 600;">Reset password</a>
  <p style="color: #666; font-size: 14px;">If you didn't request a password reset, you can safely ignore this email.</p>
</div>`,
  },
}

const PREVIEW_VARS: Record<string, string> = {
  "{{name}}":      "John Doe",
  "{{email}}":     "john@example.com",
  "{{link}}":      "https://monsite.com/auth?token=abc123",
  "{{site_name}}": "Mon Site",
}

function replaceVars(html: string): string {
  return Object.entries(PREVIEW_VARS).reduce(
    (acc, [key, val]) => acc.replaceAll(key, val),
    html
  )
}

export async function loader({ request }: LoaderFunctionArgs) {
  const adapter = getAdapter()
  const user = await adapter.getSession(request)
  if (!user) return redirect("/login")
  if (user.role !== "admin") return redirect("/")

  const settingRows = await db.select().from(skafformAuthSettings)
  const settings: Record<string, string> = {}
  for (const row of settingRows) settings[row.key] = row.value

  const messages = await db.select().from(skafformAuthMessages)

  return {
    settings: {
      emailVerification: settings["email_verification"] === "true",
      passwordReset:     settings["password_reset"] !== "false",
      defaultLanguage:   settings["default_language"] ?? "en",
    },
    messages,
  }
}

export async function action({ request }: ActionFunctionArgs) {
  const adapter = getAdapter()
  const user = await adapter.getSession(request)
  if (!user || user.role !== "admin") return redirect("/login")

  const formData = await request.formData()
  const _action  = formData.get("_action") as string

  if (_action === "save-settings") {
    const emailVerification = formData.get("email_verification") === "on" ? "true" : "false"
    const passwordReset     = formData.get("password_reset")     === "on" ? "true" : "false"
    const defaultLanguage   = (formData.get("default_language") as string ?? "en").trim()

    for (const [key, value] of [
      ["email_verification", emailVerification],
      ["password_reset",     passwordReset],
      ["default_language",   defaultLanguage],
    ]) {
      await db.insert(skafformAuthSettings)
        .values({ key, value })
        .onConflictDoUpdate({ target: skafformAuthSettings.key, set: { value } })
    }
  }

  if (_action === "save-message") {
    const type     = formData.get("type") as string
    const language = (formData.get("language") as string ?? "en").trim()
    const subject  = (formData.get("subject") as string ?? "").trim()
    const html     = (formData.get("html") as string ?? "").trim()

    if (type && language && subject && html) {
      await db.insert(skafformAuthMessages)
        .values({ type, language, subject, html })
        .onConflictDoUpdate({
          target: [skafformAuthMessages.type, skafformAuthMessages.language],
          set: { subject, html },
        })
    }
    return redirect("/admin/auth?tab=messages")
  }

  return redirect("/admin/auth")
}

type LoaderData = {
  settings: { emailVerification: boolean; passwordReset: boolean; defaultLanguage: string }
  messages: MessageEntry[]
}

export default function AdminAuthPage({ loaderData }: { loaderData: LoaderData }) {
  const { settings, messages: initialMessages } = loaderData
  const [searchParams] = useSearchParams()

  const [tab, setTab]               = useState<"settings" | "messages">(
    searchParams.get("tab") === "messages" ? "messages" : "settings"
  )
  const [activeType, setActiveType] = useState<MessageType>("welcome")
  const [activeLang, setActiveLang] = useState<string>(settings.defaultLanguage)
  const [messages, setMessages]     = useState<MessageEntry[]>(initialMessages)
  const [addingLang, setAddingLang] = useState(false)
  const [newLangInput, setNewLangInput] = useState("")

  const currentMessage = messages.find(m => m.type === activeType && m.language === activeLang)
    ?? { type: activeType, language: activeLang, ...DEFAULT_MESSAGES[activeType] }

  const typeLangs = [...new Set(messages.filter(m => m.type === activeType).map(m => m.language))]
  const displayLangs = [...new Set([settings.defaultLanguage, ...typeLangs, activeLang])]

  const updateMessage = (field: "subject" | "html", value: string) => {
    setMessages((prev: MessageEntry[]) => {
      const idx = prev.findIndex(m => m.type === activeType && m.language === activeLang)
      if (idx >= 0) {
        const next = [...prev]
        next[idx] = { ...next[idx], [field]: value }
        return next
      }
      return [...prev, { ...currentMessage, [field]: value }]
    })
  }

  const handleAddLang = () => {
    const lang = newLangInput.trim().toLowerCase().replace(/[^a-z]/g, "").slice(0, 5)
    if (lang) setActiveLang(lang)
    setAddingLang(false)
    setNewLangInput("")
  }

  return (
    <div style={{ padding: "var(--skafform-spacing-xl)", maxWidth: "900px" }}>

      <div style={{ marginBottom: "var(--skafform-spacing-xl)" }}>
        <h1 style={{
          fontSize: "var(--skafform-font-size-2xl)",
          fontWeight: 700,
          color: "var(--skafform-foreground)",
          fontFamily: "var(--skafform-font-heading)",
          margin: 0,
        }}>
          Authentification
        </h1>
        <p style={{ color: "var(--skafform-muted-fg)", fontSize: "var(--skafform-font-size-sm)", marginTop: "var(--skafform-spacing-xs)" }}>
          Configurez les fonctionnalités d'authentification et les emails.
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: "2px", marginBottom: "var(--skafform-spacing-xl)", borderBottom: "1px solid var(--skafform-border)" }}>
        {(["settings", "messages"] as const).map(t => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            style={{
              padding: "var(--skafform-spacing-sm) var(--skafform-spacing-lg)",
              background: "none",
              border: "none",
              borderBottom: tab === t ? "2px solid var(--skafform-primary)" : "2px solid transparent",
              cursor: "pointer",
              fontSize: "var(--skafform-font-size-sm)",
              fontWeight: tab === t ? 600 : 400,
              color: tab === t ? "var(--skafform-primary)" : "var(--skafform-muted-fg)",
              marginBottom: "-1px",
            }}
          >
            {t === "settings" ? "Réglages" : "Messages"}
          </button>
        ))}
      </div>

      {/* Settings tab */}
      {tab === "settings" && (
        <form method="post">
          <input type="hidden" name="_action" value="save-settings" />
          <div style={{
            background: "var(--skafform-background)",
            border: "1px solid var(--skafform-border)",
            borderRadius: "var(--skafform-radius-lg)",
            overflow: "hidden",
            marginBottom: "var(--skafform-spacing-xl)",
          }}>
            <Toggle
              name="email_verification"
              label="Vérification d'email"
              description="Envoie un email de confirmation à l'inscription."
              defaultChecked={settings.emailVerification}
              first
            />
            <Toggle
              name="password_reset"
              label="Réinitialisation du mot de passe"
              description="Permet aux utilisateurs de réinitialiser leur mot de passe par email."
              defaultChecked={settings.passwordReset}
            />
            <div style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "var(--skafform-spacing-lg)",
              borderTop: "1px solid var(--skafform-border)",
              gap: "var(--skafform-spacing-lg)",
            }}>
              <div>
                <div style={{ fontSize: "var(--skafform-font-size-sm)", fontWeight: 600, color: "var(--skafform-foreground)" }}>
                  Langue par défaut
                </div>
                <div style={{ fontSize: "var(--skafform-font-size-xs)", color: "var(--skafform-muted-fg)", marginTop: "2px" }}>
                  Langue utilisée pour envoyer les emails.
                </div>
              </div>
              <select
                name="default_language"
                defaultValue={settings.defaultLanguage}
                style={{ ...inputStyle, width: "auto", minWidth: "140px" }}
              >
                {[...new Set(["en", ...initialMessages.map(m => m.language)])].map(code => (
                  <option key={code} value={code}>{LANG_LABELS[code] ?? code.toUpperCase()}</option>
                ))}
              </select>
            </div>
          </div>
          <button type="submit" style={btnStyle}>Sauvegarder</button>
        </form>
      )}

      {/* Messages tab */}
      {tab === "messages" && (
        <div>
          {/* Type selector */}
          <div style={{ display: "flex", gap: "var(--skafform-spacing-sm)", marginBottom: "var(--skafform-spacing-md)" }}>
            {MESSAGE_TYPES.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => setActiveType(value)}
                style={pillStyle(activeType === value)}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Language selector */}
          <div style={{ display: "flex", alignItems: "center", gap: "var(--skafform-spacing-xs)", marginBottom: "var(--skafform-spacing-lg)", flexWrap: "wrap" }}>
            {displayLangs.map((lang: string) => {
              const exists = messages.some((m: MessageEntry) => m.type === activeType && m.language === lang)
              const label = LANG_LABELS[lang] ?? lang.toUpperCase()
              return (
                <button
                  key={lang}
                  type="button"
                  onClick={() => setActiveLang(lang)}
                  style={{
                    ...pillStyle(activeLang === lang, true),
                    opacity: exists ? 1 : 0.5,
                  }}
                  title={exists ? label : `${label} — non sauvegardé`}
                >
                  {lang.toUpperCase()}
                  {!exists && <span style={{ marginLeft: "4px", fontSize: "10px" }}>✦</span>}
                </button>
              )
            })}

            {/* Add language */}
            {!addingLang && (
              <button
                type="button"
                onClick={() => setAddingLang(true)}
                style={{
                  width: "24px",
                  height: "24px",
                  borderRadius: "50%",
                  border: "1px dashed var(--skafform-border)",
                  background: "none",
                  cursor: "pointer",
                  fontSize: "16px",
                  color: "var(--skafform-muted-fg)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  lineHeight: 1,
                }}
              >
                +
              </button>
            )}
            {addingLang && (
              <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                <input
                  autoFocus
                  type="text"
                  value={newLangInput}
                  onChange={e => setNewLangInput(e.target.value.replace(/[^a-zA-Z]/g, "").slice(0, 5))}
                  onKeyDown={(e: React.KeyboardEvent) => {
                    if (e.key === "Enter") { e.preventDefault(); handleAddLang() }
                    if (e.key === "Escape") { setAddingLang(false); setNewLangInput("") }
                  }}
                  placeholder="fr"
                  style={{ ...inputStyle, width: "56px", padding: "2px 8px", fontSize: "var(--skafform-font-size-xs)", textTransform: "lowercase" }}
                />
                <button
                  type="button"
                  onClick={handleAddLang}
                  style={{ ...btnStyle, padding: "2px 10px", fontSize: "var(--skafform-font-size-xs)" }}
                >
                  OK
                </button>
                <button
                  type="button"
                  onClick={() => { setAddingLang(false); setNewLangInput("") }}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "var(--skafform-muted-fg)", fontSize: "16px", lineHeight: 1, padding: "2px 4px" }}
                >
                  ✕
                </button>
              </div>
            )}
          </div>

          <form method="post">
            <input type="hidden" name="_action" value="save-message" />
            <input type="hidden" name="type" value={activeType} />
            <input type="hidden" name="language" value={activeLang} />

            {/* Subject */}
            <div style={{ marginBottom: "var(--skafform-spacing-md)" }}>
              <label style={labelStyle}>Sujet</label>
              <input
                name="subject"
                type="text"
                value={currentMessage.subject}
                onChange={e => updateMessage("subject", e.target.value)}
                style={inputStyle}
              />
            </div>

            {/* Editor + Preview */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--skafform-spacing-md)", marginBottom: "var(--skafform-spacing-lg)" }}>
              <div>
                <label style={labelStyle}>HTML</label>
                <textarea
                  name="html"
                  value={currentMessage.html}
                  onChange={e => updateMessage("html", e.target.value)}
                  rows={18}
                  style={{ ...inputStyle, fontFamily: "monospace", fontSize: "var(--skafform-font-size-xs)", resize: "vertical" }}
                />
                <div style={{ marginTop: "var(--skafform-spacing-xs)", fontSize: "var(--skafform-font-size-xs)", color: "var(--skafform-muted-fg)" }}>
                  Variables : <code>{"{{name}}"}</code> <code>{"{{email}}"}</code> <code>{"{{link}}"}</code> <code>{"{{site_name}}"}</code>
                </div>
              </div>

              <div>
                <label style={labelStyle}>Aperçu</label>
                <iframe
                  srcDoc={replaceVars(currentMessage.html)}
                  style={{
                    width: "100%",
                    height: "340px",
                    border: "1px solid var(--skafform-border)",
                    borderRadius: "var(--skafform-radius)",
                    background: "#fff",
                  }}
                  title="Email preview"
                />
              </div>
            </div>

            <button type="submit" style={btnStyle}>Sauvegarder</button>
          </form>
        </div>
      )}
    </div>
  )
}

function Toggle({ name, label, description, defaultChecked, first }: {
  name: string
  label: string
  description: string
  defaultChecked: boolean
  first?: boolean
}) {
  return (
    <label style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "var(--skafform-spacing-lg)",
      borderTop: first ? "none" : "1px solid var(--skafform-border)",
      cursor: "pointer",
      gap: "var(--skafform-spacing-lg)",
    }}>
      <div>
        <div style={{ fontSize: "var(--skafform-font-size-sm)", fontWeight: 600, color: "var(--skafform-foreground)" }}>{label}</div>
        <div style={{ fontSize: "var(--skafform-font-size-xs)", color: "var(--skafform-muted-fg)", marginTop: "2px" }}>{description}</div>
      </div>
      <input type="checkbox" name={name} defaultChecked={defaultChecked} style={{ width: "16px", height: "16px", flexShrink: 0, cursor: "pointer" }} />
    </label>
  )
}

function pillStyle(active: boolean, small = false): React.CSSProperties {
  return {
    padding: small ? "2px 10px" : "var(--skafform-spacing-xs) var(--skafform-spacing-md)",
    borderRadius: "var(--skafform-radius-sm)",
    border: "1px solid var(--skafform-border)",
    background: active ? "var(--skafform-primary)" : "var(--skafform-background)",
    color: active ? "var(--skafform-primary-fg)" : "var(--skafform-foreground)",
    fontSize: "var(--skafform-font-size-xs)",
    fontWeight: 500,
    cursor: "pointer",
  }
}

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "var(--skafform-font-size-sm)",
  fontWeight: 600,
  color: "var(--skafform-foreground)",
  marginBottom: "var(--skafform-spacing-xs)",
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "var(--skafform-spacing-sm) var(--skafform-spacing-md)",
  border: "1px solid var(--skafform-border)",
  borderRadius: "var(--skafform-radius)",
  background: "var(--skafform-background)",
  color: "var(--skafform-foreground)",
  fontSize: "var(--skafform-font-size-sm)",
  boxSizing: "border-box",
  outline: "none",
}

const btnStyle: React.CSSProperties = {
  padding: "var(--skafform-spacing-sm) var(--skafform-spacing-lg)",
  background: "var(--skafform-primary)",
  color: "var(--skafform-primary-fg)",
  border: "none",
  borderRadius: "var(--skafform-radius)",
  fontWeight: 600,
  cursor: "pointer",
  fontSize: "var(--skafform-font-size-sm)",
}
