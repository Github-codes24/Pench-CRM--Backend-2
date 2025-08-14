// middleware/getActiveSession.js
const GameSession = require("../model/gameSessionModel");

module.exports = async function getActiveSession(req, res, next) {
  try {
    const ip = req.ip;
    const session = await GameSession.findOne({
      ip,
      isCompleted: false,
      expiresAt: { $gt: new Date() }
    }).sort({ startedAt: -1 });

    if (!session) {
      return res.status(403).json({ error: "No active session. Please start the game first." });
    }

    req.session = session; // Attach session to request
    next();
  } catch (err) {
    console.error("Session middleware error", err);
    res.status(500).json({ error: "Internal error" });
  }
};
