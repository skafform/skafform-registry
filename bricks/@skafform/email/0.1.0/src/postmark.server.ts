import type { SkafformEmailAdapter } from "@skafform/core"

export class PostmarkAdapter implements SkafformEmailAdapter {
  private defaultFrom: string

  constructor(private apiKey: string, opts?: { from?: string }) {
    this.defaultFrom = opts?.from ?? "noreply@example.com"
  }

  async send(opts: { to: string; subject: string; html: string; from?: string }): Promise<void> {
    const response = await fetch("https://api.postmarkapp.com/email", {
      method: "POST",
      headers: {
        "Accept":                  "application/json",
        "Content-Type":            "application/json",
        "X-Postmark-Server-Token": this.apiKey,
      },
      body: JSON.stringify({
        From:     opts.from ?? this.defaultFrom,
        To:       opts.to,
        Subject:  opts.subject,
        HtmlBody: opts.html,
      }),
    })

    if (!response.ok) {
      const body = await response.text()
      throw new Error(`Postmark error ${response.status}: ${body}`)
    }
  }
}
