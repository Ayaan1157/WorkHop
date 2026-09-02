"""Backend tests for Admin Dashboard (iteration 23).

Covers:
- Auth gating on /api/admin/* (401 no token, 403 non-admin, 200 admin)
- /api/auth/me is_admin flag
- Overview counts
- Users list (roles + approved flag)
- Freelancers list + approve/revoke
- Payments (amount_rupees, discount_rupees, coupon_code)
- Complaints
- Coupon CRUD via admin + public /api/coupons/validate integration

Cleans up: TESTADMIN10 coupon left DISABLED (as per request).
"""
import os
import pytest
import requests

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL", "https://payment-mgmt-10.preview.emergentagent.com").rstrip("/")
ADMIN_TOKEN = "test_token_workhop_admin"
E2E_TOKEN = "test_token_workhop_e2e"
TEST_COUPON = "TESTADMIN10"


def h(token=None):
    return {"Authorization": f"Bearer {token}"} if token else {}


# ============== Auth gating ==============
ADMIN_PATHS = [
    ("GET", "/api/admin/overview"),
    ("GET", "/api/admin/users"),
    ("GET", "/api/admin/freelancers"),
    ("GET", "/api/admin/payments"),
    ("GET", "/api/admin/complaints"),
    ("GET", "/api/admin/coupons"),
]


class TestAuthGating:
    @pytest.mark.parametrize("method,path", ADMIN_PATHS)
    def test_no_token_returns_401(self, method, path):
        r = requests.request(method, f"{BASE_URL}{path}")
        assert r.status_code == 401, f"{path} without token → {r.status_code}: {r.text[:200]}"

    @pytest.mark.parametrize("method,path", ADMIN_PATHS)
    def test_non_admin_returns_403(self, method, path):
        r = requests.request(method, f"{BASE_URL}{path}", headers=h(E2E_TOKEN))
        assert r.status_code == 403, f"{path} with non-admin → {r.status_code}: {r.text[:200]}"

    @pytest.mark.parametrize("method,path", ADMIN_PATHS)
    def test_admin_returns_200(self, method, path):
        r = requests.request(method, f"{BASE_URL}{path}", headers=h(ADMIN_TOKEN))
        assert r.status_code == 200, f"{path} with admin → {r.status_code}: {r.text[:200]}"


class TestAuthMe:
    def test_me_admin_is_true(self):
        r = requests.get(f"{BASE_URL}/api/auth/me", headers=h(ADMIN_TOKEN))
        assert r.status_code == 200
        body = r.json()
        assert body.get("is_admin") is True, body
        assert (body.get("email") or "").lower() == "manarastudio22@gmail.com"

    def test_me_non_admin_is_false(self):
        r = requests.get(f"{BASE_URL}/api/auth/me", headers=h(E2E_TOKEN))
        assert r.status_code == 200
        body = r.json()
        assert body.get("is_admin") is False, body


# ============== Overview / Users / Payments / Complaints ==============
class TestOverview:
    def test_overview_shape(self):
        r = requests.get(f"{BASE_URL}/api/admin/overview", headers=h(ADMIN_TOKEN))
        assert r.status_code == 200
        b = r.json()
        for k in ("users", "freelancers", "payments_paid", "revenue_rupees", "complaints", "coupons"):
            assert k in b, f"missing {k} in {b}"
            assert isinstance(b[k], int), f"{k} is {type(b[k])}"


class TestUsers:
    def test_users_list_shape(self):
        r = requests.get(f"{BASE_URL}/api/admin/users", headers=h(ADMIN_TOKEN))
        assert r.status_code == 200
        arr = r.json()
        assert isinstance(arr, list) and len(arr) > 0
        roles = {u.get("role") for u in arr}
        assert roles.issubset({"freelancer", "employer"}), roles
        # Every user must have basics
        u0 = arr[0]
        for k in ("user_id", "email", "role"):
            assert k in u0


class TestPayments:
    def test_payments_shape(self):
        r = requests.get(f"{BASE_URL}/api/admin/payments", headers=h(ADMIN_TOKEN))
        assert r.status_code == 200
        arr = r.json()
        assert isinstance(arr, list)
        if arr:
            row = arr[0]
            for k in ("order_id", "amount_rupees", "discount_rupees", "coupon_code", "status"):
                assert k in row, f"missing {k}"


class TestComplaints:
    def test_complaints_list(self):
        r = requests.get(f"{BASE_URL}/api/admin/complaints", headers=h(ADMIN_TOKEN))
        assert r.status_code == 200
        assert isinstance(r.json(), list)


# ============== Freelancers approve/revoke ==============
class TestFreelancersApprove:
    def test_freelancers_list(self):
        r = requests.get(f"{BASE_URL}/api/admin/freelancers", headers=h(ADMIN_TOKEN))
        assert r.status_code == 200
        arr = r.json()
        assert isinstance(arr, list)
        if arr:
            f0 = arr[0]
            for k in ("freelancer_id", "full_name", "email", "phone", "skill", "paid", "email_verified", "status", "approved"):
                assert k in f0, f"missing {k}"

    def test_approve_404_for_unknown(self):
        r = requests.post(
            f"{BASE_URL}/api/admin/freelancers/does_not_exist_xyz/approve",
            headers=h(ADMIN_TOKEN), json={"approved": True},
        )
        assert r.status_code == 404

    def test_approve_and_revert(self):
        arr = requests.get(f"{BASE_URL}/api/admin/freelancers", headers=h(ADMIN_TOKEN)).json()
        if not arr:
            pytest.skip("no freelancers in db")
        target = arr[0]
        fid = target["freelancer_id"]
        original_approved = bool(target["approved"])
        # Toggle
        new_val = not original_approved
        r1 = requests.post(
            f"{BASE_URL}/api/admin/freelancers/{fid}/approve",
            headers=h(ADMIN_TOKEN), json={"approved": new_val},
        )
        assert r1.status_code == 200, r1.text
        assert r1.json().get("approved") is new_val
        # Verify via GET
        arr2 = requests.get(f"{BASE_URL}/api/admin/freelancers", headers=h(ADMIN_TOKEN)).json()
        found = next((f for f in arr2 if f["freelancer_id"] == fid), None)
        assert found is not None
        assert bool(found["approved"]) is new_val
        expected_status = "approved" if new_val else "under_review"
        assert found["status"] == expected_status, found
        # Revert
        r2 = requests.post(
            f"{BASE_URL}/api/admin/freelancers/{fid}/approve",
            headers=h(ADMIN_TOKEN), json={"approved": original_approved},
        )
        assert r2.status_code == 200


# ============== Coupons ==============
@pytest.fixture(scope="module", autouse=True)
def _pretest_cleanup():
    """Ensure TESTADMIN10 doesn't linger from prior runs before this suite runs."""
    from pymongo import MongoClient
    c = MongoClient("mongodb://localhost:27017")
    c["test_database"].coupons.delete_one({"_id": TEST_COUPON})
    yield
    # teardown: leave disabled but present is fine — spec says leave DISABLED at end.
    # We assert below in test_zzz_leave_disabled.


class TestCoupons:
    def test_list_contains_seeded(self):
        r = requests.get(f"{BASE_URL}/api/admin/coupons", headers=h(ADMIN_TOKEN))
        assert r.status_code == 200
        codes = {c["code"] for c in r.json()}
        assert "WELCOME50" in codes and "FLAT100" in codes, codes

    def test_create_coupon(self):
        r = requests.post(
            f"{BASE_URL}/api/admin/coupons", headers=h(ADMIN_TOKEN),
            json={
                "code": TEST_COUPON, "discount_type": "percent", "value": 10,
                "applies_to": "all", "max_uses": 2, "expires_in_days": 7,
                "description": "Iteration 23 test coupon",
            },
        )
        assert r.status_code == 200, r.text
        assert r.json().get("code") == TEST_COUPON
        # And it should be listed as active
        arr = requests.get(f"{BASE_URL}/api/admin/coupons", headers=h(ADMIN_TOKEN)).json()
        row = next((c for c in arr if c["code"] == TEST_COUPON), None)
        assert row is not None and row["active"] is True

    def test_public_validate_new_coupon(self):
        # applies_to=all → should validate for any product
        r = requests.post(
            f"{BASE_URL}/api/coupons/validate",
            json={"code": TEST_COUPON, "product": "employer_unlock", "amount": 199},
        )
        assert r.status_code == 200, r.text
        body = r.json()
        assert body.get("valid") is True and body.get("code") == TEST_COUPON
        # 10% off ₹199 = ₹19.90 → floor to ₹19
        assert body.get("discount_amount") in (19, 20), body
        assert body.get("final_amount") in (179, 180), body

    def test_duplicate_code_409(self):
        r = requests.post(
            f"{BASE_URL}/api/admin/coupons", headers=h(ADMIN_TOKEN),
            json={"code": TEST_COUPON, "discount_type": "percent", "value": 5, "applies_to": "all"},
        )
        assert r.status_code == 409, r.text

    def test_invalid_percent_400(self):
        r = requests.post(
            f"{BASE_URL}/api/admin/coupons", headers=h(ADMIN_TOKEN),
            json={"code": "BADPERCENT1", "discount_type": "percent", "value": 150, "applies_to": "all"},
        )
        assert r.status_code == 400, r.text

    def test_invalid_applies_to_400(self):
        r = requests.post(
            f"{BASE_URL}/api/admin/coupons", headers=h(ADMIN_TOKEN),
            json={"code": "BADAPPLIES1", "discount_type": "flat", "value": 10, "applies_to": "nonsense"},
        )
        assert r.status_code == 400, r.text

    def test_disable_coupon_then_validate_404(self):
        r = requests.patch(
            f"{BASE_URL}/api/admin/coupons/{TEST_COUPON}", headers=h(ADMIN_TOKEN),
            json={"active": False},
        )
        assert r.status_code == 200
        assert r.json().get("active") is False
        # Now public validate should fail
        v = requests.post(
            f"{BASE_URL}/api/coupons/validate",
            json={"code": TEST_COUPON, "product": "employer_unlock"},
        )
        assert v.status_code == 404, v.text
        assert "Invalid coupon" in (v.json().get("detail") or ""), v.text

    def test_reenable_then_validate_ok(self):
        r = requests.patch(
            f"{BASE_URL}/api/admin/coupons/{TEST_COUPON}", headers=h(ADMIN_TOKEN),
            json={"active": True},
        )
        assert r.status_code == 200
        v = requests.post(
            f"{BASE_URL}/api/coupons/validate",
            json={"code": TEST_COUPON, "product": "employer_unlock"},
        )
        assert v.status_code == 200, v.text

    def test_zzz_leave_disabled(self):
        """Final step: leave the test coupon DISABLED as per spec."""
        r = requests.patch(
            f"{BASE_URL}/api/admin/coupons/{TEST_COUPON}", headers=h(ADMIN_TOKEN),
            json={"active": False},
        )
        assert r.status_code == 200
        # Verify
        arr = requests.get(f"{BASE_URL}/api/admin/coupons", headers=h(ADMIN_TOKEN)).json()
        row = next((c for c in arr if c["code"] == TEST_COUPON), None)
        assert row is not None and row["active"] is False
