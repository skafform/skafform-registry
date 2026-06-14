import type { SkafformEmailAdapter } from "@skafform/core"

export class ResendAdapter implements SkafformEmailAdapter {
  private defaultFrom: string

  constructor(private apiKey: string, opts?: { from?: string }) {
    this.defaultFrom = opts?.from ?? "noreply@example.com"
  }

  async send(opts: { to: string; subject: string; html: string; from?: string }): Promise<void> {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from:    opts.from ?? this.defaultFrom,
        to:      opts.to,
        subject: opts.subject,
        html:    opts.html,
      }),
    })

    if (!response.ok) {
      const body = await response.text()
      throw new Error(`Resend error ${response.status}: ${body}`)
    }
  }
}
