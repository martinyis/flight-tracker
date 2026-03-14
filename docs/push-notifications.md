# Push Notifications Implementation Guide

## Architecture

```
┌─────────────┐     ┌──────────────┐     ┌─────────────────┐     ┌─────────┐
│  Backend     │────▶│  Expo Push   │────▶│  APNs / FCM     │────▶│  Device │
│  (Express)   │     │  Service     │     │  (Apple/Google)  │     │         │
└─────────────┘     └──────────────┘     └─────────────────┘     └─────────┘
```

Three moving parts:

1. **Frontend** calls `expo-notifications` on app launch to get a push token (`ExponentPushToken[xxx]`), sends it to the backend.
2. **Backend** stores the token on the User, and when the price check cron detects a change, POSTs to Expo's push endpoint.
3. **Expo's servers** route the notification to APNs (iOS) or FCM (Android). You never talk to Apple/Google directly.

## Complexity

- **Frontend**: ~30 lines — request permission, get token, send to backend
- **Backend**: ~15 lines — one POST request to send a notification
- **Database**: One new column (`pushToken` on User)

No Firebase SDK, no APNs certificate management, no complex setup.

## Dev Testing vs Production

The notification flow is **identical** in dev and production builds:

| | Dev Build | Production Build |
|---|---|---|
| Token format | `ExponentPushToken[xxx]` | `ExponentPushToken[xxx]` |
| Backend call | Same POST to Expo | Same POST to Expo |
| Delivery path | Expo → APNs/FCM → device | Expo → APNs/FCM → device |
| Code changes | None | None |

No environment switching, no different API keys, no conditional logic.

## One-Time EAS Setup

1. Run `eas build:configure` if not done already (creates `eas.json`)
2. **iOS**: EAS automatically provisions push notification credentials during build
3. **Android**: Create a Firebase project + download `google-services.json` (~5 min one-time setup)

After this, push notifications work in both dev and prod builds with no code differences.

## Frontend Implementation

### 1. Install expo-notifications

```bash
npx expo install expo-notifications expo-device expo-constants
```

### 2. Register for push notifications

Create `src/utils/notifications.ts`:

```typescript
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

// Configure how notifications appear when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function registerForPushNotifications(): Promise<string | null> {
  if (!Device.isDevice) {
    console.log('Push notifications require a physical device');
    return null;
  }

  // Check/request permission
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('Push notification permission denied');
    return null;
  }

  // Get the Expo push token
  const projectId = Constants.expoConfig?.extra?.eas?.projectId;
  const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });

  // Android needs a notification channel
  if (Platform.OS === 'android') {
    Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
    });
  }

  return tokenData.data; // "ExponentPushToken[xxx]"
}
```

### 3. Send token to backend on login/app launch

In your AuthProvider or app layout, after the user is authenticated:

```typescript
import { registerForPushNotifications } from '@/utils/notifications';

// After successful auth:
const pushToken = await registerForPushNotifications();
if (pushToken) {
  await fetch(`${API_URL}/auth/push-token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${jwtToken}`,
    },
    body: JSON.stringify({ pushToken }),
  });
}
```

## Backend Implementation

### 1. Add pushToken to User model

In `prisma/schema.prisma`:

```prisma
model User {
  // ... existing fields
  pushToken String?
}
```

Run `npx prisma migrate dev --name add-push-token`.

### 2. Add endpoint to save push token

```typescript
// POST /auth/push-token
router.post('/push-token', authMiddleware, async (req, res) => {
  const { pushToken } = req.body;
  await prisma.user.update({
    where: { id: req.userId },
    data: { pushToken },
  });
  res.json({ success: true });
});
```

### 3. Send notifications from the price check cron

```typescript
// src/utils/pushNotification.ts
import fetch from 'node-fetch'; // or use global fetch

interface PushMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, any>;
}

export async function sendPushNotification(message: PushMessage) {
  const response = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(message),
  });
  return response.json();
}
```

### 4. Hook into priceCheckWorker

In the cron worker, after detecting a price change:

```typescript
import { sendPushNotification } from '../utils/pushNotification';

// After price comparison logic:
if (newPrice < oldPrice && user.pushToken) {
  await sendPushNotification({
    to: user.pushToken,
    title: 'Price Drop!',
    body: `${origin}→${destination} dropped to $${newPrice} (was $${oldPrice})`,
    data: { searchId: savedSearch.id },
  });
}
```

## app.json / app.config.ts additions

```json
{
  "expo": {
    "plugins": [
      [
        "expo-notifications",
        {
          "icon": "./assets/notification-icon.png",
          "color": "#ffffff"
        }
      ]
    ]
  }
}
```

## Testing Checklist

1. Run `eas build --profile development --platform ios` (or android)
2. Install the dev build on your physical device
3. Start the dev server with `npx expo start --dev-client`
4. Grant notification permission when prompted
5. Verify the push token is saved to the User record in the database
6. Test sending a notification manually:

```bash
curl -X POST https://exp.host/--/api/v2/push/send \
  -H "Content-Type: application/json" \
  -d '{
    "to": "ExponentPushToken[your-token-here]",
    "title": "Test",
    "body": "Hello from flight tracker!"
  }'
```

7. You should see the notification on your device immediately

## Future Considerations

- **Multi-device support**: Move `pushToken` to a separate `PushToken` table (userId + token + deviceInfo)
- **Notification triggers**: Price drops, price increases, tracking expiry warnings, weekly summaries
- **Granular settings**: Per-user toggle for different notification types
- **Batch sending**: Expo supports sending up to 100 notifications in a single POST
- **Receipt checking**: Poll `https://exp.host/--/api/v2/push/getReceipts` to verify delivery
- **Token cleanup**: Remove tokens that Expo reports as invalid (device uninstalled app)
