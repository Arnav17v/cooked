/* Prep plan Web Push — scope /plan only when registered from that page */

self.addEventListener("push", (event) => {
  let data = { title: "Prep reminder", body: "Your plan for today is ready.", url: "/plan" };
  try {
    if (event.data) {
      const parsed = event.data.json();
      if (parsed && typeof parsed === "object") data = { ...data, ...parsed };
    }
  } catch {
    /* ignore */
  }
  event.waitUntil(
    self.registration.showNotification(data.title || "Prep reminder", {
      body: data.body || "",
      icon: "/favicon.ico",
      data: { url: data.url || "/plan" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/plan";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if (client.url.includes("/plan") && "focus" in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow(url);
    }),
  );
});
