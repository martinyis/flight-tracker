import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import { createApp } from "../../index";
import { prismaMock } from "../mocks/prisma";

// Mock authService — but keep generateToken/verifyToken real for JWT auth
const { mockGoogleAuth, mockAppleAuth, mockRotateRefreshToken, mockRevokeTokenByRaw } =
  vi.hoisted(() => ({
    mockGoogleAuth: vi.fn(),
    mockAppleAuth: vi.fn(),
    mockRotateRefreshToken: vi.fn(),
    mockRevokeTokenByRaw: vi.fn(),
  }));

vi.mock("../../services/authService", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../services/authService")>();
  return {
    ...actual,
    googleAuth: mockGoogleAuth,
    appleAuth: mockAppleAuth,
    rotateRefreshToken: mockRotateRefreshToken,
    revokeTokenByRaw: mockRevokeTokenByRaw,
  };
});

// Mock google-auth-library (imported at module level by authService)
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

describe("POST /api/auth/google", () => {
  it("returns 200 with tokens on success", async () => {
    mockGoogleAuth.mockResolvedValue({
      user: { id: 1, email: "test@example.com" },
      accessToken: "at",
      refreshToken: "rt",
    });

    const res = await request(app)
      .post("/api/auth/google")
      .send({ idToken: "valid-google-token" });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("accessToken", "at");
    expect(res.body).toHaveProperty("refreshToken", "rt");
    expect(res.body.user).toMatchObject({ id: 1, email: "test@example.com" });
  });

  it("returns 400 when idToken is missing", async () => {
    const res = await request(app).post("/api/auth/google").send({});
    expect(res.status).toBe(400);
  });
});

describe("POST /api/auth/apple", () => {
  it("returns 200 with tokens on success", async () => {
    mockAppleAuth.mockResolvedValue({
      user: { id: 2, email: "apple@example.com" },
      accessToken: "at",
      refreshToken: "rt",
    });

    const res = await request(app)
      .post("/api/auth/apple")
      .send({ identityToken: "valid-apple-token" });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("accessToken");
    expect(res.body.user.id).toBe(2);
  });

  it("returns 400 when identityToken is missing", async () => {
    const res = await request(app).post("/api/auth/apple").send({});
    expect(res.status).toBe(400);
  });
});

describe("POST /api/auth/refresh", () => {
  it("returns 200 with new tokens on success", async () => {
    mockRotateRefreshToken.mockResolvedValue({
      accessToken: "new-at",
      refreshToken: "new-rt",
    });

    const res = await request(app)
      .post("/api/auth/refresh")
      .send({ refreshToken: "old-token" });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ accessToken: "new-at", refreshToken: "new-rt" });
  });

  it("returns 400 when refreshToken is missing", async () => {
    const res = await request(app).post("/api/auth/refresh").send({});
    expect(res.status).toBe(400);
  });
});

describe("GET /api/auth/me", () => {
  it("returns 401 without auth header", async () => {
    const res = await request(app).get("/api/auth/me");
    expect(res.status).toBe(401);
  });

  it("returns 200 with profile when authenticated", async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: 1,
      email: "test@example.com",
      firstName: "Test",
      lastName: "User",
      googleId: "g-123",
      appleId: null,
      creditBalance: 100,
      createdAt: new Date("2026-01-01"),
      _count: { searches: 5 },
    });
    prismaMock.savedSearch.count.mockResolvedValue(2);

    const res = await request(app)
      .get("/api/auth/me")
      .set("Authorization", authHeader());

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      id: 1,
      email: "test@example.com",
      provider: "google",
      creditBalance: 100,
      totalSearches: 5,
      activeSearches: 2,
    });
  });
});
