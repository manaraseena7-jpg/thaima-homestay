require("dotenv").config();
const express = require("express");
const Razorpay = require("razorpay");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, "bookings.json");
const rooms = [
  { id: "room-1", name: "Room 1", price: 2000 },
  { id: "room-2", name: "Room 2", price: 2000 },
  { id: "room-3", name: "Room 3", price: 2000 },
  { id: "room-4", name: "Room 4", price: 2000 }
];

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

function readBookings() {
  try { return JSON.parse(fs.readFileSync(DATA_FILE, "utf8")); }
  catch { return []; }
}
function writeBookings(bookings) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(bookings, null, 2));
}
function datesOverlap(aStart, aEnd, bStart, bEnd) {
  return new Date(aStart) < new Date(bEnd) && new Date(bStart) < new Date(aEnd);
}
function isConfigured() {
  return process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET &&
    !process.env.RAZORPAY_KEY_ID.includes("replace_me") &&
    !process.env.RAZORPAY_KEY_SECRET.includes("replace_me");
}
function getRazorpay() {
  if (!isConfigured()) return null;
  return new Razorpay({ key_id: process.env.RAZORPAY_KEY_ID, key_secret: process.env.RAZORPAY_KEY_SECRET });
}

app.get("/api/config", (_req, res) => {
  res.json({
    paymentConfigured: isConfigured(),
    keyId: isConfigured() ? process.env.RAZORPAY_KEY_ID : null,
    advancePercent: Math.min(100, Math.max(1, Number(process.env.ADVANCE_PERCENT || 30))),
    rooms
  });
});

app.post("/api/availability", (req, res) => {
  const { roomId, checkIn, checkOut } = req.body || {};
  if (!roomId || !checkIn || !checkOut || new Date(checkOut) <= new Date(checkIn))
    return res.status(400).json({ error: "Choose a valid room and date range." });
  const bookings = readBookings();
  const conflict = bookings.some(b => b.roomId === roomId && b.status === "confirmed" &&
    datesOverlap(checkIn, checkOut, b.checkIn, b.checkOut));
  res.json({ available: !conflict });
});

app.post("/api/create-order", async (req, res) => {
  try {
    const { roomId, checkIn, checkOut, guestName, email, phone, guests } = req.body || {};
    const room = rooms.find(r => r.id === roomId);
    if (!room || !guestName || !email || !phone || !checkIn || !checkOut ||
        new Date(checkOut) <= new Date(checkIn))
      return res.status(400).json({ error: "Please complete all booking details." });
    if (!isConfigured()) return res.status(503).json({ error: "Online payment is not configured yet. Add your Razorpay keys to the .env file." });
    const bookings = readBookings();
    const conflict = bookings.some(b => b.roomId === roomId && b.status === "confirmed" &&
      datesOverlap(checkIn, checkOut, b.checkIn, b.checkOut));
    if (conflict) return res.status(409).json({ error: "This room is no longer available for those dates." });

    const nights = Math.ceil((new Date(checkOut) - new Date(checkIn)) / 86400000);
    const total = room.price * nights;
    const advancePercent = Math.min(100, Math.max(1, Number(process.env.ADVANCE_PERCENT || 30)));
    const advance = Math.round(total * advancePercent / 100);
    const razorpay = getRazorpay();
    const order = await razorpay.orders.create({
      amount: advance * 100, currency: "INR",
      receipt: `thaima_${Date.now()}`,
      notes: { roomId, checkIn, checkOut, guestName, email, phone }
    });
    bookings.push({
      id: order.id, orderId: order.id, roomId, roomName: room.name, checkIn, checkOut,
      guestName, email, phone, guests: Number(guests || 1), nights, total, advance,
      status: "payment_pending", createdAt: new Date().toISOString()
    });
    writeBookings(bookings);
    res.json({ orderId: order.id, amount: advance * 100, currency: "INR",
      keyId: process.env.RAZORPAY_KEY_ID, advance, total, nights,
      name: "Thaima Homestay", description: `${room.name} · ${nights} night(s)` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not start payment. Please try again." });
  }
});

app.post("/api/verify-payment", (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body || {};
  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !process.env.RAZORPAY_KEY_SECRET)
    return res.status(400).json({ error: "Payment verification details are missing." });
  const expected = crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(razorpay_signature);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b))
    return res.status(400).json({ error: "Payment verification failed." });

  const bookings = readBookings();
  const booking = bookings.find(b => b.orderId === razorpay_order_id);
  if (!booking) return res.status(404).json({ error: "Booking was not found." });
  booking.status = "confirmed";
  booking.paymentId = razorpay_payment_id;
  booking.paidAt = new Date().toISOString();
  writeBookings(bookings);
  res.json({ success: true, booking: {
    guestName: booking.guestName, roomName: booking.roomName,
    checkIn: booking.checkIn, checkOut: booking.checkOut,
    advance: booking.advance, total: booking.total
  }});
});

app.get("*", (_req, res) => res.sendFile(path.join(__dirname, "public", "index.html")));
app.listen(PORT, () => console.log(`Thaima Homestay website running at http://localhost:${PORT}`));
