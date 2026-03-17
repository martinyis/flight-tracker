import { describe, it, expect, vi } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import { createApp } from "../../index";

// Mock google-auth-library and apple-signin-auth so authService can load
vi.mock("google-auth-library", () => ({
  OAuth2Client: class {
    verifyIdToken = vi.fn();
  },
}));
vi.mock("apple-signin-auth", () => ({
  default: { verifyIdToken: vi.fn() },
}));

// Mock savedSearchService at the module level
const {
  mockCreateSavedSearch,
  mockGetUserSearches,
  mockGetSearchById,
  mockDeleteSearch,
} = vi.hoisted(() => ({
  mockCreateSavedSearch: vi.fn(),
  mockGetUserSearches: vi.fn(),
  mockGetSearchById: vi.fn(),
  mockDeleteSearch: vi.fn(),
}));

vi.mock("../../services/savedSearchService", () => ({
  createSavedSearch: mockCreateSavedSearch,
  getUserSearches: mockGetUserSearches,
  getSearchById: mockGetSearchById,
  deleteSearch: mockDeleteSearch,
  activateTracking: vi.fn(),
  paidRefresh: vi.fn(),
  refreshSearch: vi.fn(),
  updateFilters: vi.fn(),
  hydrateSearch: vi.fn(),
  hydrateOneOption: vi.fn(),
  reSearchExcludingAirlines: vi.fn(),
  appendPriceHistory: vi.fn(),
  toggleSearchActive: vi.fn(),
}));

const app = createApp();

function authHeader() {
  const token = jwt.sign({ userId: "1" }, process.env.JWT_SECRET!, { expiresIn: "1h" });
  return `Bearer ${token}`;
}

describe("POST /api/search", () => {
  it("returns 401 without auth", async () => {
    const res = await request(app).post("/api/search").send({});
    expect(res.status).toBe(401);
  });

  it("returns 201 on successful search creation", async () => {
    mockCreateSavedSearch.mockResolvedValue({
      search: { id: 1, tripType: "oneway", origin: "JFK", destination: "LAX" },
      creditsCharged: 5,
      remainingBalance: 95,
      resultsError: null,
    });

    const res = await request(app)
      .post("/api/search")
      .set("Authorization", authHeader())
      .send({
        tripType: "oneway",
        origin: "JFK",
        destination: "LAX",
        dateFrom: "2026-04-01",
        dateTo: "2026-04-10",
      });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("creditsCharged", 5);
    expect(res.body).toHaveProperty("remainingBalance", 95);
  });

  it("returns 400 for invalid body (missing required fields)", async () => {
    const res = await request(app)
      .post("/api/search")
      .set("Authorization", authHeader())
      .send({ tripType: "oneway" });

    expect(res.status).toBe(400);
  });
});

describe("GET /api/search", () => {
  it("returns 200 with search list", async () => {
    mockGetUserSearches.mockResolvedValue([
      { id: 1, origin: "JFK", destination: "LAX" },
    ]);

    const res = await request(app)
      .get("/api/search")
      .set("Authorization", authHeader());

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(1);
  });
});

describe("GET /api/search/:id", () => {
  it("returns 200 for valid search", async () => {
    mockGetSearchById.mockResolvedValue({
      id: 1,
      origin: "JFK",
      destination: "LAX",
    });

    const res = await request(app)
      .get("/api/search/1")
      .set("Authorization", authHeader());

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(1);
  });

  it("returns 400 for non-numeric id", async () => {
    const res = await request(app)
      .get("/api/search/abc")
      .set("Authorization", authHeader());

    expect(res.status).toBe(400);
  });
});

describe("DELETE /api/search/:id", () => {
  it("returns 200 on successful deletion", async () => {
    mockDeleteSearch.mockResolvedValue(true);

    const res = await request(app)
      .delete("/api/search/1")
      .set("Authorization", authHeader());

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("message", "Deleted");
  });
});
