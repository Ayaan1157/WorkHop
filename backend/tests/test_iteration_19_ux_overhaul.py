"""Backend tests for iteration 19: WorkHop 8-part UX overhaul.

Coverage:
- GET /api/leads/preview returns 50 enriched leads (area, rate_hr, intro,
  languages, delivery_days, reviews_count).
- GET /api/pros/{lead_id} exposes the same enriched fields plus reviews.
- POST /api/freelancer/submit accepts new profile fields (rate_hr, intro,
  languages, delivery_days) plus external Fiverr/Upwork import
  (external_platform, external_url, external_rating, external_reviews).
- Persistence: after submit, /api/pros/{fid} shows rating from external_rating
  and external_rating_source; /api/leads/preview count remains at 50 unchanged.
- Validation: external_rating > 5 returns 400.

Test artefacts prefixed with TEST_ are deleted in teardown.
"""

import os
import pytest
import requests
from pymongo import MongoClient

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    # Some environments still use EXPO_BACKEND_URL — fall back if present.
    BASE_URL = os.environ.get("EXPO_BACKEND_URL", "").rstrip("/")

MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "test_database")


# ------------------------------- fixtures ------------------------------- #
@pytest.fixture(scope="session")
def api_client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="session")
def mongo():
    client = MongoClient(MONGO_URL)
    yield client[DB_NAME]
    client.close()


@pytest.fixture(scope="module")
def paid_verified_fid(api_client, mongo):
    """Create a paid + aadhaar-verified freelancer, return id. Cleaned up after."""
    # Step 1: /freelancer/pay (has an await asyncio.sleep(1.0))
    r = api_client.post(f"{BASE_URL}/api/freelancer/pay", json={
        "full_name": "TEST_UX_Overhaul_Pro",
        "payment_method": "upi",
    }, timeout=15)
    assert r.status_code == 200, r.text
    fid = r.json()["freelancer_id"]

    # Step 2: aadhaar verify
    r2 = api_client.post(f"{BASE_URL}/api/freelancer/aadhaar/verify", json={
        "freelancer_id": fid,
        "aadhaar_number": "432112345678",
    }, timeout=15)
    assert r2.status_code == 200, r2.text

    yield fid

    # Cleanup
    try:
        mongo.freelancers.delete_one({"_id": fid})
        mongo.freelancer_portfolio.delete_one({"_id": fid})
    except Exception as e:
        print(f"[cleanup] failed for {fid}: {e}")


# ------------------------------- helpers -------------------------------- #
def _assert_lead_shape(lead: dict):
    """Every lead exposed via /api/leads/preview must have enriched fields."""
    for key in ("id", "name", "skill", "area", "rate_hr", "intro",
                "languages", "delivery_days", "reviews_count",
                "external_rating_source"):
        assert key in lead, f"missing key {key} in lead {lead.get('id')}"
    assert isinstance(lead["area"], str) and lead["area"].strip() != ""
    assert isinstance(lead["rate_hr"], int) and lead["rate_hr"] > 0
    assert isinstance(lead["intro"], str) and len(lead["intro"]) >= 10
    assert isinstance(lead["languages"], list) and len(lead["languages"]) >= 1
    assert isinstance(lead["delivery_days"], int) and lead["delivery_days"] > 0
    assert isinstance(lead["reviews_count"], int) and lead["reviews_count"] >= 0


# ------------------------------ tests ---------------------------------- #
class TestLeadsPreview:
    def test_leads_preview_returns_50_enriched(self, api_client):
        r = api_client.get(f"{BASE_URL}/api/leads/preview", timeout=10)
        assert r.status_code == 200
        leads = r.json()
        assert isinstance(leads, list)
        assert len(leads) == 50, f"expected 50 leads, got {len(leads)}"
        for lead in leads:
            _assert_lead_shape(lead)


class TestProsProfile:
    def test_pros_lead_1_has_new_fields(self, api_client):
        r = api_client.get(f"{BASE_URL}/api/pros/lead-1", timeout=10)
        assert r.status_code == 200
        body = r.json()
        assert "pro" in body and "reviews" in body
        pro = body["pro"]
        _assert_lead_shape(pro)
        # reviews must be a list (may be empty)
        assert isinstance(body["reviews"], list)

    def test_pros_unknown_returns_404(self, api_client):
        r = api_client.get(f"{BASE_URL}/api/pros/does-not-exist-xyz", timeout=10)
        assert r.status_code == 404


class TestFreelancerSubmitNewFields:
    def test_submit_with_new_fields_persists(self, api_client, paid_verified_fid):
        payload = {
            "freelancer_id": paid_verified_fid,
            "linkedin_url": "",
            "portfolio_url": "",
            "portfolio_images": [],
            "phone": "9876500123",
            "skill": "TEST_Logo Designer",
            "category": "Graphics & Design",
            "lat": 12.97,
            "lng": 77.59,
            "rate_hr": 750,
            "intro": "TEST intro: senior brand & logo designer available for fast turnarounds.",
            "languages": ["English", "Hindi", "Kannada"],
            "delivery_days": 2,
            "external_platform": "fiverr",
            "external_url": "https://www.fiverr.com/testauto_pro",
            "external_rating": 4.8,
            "external_reviews": 120,
        }
        r = api_client.post(f"{BASE_URL}/api/freelancer/submit",
                            json=payload, timeout=15)
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["freelancer_id"] == paid_verified_fid
        assert body["status"] == "under_review"

        # Verify via /api/pros/{fid}
        r2 = api_client.get(f"{BASE_URL}/api/pros/{paid_verified_fid}",
                            timeout=10)
        assert r2.status_code == 200, r2.text
        pro = r2.json()["pro"]
        assert pro["rate_hr"] == 750
        assert pro["delivery_days"] == 2
        assert "Kannada" in pro["languages"]
        assert pro["intro"].startswith("TEST intro")
        # external import must reflect on lead-level rating + source
        assert abs(pro["rating"] - 4.8) < 1e-6, f"rating={pro['rating']}"
        assert pro["external_rating_source"] == "fiverr"
        assert pro["reviews_count"] == 120

    def test_leads_preview_merges_real_verified_pro(
            self, api_client, paid_verified_fid):
        """A paid + verified + submitted freelancer must appear in /leads/preview
        (merged ahead of the 50 seeded demo leads)."""
        r = api_client.get(f"{BASE_URL}/api/leads/preview", timeout=10)
        assert r.status_code == 200
        leads = r.json()
        # Seed base is 50 → with our real pro it must be >= 51.
        assert len(leads) >= 51, f"expected >=51 with real pro, got {len(leads)}"
        # Our pro must be present with the imported rating + source.
        ours = next((l for l in leads if l["id"] == paid_verified_fid), None)
        assert ours is not None, "submitted freelancer not merged into preview"
        assert ours["external_rating_source"] == "fiverr"
        assert abs(ours["rating"] - 4.8) < 1e-6


class TestFreelancerSubmitValidation:
    def test_external_rating_out_of_range_returns_400(
            self, api_client, paid_verified_fid):
        payload = {
            "freelancer_id": paid_verified_fid,
            "linkedin_url": "",
            "portfolio_url": "",
            "portfolio_images": [],
            "phone": "9876500123",
            "skill": "TEST_Logo Designer",
            "category": "Graphics & Design",
            "rate_hr": 500,
            "intro": "TEST intro",
            "languages": ["English"],
            "delivery_days": 3,
            "external_platform": "fiverr",
            "external_url": "https://fiverr.com/x",
            "external_rating": 7.0,   # invalid
            "external_reviews": 10,
        }
        r = api_client.post(f"{BASE_URL}/api/freelancer/submit",
                            json=payload, timeout=15)
        assert r.status_code == 400, f"expected 400, got {r.status_code}: {r.text}"
        assert "rating" in r.text.lower()
