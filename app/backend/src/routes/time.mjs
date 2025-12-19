import express from "express";
import { pool } from "../../server.mjs";

const router = express.Router();

router.post("/add-time", async (req, res, next) => {
  const { hash, time } = req.body;
  console.log(`[ADD-TIME] Received: hash=${hash}, time=${time}`);

  if (!hash || time == null) {
    console.error("[ADD-TIME] Missing hash or time");
    return res.status(400).json({ error: "Missing hash or time in body" });
  }

  try {
    console.log(`[ADD-TIME] Checking if hash exists: ${hash}`);
    const [rows] = await pool.execute(
      "SELECT * FROM t_commits WHERE hash = ?",
      [hash]
    );
    console.log(`[ADD-TIME] Found ${rows.length} existing rows`);

    if (rows.length > 0) {
      console.log(`[ADD-TIME] Updating existing hash: ${hash}`);
      await pool.execute("UPDATE t_commits SET time = ? WHERE hash = ?", [
        time,
        hash,
      ]);
      res.status(200).json({ message: "Time updated" });
    } else {
      console.log(`[ADD-TIME] Inserting new hash: ${hash}`);
      await pool.execute("INSERT INTO t_commits (hash, time) VALUES (?, ?)", [
        hash,
        time,
      ]);
      res.status(201).json({ message: "Time added" });
    }
  } catch (err) {
    console.error("[ADD-TIME] Database error:", err);
    next(err);
  }
});

router.get("/get-time/:hash", async (req, res, next) => {
  const { hash } = req.params;
  console.log(`[GET-TIME] Requesting time for hash: ${hash}`);

  if (!hash) {
    console.error("[GET-TIME] Missing hash in params");
    return res.status(400).json({ error: "Missing hash in params" });
  }

  try {
    const [rows] = await pool.execute(
      "SELECT time FROM t_commits WHERE hash = ?",
      [hash]
    );
    console.log(`[GET-TIME] Found ${rows.length} rows for hash: ${hash}`);
    res.json(rows);
  } catch (err) {
    console.error("[GET-TIME] Database error:", err);
    next(err);
  }
});

export default router;
