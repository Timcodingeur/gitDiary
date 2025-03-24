import express from "express";
import { pool } from "../../server.mjs";

const router = express.Router();

router.post("/add-time", async (req, res, next) => {
  const { hash, time } = req.body;
  if (!hash || time == null) {
    return res.status(400).json({ error: "Missing hash or time in body" });
  }

  try {
    const [rows] = await pool.execute(
      "SELECT * FROM t_commits WHERE hash = ?",
      [hash]
    );

    if (rows.length > 0) {
      await pool.execute("UPDATE t_commits SET time = ? WHERE hash = ?", [
        time,
        hash,
      ]);
      res.status(200).json({ message: "Time updated" });
    } else {
      await pool.execute("INSERT INTO t_commits (hash, time) VALUES (?, ?)", [
        hash,
        time,
      ]);
      res.status(201).json({ message: "Time added" });
    }
  } catch (err) {
    next(err);
  }
});

router.get("/get-time/:hash", async (req, res, next) => {
  const { hash } = req.params;
  if (!hash) {
    return res.status(400).json({ error: "Missing hash in params" });
  }

  try {
    const [rows] = await pool.execute(
      "SELECT time FROM t_commits WHERE hash = ?",
      [hash]
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

export default router;
