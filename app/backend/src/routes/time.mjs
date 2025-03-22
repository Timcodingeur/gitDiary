import express from 'express';
import { db } from '../../server.mjs';

const router = express.Router();

router.post("/add-time", (req, res, next) => {
  const { hash, time } = req.body;
  if (!hash || time == null) {
    return res.status(400).json({ error: "Missing hash or time in body" });
  }

  const querySelect = "SELECT * FROM t_commits WHERE hash = ?";
  db.query(querySelect, [hash], (err, result) => {
    if (err) return next(err);
    
    if (result.length > 0) {
      const query = "UPDATE t_commits SET time = ? WHERE hash = ?";
      db.query(query, [time, hash], (errUpdate) => {
        if (errUpdate) return next(errUpdate);
        res.status(200).json({ message: "Time updated" });
      });
    } else {
      const query = "INSERT INTO t_commits (hash, time) VALUES (?, ?)";
      db.query(query, [hash, time], (errInsert) => {
        if (errInsert) return next(errInsert);
        res.status(201).json({ message: "Time added" });
      });
    }
  });
});

router.get("/get-time/:hash", (req, res, next) => {
  const { hash } = req.params;
  if (!hash) {
    return res.status(400).json({ error: "Missing hash in params" });
  }

  const query = "SELECT time FROM t_commits WHERE hash = ?";
  db.query(query, [hash], (err, result) => {
    if (err) return next(err);
    res.json(result);
  });
});

export default router;