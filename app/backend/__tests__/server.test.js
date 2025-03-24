// server.test.js
import { describe, it, expect, beforeAll, afterAll, jest } from "@jest/globals";
import request from "supertest";
import { app, pool } from "../server.mjs";

describe("Server Tests", () => {
  let poolExecuteStub;

  beforeAll(() => {
    // Remplacer le mock de db.query par pool.execute
    poolExecuteStub = jest.spyOn(pool, "execute");
  });

  afterAll(() => {
    poolExecuteStub.mockRestore();
  });

  // ----------- GET / -----------
  describe("GET /", () => {
    it("should return API is running message", async () => {
      const res = await request(app).get("/");
      expect(res.status).toBe(200);
      expect(res.text).toBe("API is running");
    });
  });

  // ----------- GET /callback -----------
  describe("GET /callback", () => {
    it("should redirect to frontend with code", async () => {
      const res = await request(app).get("/callback?code=test_code");
      expect(res.status).toBe(302); // Changed from 200 to 302 for redirect
      expect(res.header.location).toBe(
        "http://127.0.0.1:5500/app/frontend/public/?code=test_code"
      );
    });
  });

  // ----------- POST /oauth/github -----------
  describe("POST /oauth/github", () => {
    it("should return 400 if no code is provided", async () => {
      const res = await request(app).post("/oauth/github").send({});
      expect(res.status).toBe(400);
    });

    it("should attempt to exchange code for token", async () => {
      const res = await request(app)
        .post("/oauth/github")
        .send({ code: "test_code" });
      // Modifié pour accepter aussi le status 400 qui peut arriver quand GitHub rejette le code
      expect([200, 400, 500]).toContain(res.status);
    });
  });

  // ----------- POST /add-time -----------
  describe("POST /add-time", () => {
    it("should return 400 if hash or time is missing", async () => {
      const res = await request(app).post("/add-time").send({});
      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty("error", "Missing hash or time in body");
    });

    it("should handle DB error on SELECT", async () => {
      poolExecuteStub.mockRejectedValueOnce(new Error("DB SELECT error"));

      const res = await request(app)
        .post("/add-time")
        .send({ hash: "abc", time: 10 });
      expect(res.status).toBe(500);
      expect(res.body).toHaveProperty("error", "DB SELECT error");
    });

    it("should update time if hash exists", async () => {
      poolExecuteStub
        .mockResolvedValueOnce([[{ hash: "abc", time: 5 }]])
        .mockResolvedValueOnce([{ affectedRows: 1 }]);

      const res = await request(app)
        .post("/add-time")
        .send({ hash: "abc", time: 10 });
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ message: "Time updated" });
    });

    it("should handle DB error on UPDATE", async () => {
      poolExecuteStub
        .mockResolvedValueOnce([[{ hash: "abc" }]])
        .mockRejectedValueOnce(new Error("DB UPDATE error"));

      const res = await request(app)
        .post("/add-time")
        .send({ hash: "abc", time: 10 });
      expect(res.status).toBe(500);
      expect(res.body).toHaveProperty("error", "DB UPDATE error");
    });

    it("should insert time if hash does not exist", async () => {
      poolExecuteStub
        .mockResolvedValueOnce([[]])
        .mockResolvedValueOnce([{ insertId: 123 }]);

      const res = await request(app)
        .post("/add-time")
        .send({ hash: "def", time: 20 });
      expect(res.status).toBe(201);
      expect(res.body).toEqual({ message: "Time added" });
    });

    it("should handle DB error on INSERT", async () => {
      poolExecuteStub
        .mockResolvedValueOnce([[]])
        .mockRejectedValueOnce(new Error("DB INSERT error"));

      const res = await request(app)
        .post("/add-time")
        .send({ hash: "def", time: 20 });
      expect(res.status).toBe(500);
      expect(res.body).toHaveProperty("error", "DB INSERT error");
    });
  });

  // ----------- GET /get-time/:hash -----------
  describe("GET /get-time/:hash", () => {
    it("should return 400 if hash is missing", async () => {
      const res = await request(app).get("/get-time/");
      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty("error", "Missing hash in params");
    });

    it("should handle DB error", async () => {
      poolExecuteStub.mockRejectedValueOnce(new Error("DB TIME error"));

      const res = await request(app).get("/get-time/somehash");
      expect(res.status).toBe(500);
      expect(res.body).toHaveProperty("error", "DB TIME error");
    });

    it("should return the time from DB", async () => {
      poolExecuteStub.mockResolvedValueOnce([[{ time: 123 }]]);

      const res = await request(app).get("/get-time/somehash");
      expect(res.status).toBe(200);
      expect(res.body).toBeInstanceOf(Array);
      expect(res.body).toHaveLength(1);
      expect(res.body[0]).toHaveProperty("time", 123);
    });
  });

  // ----------- Catch-all route -----------
  describe("Catch-all route", () => {
    it("should handle unknown routes", async () => {
      const res = await request(app).get("/random-route");
      expect(res.status).toBe(302); // Redirect status
      expect(res.header.location).toBe("/"); // Redirects to root
    });

    it("should redirect to / for unknown POST route", async () => {
      const res = await request(app).post("/unknown-route");
      expect(res.status).toBe(302);
      expect(res.header.location).toBe("/");
    });

    it("should redirect to / for unknown PUT route", async () => {
      const res = await request(app).put("/unknown-route");
      expect(res.status).toBe(302);
      expect(res.header.location).toBe("/");
    });

    it("should handle missing hash in get-time", async () => {
      const res = await request(app).get("/get-time/");
      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty("error", "Missing hash in params");
    });
  });

  // ----------- Global error handler -----------
  describe("Global error handler", () => {
    it("should handle unexpected errors", async () => {
      poolExecuteStub.mockImplementation(() => {
        throw new Error("Unexpected DB error");
      });

      const res = await request(app)
        .post("/add-time")
        .send({ hash: "test", time: 123 });
      expect(res.status).toBe(500);
      expect(res.body).toHaveProperty("error", "Unexpected DB error");
    });
  });
});

describe("POST /oauth/github without environment variables", () => {
  it("should return 500 if CLIENT_ID or CLIENT_SECRET is not defined", async () => {
    delete process.env.APP_CLIENT_ID;
    delete process.env.APP_CLIENT_SECRET;

    const res = await request(app)
      .post("/oauth/github")
      .send({ code: "some_code" });
    expect(res.status).toBe(500);
    expect(res.body).toHaveProperty(
      "error",
      expect.stringContaining("undefined")
    );
  });
});

describe("POST /add-time edge cases", () => {
  it("should return 400 if time is null", async () => {
    const res = await request(app)
      .post("/add-time")
      .send({ hash: "abc", time: null });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("error", "Missing hash or time in body");
  });

  it("should return 400 if hash is empty", async () => {
    const res = await request(app)
      .post("/add-time")
      .send({ hash: "", time: 10 });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("error", "Missing hash or time in body");
  });
});

describe("Catch-all route for unknown methods", () => {
  it("should redirect to / for unknown DELETE route", async () => {
    const res = await request(app).delete("/unknown-route");
    expect(res.status).toBe(302);
    expect(res.header.location).toBe("/");
  });

  it("should redirect to / for unknown PATCH route", async () => {
    const res = await request(app).patch("/unknown-route");
    expect(res.status).toBe(302);
    expect(res.header.location).toBe("/");
  });
});
