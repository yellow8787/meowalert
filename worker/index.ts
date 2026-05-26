/// <reference lib="webworker" />
export {};

const sw = self as unknown as ServiceWorkerGlobalScope;

// Push received → show notification
sw.addEventListener("push", (event) => {
  const data = event.data?.json() ?? {};
  const title = data.title || "MeowAlert";
  const options: NotificationOptions = {
    body: data.body || "",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    data: { url: data.url || "/" },
  };
  event.waitUntil(sw.registration.showNotification(title, options));
});

// Notification clicked → open URL
sw.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data as { url?: string })?.url || "/";
  event.waitUntil(sw.clients.openWindow(url));
});