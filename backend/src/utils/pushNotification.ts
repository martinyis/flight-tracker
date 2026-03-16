import logger from "../config/logger";

const log = logger.child({ component: "pushNotification" });

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
      const body = await res.text();
      log.error({ status: res.status, body }, "Push notification failed");
    }
  } catch (err) {
    log.error({ err }, "Push notification error");
  }
}
