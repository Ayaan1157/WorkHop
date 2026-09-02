"""Backend tests for the 9-catalog-category acceptance on POST /api/employer/jobs.

Covers review request items 3 & 4:
- Employer with a plan_purchases credit can POST /api/employer/jobs with one of
  the 9 catalog categories; response echoes category, bucket-mapped correctly.
- Legacy bucket values (Creative/Tech/Marketing/Ops) still accepted.
- Invalid bucket -> 400.
- GET /api/jobs returns the new job; bucket filter picks it up.
"""
import os
import uuid
import pytest
import requests
from pymongo import MongoClient

BASE = os.environ["EXPO_PUBLIC_BACKEND_URL"].rstrip("/")
MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "test_database")

_client = MongoClient(MONGO_URL)
_db = _client[DB_NAME]


CATALOG_TO_BUCKET = {
    "Graphics & Design": "Creative",
    "Programming & Tech": "Tech",
    "Digital Marketing": "Marketing",
    "Writing & Translation": "Creative",
    "Video & Animation": "Creative",
    "AI Services": "Tech",
    "Music & Audio": "Creative",
    "Business": "Ops",
    "Consulting": "Ops",
}


@pytest.fixture(scope="module")
def employer_with_credit():
    """Grant this employer 20 single-post credits (enough for every parametrized test)."""
    emp_id = f"TEST_emp_{uuid.uuid4().hex[:8]}"
    docs = [
        {
            "_id": f"TEST_pp_{uuid.uuid4().hex[:8]}",
            "employer_id": emp_id,
            "plan_id": "single-post",
            "amount_paise": 29900,
            "created_at": "2026-01-15T00:00:00+00:00",
        }
        for _ in range(20)
    ]
    _db.plan_purchases.insert_many(docs)
    yield emp_id
    # Cleanup: remove any purchases + custom jobs created by this test employer.
    _db.plan_purchases.delete_many({"employer_id": emp_id})
    _db.custom_jobs.delete_many({"employer_id": emp_id})


# ---- 1) All 9 catalog categories accepted with correct bucket mapping ----
@pytest.mark.parametrize("category,expected_bucket", list(CATALOG_TO_BUCKET.items()))
def test_post_job_accepts_catalog_category(employer_with_credit, category, expected_bucket):
    payload = {
        "employer_id": employer_with_credit,
        "company_name": "TEST_CatalogCo",
        "title": f"TEST_{category} role",
        "bucket": category,
        "pay": 5000,
        "description": f"Hiring for {category}. TEST_ROW",
        "area": "Bengaluru",
    }
    r = requests.post(f"{BASE}/api/employer/jobs", json=payload, timeout=30)
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["category"] == category, f"category should echo catalog name, got {body['category']}"
    assert body["bucket"] == expected_bucket, (
        f"{category} should map to bucket {expected_bucket}, got {body['bucket']}"
    )
    assert body["title"].startswith("TEST_"), body["title"]
    assert body["pay"] == 5000
    assert body["id"].startswith("cjob-")


# ---- 2) Legacy buckets still accepted (regression) ----
@pytest.mark.parametrize("legacy", ["Creative", "Tech", "Marketing", "Ops"])
def test_post_job_accepts_legacy_bucket(employer_with_credit, legacy):
    payload = {
        "employer_id": employer_with_credit,
        "company_name": "TEST_LegacyCo",
        "title": f"TEST_legacy_{legacy}",
        "bucket": legacy,
        "pay": 800,
        "description": "Legacy bucket path. TEST_ROW",
        "area": "Bengaluru",
    }
    r = requests.post(f"{BASE}/api/employer/jobs", json=payload, timeout=30)
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["category"] == legacy
    assert body["bucket"] == legacy


# ---- 3) Invalid bucket rejected ----
def test_post_job_rejects_invalid_bucket(employer_with_credit):
    payload = {
        "employer_id": employer_with_credit,
        "company_name": "TEST_BogusCo",
        "title": "TEST_bogus",
        "bucket": "Bogus",
        "pay": 900,
        "description": "Invalid bucket path. TEST_ROW",
        "area": "Bengaluru",
    }
    r = requests.post(f"{BASE}/api/employer/jobs", json=payload, timeout=30)
    assert r.status_code == 400, r.text
    assert "Invalid category" in r.text or "invalid" in r.text.lower()


# ---- 4) Employer without credit gets 402 (regression, doesn't create data) ----
def test_post_job_without_credit_returns_402():
    payload = {
        "employer_id": f"TEST_no_credit_{uuid.uuid4().hex[:6]}",
        "company_name": "TEST_NoCreditCo",
        "title": "TEST_no_credit",
        "bucket": "Digital Marketing",
        "pay": 700,
        "description": "No credits. TEST_ROW",
        "area": "Bengaluru",
    }
    r = requests.post(f"{BASE}/api/employer/jobs", json=payload, timeout=30)
    assert r.status_code == 402, r.text


# ---- 5) End-to-end: Digital Marketing post visible on GET /api/jobs + bucket filter ----
def test_e2e_digital_marketing_post_visible_in_feed(employer_with_credit):
    r = requests.post(
        f"{BASE}/api/employer/jobs",
        json={
            "employer_id": employer_with_credit,
            "company_name": "TEST_DMCo",
            "title": f"TEST_dm_visible_{uuid.uuid4().hex[:6]}",
            "bucket": "Digital Marketing",
            "pay": 6500,
            "description": "SEO + Meta ads. TEST_ROW",
            "area": "Bengaluru",
        },
        timeout=30,
    )
    assert r.status_code == 200, r.text
    posted = r.json()
    assert posted["category"] == "Digital Marketing"
    assert posted["bucket"] == "Marketing"
    posted_id = posted["id"]

    # Full jobs feed contains it
    r2 = requests.get(f"{BASE}/api/jobs", timeout=30)
    assert r2.status_code == 200
    ids = [j["id"] for j in r2.json()]
    assert posted_id in ids, "Newly posted Digital Marketing job missing from GET /api/jobs"

    # Bucket=Marketing filter contains it
    r3 = requests.get(f"{BASE}/api/jobs", params={"bucket": "Marketing"}, timeout=30)
    assert r3.status_code == 200
    marketing_jobs = r3.json()
    assert any(j["id"] == posted_id for j in marketing_jobs), (
        "Digital Marketing post not returned when filtering ?bucket=Marketing"
    )
    matching = next(j for j in marketing_jobs if j["id"] == posted_id)
    assert matching["category"] == "Digital Marketing"
    assert matching["bucket"] == "Marketing"


# ---- 6) Validation: empty title -> 400, low pay -> 400 (regression, credit-gated route) ----
def test_post_job_low_pay_rejected(employer_with_credit):
    r = requests.post(
        f"{BASE}/api/employer/jobs",
        json={
            "employer_id": employer_with_credit,
            "company_name": "TEST_LowPay",
            "title": "TEST_lowpay",
            "bucket": "Business",
            "pay": 100,
            "description": "too low. TEST_ROW",
            "area": "Bengaluru",
        },
        timeout=30,
    )
    assert r.status_code == 400
