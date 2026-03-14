interface PushMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

export async function sendPushNotification(message: PushMessage): Promise<void> {
  try {
    const res = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(message),
    });
    if (!res.ok) {
      console.error("[Push] Failed to send:", res.status, await res.text());
    }
  } catch (err) {
    console.error("[Push] Error sending notification:", err);
  }
}
