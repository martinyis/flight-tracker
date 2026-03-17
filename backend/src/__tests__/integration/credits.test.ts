import { describe, it, expect, vi } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import { createApp } from "../../index";
import { prismaMock } from "../mocks/prisma";

// Keep creditService real (it uses mocked Prisma under the hood)
// Mock google-auth-library and apple-signin-auth so authService can load
vi.mock("google-auth-library", () => ({
  OAuth2Client: class {
    verifyIdToken = vi.fn();
  },
}));
vi.mock("apple-signin-auth", () => ({
  default: { verifyIdToken: vi.fn() },
}));

const app = createApp();

function authHeader() {
  const token = jwt.sign({ userId: "1" }, process.env.JWT_SECRET!, { expiresIn: "1h" });
  return `Bearer ${token}`;
}

describe("GET /api/credits/balance", () => {
  it("returns 401 without auth", async () => {
    const res = await request(app).get("/api/credits/balance");
    expect(res.status).toBe(401);
  });

  it("returns 200 with balance and transactions", async () => {
    prismaMock.user.findUnique.mockResolvedValue({ creditBalance: 100 });
    prismaMock.creditTransaction.findMany.mockResolvedValue([
      { id: 1, amount: -5, type: "search" },
    ]);

    const res = await request(app)
      .get("/api/credits/balance")
      .set("Authorization", authHeader());

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("balance", 100);
    expect(res.body.transactions).toHaveLength(1);
  });
});

describe("GET /api/credits/packs", () => {
  it("returns 200 with all pack definitions", async () => {
    const res = await request(app)
      .get("/api/credits/packs")
      .set("Authorization", authHeader());

    expect(res.status).toBe(200);
    expect(res.body.packs).toHaveProperty("starter");
    expect(res.body.packs).toHaveProperty("standard");
    expect(res.body.packs).toHaveProperty("pro");
    expect(res.body.packs).toHaveProperty("power");
  });
});

describe("POST /api/credits/purchase", () => {
  it("returns 200 for valid packId", async () => {
    prismaMock.user.update.mockResolvedValue({ creditBalance: 150 });
    prismaMock.creditTransaction.create.mockResolvedValue({});
    prismaMock.creditTransaction.findMany.mockResolvedValue([
      { id: 1, amount: 50, type: "purchase" },
    ]);

    const res = await request(app)
      .post("/api/credits/purchase")
      .set("Authorization", authHeader())
      .send({ packId: "starter" });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("balance");
    expect(res.body).toHaveProperty("creditsAdded", 50);
  });

  it("returns 400 for invalid packId", async () => {
    const res = await request(app)
      .post("/api/credits/purchase")
      .set("Authorization", authHeader())
      .send({ packId: "nonexistent" });

    expect(res.status).toBe(400);
  });
});
