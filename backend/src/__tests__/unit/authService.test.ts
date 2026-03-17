import { describe, it, expect, vi, beforeEach } from "vitest";
import { prismaMock } from "../mocks/prisma";
import jwt from "jsonwebtoken";

// ── Mock external auth libraries ──────────────────────────────────────

const { mockGoogleVerifyIdToken, mockAppleVerifyIdToken } = vi.hoisted(() => ({
  mockGoogleVerifyIdToken: vi.fn(),
  mockAppleVerifyIdToken: vi.fn(),
}));

vi.mock("google-auth-library", () => ({
  OAuth2Client: class {
    verifyIdToken = mockGoogleVerifyIdToken;
  },
}));

vi.mock("apple-signin-auth", () => ({
  default: { verifyIdToken: mockAppleVerifyIdToken },
}));

// Import after mocks are hoisted
import {
  generateToken,
  verifyToken,
  createRefreshToken,
  rotateRefreshToken,
  revokeAllUserTokens,
  revokeTokenByRaw,
  cleanupExpiredTokens,
  appleAuth,
  googleAuth,
} from "../../services/authService";
import { UnauthorizedError } from "../../errors/AppError";

// ── JWT ───────────────────────────────────────────────────────────────

describe("generateToken", () => {
  it("returns a valid JWT string", () => {
    const token = generateToken("1");
    expect(typeof token).toBe("string");
    expect(token.split(".")).toHaveLength(3);
  });

  it("contains the provided userId in payload", () => {
    const token = generateToken("42");
    const decoded = jwt.decode(token) as any;
    expect(decoded.userId).toBe("42");
  });
});

describe("verifyToken", () => {
  it("returns { userId } for a valid token", () => {
    const token = generateToken("1");
    const result = verifyToken(token);
    expect(result.userId).toBe("1");
  });

  it("throws for an invalid token", () => {
    expect(() => verifyToken("invalid.token.here")).toThrow();
  });

  it("throws for a token signed with a different secret", () => {
    const token = jwt.sign({ userId: "1" }, "wrong-secret", { expiresIn: "1h" });
    expect(() => verifyToken(token)).toThrow();
  });
});

// ── Refresh tokens ────────────────────────────────────────────────────

describe("createRefreshToken", () => {
  it("creates a token in DB and returns a base64url string", async () => {
    prismaMock.refreshToken.create.mockResolvedValue({ id: 1 });

    const rawToken = await createRefreshToken(1);

    expect(typeof rawToken).toBe("string");
    expect(rawToken.length).toBeGreaterThan(0);
    expect(prismaMock.refreshToken.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        tokenHash: expect.any(String),
        userId: 1,
        familyId: expect.any(String),
        expiresAt: expect.any(Date),
      }),
    });
  });

  it("uses provided familyId", async () => {
    prismaMock.refreshToken.create.mockResolvedValue({ id: 1 });

    await createRefreshToken(1, "my-family");

    expect(prismaMock.refreshToken.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ familyId: "my-family" }),
    });
  });
});

describe("rotateRefreshToken", () => {
  const validToken = {
    id: 1,
    tokenHash: "hash",
    userId: 1,
    familyId: "fam-1",
    expiresAt: new Date(Date.now() + 86400000),
    revokedAt: null,
    replacedById: null,
  };

  it("returns new access + refresh tokens on success", async () => {
    prismaMock.refreshToken.findFirst.mockResolvedValue(validToken);
    prismaMock.refreshToken.create.mockResolvedValue({ id: 2 });
    prismaMock.refreshToken.update.mockResolvedValue({});

    const result = await rotateRefreshToken("some-raw-token");

    expect(result).toHaveProperty("accessToken");
    expect(result).toHaveProperty("refreshToken");
    expect(typeof result.accessToken).toBe("string");
    expect(typeof result.refreshToken).toBe("string");
  });

  it("throws UnauthorizedError when token not found", async () => {
    prismaMock.refreshToken.findFirst.mockResolvedValue(null);

    await expect(rotateRefreshToken("bad-token")).rejects.toThrow(UnauthorizedError);
  });

  it("throws UnauthorizedError when token is expired", async () => {
    prismaMock.refreshToken.findFirst.mockResolvedValue({
      ...validToken,
      expiresAt: new Date(Date.now() - 1000),
    });
    prismaMock.refreshToken.update.mockResolvedValue({});

    await expect(rotateRefreshToken("expired-token")).rejects.toThrow(UnauthorizedError);
  });

  it("throws and revokes family on reuse (revokedAt set)", async () => {
    prismaMock.refreshToken.findFirst.mockResolvedValue({
      ...validToken,
      revokedAt: new Date(),
    });
    prismaMock.refreshToken.updateMany.mockResolvedValue({ count: 3 });

    await expect(rotateRefreshToken("reused-token")).rejects.toThrow(
      /reuse detected/i
    );
    expect(prismaMock.refreshToken.updateMany).toHaveBeenCalledWith({
      where: { familyId: "fam-1", revokedAt: null },
      data: { revokedAt: expect.any(Date) },
    });
  });

  it("throws and revokes family on reuse (replacedById set)", async () => {
    prismaMock.refreshToken.findFirst.mockResolvedValue({
      ...validToken,
      replacedById: 99,
    });
    prismaMock.refreshToken.updateMany.mockResolvedValue({ count: 2 });

    await expect(rotateRefreshToken("replaced-token")).rejects.toThrow(
      /reuse detected/i
    );
  });

  it("uses Serializable isolation", async () => {
    prismaMock.refreshToken.findFirst.mockResolvedValue(validToken);
    prismaMock.refreshToken.create.mockResolvedValue({ id: 2 });
    prismaMock.refreshToken.update.mockResolvedValue({});

    await rotateRefreshToken("token");

    expect(prismaMock.$transaction).toHaveBeenCalledWith(
      expect.any(Function),
      { isolationLevel: "Serializable" }
    );
  });
});

describe("revokeAllUserTokens", () => {
  it("revokes all non-revoked tokens for user", async () => {
    prismaMock.refreshToken.updateMany.mockResolvedValue({ count: 5 });

    await revokeAllUserTokens(1);

    expect(prismaMock.refreshToken.updateMany).toHaveBeenCalledWith({
      where: { userId: 1, revokedAt: null },
      data: { revokedAt: expect.any(Date) },
    });
  });
});

describe("revokeTokenByRaw", () => {
  it("hashes raw token and revokes matching records", async () => {
    prismaMock.refreshToken.updateMany.mockResolvedValue({ count: 1 });

    await revokeTokenByRaw("some-raw-token");

    expect(prismaMock.refreshToken.updateMany).toHaveBeenCalledWith({
      where: { tokenHash: expect.any(String), revokedAt: null },
      data: { revokedAt: expect.any(Date) },
    });
  });
});

describe("cleanupExpiredTokens", () => {
  it("deletes expired and revoked tokens", async () => {
    prismaMock.refreshToken.deleteMany.mockResolvedValue({ count: 10 });

    const result = await cleanupExpiredTokens();

    expect(result).toBe(10);
    expect(prismaMock.refreshToken.deleteMany).toHaveBeenCalledWith({
      where: {
        OR: [
          { expiresAt: { lt: expect.any(Date) } },
          { revokedAt: { not: null } },
        ],
      },
    });
  });
});

// ── Social auth ───────────────────────────────────────────────────────

const mockUser = {
  id: 1,
  email: "test@example.com",
  firstName: null,
  lastName: null,
  googleId: null,
  appleId: null,
  creditBalance: 0,
  pushToken: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("appleAuth", () => {
  beforeEach(() => {
    // Default: valid Apple token
    mockAppleVerifyIdToken.mockResolvedValue({
      sub: "apple-user-123",
      email: "test@example.com",
    });
    // Default: createRefreshToken succeeds
    prismaMock.refreshToken.create.mockResolvedValue({ id: 1 });
  });

  it("returns existing user found by appleId", async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce({ ...mockUser, appleId: "apple-user-123" });

    const result = await appleAuth("valid-token");

    expect(result.user.appleId).toBe("apple-user-123");
    expect(result).toHaveProperty("accessToken");
    expect(result).toHaveProperty("refreshToken");
  });

  it("links appleId to existing user found by email", async () => {
    // First findUnique (by appleId) returns null
    prismaMock.user.findUnique.mockResolvedValueOnce(null);
    // Second findUnique (by email) returns existing user
    prismaMock.user.findUnique.mockResolvedValueOnce(mockUser);
    // Update to link appleId
    prismaMock.user.update.mockResolvedValue({ ...mockUser, appleId: "apple-user-123" });

    const result = await appleAuth("valid-token");

    expect(prismaMock.user.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { appleId: "apple-user-123" },
    });
    expect(result).toHaveProperty("accessToken");
  });

  it("creates new user when no match exists", async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    const newUser = { ...mockUser, id: 2, appleId: "apple-user-123" };
    prismaMock.user.create.mockResolvedValue(newUser);
    // grantSignupBonus: addCredits transaction
    prismaMock.user.update.mockResolvedValue({ creditBalance: 50 });
    prismaMock.creditTransaction.create.mockResolvedValue({});

    const result = await appleAuth("valid-token");

    expect(prismaMock.user.create).toHaveBeenCalledWith({
      data: { email: "test@example.com", appleId: "apple-user-123" },
    });
    expect(result.user.id).toBe(2);
  });

  it("throws UnauthorizedError for invalid Apple token", async () => {
    mockAppleVerifyIdToken.mockResolvedValue(null);

    await expect(appleAuth("bad-token")).rejects.toThrow(UnauthorizedError);
  });
});

describe("googleAuth", () => {
  beforeEach(() => {
    // Default: valid Google token
    mockGoogleVerifyIdToken.mockResolvedValue({
      getPayload: () => ({
        sub: "google-user-456",
        email: "test@example.com",
      }),
    });
    prismaMock.refreshToken.create.mockResolvedValue({ id: 1 });
  });

  it("returns existing user found by googleId", async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce({ ...mockUser, googleId: "google-user-456" });

    const result = await googleAuth("valid-token");

    expect(result.user.googleId).toBe("google-user-456");
    expect(result).toHaveProperty("accessToken");
    expect(result).toHaveProperty("refreshToken");
  });

  it("links googleId to existing user found by email", async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce(null);
    prismaMock.user.findUnique.mockResolvedValueOnce(mockUser);
    prismaMock.user.update.mockResolvedValue({ ...mockUser, googleId: "google-user-456" });

    const result = await googleAuth("valid-token");

    expect(prismaMock.user.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { googleId: "google-user-456" },
    });
    expect(result).toHaveProperty("accessToken");
  });

  it("creates new user when no match exists", async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    const newUser = { ...mockUser, id: 3, googleId: "google-user-456" };
    prismaMock.user.create.mockResolvedValue(newUser);
    prismaMock.user.update.mockResolvedValue({ creditBalance: 50 });
    prismaMock.creditTransaction.create.mockResolvedValue({});

    const result = await googleAuth("valid-token");

    expect(prismaMock.user.create).toHaveBeenCalledWith({
      data: { email: "test@example.com", googleId: "google-user-456" },
    });
    expect(result.user.id).toBe(3);
  });

  it("throws UnauthorizedError for invalid Google token", async () => {
    mockGoogleVerifyIdToken.mockResolvedValue({ getPayload: () => null });

    await expect(googleAuth("bad-token")).rejects.toThrow(UnauthorizedError);
  });

  it("normalizes email to lowercase", async () => {
    mockGoogleVerifyIdToken.mockResolvedValue({
      getPayload: () => ({
        sub: "google-user-789",
        email: "  TEST@EXAMPLE.COM  ",
      }),
    });
    prismaMock.user.findUnique.mockResolvedValue(null);
    prismaMock.user.create.mockResolvedValue({ ...mockUser, id: 4 });
    prismaMock.user.update.mockResolvedValue({ creditBalance: 50 });
    prismaMock.creditTransaction.create.mockResolvedValue({});
    prismaMock.refreshToken.create.mockResolvedValue({ id: 1 });

    await googleAuth("valid-token");

    expect(prismaMock.user.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { email: "test@example.com" } })
    );
  });
});
