"""Tests for the 50-job catalog + bucket query filter on GET /api/jobs."""
import os
import requests
import pytest

BASE = os.environ.get("EXPO_PUBLIC_BACKEND_URL", "https://payment-mgmt-10.preview.emergentagent.com").rstrip("/")

EXPECTED_TOTAL = 200


def _seeded(jobs):
    """Employer-posted (cjob-) jobs are dynamic; count assertions apply to seeds only."""
    return [j for j in jobs if not j["id"].startswith("cjob-")]
EXPECTED_DIST = {"Creative": 56, "Tech": 48, "Marketing": 48, "Ops": 48}
TECH_COUNT = EXPECTED_DIST["Tech"]


@pytest.fixture(scope="module")
def verified_freelancer():
    r = requests.post(
        f"{BASE}/api/freelancer/pay",
        json={"full_name": "TEST_BucketVerified", "payment_method": "upi"},
        timeout=30,
    )
    assert r.status_code == 200
    fid = r.json()["freelancer_id"]
    r2 = requests.post(
        f"{BASE}/api/freelancer/aadhaar/verify",
        json={"freelancer_id": fid, "aadhaar_number": "987612345678"},
        timeout=30,
    )
    assert r2.status_code == 200
    return fid


# --- 200 total + distribution ---
def test_jobs_total_with_bucket_field():
    r = requests.get(f"{BASE}/api/jobs", timeout=30)
    assert r.status_code == 200
    data = _seeded(r.json())
    assert len(data) == EXPECTED_TOTAL, f"Expected {EXPECTED_TOTAL}, got {len(data)}"
    # Every job must have a non-empty bucket field
    for j in data:
        assert "bucket" in j, f"Job {j.get('id')} missing bucket"
        assert j["bucket"] in EXPECTED_DIST, f"Unexpected bucket {j['bucket']} on {j['id']}"
    counts = {b: 0 for b in EXPECTED_DIST}
    for j in data:
        counts[j["bucket"]] += 1
    assert counts == EXPECTED_DIST, f"Distribution mismatch: {counts}"


# --- bucket filter (exact case) ---
@pytest.mark.parametrize("bucket,expected", list(EXPECTED_DIST.items()))
def test_jobs_bucket_filter_counts(bucket, expected):
    r = requests.get(f"{BASE}/api/jobs", params={"bucket": bucket}, timeout=30)
    assert r.status_code == 200
    data = _seeded(r.json())
    assert len(data) == expected, f"{bucket}: expected {expected}, got {len(data)}"
    for j in data:
        assert j["bucket"] == bucket


# --- case-insensitive lowercase still works ---
def test_jobs_bucket_filter_case_insensitive_tech():
    r = requests.get(f"{BASE}/api/jobs", params={"bucket": "tech"}, timeout=30)
    assert r.status_code == 200
    data = _seeded(r.json())
    assert len(data) == TECH_COUNT
    for j in data:
        assert j["bucket"] == "Tech"


# --- garbage bucket returns empty list ---
def test_jobs_bucket_garbage_returns_empty():
    r = requests.get(f"{BASE}/api/jobs", params={"bucket": "Garbage"}, timeout=30)
    assert r.status_code == 200
    assert r.json() == []


# --- bucket filter + verified freelancer => still anonymized (chat-only contact) ---
def test_jobs_bucket_tech_verified_anonymized(verified_freelancer):
    r = requests.get(
        f"{BASE}/api/jobs",
        params={"bucket": "Tech", "freelancer_id": verified_freelancer},
        timeout=30,
    )
    assert r.status_code == 200
    data = _seeded(r.json())
    assert len(data) == TECH_COUNT
    for j in data:
        assert j["bucket"] == "Tech"
        assert "employer_phone" not in j
        assert j["company_name"]


# --- bucket filter + unverified id => anonymized too ---
def test_jobs_bucket_tech_unverified_anonymized():
    r = requests.get(
        f"{BASE}/api/jobs",
        params={"bucket": "Tech", "freelancer_id": "ghost-not-real"},
        timeout=30,
    )
    assert r.status_code == 200
    data = _seeded(r.json())
    assert len(data) == TECH_COUNT
    for j in data:
        assert "employer_phone" not in j


# --- structural sanity: pay_label format, ids unique ---
def test_jobs_structural_sanity():
    r = requests.get(f"{BASE}/api/jobs", timeout=30)
    data = _seeded(r.json())
    ids = [j["id"] for j in data]
    assert len(set(ids)) == EXPECTED_TOTAL, "Duplicate job ids"
    for j in data:
        assert j["pay_label"].startswith("₹")
        assert isinstance(j["pay"], int) and j["pay"] > 0
        assert j["title"] and j["category"] and j["description"]
