"""
Coupon feature tests — WELCOME50 (50% all) and FLAT100 (₹100 flat, plan only).
Also verifies /api/payments/create-order applies discount server-side and
that Razorpay minimum ₹1 floor is respected.
"""
import os
import pytest
import requests

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL") or "https://payment-mgmt-10.preview.emergentagent.com"
BASE_URL = BASE_URL.rstrip("/")


@pytest.fixture(scope="module")
def api():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


# ---------------- /api/coupons/validate ----------------
class TestCouponValidate:
    def test_welcome50_employer_unlock(self, api):
        r = api.post(f"{BASE_URL}/api/coupons/validate",
                     json={"code": "WELCOME50", "product": "employer_unlock", "amount": 199})
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["valid"] is True
        assert d["code"] == "WELCOME50"
        assert d["discount_type"] == "percent"
        assert d["value"] == 50
        # 50% of ₹199 = ₹99 (int floor); final = ₹99 (rupee floor from 9950 paise)
        assert d["discount_amount"] == 99
        assert d["final_amount"] == 99

    def test_welcome50_freelancer_onboarding(self, api):
        r = api.post(f"{BASE_URL}/api/coupons/validate",
                     json={"code": "WELCOME50", "product": "freelancer_onboarding", "amount": 99})
        assert r.status_code == 200
        d = r.json()
        assert d["valid"] is True
        # ₹99 -> 9900 paise; 50% = 4950; disc rupees = 49, final = 49
        assert d["discount_amount"] == 49
        assert d["final_amount"] == 49

    def test_welcome50_quota_boost(self, api):
        r = api.post(f"{BASE_URL}/api/coupons/validate",
                     json={"code": "WELCOME50", "product": "quota_boost", "amount": 149})
        assert r.status_code == 200
        assert r.json()["valid"] is True

    def test_welcome50_plan(self, api):
        r = api.post(f"{BASE_URL}/api/coupons/validate",
                     json={"code": "WELCOME50", "product": "plan", "amount": 499})
        assert r.status_code == 200
        assert r.json()["valid"] is True

    def test_flat100_on_plan_success(self, api):
        r = api.post(f"{BASE_URL}/api/coupons/validate",
                     json={"code": "FLAT100", "product": "plan", "amount": 499})
        assert r.status_code == 200
        d = r.json()
        assert d["discount_type"] == "flat"
        assert d["value"] == 100
        assert d["discount_amount"] == 100
        assert d["final_amount"] == 399

    def test_flat100_on_employer_unlock_forbidden(self, api):
        r = api.post(f"{BASE_URL}/api/coupons/validate",
                     json={"code": "FLAT100", "product": "employer_unlock", "amount": 199})
        assert r.status_code == 400
        assert "doesn" in r.text.lower() or "apply" in r.text.lower()

    def test_invalid_code_404(self, api):
        r = api.post(f"{BASE_URL}/api/coupons/validate",
                     json={"code": "BADCODE_XYZ", "product": "plan", "amount": 199})
        assert r.status_code == 404

    def test_empty_code_400(self, api):
        r = api.post(f"{BASE_URL}/api/coupons/validate",
                     json={"code": "   ", "product": "plan", "amount": 199})
        assert r.status_code == 400

    def test_case_insensitive_code(self, api):
        r = api.post(f"{BASE_URL}/api/coupons/validate",
                     json={"code": "welcome50", "product": "plan", "amount": 199})
        assert r.status_code == 200
        assert r.json()["code"] == "WELCOME50"

    def test_no_amount_still_valid(self, api):
        r = api.post(f"{BASE_URL}/api/coupons/validate",
                     json={"code": "WELCOME50", "product": "employer_unlock"})
        assert r.status_code == 200
        d = r.json()
        assert d["valid"] is True
        assert "discount_amount" not in d  # no amount => no preview


# ---------------- /api/payments/create-order ----------------
class TestCreateOrderWithCoupon:
    def test_employer_unlock_no_coupon(self, api):
        r = api.post(f"{BASE_URL}/api/payments/create-order",
                     json={"product": "employer_unlock",
                           "employer_id": "TEST_emp_no_coupon"})
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["amount"] == 19900
        assert d["currency"] == "INR"
        assert d["order_id"].startswith("order_")

    def test_employer_unlock_with_welcome50(self, api):
        r = api.post(f"{BASE_URL}/api/payments/create-order",
                     json={"product": "employer_unlock",
                           "employer_id": "TEST_emp_welcome50",
                           "coupon_code": "WELCOME50"})
        assert r.status_code == 200, r.text
        d = r.json()
        # 50% off ₹199 -> 9950 paise
        assert d["amount"] == 9950

    def test_employer_unlock_with_flat100_rejected(self, api):
        r = api.post(f"{BASE_URL}/api/payments/create-order",
                     json={"product": "employer_unlock",
                           "employer_id": "TEST_emp_flat100",
                           "coupon_code": "FLAT100"})
        # FLAT100 applies_to=plan only
        assert r.status_code == 400

    def test_employer_unlock_invalid_coupon_404(self, api):
        r = api.post(f"{BASE_URL}/api/payments/create-order",
                     json={"product": "employer_unlock",
                           "employer_id": "TEST_emp_bad",
                           "coupon_code": "BADCODE_NOPE"})
        assert r.status_code == 404

    def test_freelancer_onboarding_with_welcome50(self, api):
        r = api.post(f"{BASE_URL}/api/payments/create-order",
                     json={"product": "freelancer_onboarding",
                           "full_name": "TEST Coupon User",
                           "coupon_code": "WELCOME50"})
        assert r.status_code == 200, r.text
        d = r.json()
        # 50% off ₹99 -> 4950 paise
        assert d["amount"] == 4950

    def test_plan_with_flat100(self, api):
        # Get first paid plan (price >= ₹101 so FLAT100 stays above min)
        plans_r = api.get(f"{BASE_URL}/api/plans")
        assert plans_r.status_code == 200
        plans = plans_r.json()
        target = next((p for p in plans if p.get("price", 0) >= 200), None)
        assert target is not None, f"No plan with price>=200 available: {plans}"
        expected = (target["price"] * 100) - (100 * 100)
        r = api.post(f"{BASE_URL}/api/payments/create-order",
                     json={"product": "plan",
                           "plan_id": target["plan_id"],
                           "employer_id": "TEST_emp_plan_flat100",
                           "coupon_code": "FLAT100"})
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["amount"] == expected

    def test_plan_with_welcome50(self, api):
        plans_r = api.get(f"{BASE_URL}/api/plans")
        plans = plans_r.json()
        target = next((p for p in plans if p.get("price", 0) >= 200), None)
        assert target is not None
        expected = (target["price"] * 100) // 2
        r = api.post(f"{BASE_URL}/api/payments/create-order",
                     json={"product": "plan",
                           "plan_id": target["plan_id"],
                           "employer_id": "TEST_emp_plan_wel50",
                           "coupon_code": "WELCOME50"})
        assert r.status_code == 200, r.text
        assert r.json()["amount"] == expected

    def test_minimum_floor_never_below_1_rupee(self, api):
        """
        Ensure discount never brings order below ₹1 (100 paise).
        Not directly reachable via public API (no cheap product), but we
        verify the _discount_paise math via a validate call with a low
        amount + FLAT100 on plan.
        """
        # ₹99 * FLAT100 would go negative — floor kicks in.
        r = api.post(f"{BASE_URL}/api/coupons/validate",
                     json={"code": "FLAT100", "product": "plan", "amount": 99})
        assert r.status_code == 200
        d = r.json()
        # amount_paise=9900, flat disc raw=10000, capped to 9900-100=9800
        # discount_amount = 9800//100 = 98; final = (9900-9800)//100 = 1
        assert d["final_amount"] >= 1
        assert d["discount_amount"] <= 98
