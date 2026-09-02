"""Iteration 16: profile CRUD (phone/skill/category/lat/lng) + real pros in /api/leads/preview.

Covers the FinalSubmitRequest additions and the new GET/PUT profile endpoints, plus the
merge-ahead-of-seeded-leads behaviour for verified real pros.
"""
import os
import uuid
import pytest
import requests
from pymongo import MongoClient

BASE_URL = os.environ["EXPO_PUBLIC_BACKEND_URL"].rstrip("/") if os.environ.get("EXPO_PUBLIC_BACKEND_URL") else None
if not BASE_URL:
    # backend supervisor uses same var as frontend for public URL; fall back to env
    BASE_URL = "https://payment-mgmt-10.preview.emergentagent.com"

MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "test_database")


@pytest.fixture(scope="module")
def db():
    client = MongoClient(MONGO_URL)
    return client[DB_NAME]


@pytest.fixture(scope="module")
def api():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture
def paid_verified_freelancer(db):
    """Create a paid + aadhaar_verified freelancer doc (no phone yet); auto-cleanup."""
    fid = f"TEST_pro_{uuid.uuid4().hex[:8]}"
    db.freelancers.insert_one({
        "_id": fid,
        "freelancer_id": fid,
        "full_name": "TEST_ Priya Sharma",
        "paid": True,
        "aadhaar_verified": True,
        "status": "aadhaar_verified",
        "created_at": "2026-01-01T00:00:00+00:00",
    })
    yield fid
    db.freelancers.delete_one({"_id": fid})
    db.freelancer_portfolio.delete_one({"_id": fid})


# ---------- PUT /api/freelancer/{id}/profile: phone validation ----------
class TestProfileUpdatePhone:
    def test_put_profile_valid_phone_formats_and_persists(self, api, paid_verified_freelancer, db):
        fid = paid_verified_freelancer
        r = api.put(f"{BASE_URL}/api/freelancer/{fid}/profile",
                    json={"phone": "9876512345", "skill": "Logo Designer",
                          "category": "Graphics & Design"})
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["phone"] == "+91 98765 12345"
        assert body["skill"] == "Logo Designer"
        assert body["category"] == "Graphics & Design"

        # GET verifies persistence
        g = api.get(f"{BASE_URL}/api/freelancer/{fid}/profile")
        assert g.status_code == 200
        gd = g.json()
        assert gd["phone"] == "+91 98765 12345"
        assert gd["skill"] == "Logo Designer"

    def test_put_profile_invalid_phone_returns_400(self, api, paid_verified_freelancer):
        fid = paid_verified_freelancer
        r = api.put(f"{BASE_URL}/api/freelancer/{fid}/profile", json={"phone": "12345"})
        assert r.status_code == 400
        assert "10-digit" in r.json().get("detail", "").lower() or "10 digit" in r.json().get("detail", "").lower()

    def test_get_profile_404_for_unknown(self, api):
        r = api.get(f"{BASE_URL}/api/freelancer/does-not-exist-xyz/profile")
        assert r.status_code == 404


# ---------- POST /api/freelancer/submit persists all new fields ----------
class TestFreelancerSubmit:
    def test_submit_persists_phone_skill_category_location(self, api, paid_verified_freelancer, db):
        fid = paid_verified_freelancer
        payload = {
            "freelancer_id": fid,
            "linkedin_url": "https://linkedin.com/in/test",
            "portfolio_url": "https://portfolio.test",
            "portfolio_images": [],
            "phone": "9876500022",
            "skill": "Brand & Logo Designer",
            "category": "Graphics & Design",
            "lat": 12.95,
            "lng": 77.60,
        }
        r = api.post(f"{BASE_URL}/api/freelancer/submit", json=payload)
        assert r.status_code == 200, r.text
        assert r.json()["status"] == "under_review"

        # Verify persistence
        doc = db.freelancers.find_one({"_id": fid})
        assert doc["phone"] == "+91 98765 00022"
        assert doc["skill"] == "Brand & Logo Designer"
        assert doc["category"] == "Graphics & Design"
        assert doc["lat"] == 12.95 and doc["lng"] == 77.60


# ---------- GET /api/leads/preview: real pros merged ahead of seeded ----------
class TestLeadsPreviewMerge:
    def test_real_pro_with_phone_appears_first(self, api, paid_verified_freelancer, db):
        fid = paid_verified_freelancer
        # Give it a phone via profile PUT
        api.put(f"{BASE_URL}/api/freelancer/{fid}/profile",
                json={"phone": "9876500033", "skill": "TEST_ Painter",
                      "category": "Graphics & Design"})
        r = api.get(f"{BASE_URL}/api/leads/preview")
        assert r.status_code == 200
        leads = r.json()
        # At least 50 seeded + 1 test-pro-lead1 + this real pro
        assert len(leads) >= 51
        ids = [l["id"] for l in leads]
        assert fid in ids, f"Real pro {fid} missing from leads preview"
        # Must appear BEFORE any lead-* seeded id
        first_seeded_idx = next(i for i, l in enumerate(leads) if l["id"].startswith("lead-"))
        assert ids.index(fid) < first_seeded_idx, "Real pro not merged ahead of seed leads"

        # Verify structure of the real lead
        rl = next(l for l in leads if l["id"] == fid)
        assert rl["name"] == "TEST_ Priya Sharma"
        assert rl["skill"] == "TEST_ Painter"
        assert rl["category"] == "Graphics & Design"
        assert rl["phone"] == "+91 98765 00033"
        assert rl["rating"] == 5.0
        assert rl["initials"] == "TP"

    def test_real_pro_without_phone_excluded(self, api, paid_verified_freelancer):
        fid = paid_verified_freelancer  # has no phone yet
        r = api.get(f"{BASE_URL}/api/leads/preview")
        assert r.status_code == 200
        ids = [l["id"] for l in r.json()]
        assert fid not in ids, "Freelancer without phone must NOT appear in leads"

    def test_seeded_leads_still_50(self, api):
        r = api.get(f"{BASE_URL}/api/leads/preview")
        seeded = [l for l in r.json() if l["id"].startswith("lead-")]
        assert len(seeded) == 50


# ---------- Employer unlock still works & returns real+seeded leads ----------
class TestEmployerUnlock:
    def test_unlock_returns_leads(self, api):
        r = api.post(f"{BASE_URL}/api/employer/unlock",
                     json={"employer_id": "TEST_emp_regression", "payment_method": "card"})
        assert r.status_code == 200
        body = r.json()
        assert body["paid_amount"] == 199
        assert len(body["leads"]) >= 50


# ---------- Regression: jobs feed unaffected ----------
class TestJobsRegression:
    def test_jobs_feed(self, api):
        r = api.get(f"{BASE_URL}/api/jobs")
        assert r.status_code == 200
        jobs = r.json()
        assert isinstance(jobs, list) and len(jobs) > 0
