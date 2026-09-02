"""Backend tests for the employer Plans & Pricing feature (mocked payments)."""
import os
import uuid
import requests
import pytest

BASE = os.environ.get(
    "EXPO_PUBLIC_BACKEND_URL",
    "https://payment-mgmt-10.preview.emergentagent.com",
).rstrip("/")

EXPECTED_PLANS = {
    "single-post":      {"section": "postings", "price": 299,   "duration_days": None},
    "starter-bundle":   {"section": "postings", "price": 999,   "duration_days": None},
    "premium-boost":    {"section": "postings", "price": 299,   "duration_days": None},
    "brand-spotlight":  {"section": "branding", "price": 4999,  "duration_days": 7},
    "classified-ad":    {"section": "branding", "price": 9999,  "duration_days": 30},
    "enterprise-suite": {"section": "branding", "price": 24999, "duration_days": 30},
}


# ---------- Catalog ----------
def test_plans_catalog_returns_six_plans():
    r = requests.get(f"{BASE}/api/plans", timeout=30)
    assert r.status_code == 200, r.text
    data = r.json()
    assert isinstance(data, list) and len(data) == 6
    ids = {p["plan_id"] for p in data}
    assert ids == set(EXPECTED_PLANS.keys())


def test_plans_catalog_sections_and_prices():
    data = requests.get(f"{BASE}/api/plans", timeout=30).json()
    for p in data:
        exp = EXPECTED_PLANS[p["plan_id"]]
        assert p["section"] == exp["section"], p
        assert p["price"] == exp["price"], p
        assert p["duration_days"] == exp["duration_days"], p
        assert "price_label" in p and p["price_label"].startswith("₹")
        assert isinstance(p["features"], list) and len(p["features"]) >= 2


def test_plans_catalog_badges():
    data = {p["plan_id"]: p for p in requests.get(f"{BASE}/api/plans", timeout=30).json()}
    assert data["starter-bundle"]["badge"] == "SAVE 33%"
    assert data["premium-boost"]["badge"] == "ADD-ON"
    assert data["enterprise-suite"]["badge"] == "BEST VALUE"


# ---------- Purchase ----------
@pytest.fixture(scope="module")
def employer_id():
    return f"TEST_employer-{uuid.uuid4().hex[:8]}"


def test_purchase_no_duration_plan_has_no_expiry(employer_id):
    r = requests.post(
        f"{BASE}/api/employer/plans/purchase",
        json={"employer_id": employer_id, "plan_id": "single-post", "payment_method": "upi"},
        timeout=30,
    )
    assert r.status_code == 200, r.text
    d = r.json()
    assert d["plan_id"] == "single-post"
    assert d["plan_name"] == "Single Post"
    assert d["section"] == "postings"
    assert d["price"] == 299
    assert d["employer_id"] == employer_id
    assert d["expires_at"] is None
    assert "purchase_id" in d and "purchased_at" in d


def test_purchase_branding_plan_has_expiry(employer_id):
    r = requests.post(
        f"{BASE}/api/employer/plans/purchase",
        json={"employer_id": employer_id, "plan_id": "brand-spotlight", "payment_method": "card"},
        timeout=30,
    )
    assert r.status_code == 200, r.text
    d = r.json()
    assert d["expires_at"] is not None
    assert d["price"] == 4999


def test_purchase_enterprise_suite_expiry(employer_id):
    r = requests.post(
        f"{BASE}/api/employer/plans/purchase",
        json={"employer_id": employer_id, "plan_id": "enterprise-suite", "payment_method": "netbanking"},
        timeout=30,
    )
    assert r.status_code == 200
    assert r.json()["expires_at"] is not None


def test_purchase_invalid_plan_returns_404(employer_id):
    r = requests.post(
        f"{BASE}/api/employer/plans/purchase",
        json={"employer_id": employer_id, "plan_id": "does-not-exist", "payment_method": "upi"},
        timeout=30,
    )
    assert r.status_code == 404


# ---------- Employer active plans listing ----------
def test_employer_active_plans_lists_only_own(employer_id):
    # employer_id above has purchased 3 plans by now
    r = requests.get(f"{BASE}/api/employer/{employer_id}/plans", timeout=30)
    assert r.status_code == 200
    data = r.json()
    assert len(data) >= 3
    plan_ids = [p["plan_id"] for p in data]
    for pid in ("single-post", "brand-spotlight", "enterprise-suite"):
        assert pid in plan_ids
    # every record belongs to this employer
    for p in data:
        assert p["employer_id"] == employer_id


def test_employer_active_plans_isolation():
    other = f"TEST_employer-{uuid.uuid4().hex[:8]}"
    r = requests.get(f"{BASE}/api/employer/{other}/plans", timeout=30)
    assert r.status_code == 200
    assert r.json() == []


# ---------- Regression: existing ₹199 & ₹99 unchanged ----------
def test_regression_unlock_still_199():
    r = requests.post(f"{BASE}/api/employer/unlock", json={"payment_method": "upi"}, timeout=30)
    assert r.status_code == 200
    assert r.json()["paid_amount"] == 199


def test_regression_freelancer_pay_still_99():
    r = requests.post(
        f"{BASE}/api/freelancer/pay",
        json={"full_name": "TEST_Regress", "payment_method": "upi"},
        timeout=30,
    )
    assert r.status_code == 200
    assert r.json()["paid_amount"] == 99
