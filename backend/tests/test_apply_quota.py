"""Tests for apply-to-job + quota + ₹149 boost (+5 applies/day) flow."""
import os
import time
import uuid
import requests
import pytest

BASE = os.environ.get(
    "EXPO_PUBLIC_BACKEND_URL", "https://payment-mgmt-10.preview.emergentagent.com"
).rstrip("/")


def _new_paid(name="TEST_QuotaPaid"):
    r = requests.post(
        f"{BASE}/api/freelancer/pay", json={"full_name": name, "payment_method": "upi"}, timeout=30
    )
    assert r.status_code == 200
    return r.json()["freelancer_id"]


def _new_verified(name="TEST_QuotaVerified"):
    fid = _new_paid(name)
    r = requests.post(
        f"{BASE}/api/freelancer/aadhaar/verify",
        json={"freelancer_id": fid, "aadhaar_number": "432198765432"},
        timeout=30,
    )
    assert r.status_code == 200
    return fid


# Module-scoped freelancers
@pytest.fixture(scope="module")
def verified_a():
    return _new_verified("TEST_QuotaA")


@pytest.fixture(scope="module")
def verified_b():
    return _new_verified("TEST_QuotaB")


@pytest.fixture(scope="module")
def paid_only():
    return _new_paid("TEST_QuotaPaidOnly")


# ---------- GET /api/freelancer/{id}/quota ----------
def test_quota_initial_state(verified_a):
    r = requests.get(f"{BASE}/api/freelancer/{verified_a}/quota", timeout=30)
    assert r.status_code == 200
    d = r.json()
    assert d["freelancer_id"] == verified_a
    assert d["quota_used"] == 0
    assert d["quota_limit"] == 3
    assert d["has_boost"] is False
    assert d["applied_job_ids"] == []


def test_quota_unknown_freelancer_404():
    r = requests.get(f"{BASE}/api/freelancer/ghost-{uuid.uuid4().hex[:6]}/quota", timeout=30)
    assert r.status_code == 404


# ---------- POST /api/jobs/{id}/apply ----------
def test_apply_unknown_job_404(verified_a):
    r = requests.post(
        f"{BASE}/api/jobs/job-does-not-exist/apply",
        json={"freelancer_id": verified_a, "note": "x"},
        timeout=30,
    )
    assert r.status_code == 404


def test_apply_unknown_freelancer_404():
    r = requests.post(
        f"{BASE}/api/jobs/job-1/apply",
        json={"freelancer_id": f"ghost-{uuid.uuid4().hex[:6]}", "note": ""},
        timeout=30,
    )
    assert r.status_code == 404


def test_apply_unverified_freelancer_403(paid_only):
    r = requests.post(
        f"{BASE}/api/jobs/job-1/apply",
        json={"freelancer_id": paid_only, "note": ""},
        timeout=30,
    )
    assert r.status_code == 403


def test_apply_first_success_increments_quota(verified_b):
    r = requests.post(
        f"{BASE}/api/jobs/job-1/apply",
        json={"freelancer_id": verified_b, "note": "Hello"},
        timeout=30,
    )
    assert r.status_code == 200, r.text
    d = r.json()
    assert d["job_id"] == "job-1"
    assert d["freelancer_id"] == verified_b
    assert d["quota_used"] == 1
    assert d["quota_limit"] == 3
    assert d["has_boost"] is False
    assert "application_id" in d

    # GET quota reflects
    q = requests.get(f"{BASE}/api/freelancer/{verified_b}/quota", timeout=30).json()
    assert q["quota_used"] == 1
    assert "job-1" in q["applied_job_ids"]


def test_apply_duplicate_409(verified_b):
    r = requests.post(
        f"{BASE}/api/jobs/job-1/apply",
        json={"freelancer_id": verified_b, "note": ""},
        timeout=30,
    )
    assert r.status_code == 409


def test_apply_quota_exhaust_then_402_then_boost_then_capped_at_8(verified_a):
    # Apply 3 times to different jobs
    for jid in ("job-1", "job-2", "job-3"):
        r = requests.post(
            f"{BASE}/api/jobs/{jid}/apply",
            json={"freelancer_id": verified_a, "note": ""},
            timeout=30,
        )
        assert r.status_code == 200, f"{jid} -> {r.status_code} {r.text}"

    q = requests.get(f"{BASE}/api/freelancer/{verified_a}/quota", timeout=30).json()
    assert q["quota_used"] == 3
    assert q["has_boost"] is False

    # 4th apply must 402
    r4 = requests.post(
        f"{BASE}/api/jobs/job-4/apply",
        json={"freelancer_id": verified_a, "note": ""},
        timeout=30,
    )
    assert r4.status_code == 402, r4.text
    assert "Daily free quota" in r4.json().get("detail", "")

    # Boost ₹149 → +5 applies
    unlock = requests.post(
        f"{BASE}/api/freelancer/quota/unlock",
        json={"freelancer_id": verified_a, "payment_method": "upi"},
        timeout=30,
    )
    assert unlock.status_code == 200, unlock.text
    ud = unlock.json()
    assert ud["has_boost"] is True
    assert ud["paid_amount"] == 149
    assert ud["quota_limit"] == 8
    assert ud["boost_until"]

    # Buying boost again while active → 409
    again = requests.post(
        f"{BASE}/api/freelancer/quota/unlock",
        json={"freelancer_id": verified_a, "payment_method": "upi"},
        timeout=30,
    )
    assert again.status_code == 409

    # Applies 4 through 8 succeed
    for jid in ("job-4", "job-5", "job-6", "job-7", "job-8"):
        r = requests.post(
            f"{BASE}/api/jobs/{jid}/apply",
            json={"freelancer_id": verified_a, "note": ""},
            timeout=30,
        )
        assert r.status_code == 200, f"{jid} -> {r.status_code} {r.text}"
        assert r.json()["has_boost"] is True
        assert r.json()["quota_limit"] == 8

    # 9th apply must 402 (daily cap even with boost)
    r9 = requests.post(
        f"{BASE}/api/jobs/job-9/apply",
        json={"freelancer_id": verified_a, "note": ""},
        timeout=30,
    )
    assert r9.status_code == 402, r9.text
    assert "Daily limit" in r9.json().get("detail", "")

    # Quota reflects boosted state
    qf = requests.get(f"{BASE}/api/freelancer/{verified_a}/quota", timeout=30).json()
    assert qf["has_boost"] is True
    assert qf["boost_until"] is not None
    assert qf["quota_used"] == 8
    assert qf["quota_limit"] == 8


# ---------- POST /api/freelancer/quota/unlock errors ----------
def test_unlock_unknown_freelancer_404():
    r = requests.post(
        f"{BASE}/api/freelancer/quota/unlock",
        json={"freelancer_id": f"ghost-{uuid.uuid4().hex[:6]}", "payment_method": "upi"},
        timeout=30,
    )
    assert r.status_code == 404


def test_unlock_unverified_freelancer_403(paid_only):
    r = requests.post(
        f"{BASE}/api/freelancer/quota/unlock",
        json={"freelancer_id": paid_only, "payment_method": "upi"},
        timeout=30,
    )
    assert r.status_code == 403
