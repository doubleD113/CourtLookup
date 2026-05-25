type DiscordEmbed = {
  title?: string
  description?: string
  url?: string
  color?: number
  fields?: { name: string; value: string; inline?: boolean }[]
  timestamp?: string
}

export async function sendDiscordNotification(embed: DiscordEmbed): Promise<void> {
  const url = process.env.DISCORD_FLAG_WEBHOOK_URL
  if (!url) return

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ embeds: [embed] }),
    })
    if (!res.ok) {
      console.error('[discord] webhook failed', res.status, await res.text().catch(() => ''))
    }
  } catch (err) {
    console.error('[discord] webhook error', err)
  }
}
