"""Tests for newly-added endpoints: GET /api/jobs and GET /api/freelancer/{id}."""
import os
import requests
import pytest

BASE = os.environ.get("EXPO_PUBLIC_BACKEND_URL", "https://payment-mgmt-10.preview.emergentagent.com").rstrip("/")

EXPECTED_TOTAL = 200


def _seeded(jobs):
    """Employer-posted (cjob-) jobs are dynamic; count assertions apply to seeds only."""
    return [j for j in jobs if not j["id"].startswith("cjob-")]
EXPECTED_JOB_IDS = {f"job-{i}" for i in range(1, EXPECTED_TOTAL + 1)}


# ---------- helpers / fixtures ----------
@pytest.fixture(scope="module")
def paid_only_freelancer():
    r = requests.post(
        f"{BASE}/api/freelancer/pay",
        json={"full_name": "TEST_PaidOnly", "payment_method": "upi"},
        timeout=30,
    )
    assert r.status_code == 200
    return r.json()["freelancer_id"]


@pytest.fixture(scope="module")
def verified_freelancer():
    r = requests.post(
        f"{BASE}/api/freelancer/pay",
        json={"full_name": "TEST_Verified", "payment_method": "upi"},
        timeout=30,
    )
    assert r.status_code == 200
    fid = r.json()["freelancer_id"]
    r2 = requests.post(
        f"{BASE}/api/freelancer/aadhaar/verify",
        json={"freelancer_id": fid, "aadhaar_number": "432198765432"},
        timeout=30,
    )
    assert r2.status_code == 200
    return fid


# ---------- /api/jobs (employer identity anonymized: company only) ----------
def test_jobs_anonymized_company_only():
    r = requests.get(f"{BASE}/api/jobs", timeout=30)
    assert r.status_code == 200
    data = _seeded(r.json())
    assert isinstance(data, list)
    assert len(data) == EXPECTED_TOTAL
    ids = {j["id"] for j in data}
    assert ids == EXPECTED_JOB_IDS
    for j in data:
        assert "employer_phone" not in j, "Phone must never be exposed"
        assert "employer_name" not in j, "Employer personal name must never be exposed"
        for k in ("title", "category", "pay", "pay_label", "distance_km", "posted_minutes_ago", "company_name", "area", "description"):
            assert k in j


def test_jobs_unknown_freelancer_still_anonymized():
    r = requests.get(f"{BASE}/api/jobs", params={"freelancer_id": "ghost-xyz"}, timeout=30)
    assert r.status_code == 200
    data = _seeded(r.json())
    assert len(data) == EXPECTED_TOTAL
    assert all("employer_phone" not in j for j in data)


def test_jobs_paid_but_not_aadhaar_verified_still_anonymized(paid_only_freelancer):
    r = requests.get(f"{BASE}/api/jobs", params={"freelancer_id": paid_only_freelancer}, timeout=30)
    assert r.status_code == 200
    data = _seeded(r.json())
    assert len(data) == EXPECTED_TOTAL
    assert all("employer_phone" not in j for j in data)


def test_jobs_verified_freelancer_still_anonymized(verified_freelancer):
    """Even verified freelancers never see phone/personal names — chat is the only channel."""
    r = requests.get(f"{BASE}/api/jobs", params={"freelancer_id": verified_freelancer}, timeout=30)
    assert r.status_code == 200
    data = _seeded(r.json())
    assert len(data) == EXPECTED_TOTAL
    for j in data:
        assert "employer_phone" not in j
        assert j["company_name"]


# ---------- /api/freelancer/{id} ----------
def test_freelancer_status_unknown_404():
    r = requests.get(f"{BASE}/api/freelancer/does-not-exist-123", timeout=30)
    assert r.status_code == 404


def test_freelancer_status_paid_only(paid_only_freelancer):
    r = requests.get(f"{BASE}/api/freelancer/{paid_only_freelancer}", timeout=30)
    assert r.status_code == 200
    d = r.json()
    assert d["paid"] is True
    assert d["aadhaar_verified"] is False
    assert d["is_verified"] is False
    assert d["freelancer_id"] == paid_only_freelancer


def test_freelancer_status_verified(verified_freelancer):
    r = requests.get(f"{BASE}/api/freelancer/{verified_freelancer}", timeout=30)
    assert r.status_code == 200
    d = r.json()
    assert d["paid"] is True
    assert d["aadhaar_verified"] is True
    assert d["is_verified"] is True
