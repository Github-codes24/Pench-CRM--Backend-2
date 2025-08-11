//  Checks if an order is scheduled for delivery on targetDate.
 
 exports.isScheduledOn = (order, targetDate) => {
  if (!order || !targetDate) return false;

  const t = new Date(targetDate);
  t.setHours(0, 0, 0, 0);

  const created = order.createdAt ? new Date(order.createdAt) : null;
  if (created) created.setHours(0, 0, 0, 0);

  const weekday = t.getDay(); // 0 = Sun ... 6 = Sat
  const dayOfMonth = t.getDate();
  const dd = (s) => (s ? s.trim() : "");
  const deliveryDays = dd(order.deliveryDays);

  // Custom Days
  if (deliveryDays.toLowerCase().includes("custom")) {
    if (Array.isArray(order.customDates)) {
      return order.customDates.some(item => {
        if (!item) return false;
        const d = new Date(item.date);
        d.setHours(0, 0, 0, 0);
        return d.getTime() === t.getTime();
      });
    }
    return false;
  }

  // Daily
  if (deliveryDays.toLowerCase() === "daily") return true;

  // Alternate Days
  if (["alternate days", "alternate"].includes(deliveryDays.toLowerCase())) {
    if (!created) return false;
    const diffDays = Math.floor((t - created) / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays % 2 === 0;
  }

  // Mon-Fri
  if (["monday to friday", "mon-fri"].includes(deliveryDays.toLowerCase())) {
    return weekday >= 1 && weekday <= 5;
  }

  // Weekends
  if (["weekends only", "weekends"].includes(deliveryDays.toLowerCase())) {
    return weekday === 0 || weekday === 6;
  }

  // Weekly
  if (deliveryDays.toLowerCase() === "weekly") {
    return created && created.getDay() === weekday && t >= created;
  }

  // Monthly
  if (deliveryDays.toLowerCase() === "monthly") {
    return created && created.getDate() === dayOfMonth && t >= created;
  }

  return false;
}
