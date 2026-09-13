from fastapi import FastAPI, APIRouter, HTTPException, Request, BackgroundTasks
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import html
import json
import logging
import math
import re
import secrets
import time
import asyncio
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Set
import uuid
import razorpay
import httpx
from datetime import datetime, timezone, timedelta

logger = logging.getLogger("workhop.security")

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
db_name = os.environ.get('DB_NAME', 'workhop_database')
client = AsyncIOMotorClient(mongo_url)
db = client[db_name]

app = FastAPI()
api_router = APIRouter(prefix="/api")

razorpay_key_id = os.environ.get("RAZORPAY_KEY_ID", "rzp_test_placeholder")
razorpay_key_secret = os.environ.get("RAZORPAY_KEY_SECRET", "placeholder_secret")
razorpay_client = razorpay.Client(auth=(razorpay_key_id, razorpay_key_secret))

# Global sliding-window in-memory rate limiter for auth / OTP endpoints
_RATE_LIMIT_STORE: dict = {}

def _check_rate_limit(key: str, max_requests: int = 5, window_seconds: int = 60) -> None:
    now = time.time()
    history = _RATE_LIMIT_STORE.get(key, [])
    history = [t for t in history if now - t < window_seconds]
    if len(history) >= max_requests:
        raise HTTPException(
            status_code=429,
            detail=f"Too many requests. Please wait {max(1, int(window_seconds - (now - history[0])))}s before retrying."
        )
    history.append(now)
    _RATE_LIMIT_STORE[key] = history


# ============== Models ==============
class Lead(BaseModel):
    id: str
    initials: str
    skill: str
    distance_km: float
    rating: float
    jobs_done: int
    name: str
    phone: str
    portfolio: str
    bucket: str = "Creative"
    category: str = ""
    area: str = "Bengaluru"
    rate_hr: int = 0
    intro: str = ""
    languages: List[str] = Field(default_factory=list)
    delivery_days: int = 3
    reviews_count: int = 0
    external_rating_source: str = ""
    lat: float = 12.9716
    lng: float = 77.5946
    keywords: List[str] = Field(default_factory=list)


class UnlockRequest(BaseModel):
    employer_id: Optional[str] = None
    payment_method: str = "upi"


class UnlockResponse(BaseModel):
    unlock_id: str
    leads: List[Lead]
    paid_amount: int = 199
    paid_at: str


class FreelancerPayRequest(BaseModel):
    full_name: str
    payment_method: str = "upi"


class FreelancerPayResponse(BaseModel):
    freelancer_id: str
    paid: bool
    paid_amount: int = 99
    paid_at: str


class AadhaarVerifyRequest(BaseModel):
    freelancer_id: str
    aadhaar_number: str


class AadhaarVerifyResponse(BaseModel):
    freelancer_id: str
    verified: bool
    masked_aadhaar: str


class FinalSubmitRequest(BaseModel):
    freelancer_id: str
    linkedin_url: str
    portfolio_url: str
    portfolio_images: List[str] = Field(default_factory=list)
    phone: str = ""
    skill: str = ""
    category: str = ""
    lat: Optional[float] = None
    lng: Optional[float] = None
    rate_hr: Optional[int] = None
    intro: str = ""
    languages: List[str] = Field(default_factory=list)
    delivery_days: Optional[int] = None
    external_platform: str = ""  # "fiverr" | "upwork" | ""
    external_url: str = ""
    external_rating: Optional[float] = None
    external_reviews: Optional[int] = None


class FinalSubmitResponse(BaseModel):
    freelancer_id: str
    status: str
    submitted_at: str


class Job(BaseModel):
    id: str
    title: str
    category: str
    bucket: str
    pay: int
    pay_label: str
    distance_km: float
    posted_minutes_ago: int
    company_name: str
    area: str
    description: str
    keywords: List[str] = Field(default_factory=list)


class FreelancerStatus(BaseModel):
    freelancer_id: str
    status: str
    paid: bool
    aadhaar_verified: bool
    is_verified: bool


class ApplyRequest(BaseModel):
    freelancer_id: str
    note: Optional[str] = ""


class ApplyResponse(BaseModel):
    application_id: str
    job_id: str
    freelancer_id: str
    applied_at: str
    quota_used: int
    quota_limit: int
    has_boost: bool
    conversation_id: str


class Conversation(BaseModel):
    conversation_id: str
    job_id: str
    job_title: str
    company_name: str
    freelancer_id: str
    freelancer_name: str
    created_at: str
    status: str = "applied"  # applied -> hired -> completed
    last_message: Optional[str] = None
    last_message_at: Optional[str] = None


class ChatMessage(BaseModel):
    message_id: str
    conversation_id: str
    sender_role: str  # "freelancer" | "employer"
    text: str
    created_at: str


class SendMessageRequest(BaseModel):
    sender_role: str
    text: str


class QuotaResponse(BaseModel):
    freelancer_id: str
    quota_used: int
    quota_limit: int
    has_boost: bool
    boost_until: Optional[str] = None
    applied_job_ids: List[str] = Field(default_factory=list)


class QuotaUnlockRequest(BaseModel):
    freelancer_id: str
    payment_method: str = "upi"


class QuotaUnlockResponse(BaseModel):
    freelancer_id: str
    has_boost: bool
    boost_until: str
    quota_limit: int
    paid_amount: int = 149


class Plan(BaseModel):
    plan_id: str
    section: str  # "postings" | "branding"
    name: str
    price: int
    price_label: str
    unit: str
    duration_days: Optional[int] = None
    badge: Optional[str] = None
    features: List[str] = Field(default_factory=list)


class PlanPurchaseRequest(BaseModel):
    employer_id: str
    plan_id: str
    payment_method: str = "upi"


class PlanPurchase(BaseModel):
    purchase_id: str
    employer_id: str
    plan_id: str
    plan_name: str
    section: str
    price: int
    payment_method: str
    purchased_at: str
    expires_at: Optional[str] = None


FREE_APPLY_LIMIT = 3
BOOST_EXTRA_APPLIES = 5
BOOST_DURATION_HOURS = 24
BOOST_PRICE = 149


# ============== Employer Plans Catalog (all payments mocked) ==============
PLAN_CATALOG: List[dict] = [
    # ---- A. Job Postings & Premium Listings ----
    {
        "plan_id": "single-post", "section": "postings", "name": "Single Post",
        "price": 299, "price_label": "₹299", "unit": "1 job post",
        "duration_days": None, "badge": None,
        "features": ["1 job listing on the feed", "Live for 30 days", "Applicant inbox included"],
    },
    {
        "plan_id": "starter-bundle", "section": "postings", "name": "Starter Bundle",
        "price": 999, "price_label": "₹999", "unit": "5 job posts",
        "duration_days": None, "badge": "SAVE 33%",
        "features": ["5 job listings", "Use anytime — no expiry", "Applicant inbox included"],
    },
    {
        "plan_id": "premium-boost", "section": "postings", "name": "Premium Listing Boost",
        "price": 299, "price_label": "₹299", "unit": "per post add-on",
        "duration_days": None, "badge": "ADD-ON",
        "features": ["Featured at top of jobs feed", "Highlighted card with badge", "3× more freelancer views"],
    },
    # ---- B. Employer Branding & Classified Ads (Enterprise) ----
    {
        "plan_id": "brand-spotlight", "section": "branding", "name": "Brand Spotlight",
        "price": 4999, "price_label": "₹4,999", "unit": "7 days",
        "duration_days": 7, "badge": None,
        "features": ["Logo banner on the jobs feed", "Runs for 7 days", "Impression report on request"],
    },
    {
        "plan_id": "classified-ad", "section": "branding", "name": "Classified Ad Slot",
        "price": 9999, "price_label": "₹9,999", "unit": "30 days",
        "duration_days": 30, "badge": None,
        "features": ["Dedicated classified ad slot", "Runs for 30 days", "Custom creative supported"],
    },
    {
        "plan_id": "enterprise-suite", "section": "branding", "name": "Enterprise Branding Suite",
        "price": 24999, "price_label": "₹24,999", "unit": "30 days",
        "duration_days": 30, "badge": "BEST VALUE",
        "features": ["Feed banner + featured company page", "Runs for 30 days", "Priority placement across app", "Dedicated account support"],
    },
]


# ============== Seed Leads ==============
# 50 verified freelancer leads (one per profession), loaded from seeds/leads.json.
with open(ROOT_DIR / "seeds" / "leads.json", encoding="utf-8") as _f:
    SEED_LEADS: List[dict] = json.load(_f)

# Deterministic enrichment of seed leads: area, hourly rate, intro, languages, delivery.
_SEED_AREAS = ["Indiranagar", "Koramangala", "HSR Layout", "Jayanagar", "Whitefield",
               "JP Nagar", "Malleshwaram", "BTM Layout", "Basavanagudi", "Yelahanka",
               "Rajajinagar", "Marathahalli"]
_SEED_LANGS = [["English", "Hindi"], ["English", "Kannada"], ["English", "Hindi", "Kannada"],
               ["English", "Tamil"], ["English", "Hindi", "Telugu"], ["English", "Kannada", "Tamil"]]
_SEED_RATE_BASE = {"Creative": 450, "Tech": 700, "Marketing": 400, "Ops": 350}
for _i, _l in enumerate(SEED_LEADS):
    _l.setdefault("area", _SEED_AREAS[_i % len(_SEED_AREAS)])
    _l.setdefault("rate_hr", _SEED_RATE_BASE.get(_l.get("bucket", "Creative"), 400) + (_i % 5) * 150)
    _l.setdefault("languages", _SEED_LANGS[_i % len(_SEED_LANGS)])
    _l.setdefault("delivery_days", [1, 2, 3, 5, 7][_i % 5])
    _l.setdefault("reviews_count", max(1, int(_l.get("jobs_done", 10) * 0.6)))
    _l.setdefault(
        "intro",
        f"{_l['skill']} based in {_l['area']} with {_l.get('jobs_done', 10)}+ gigs delivered. "
        f"Fast turnarounds, clear communication and on-time delivery.",
    )


# 50 professional gig postings across 4 buckets, loaded from seeds/jobs.json.
with open(ROOT_DIR / "seeds" / "jobs.json", encoding="utf-8") as _f:
    _JOB_DEFS: List[dict] = json.load(_f)


def _make_seed_job(i: int, j: dict) -> dict:
    return {
        "id": f"job-{i + 1}",
        "title": j["title"],
        "category": j["category"],
        "bucket": j["bucket"],
        "pay": j["pay"],
        "pay_label": f"₹{j['pay']:,} fixed",
        "distance_km": round(0.3 + ((i * 17) % 27) / 10.0, 1),
        "posted_minutes_ago": (i * 23) % 480,
        "company_name": j["company_name"],
        "area": j["area"],
        "lat": j["lat"],
        "lng": j["lng"],
        "description": j["description"],
        "keywords": j.get("keywords", []),
    }


SEED_JOBS: List[dict] = [_make_seed_job(i, j) for i, j in enumerate(_JOB_DEFS)]


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


# ============== Routes ==============
@api_router.get("/")
async def root():
    return {"app": "WorkHop", "status": "ok"}


def _format_phone(raw: str) -> str:
    digits = re.sub(r"\D", "", raw or "")
    if digits.startswith("91") and len(digits) == 12:
        digits = digits[2:]
    if len(digits) != 10:
        raise HTTPException(status_code=400, detail="Phone must be a 10-digit number.")
    return f"+91 {digits[:5]} {digits[5:]}"


def _mask_phone(phone: str) -> str:
    if not phone:
        return ""
    digits = re.sub(r"\D", "", phone)
    if len(digits) == 12 and digits.startswith("91"):
        digits = digits[2:]
    if len(digits) == 10:
        return f"+91 {digits[:2]}XXX XX{digits[-3:]}"
    return "+91 XXXXX XXXXX"


def _freelancer_to_lead(doc: dict, unlocked: bool = False) -> Lead:
    name = doc.get("full_name") or "Verified Pro"
    initials = "".join(w[0] for w in name.split()[:2]).upper() or "VP"
    lat, lng = doc.get("lat"), doc.get("lng")
    if lat is not None and lng is not None:
        dlat = math.radians(lat - 12.9716)
        dlng = math.radians(lng - 77.5946)
        a = (
            math.sin(dlat / 2) ** 2
            + math.cos(math.radians(12.9716)) * math.cos(math.radians(lat)) * math.sin(dlng / 2) ** 2
        )
        dist = round(6371 * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a)), 1)
    else:
        dist = 2.0
    skill = doc.get("skill") or "Verified Pro"
    ext_rating = doc.get("external_rating")
    raw_phone = doc.get("phone") or ""
    phone = raw_phone if unlocked else _mask_phone(raw_phone)
    return Lead(
        id=doc["freelancer_id"],
        initials=initials,
        skill=skill,
        distance_km=dist,
        rating=float(ext_rating if ext_rating is not None else (doc.get("rating") or 5.0)),
        jobs_done=int(doc.get("jobs_done") or 0),
        name=name,
        phone=phone,
        portfolio=doc.get("portfolio_url") or "",
        category=doc.get("category") or "",
        area=doc.get("area") or "Bengaluru",
        rate_hr=int(doc.get("rate_hr") or 0),
        intro=doc.get("intro") or "",
        languages=doc.get("languages") or [],
        delivery_days=int(doc.get("delivery_days") or 3),
        reviews_count=int(doc.get("external_reviews") or 0),
        external_rating_source=doc.get("external_platform") or "",
        lat=lat if lat is not None else 12.9716,
        lng=lng if lng is not None else 77.5946,
        keywords=[w.lower() for w in skill.split()] + [skill],
    )


async def _all_leads(unlocked: bool = False) -> List[Lead]:
    """Real verified pros merged ahead of seeded demo leads, masked server-side unless unlocked."""
    docs = await db.freelancers.find(
        {"paid": True, "aadhaar_verified": True, "phone": {"$exists": True, "$nin": ["", None]}}
    ).to_list(200)
    real_leads = [_freelancer_to_lead(d, unlocked=unlocked) for d in docs]
    seed_leads_out = []
    for lead in SEED_LEADS:
        l_copy = dict(lead)
        if not unlocked and l_copy.get("phone"):
            l_copy["phone"] = _mask_phone(l_copy["phone"])
        seed_leads_out.append(Lead(**l_copy))
    return real_leads + seed_leads_out


@api_router.get("/leads/preview", response_model=List[Lead])
async def get_leads_preview():
    """Returns nearby freelancer leads with phone numbers safely masked server-side."""
    return await _all_leads(unlocked=False)


@api_router.post("/employer/unlock", response_model=UnlockResponse)
async def employer_unlock(req: UnlockRequest):
    """Mock Razorpay/UPI ₹199 unlock. Simulates a brief gateway delay then persists & returns full leads."""
    await asyncio.sleep(1.2)
    all_leads = await _all_leads(unlocked=True)
    unlock_id = str(uuid.uuid4())
    record = {
        "_id": unlock_id,
        "unlock_id": unlock_id,
        "employer_id": req.employer_id or f"employer-{uuid.uuid4().hex[:6]}",
        "payment_method": req.payment_method,
        "paid_amount": 199,
        "paid_at": _now_iso(),
        "leads_unlocked": [lead.id for lead in all_leads],
    }
    await db.employer_unlocks.insert_one(record)
    return UnlockResponse(
        unlock_id=unlock_id,
        leads=all_leads,
        paid_amount=199,
        paid_at=record["paid_at"],
    )


@api_router.post("/freelancer/pay", response_model=FreelancerPayResponse)
async def freelancer_pay(req: FreelancerPayRequest):
    """Step 1: Mock ₹99 onboarding payment. Creates freelancer record and unlocks subsequent steps."""
    await asyncio.sleep(1.0)
    freelancer_id = str(uuid.uuid4())
    paid_at = _now_iso()
    doc = {
        "_id": freelancer_id,
        "freelancer_id": freelancer_id,
        "full_name": req.full_name,
        "payment_method": req.payment_method,
        "paid_amount": 99,
        "paid": True,
        "paid_at": paid_at,
        "aadhaar_verified": False,
        "status": "payment_complete",
        "created_at": paid_at,
    }
    await db.freelancers.insert_one(doc)
    return FreelancerPayResponse(freelancer_id=freelancer_id, paid=True, paid_amount=99, paid_at=paid_at)


@api_router.post("/freelancer/aadhaar/verify", response_model=AadhaarVerifyResponse)
async def freelancer_aadhaar_verify(req: AadhaarVerifyRequest):
    """Step 2: Mock Aadhaar verification (validates 12-digit numeric and reject obvious dummy inputs)."""
    cleaned = re.sub(r"\D", "", req.aadhaar_number or "")
    if len(cleaned) != 12:
        raise HTTPException(status_code=400, detail="Aadhaar must be exactly 12 digits.")
    if cleaned in {"000000000000", "111111111111", "123456789012"}:
        raise HTTPException(status_code=400, detail="Invalid Aadhaar number. Please re-check.")

    await asyncio.sleep(1.0)
    masked = f"XXXX XXXX {cleaned[-4:]}"
    result = await db.freelancers.update_one(
        {"_id": req.freelancer_id},
        {"$set": {"aadhaar_verified": True, "aadhaar_masked": masked, "status": "aadhaar_verified"}},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Freelancer not found. Complete payment first.")
    return AadhaarVerifyResponse(freelancer_id=req.freelancer_id, verified=True, masked_aadhaar=masked)


@api_router.post("/freelancer/submit", response_model=FinalSubmitResponse)
async def freelancer_submit(req: FinalSubmitRequest):
    """Final submission: persists phone, skill, category, location, LinkedIn, portfolio + images."""
    if len(req.portfolio_images) > 3:
        raise HTTPException(status_code=400, detail="Maximum 3 portfolio images allowed.")
    for img in req.portfolio_images:
        if len(img) > 2_500_000:
            raise HTTPException(status_code=400, detail="Each portfolio image must be under 2MB.")
        if not (img.startswith("data:image/") or img.startswith("http://") or img.startswith("https://")):
            raise HTTPException(status_code=400, detail="Invalid image format. Must be an image URL or data-URI.")
    submitted_at = _now_iso()
    updates = {
        "linkedin_url": (req.linkedin_url or "").strip()[:250],
        "portfolio_url": (req.portfolio_url or "").strip()[:250],
        "portfolio_images_count": len(req.portfolio_images),
        "status": "under_review",
        "submitted_at": submitted_at,
    }
    if req.phone:
        updates["phone"] = _format_phone(req.phone)
    if req.skill.strip():
        updates["skill"] = req.skill.strip()[:60]
    if req.category.strip():
        updates["category"] = req.category.strip()[:40]
    if req.lat is not None and req.lng is not None:
        updates["lat"] = req.lat
        updates["lng"] = req.lng
    if req.rate_hr is not None and req.rate_hr > 0:
        updates["rate_hr"] = int(req.rate_hr)
    if req.intro.strip():
        updates["intro"] = req.intro.strip()[:400]
    if req.languages:
        updates["languages"] = [str(l).strip()[:20] for l in req.languages][:6]
    if req.delivery_days is not None and req.delivery_days > 0:
        updates["delivery_days"] = int(req.delivery_days)
    if req.external_platform in ("fiverr", "upwork"):
        if req.external_rating is not None and not (0 <= req.external_rating <= 5):
            raise HTTPException(status_code=400, detail="External rating must be between 0 and 5.")
        updates["external_platform"] = req.external_platform
        updates["external_url"] = req.external_url.strip()[:200]
        updates["external_rating"] = req.external_rating
        updates["external_reviews"] = req.external_reviews
    result = await db.freelancers.update_one({"_id": req.freelancer_id}, {"$set": updates})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Freelancer not found.")
    # Store images separately to keep main doc small
    if req.portfolio_images:
        await db.freelancer_portfolio.replace_one(
            {"_id": req.freelancer_id},
            {
                "_id": req.freelancer_id,
                "freelancer_id": req.freelancer_id,
                "images": req.portfolio_images,
                "uploaded_at": submitted_at,
            },
            upsert=True,
        )
    return FinalSubmitResponse(freelancer_id=req.freelancer_id, status="under_review", submitted_at=submitted_at)


PROFILE_FIELDS = ("freelancer_id", "full_name", "phone", "skill", "category",
                  "linkedin_url", "portfolio_url", "status", "lat", "lng",
                  "rate_hr", "intro", "languages", "delivery_days",
                  "external_platform", "external_url", "external_rating", "external_reviews")


class ProfileUpdateRequest(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    skill: Optional[str] = None
    category: Optional[str] = None
    linkedin_url: Optional[str] = None
    portfolio_url: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    rate_hr: Optional[int] = None
    intro: Optional[str] = None
    languages: Optional[List[str]] = None
    delivery_days: Optional[int] = None
    external_platform: Optional[str] = None
    external_url: Optional[str] = None
    external_rating: Optional[float] = None
    external_reviews: Optional[int] = None


@api_router.get("/freelancer/{freelancer_id}/profile")
async def freelancer_profile(freelancer_id: str):
    doc = await db.freelancers.find_one({"_id": freelancer_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Freelancer not found.")
    return {k: doc.get(k) for k in PROFILE_FIELDS}


@api_router.put("/freelancer/{freelancer_id}/profile")
async def update_freelancer_profile(freelancer_id: str, req: ProfileUpdateRequest):
    updates = {k: v for k, v in req.model_dump().items() if v is not None}
    if "phone" in updates:
        updates["phone"] = _format_phone(updates["phone"])
    if "full_name" in updates:
        updates["full_name"] = str(updates["full_name"]).strip()[:80]
    if "skill" in updates:
        updates["skill"] = str(updates["skill"]).strip()[:60]
    if "category" in updates:
        updates["category"] = str(updates["category"]).strip()[:40]
    if "intro" in updates:
        updates["intro"] = str(updates["intro"]).strip()[:400]
    if "linkedin_url" in updates:
        updates["linkedin_url"] = str(updates["linkedin_url"]).strip()[:250]
    if "portfolio_url" in updates:
        updates["portfolio_url"] = str(updates["portfolio_url"]).strip()[:250]
    if "external_rating" in updates and updates["external_rating"] is not None:
        if not (0 <= updates["external_rating"] <= 5):
            raise HTTPException(status_code=400, detail="External rating must be between 0 and 5.")
    if not updates:
        raise HTTPException(status_code=400, detail="Nothing to update.")
    result = await db.freelancers.update_one({"_id": freelancer_id}, {"$set": updates})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Freelancer not found.")
    doc = await db.freelancers.find_one({"_id": freelancer_id})
    return {k: doc.get(k) for k in PROFILE_FIELDS}


@api_router.get("/freelancer/{freelancer_id}", response_model=FreelancerStatus)
async def freelancer_status(freelancer_id: str):
    doc = await db.freelancers.find_one({"_id": freelancer_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Freelancer not found.")
    is_verified = bool(doc.get("aadhaar_verified")) and bool(doc.get("paid"))
    return FreelancerStatus(
        freelancer_id=freelancer_id,
        status=doc.get("status", "pending"),
        paid=bool(doc.get("paid")),
        aadhaar_verified=bool(doc.get("aadhaar_verified")),
        is_verified=is_verified,
    )


@api_router.get("/jobs", response_model=List[Job])
async def list_jobs(freelancer_id: Optional[str] = None, bucket: Optional[str] = None):
    """Returns available jobs. Employer identity is anonymized: only the company name
    and area are exposed. Freelancers connect via the in-app chat after applying."""
    jobs_out: List[Job] = []
    custom = await db.custom_jobs.find({}, {"_id": 0}).to_list(500)
    custom.sort(key=lambda j: j.get("created_at", ""), reverse=True)
    for job in custom + SEED_JOBS:
        if bucket and job["bucket"].lower() != bucket.lower():
            continue
        jobs_out.append(Job(
            id=job["id"], title=job["title"], category=job["category"],
            bucket=job["bucket"],
            pay=job["pay"], pay_label=job["pay_label"], distance_km=job["distance_km"],
            posted_minutes_ago=job["posted_minutes_ago"],
            company_name=job["company_name"],
            area=job["area"],
            description=job["description"],
            keywords=job["keywords"],
        ))
    return jobs_out


async def _get_quota_state(freelancer_id: str) -> dict:
    """Return {quota_used, quota_limit, has_boost, boost_until, applied_job_ids} for the freelancer."""
    applied = await db.applications.find(
        {"freelancer_id": freelancer_id}, {"_id": 0, "job_id": 1, "applied_at": 1}
    ).to_list(1000)
    applied_job_ids = [a["job_id"] for a in applied]

    fdoc = await db.freelancers.find_one({"_id": freelancer_id}, {"_id": 0}) or {}
    boost_until_str = fdoc.get("boost_until")
    has_boost = False
    if boost_until_str:
        try:
            has_boost = datetime.fromisoformat(boost_until_str) > datetime.now(timezone.utc)
        except Exception:
            has_boost = False

    # Count applies in last 24h for quota usage
    cutoff = datetime.now(timezone.utc) - timedelta(hours=24)
    recent_used = 0
    for a in applied:
        try:
            if datetime.fromisoformat(a["applied_at"]) > cutoff:
                recent_used += 1
        except Exception:
            pass

    return {
        "quota_used": recent_used,
        "quota_limit": FREE_APPLY_LIMIT + (BOOST_EXTRA_APPLIES if has_boost else 0),
        "has_boost": has_boost,
        "boost_until": boost_until_str if has_boost else None,
        "applied_job_ids": applied_job_ids,
    }


@api_router.get("/freelancer/{freelancer_id}/quota", response_model=QuotaResponse)
async def freelancer_quota(freelancer_id: str):
    fdoc = await db.freelancers.find_one({"_id": freelancer_id}, {"_id": 0})
    if not fdoc:
        raise HTTPException(status_code=404, detail="Freelancer not found.")
    state = await _get_quota_state(freelancer_id)
    return QuotaResponse(
        freelancer_id=freelancer_id,
        quota_used=state["quota_used"],
        quota_limit=state["quota_limit"],
        has_boost=state["has_boost"],
        boost_until=state["boost_until"],
        applied_job_ids=state["applied_job_ids"],
    )


@api_router.post("/jobs/{job_id}/apply", response_model=ApplyResponse)
async def apply_to_job(job_id: str, req: ApplyRequest):
    # Validate job (seeded or employer-posted)
    job = next((j for j in SEED_JOBS if j["id"] == job_id), None)
    if not job:
        job = await db.custom_jobs.find_one({"_id": job_id}, {"_id": 0})
    if not job:
        raise HTTPException(status_code=404, detail="Job not found.")
    # Validate verified freelancer
    fdoc = await db.freelancers.find_one({"_id": req.freelancer_id}, {"_id": 0})
    if not fdoc:
        raise HTTPException(status_code=404, detail="Freelancer not found.")
    if not (fdoc.get("paid") and fdoc.get("aadhaar_verified")):
        raise HTTPException(status_code=403, detail="Complete verification to apply.")
    # De-dupe: one application per (freelancer, job)
    existing = await db.applications.find_one(
        {"freelancer_id": req.freelancer_id, "job_id": job_id}, {"_id": 0}
    )
    if existing:
        raise HTTPException(status_code=409, detail="Already applied to this job.")
    # Quota check
    state = await _get_quota_state(req.freelancer_id)
    if state["quota_used"] >= state["quota_limit"]:
        if state["has_boost"]:
            raise HTTPException(
                status_code=402,
                detail=f"Daily limit ({state['quota_limit']}) reached. Resets in 24 hours.",
            )
        raise HTTPException(
            status_code=402,
            detail=f"Daily free quota ({FREE_APPLY_LIMIT}) exhausted. Boost with +{BOOST_EXTRA_APPLIES} applies.",
        )
    application_id = str(uuid.uuid4())
    applied_at = _now_iso()
    await db.applications.insert_one({
        "_id": application_id,
        "application_id": application_id,
        "job_id": job_id,
        "freelancer_id": req.freelancer_id,
        "note": (req.note or "")[:500],
        "applied_at": applied_at,
    })
    # Open (or reuse) a chat thread between the freelancer and the employer
    conv = await db.conversations.find_one(
        {"job_id": job_id, "freelancer_id": req.freelancer_id}, {"_id": 0}
    )
    if conv:
        conversation_id = conv["conversation_id"]
    else:
        conversation_id = str(uuid.uuid4())
        await db.conversations.insert_one({
            "_id": conversation_id,
            "conversation_id": conversation_id,
            "job_id": job_id,
            "job_title": job["title"],
            "company_name": job["company_name"],
            "freelancer_id": req.freelancer_id,
            "freelancer_name": fdoc.get("full_name") or "Verified Pro",
            "created_at": applied_at,
            "last_message": None,
            "last_message_at": None,
        })
    new_state = await _get_quota_state(req.freelancer_id)
    return ApplyResponse(
        application_id=application_id,
        job_id=job_id,
        freelancer_id=req.freelancer_id,
        applied_at=applied_at,
        quota_used=new_state["quota_used"],
        quota_limit=new_state["quota_limit"],
        has_boost=new_state["has_boost"],
        conversation_id=conversation_id,
    )


@api_router.post("/freelancer/quota/unlock", response_model=QuotaUnlockResponse)
async def quota_unlock(req: QuotaUnlockRequest):
    """Mock ₹149 boost: +5 extra applies for 24 hours (on top of the 3 free/day)."""
    fdoc = await db.freelancers.find_one({"_id": req.freelancer_id}, {"_id": 0})
    if not fdoc:
        raise HTTPException(status_code=404, detail="Freelancer not found.")
    if not (fdoc.get("paid") and fdoc.get("aadhaar_verified")):
        raise HTTPException(status_code=403, detail="Verify your profile first.")
    state = await _get_quota_state(req.freelancer_id)
    if state["has_boost"]:
        raise HTTPException(status_code=409, detail="Boost already active. Resets within 24 hours.")
    await asyncio.sleep(0.8)
    until = datetime.now(timezone.utc) + timedelta(hours=BOOST_DURATION_HOURS)
    until_iso = until.isoformat()
    await db.freelancers.update_one(
        {"_id": req.freelancer_id},
        {"$set": {"boost_until": until_iso, "quota_paid_at": _now_iso()}},
    )
    await db.quota_unlocks.insert_one({
        "_id": str(uuid.uuid4()),
        "freelancer_id": req.freelancer_id,
        "payment_method": req.payment_method,
        "paid_amount": BOOST_PRICE,
        "paid_at": _now_iso(),
        "boost_until": until_iso,
    })
    return QuotaUnlockResponse(
        freelancer_id=req.freelancer_id,
        has_boost=True,
        boost_until=until_iso,
        quota_limit=FREE_APPLY_LIMIT + BOOST_EXTRA_APPLIES,
        paid_amount=BOOST_PRICE,
    )


@api_router.get("/plans", response_model=List[Plan])
async def list_plans():
    """Returns the employer plans catalog (job postings + enterprise branding)."""
    return [Plan(**p) for p in PLAN_CATALOG]


@api_router.post("/employer/plans/purchase", response_model=PlanPurchase)
async def purchase_plan(req: PlanPurchaseRequest):
    """Mock Razorpay/UPI purchase of an employer plan. Persists the purchase record."""
    plan = next((p for p in PLAN_CATALOG if p["plan_id"] == req.plan_id), None)
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found.")
    await asyncio.sleep(1.0)
    purchase_id = str(uuid.uuid4())
    purchased_at = _now_iso()
    expires_at = None
    if plan.get("duration_days"):
        expires_at = (datetime.now(timezone.utc) + timedelta(days=plan["duration_days"])).isoformat()
    record = {
        "_id": purchase_id,
        "purchase_id": purchase_id,
        "employer_id": req.employer_id,
        "plan_id": plan["plan_id"],
        "plan_name": plan["name"],
        "section": plan["section"],
        "price": plan["price"],
        "payment_method": req.payment_method,
        "purchased_at": purchased_at,
        "expires_at": expires_at,
    }
    await db.plan_purchases.insert_one(record)
    return PlanPurchase(**{k: v for k, v in record.items() if k != "_id"})


@api_router.get("/employer/{employer_id}/plans", response_model=List[PlanPurchase])
async def employer_active_plans(employer_id: str):
    """Returns the employer's active plan purchases (expired time-bound plans are excluded)."""
    docs = await db.plan_purchases.find({"employer_id": employer_id}, {"_id": 0}).to_list(200)
    now = datetime.now(timezone.utc)
    active: List[PlanPurchase] = []
    for d in docs:
        exp = d.get("expires_at")
        if exp:
            try:
                if datetime.fromisoformat(exp) <= now:
                    continue
            except Exception:
                pass
        active.append(PlanPurchase(**d))
    active.sort(key=lambda p: p.purchased_at, reverse=True)
    return active


# ============== Razorpay Payments (real checkout, test mode) ==============
PRODUCT_AMOUNTS_PAISE = {
    "employer_unlock": 19900,
    "freelancer_onboarding": 9900,
    "quota_boost": 14900,
}


# ============== Coupons ==============
SEED_COUPONS = [
    {"_id": "WELCOME50", "code": "WELCOME50", "discount_type": "percent", "value": 50,
     "applies_to": "all", "active": True, "max_uses": 0, "used_count": 0,
     "description": "50% off any purchase"},
    {"_id": "FLAT100", "code": "FLAT100", "discount_type": "flat", "value": 100,
     "applies_to": "plan", "active": True, "max_uses": 0, "used_count": 0,
     "description": "₹100 off employer plans"},
]


class CouponValidateRequest(BaseModel):
    code: str
    product: str
    amount: Optional[int] = None  # rupees


def _discount_paise(coupon: dict, amount_paise: int) -> int:
    if coupon["discount_type"] == "percent":
        disc = amount_paise * int(coupon["value"]) // 100
    else:
        disc = int(coupon["value"]) * 100
    # Razorpay minimum order is ₹1 — never discount below that.
    return max(0, min(disc, amount_paise - 100))


async def _get_valid_coupon(code: str, product: str) -> dict:
    c = await db.coupons.find_one({"_id": code.strip().upper()})
    if not c or not c.get("active"):
        raise HTTPException(status_code=404, detail="Invalid coupon code.")
    if c.get("applies_to") not in ("all", product):
        raise HTTPException(status_code=400, detail="This coupon doesn't apply to this purchase.")
    if c.get("max_uses") and c.get("used_count", 0) >= c["max_uses"]:
        raise HTTPException(status_code=409, detail="This coupon has been fully redeemed.")
    if c.get("expires_at") and time.time() > c["expires_at"]:
        raise HTTPException(status_code=410, detail="This coupon has expired.")
    return c


@api_router.post("/coupons/validate")
async def validate_coupon(req: CouponValidateRequest):
    if not req.code.strip():
        raise HTTPException(status_code=400, detail="Enter a coupon code.")
    c = await _get_valid_coupon(req.code, req.product)
    resp = {
        "valid": True,
        "code": c["_id"],
        "description": c.get("description", ""),
        "discount_type": c["discount_type"],
        "value": c["value"],
    }
    if req.amount:
        amount_paise = req.amount * 100
        disc = _discount_paise(c, amount_paise)
        resp["discount_amount"] = disc // 100
        resp["final_amount"] = (amount_paise - disc) // 100
    return resp


class CreateOrderRequest(BaseModel):
    product: str  # employer_unlock | freelancer_onboarding | quota_boost | plan
    full_name: Optional[str] = None
    freelancer_id: Optional[str] = None
    employer_id: Optional[str] = None
    plan_id: Optional[str] = None
    coupon_code: Optional[str] = None


class CreateOrderResponse(BaseModel):
    order_id: str
    amount: int  # paise
    currency: str = "INR"
    key_id: str
    product: str


class VerifyPaymentRequest(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str


@api_router.post("/payments/create-order", response_model=CreateOrderResponse)
async def create_payment_order(req: CreateOrderRequest):
    """Creates a Razorpay order. Amount is always determined server-side."""
    if req.product == "plan":
        plan = next((p for p in PLAN_CATALOG if p["plan_id"] == req.plan_id), None)
        if not plan:
            raise HTTPException(status_code=404, detail="Plan not found.")
        if not req.employer_id:
            raise HTTPException(status_code=400, detail="employer_id required.")
        amount = plan["price"] * 100
    elif req.product in PRODUCT_AMOUNTS_PAISE:
        amount = PRODUCT_AMOUNTS_PAISE[req.product]
        if req.product == "freelancer_onboarding" and not req.full_name:
            raise HTTPException(status_code=400, detail="full_name required.")
        if req.product == "quota_boost":
            fdoc = await db.freelancers.find_one({"_id": req.freelancer_id}, {"_id": 0})
            if not fdoc:
                raise HTTPException(status_code=404, detail="Freelancer not found.")
            if not (fdoc.get("paid") and fdoc.get("aadhaar_verified")):
                raise HTTPException(status_code=403, detail="Verify your profile first.")
            state = await _get_quota_state(req.freelancer_id)
            if state["has_boost"]:
                raise HTTPException(status_code=409, detail="Boost already active.")
    else:
        raise HTTPException(status_code=400, detail="Unknown product.")

    coupon_code = None
    discount_paise = 0
    if req.coupon_code and req.coupon_code.strip():
        coupon = await _get_valid_coupon(req.coupon_code, req.product)
        discount_paise = _discount_paise(coupon, amount)
        amount -= discount_paise
        coupon_code = coupon["_id"]

    order = await asyncio.to_thread(
        razorpay_client.order.create,
        {"amount": amount, "currency": "INR", "payment_capture": 1,
         "notes": {"product": req.product, "plan_id": req.plan_id or "",
                   "coupon": coupon_code or ""}},
    )
    await db.payment_orders.insert_one({
        "_id": order["id"],
        "order_id": order["id"],
        "product": req.product,
        "amount": amount,
        "coupon_code": coupon_code,
        "discount_paise": discount_paise,
        "full_name": req.full_name,
        "freelancer_id": req.freelancer_id,
        "employer_id": req.employer_id,
        "plan_id": req.plan_id,
        "status": "created",
        "created_at": _now_iso(),
    })
    return CreateOrderResponse(
        order_id=order["id"], amount=amount, currency="INR",
        key_id=os.environ["RAZORPAY_KEY_ID"], product=req.product,
    )


@api_router.post("/payments/verify")
async def verify_payment(req: VerifyPaymentRequest):
    """Verifies the Razorpay signature server-side, then fulfills the purchased product."""
    odoc = await db.payment_orders.find_one({"_id": req.razorpay_order_id})
    if not odoc:
        raise HTTPException(status_code=404, detail="Order not found.")
    if odoc.get("status") == "paid":
        return odoc["result"]  # idempotent

    try:
        await asyncio.to_thread(
            razorpay_client.utility.verify_payment_signature,
            {
                "razorpay_order_id": req.razorpay_order_id,
                "razorpay_payment_id": req.razorpay_payment_id,
                "razorpay_signature": req.razorpay_signature,
            },
        )
    except Exception:
        raise HTTPException(status_code=400, detail="Payment signature verification failed.")

    if odoc.get("coupon_code"):
        await db.coupons.update_one({"_id": odoc["coupon_code"]}, {"$inc": {"used_count": 1}})

    product = odoc["product"]
    paid_at = _now_iso()

    if product == "employer_unlock":
        all_leads = await _all_leads(unlocked=True)
        await db.employer_unlocks.insert_one({
            "_id": str(uuid.uuid4()),
            "employer_id": odoc.get("employer_id") or f"employer-{uuid.uuid4().hex[:6]}",
            "payment_method": "razorpay",
            "razorpay_payment_id": req.razorpay_payment_id,
            "paid_amount": 199,
            "paid_at": paid_at,
            "leads_unlocked": [lead.id for lead in all_leads],
        })
        result = {
            "product": product,
            "leads": [lead.model_dump() for lead in all_leads],
            "paid_amount": 199,
        }

    elif product == "freelancer_onboarding":
        freelancer_id = str(uuid.uuid4())
        await db.freelancers.insert_one({
            "_id": freelancer_id,
            "freelancer_id": freelancer_id,
            "full_name": odoc.get("full_name") or "New Pro",
            "payment_method": "razorpay",
            "razorpay_payment_id": req.razorpay_payment_id,
            "paid_amount": 99,
            "paid": True,
            "paid_at": paid_at,
            "aadhaar_verified": False,
            "status": "payment_complete",
            "created_at": paid_at,
        })
        result = {"product": product, "freelancer_id": freelancer_id, "paid": True, "paid_amount": 99}

    elif product == "quota_boost":
        until_iso = (datetime.now(timezone.utc) + timedelta(hours=BOOST_DURATION_HOURS)).isoformat()
        await db.freelancers.update_one(
            {"_id": odoc["freelancer_id"]},
            {"$set": {"boost_until": until_iso, "quota_paid_at": paid_at}},
        )
        await db.quota_unlocks.insert_one({
            "_id": str(uuid.uuid4()),
            "freelancer_id": odoc["freelancer_id"],
            "payment_method": "razorpay",
            "razorpay_payment_id": req.razorpay_payment_id,
            "paid_amount": BOOST_PRICE,
            "paid_at": paid_at,
            "boost_until": until_iso,
        })
        result = {
            "product": product, "has_boost": True, "boost_until": until_iso,
            "quota_limit": FREE_APPLY_LIMIT + BOOST_EXTRA_APPLIES, "paid_amount": BOOST_PRICE,
        }

    else:  # plan
        plan = next((p for p in PLAN_CATALOG if p["plan_id"] == odoc["plan_id"]), None)
        if not plan:
            raise HTTPException(status_code=404, detail="Plan not found.")
        purchase_id = str(uuid.uuid4())
        expires_at = None
        if plan.get("duration_days"):
            expires_at = (datetime.now(timezone.utc) + timedelta(days=plan["duration_days"])).isoformat()
        record = {
            "purchase_id": purchase_id,
            "employer_id": odoc["employer_id"],
            "plan_id": plan["plan_id"],
            "plan_name": plan["name"],
            "section": plan["section"],
            "price": plan["price"],
            "payment_method": "razorpay",
            "purchased_at": paid_at,
            "expires_at": expires_at,
        }
        await db.plan_purchases.insert_one({
            "_id": purchase_id, "razorpay_payment_id": req.razorpay_payment_id, **record,
        })
        result = {"product": product, "purchase": record}

    await db.payment_orders.update_one(
        {"_id": req.razorpay_order_id},
        {"$set": {"status": "paid", "payment_id": req.razorpay_payment_id, "paid_at": paid_at, "result": result}},
    )
    return result


# ============== Auth (Emergent-managed Google login) ==============
EMERGENT_SESSION_API = "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data"


class SessionRequest(BaseModel):
    session_id: str


async def _user_from_bearer(request: Request) -> dict:
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated.")
    token = auth_header.split(" ", 1)[1].strip()
    sdoc = await db.user_sessions.find_one({"session_token": token}, {"_id": 0})
    if not sdoc:
        raise HTTPException(status_code=401, detail="Session expired.")
    exp = sdoc.get("expires_at")
    if isinstance(exp, datetime) and exp.tzinfo is None:
        exp = exp.replace(tzinfo=timezone.utc)
    if not exp or exp <= datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="Session expired.")
    user = await db.users.find_one({"user_id": sdoc["user_id"]}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found.")
    return user


ADMIN_EMAILS = {
    e.strip().lower()
    for e in os.environ.get("ADMIN_EMAILS", "manarastudio22@gmail.com").split(",")
    if e.strip()
}


def _public_user(user: dict) -> dict:
    return {
        **{k: user.get(k) for k in ("user_id", "email", "name", "picture")},
        "is_admin": (user.get("email") or "").lower() in ADMIN_EMAILS,
    }


async def _require_admin(request: Request) -> dict:
    user = await _user_from_bearer(request)
    if (user.get("email") or "").lower() not in ADMIN_EMAILS:
        raise HTTPException(status_code=403, detail="Admin access only.")
    return user


@api_router.post("/auth/session")
async def auth_session(req: SessionRequest):
    """Exchanges an Emergent session_id for a persistent session_token + user."""
    async with httpx.AsyncClient(timeout=20) as hc:
        r = await hc.get(EMERGENT_SESSION_API, headers={"X-Session-ID": req.session_id})
    if r.status_code != 200:
        raise HTTPException(status_code=401, detail="Invalid session.")
    data = r.json()
    user = await db.users.find_one({"email": data["email"]}, {"_id": 0})
    if not user:
        user = {
            "user_id": f"user_{uuid.uuid4().hex[:12]}",
            "email": data["email"],
            "name": data.get("name") or "",
            "picture": data.get("picture"),
            "created_at": _now_iso(),
        }
        await db.users.insert_one(dict(user))
    session_token = data["session_token"]
    await db.user_sessions.update_one(
        {"session_token": session_token},
        {"$set": {
            "session_token": session_token,
            "user_id": user["user_id"],
            "expires_at": datetime.now(timezone.utc) + timedelta(days=7),
            "created_at": datetime.now(timezone.utc),
        }},
        upsert=True,
    )
    return {
        "user": _public_user(user),
        "session_token": session_token,
    }


class EmailOtpRequest(BaseModel):
    email: str


class EmailOtpVerifyRequest(BaseModel):
    email: str
    otp: str


class FreelancerEmailVerifyRequest(BaseModel):
    freelancer_id: str
    email: str
    otp: str


_EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


async def _issue_otp(email: str) -> dict:
    existing = await db.email_otps.find_one({"_id": email})
    if existing and time.time() - existing.get("last_sent", 0) < 60:
        raise HTTPException(status_code=429, detail="Please wait a minute before requesting another code.")
    otp = f"{secrets.randbelow(900000) + 100000}"
    await db.email_otps.update_one(
        {"_id": email},
        {"$set": {"otp": otp, "expires_at": time.time() + 600, "attempts": 0, "last_sent": time.time()}},
        upsert=True,
    )
    html = f"""
    <table width="100%" cellpadding="0" cellspacing="0"><tr><td>
      <h2 style="font-family:Arial,sans-serif;color:#111;">Your WorkHop verification code</h2>
      <p style="font-family:Arial,sans-serif;font-size:32px;font-weight:bold;letter-spacing:6px;color:#FF5A00;">{otp}</p>
      <p style="font-family:Arial,sans-serif;color:#555;">This code expires in 10 minutes. If you didn't request it, you can ignore this email.</p>
    </td></tr></table>
    """
    sent = await _send_email(email, f"{otp} is your WorkHop verification code", html)
    resp = {"ok": True, "sent": sent, "cooldown_seconds": 60}
    if not sent:
        # Email service unavailable — surface the code so the flow isn't blocked (dev/test only).
        resp["dev_otp"] = otp
    return resp


async def _consume_otp(email: str, otp: str) -> None:
    doc = await db.email_otps.find_one({"_id": email})
    if not doc:
        raise HTTPException(status_code=400, detail="Request a code first.")
    if time.time() > doc.get("expires_at", 0):
        raise HTTPException(status_code=400, detail="Code expired. Request a new one.")
    if doc.get("attempts", 0) >= 5:
        raise HTTPException(status_code=429, detail="Too many attempts. Request a new code.")
    if doc.get("otp") != otp.strip():
        await db.email_otps.update_one({"_id": email}, {"$inc": {"attempts": 1}})
        raise HTTPException(status_code=400, detail="Incorrect code. Try again.")
    await db.email_otps.delete_one({"_id": email})


@api_router.post("/auth/email/request-otp")
async def auth_email_request_otp(req: EmailOtpRequest, request: Request):
    email = req.email.strip().lower()
    if not _EMAIL_RE.match(email) or len(email) > 120:
        raise HTTPException(status_code=400, detail="Enter a valid email address.")
    client_ip = request.client.host if request.client else "unknown"
    _check_rate_limit(f"otp_ip_{client_ip}", max_requests=10, window_seconds=60)
    _check_rate_limit(f"otp_email_{email}", max_requests=4, window_seconds=120)
    return await _issue_otp(email)


@api_router.post("/auth/email/verify-otp")
async def auth_email_verify_otp(req: EmailOtpVerifyRequest, request: Request):
    email = req.email.strip().lower()
    client_ip = request.client.host if request.client else "unknown"
    _check_rate_limit(f"verify_ip_{client_ip}", max_requests=15, window_seconds=60)
    await _consume_otp(email, req.otp)
    user = await db.users.find_one({"email": email}, {"_id": 0})
    if not user:
        user = {
            "user_id": f"user_{uuid.uuid4().hex[:12]}",
            "email": email,
            "name": email.split("@")[0].replace(".", " ").title(),
            "picture": None,
            "created_at": _now_iso(),
        }
        await db.users.insert_one(dict(user))
    session_token = f"st_{uuid.uuid4().hex}{secrets.token_hex(8)}"
    await db.user_sessions.update_one(
        {"session_token": session_token},
        {"$set": {
            "session_token": session_token,
            "user_id": user["user_id"],
            "expires_at": datetime.now(timezone.utc) + timedelta(days=7),
            "created_at": datetime.now(timezone.utc),
        }},
        upsert=True,
    )
    return {
        "user": _public_user(user),
        "session_token": session_token,
    }


@api_router.post("/freelancer/verify-email")
async def freelancer_verify_email(req: FreelancerEmailVerifyRequest):
    email = req.email.strip().lower()
    await _consume_otp(email, req.otp)
    result = await db.freelancers.update_one(
        {"_id": req.freelancer_id},
        {"$set": {
            "aadhaar_verified": True,  # legacy flag drives is_verified
            "email_verified": True,
            "email": email,
            "status": "email_verified",
        }},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Freelancer not found.")
    return {"ok": True, "freelancer_id": req.freelancer_id, "email": email, "verified": True}


@api_router.get("/auth/me")
async def auth_me(request: Request):
    user = await _user_from_bearer(request)
    return _public_user(user)


@api_router.post("/auth/logout")
async def auth_logout(request: Request):
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        await db.user_sessions.delete_one({"session_token": auth_header.split(" ", 1)[1].strip()})
    return {"ok": True}


# ============== Admin Dashboard (restricted to ADMIN_EMAILS) ==============
class AdminApproveRequest(BaseModel):
    approved: bool


class AdminCouponCreate(BaseModel):
    code: str
    discount_type: str  # percent | flat
    value: int
    applies_to: str = "all"  # all | employer_unlock | freelancer_onboarding | quota_boost | plan
    max_uses: int = 0  # 0 = unlimited
    expires_in_days: Optional[int] = None
    description: Optional[str] = None


class AdminCouponPatch(BaseModel):
    active: bool


@api_router.get("/admin/overview")
async def admin_overview(request: Request):
    await _require_admin(request)
    paid_orders = await db.payment_orders.find({"status": "paid"}, {"amount": 1}).to_list(5000)
    return {
        "users": await db.users.count_documents({}),
        "freelancers": await db.freelancers.count_documents({}),
        "employers": await _employer_account_count(),
        "payments_paid": len(paid_orders),
        "revenue_rupees": sum(o.get("amount", 0) for o in paid_orders) // 100,
        "complaints": await db.complaints.count_documents({}),
        "coupons": await db.coupons.count_documents({}),
    }


@api_router.get("/admin/users")
async def admin_users(request: Request):
    await _require_admin(request)
    users = await db.users.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    freelancers = await db.freelancers.find(
        {"email": {"$nin": [None, ""]}},
        {"email": 1, "status": 1, "approved_by_admin": 1, "freelancer_id": 1},
    ).to_list(2000)
    by_email = {(f.get("email") or "").lower(): f for f in freelancers}
    out = []
    for u in users:
        f = by_email.get((u.get("email") or "").lower())
        out.append({
            "user_id": u.get("user_id"),
            "name": u.get("name"),
            "email": u.get("email"),
            "created_at": u.get("created_at"),
            "role": "freelancer" if f else "employer",
            "approved": bool(f.get("approved_by_admin")) if f else None,
            "freelancer_id": f.get("freelancer_id") if f else None,
        })
    return out


async def _freelancer_emails() -> set:
    docs = await db.freelancers.find(
        {"email": {"$nin": [None, ""]}}, {"email": 1}
    ).to_list(3000)
    return {(f.get("email") or "").lower() for f in docs}


async def _employer_account_count() -> int:
    fr_emails = await _freelancer_emails()
    users = await db.users.find({}, {"email": 1}).to_list(5000)
    return sum(1 for u in users if (u.get("email") or "").lower() not in fr_emails)


@api_router.get("/admin/employers")
async def admin_employers(request: Request):
    """Registered employer accounts + device-based employer activity (unlocks, plans, job posts, spend)."""
    await _require_admin(request)
    fr_emails = await _freelancer_emails()
    users = await db.users.find({}, {"_id": 0}).sort("created_at", -1).to_list(2000)
    accounts = [
        {"name": u.get("name"), "email": u.get("email"), "created_at": u.get("created_at")}
        for u in users
        if (u.get("email") or "").lower() not in fr_emails
    ]

    agg: dict = {}

    def _bump(eid, key, amount, ts):
        if not eid:
            return
        d = agg.setdefault(
            eid,
            {"employer_id": eid, "unlocks": 0, "plans": 0, "jobs_posted": 0,
             "spent_rupees": 0, "last_active": None},
        )
        d[key] += 1
        d["spent_rupees"] += int(amount or 0)
        if ts and (d["last_active"] is None or ts > d["last_active"]):
            d["last_active"] = ts

    for u in await db.employer_unlocks.find({}, {"_id": 0}).to_list(3000):
        _bump(u.get("employer_id"), "unlocks", u.get("paid_amount"), u.get("paid_at"))
    for p in await db.plan_purchases.find({}, {"_id": 0}).to_list(3000):
        _bump(p.get("employer_id"), "plans", p.get("price"), p.get("purchased_at"))
    for j in await db.custom_jobs.find({}, {"_id": 0}).to_list(3000):
        _bump(j.get("employer_id"), "jobs_posted", 0, j.get("created_at"))

    devices = sorted(agg.values(), key=lambda d: d["spent_rupees"], reverse=True)
    return {"accounts": accounts, "devices": devices}


@api_router.get("/admin/freelancers")
async def admin_freelancers(request: Request):
    await _require_admin(request)
    docs = await db.freelancers.find({}, {"_id": 0}).sort("created_at", -1).to_list(2000)
    return [
        {
            "freelancer_id": d.get("freelancer_id"),
            "full_name": d.get("full_name"),
            "email": d.get("email"),
            "phone": d.get("phone"),
            "skill": d.get("skill"),
            "category": d.get("category"),
            "rate_hr": d.get("rate_hr"),
            "paid": bool(d.get("paid")),
            "email_verified": bool(d.get("email_verified") or d.get("aadhaar_verified")),
            "status": d.get("status"),
            "approved": bool(d.get("approved_by_admin")),
            "submitted_at": d.get("submitted_at"),
            "created_at": d.get("created_at"),
        }
        for d in docs
    ]


@api_router.post("/admin/freelancers/{freelancer_id}/approve")
async def admin_approve_freelancer(freelancer_id: str, req: AdminApproveRequest, request: Request):
    await _require_admin(request)
    result = await db.freelancers.update_one(
        {"_id": freelancer_id},
        {"$set": {
            "approved_by_admin": req.approved,
            "status": "approved" if req.approved else "under_review",
        }},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Freelancer not found.")
    return {"ok": True, "freelancer_id": freelancer_id, "approved": req.approved}


@api_router.get("/admin/payments")
async def admin_payments(request: Request):
    await _require_admin(request)
    docs = await db.payment_orders.find({}, {"_id": 0}).sort("created_at", -1).to_list(2000)
    return [
        {
            "order_id": d.get("order_id"),
            "product": d.get("product"),
            "plan_id": d.get("plan_id"),
            "amount_rupees": d.get("amount", 0) // 100,
            "discount_rupees": d.get("discount_paise", 0) // 100 if d.get("discount_paise") else 0,
            "coupon_code": d.get("coupon_code"),
            "payer": d.get("full_name") or d.get("freelancer_id") or d.get("employer_id"),
            "status": d.get("status"),
            "created_at": d.get("created_at"),
        }
        for d in docs
    ]


@api_router.get("/admin/complaints")
async def admin_complaints(request: Request):
    await _require_admin(request)
    docs = await db.complaints.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return docs


@api_router.get("/admin/coupons")
async def admin_coupons(request: Request):
    await _require_admin(request)
    docs = await db.coupons.find({}).to_list(500)
    return [
        {
            "code": d["_id"],
            "discount_type": d.get("discount_type"),
            "value": d.get("value"),
            "applies_to": d.get("applies_to"),
            "active": bool(d.get("active")),
            "max_uses": d.get("max_uses", 0),
            "used_count": d.get("used_count", 0),
            "expires_at": d.get("expires_at"),
            "description": d.get("description", ""),
        }
        for d in docs
    ]


@api_router.post("/admin/coupons")
async def admin_create_coupon(req: AdminCouponCreate, request: Request):
    await _require_admin(request)
    code = req.code.strip().upper()
    if not code or not code.isalnum() or len(code) > 20:
        raise HTTPException(status_code=400, detail="Code must be 1-20 letters/numbers.")
    if req.discount_type not in ("percent", "flat"):
        raise HTTPException(status_code=400, detail="discount_type must be percent or flat.")
    if req.discount_type == "percent" and not (1 <= req.value <= 100):
        raise HTTPException(status_code=400, detail="Percent must be between 1 and 100.")
    if req.discount_type == "flat" and req.value < 1:
        raise HTTPException(status_code=400, detail="Flat discount must be at least ₹1.")
    valid_products = ("all", "employer_unlock", "freelancer_onboarding", "quota_boost", "plan")
    if req.applies_to not in valid_products:
        raise HTTPException(status_code=400, detail="Invalid applies_to.")
    if await db.coupons.find_one({"_id": code}):
        raise HTTPException(status_code=409, detail="A coupon with this code already exists.")
    doc = {
        "_id": code,
        "code": code,
        "discount_type": req.discount_type,
        "value": req.value,
        "applies_to": req.applies_to,
        "active": True,
        "max_uses": max(0, req.max_uses),
        "used_count": 0,
        "description": req.description or (
            f"{req.value}% off" if req.discount_type == "percent" else f"₹{req.value} off"
        ),
        "created_at": _now_iso(),
    }
    if req.expires_in_days and req.expires_in_days > 0:
        doc["expires_at"] = time.time() + req.expires_in_days * 86400
    await db.coupons.insert_one(doc)
    return {"ok": True, "code": code}


@api_router.patch("/admin/coupons/{code}")
async def admin_patch_coupon(code: str, req: AdminCouponPatch, request: Request):
    await _require_admin(request)
    result = await db.coupons.update_one(
        {"_id": code.strip().upper()}, {"$set": {"active": req.active}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Coupon not found.")
    return {"ok": True, "code": code.strip().upper(), "active": req.active}


# ============== In-app Chat (freelancer ↔ employer) ==============
@api_router.get("/chats", response_model=List[Conversation])
async def list_chats(freelancer_id: Optional[str] = None):
    """Freelancer inbox (pass freelancer_id) or employer inbox (no filter — demo)."""
    q = {"freelancer_id": freelancer_id} if freelancer_id else {}
    docs = await db.conversations.find(q, {"_id": 0}).to_list(500)
    docs.sort(key=lambda d: d.get("last_message_at") or d["created_at"], reverse=True)
    return [Conversation(**d) for d in docs]


@api_router.get("/chats/{conversation_id}", response_model=Conversation)
async def get_chat(conversation_id: str):
    doc = await db.conversations.find_one({"_id": conversation_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Conversation not found.")
    return Conversation(**doc)


@api_router.get("/chats/{conversation_id}/messages", response_model=List[ChatMessage])
async def list_messages(conversation_id: str):
    docs = await db.messages.find({"conversation_id": conversation_id}, {"_id": 0}).to_list(1000)
    docs.sort(key=lambda d: d["created_at"])
    return [ChatMessage(**d) for d in docs]


@api_router.post("/chats/{conversation_id}/messages", response_model=ChatMessage)
async def send_message(conversation_id: str, req: SendMessageRequest):
    conv = await db.conversations.find_one({"_id": conversation_id}, {"_id": 0})
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found.")
    if req.sender_role not in ("freelancer", "employer"):
        raise HTTPException(status_code=400, detail="Invalid sender role.")
    text = (req.text or "").strip()
    if not text:
        raise HTTPException(status_code=400, detail="Message cannot be empty.")
    message_id = str(uuid.uuid4())
    created_at = _now_iso()
    msg = {
        "message_id": message_id,
        "conversation_id": conversation_id,
        "sender_role": req.sender_role,
        "text": text[:1000],
        "created_at": created_at,
    }
    await db.messages.insert_one({"_id": message_id, **msg})
    await db.conversations.update_one(
        {"_id": conversation_id},
        {"$set": {"last_message": msg["text"][:80], "last_message_at": created_at}},
    )
    return ChatMessage(**msg)


# ============== Map pins (OpenStreetMap, Bengaluru) ==============
@api_router.get("/map/pins")
async def map_pins():
    """Interactive map pins: verified candidates + hiring employers (companies)."""
    candidates = [
        {"id": l["id"], "kind": "candidate", "title": l["name"], "subtitle": l["skill"],
         "lat": l["lat"], "lng": l["lng"]}
        for l in SEED_LEADS
    ]
    seen: dict = {}
    for j in SEED_JOBS:
        if j["company_name"] not in seen:
            open_count = sum(1 for x in SEED_JOBS if x["company_name"] == j["company_name"])
            seen[j["company_name"]] = {
                "id": f"emp-{len(seen) + 1}", "kind": "employer",
                "title": j["company_name"],
                "subtitle": f"{j['area']} · {open_count} open gigs",
                "lat": j["lat"], "lng": j["lng"],
            }
    return {
        "center": {"lat": 12.9716, "lng": 77.5946},
        "candidates": candidates,
        "employers": list(seen.values()),
    }


# ============== Job lifecycle + Reviews ==============
class StatusRequest(BaseModel):
    status: str  # "hired" | "completed"


@api_router.post("/chats/{conversation_id}/status", response_model=Conversation)
async def update_chat_status(conversation_id: str, req: StatusRequest):
    """Employer action: applied -> hired -> completed."""
    conv = await db.conversations.find_one({"_id": conversation_id}, {"_id": 0})
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found.")
    current = conv.get("status", "applied")
    valid = {"applied": "hired", "hired": "completed"}
    if req.status not in ("hired", "completed") or valid.get(current) != req.status:
        raise HTTPException(status_code=400, detail=f"Invalid transition {current} -> {req.status}.")
    await db.conversations.update_one({"_id": conversation_id}, {"$set": {"status": req.status}})
    conv["status"] = req.status
    return Conversation(**conv)


class ReviewRequest(BaseModel):
    conversation_id: str
    reviewer_role: str  # "employer" | "freelancer"
    rating: int
    text: str = ""


class Review(BaseModel):
    review_id: str
    conversation_id: str
    job_title: str
    reviewer_role: str
    reviewer_name: str
    subject_type: str  # "freelancer" | "company"
    subject_id: str
    rating: int
    text: str
    created_at: str


@api_router.post("/reviews", response_model=Review)
async def create_review(req: ReviewRequest):
    conv = await db.conversations.find_one({"_id": req.conversation_id}, {"_id": 0})
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found.")
    if conv.get("status") != "completed":
        raise HTTPException(status_code=400, detail="Reviews open after the job is marked completed.")
    if req.reviewer_role not in ("employer", "freelancer"):
        raise HTTPException(status_code=400, detail="Invalid reviewer role.")
    if not (1 <= req.rating <= 5):
        raise HTTPException(status_code=400, detail="Rating must be 1-5.")
    dup = await db.reviews.find_one(
        {"conversation_id": req.conversation_id, "reviewer_role": req.reviewer_role}
    )
    if dup:
        raise HTTPException(status_code=409, detail="You already reviewed this job.")
    if req.reviewer_role == "employer":
        subject_type, subject_id = "freelancer", conv["freelancer_id"]
        reviewer_name = conv["company_name"]
    else:
        subject_type, subject_id = "company", conv["company_name"]
        reviewer_name = conv["freelancer_name"]
    review = {
        "review_id": str(uuid.uuid4()),
        "conversation_id": req.conversation_id,
        "job_title": conv["job_title"],
        "reviewer_role": req.reviewer_role,
        "reviewer_name": reviewer_name,
        "subject_type": subject_type,
        "subject_id": subject_id,
        "rating": req.rating,
        "text": (req.text or "").strip()[:600],
        "created_at": _now_iso(),
    }
    await db.reviews.insert_one({"_id": review["review_id"], **review})
    return Review(**review)


@api_router.get("/reviews", response_model=List[Review])
async def list_reviews(subject_id: Optional[str] = None, conversation_id: Optional[str] = None):
    q: dict = {}
    if subject_id:
        q["subject_id"] = subject_id
    if conversation_id:
        q["conversation_id"] = conversation_id
    docs = await db.reviews.find(q, {"_id": 0}).to_list(500)
    docs.sort(key=lambda d: d["created_at"], reverse=True)
    return [Review(**d) for d in docs]


@api_router.get("/pros/{lead_id}")
async def pro_profile(lead_id: str):
    """Public profile of a verified pro (seeded lead or real verified freelancer)."""
    lead = next((l for l in SEED_LEADS if l["id"] == lead_id), None)
    if lead:
        pro = Lead(**lead)
    else:
        doc = await db.freelancers.find_one({"_id": lead_id})
        if not doc:
            raise HTTPException(status_code=404, detail="Pro not found.")
        pro = _freelancer_to_lead(doc)
    reviews = await db.reviews.find({"subject_id": lead_id}, {"_id": 0}).to_list(200)
    reviews.sort(key=lambda d: d["created_at"], reverse=True)
    return {"pro": pro.model_dump(), "reviews": reviews}


# ============== Employer Post-a-Job (₹299 Single Post / bundle credits) ==============
class PostJobRequest(BaseModel):
    employer_id: str
    company_name: str
    title: str
    bucket: str
    pay: int
    description: str
    area: str = "Bengaluru"


async def _post_credits(employer_id: str) -> dict:
    purchases = await db.plan_purchases.find({"employer_id": employer_id}, {"_id": 0}).to_list(200)
    credits = 0
    for p in purchases:
        if p["plan_id"] == "single-post":
            credits += 1
        elif p["plan_id"] == "starter-bundle":
            credits += 5
    used = await db.custom_jobs.count_documents({"employer_id": employer_id})
    return {"credits": credits, "used": used, "remaining": max(credits - used, 0)}


@api_router.get("/employer/{employer_id}/post-credits")
async def employer_post_credits(employer_id: str):
    return await _post_credits(employer_id)


@api_router.post("/employer/jobs", response_model=Job)
async def post_job(req: PostJobRequest):
    # Accept the 9 catalog categories (new UI) plus legacy buckets.
    catalog_to_bucket = {
        "Graphics & Design": "Creative", "Programming & Tech": "Tech",
        "Digital Marketing": "Marketing", "Writing & Translation": "Creative",
        "Video & Animation": "Creative", "AI Services": "Tech",
        "Music & Audio": "Creative", "Business": "Ops", "Consulting": "Ops",
        "Creative": "Creative", "Tech": "Tech", "Marketing": "Marketing", "Ops": "Ops",
    }
    if req.bucket not in catalog_to_bucket:
        raise HTTPException(status_code=400, detail="Invalid category.")
    if not req.title.strip() or not req.description.strip() or not req.company_name.strip():
        raise HTTPException(status_code=400, detail="Title, company and description are required.")
    if req.pay < 500:
        raise HTTPException(status_code=400, detail="Pay must be at least ₹500.")
    state = await _post_credits(req.employer_id)
    if state["remaining"] <= 0:
        raise HTTPException(
            status_code=402,
            detail="No job post credits. Buy a Single Post (₹299) or Starter Bundle to publish.",
        )
    job_id = f"cjob-{uuid.uuid4().hex[:8]}"
    idx = state["used"]
    job = {
        "id": job_id,
        "title": req.title.strip()[:120],
        "category": req.bucket,
        "bucket": catalog_to_bucket[req.bucket],
        "pay": req.pay,
        "pay_label": f"₹{req.pay:,} fixed",
        "distance_km": round(0.5 + (idx % 30) / 10.0, 1),
        "posted_minutes_ago": 0,
        "company_name": req.company_name.strip()[:60],
        "area": req.area.strip()[:40] or "Bengaluru",
        "lat": round(12.9716 + (idx % 11 - 5) * 0.006, 5),
        "lng": round(77.5946 + (idx % 9 - 4) * 0.007, 5),
        "description": req.description.strip()[:600],
        "keywords": [req.bucket.lower(), req.title.strip().lower()],
    }
    await db.custom_jobs.insert_one({
        "_id": job_id, **job,
        "employer_id": req.employer_id, "created_at": _now_iso(),
    })
    return Job(**job)


@api_router.get("/employer/{employer_id}/jobs", response_model=List[Job])
async def employer_jobs(employer_id: str):
    docs = await db.custom_jobs.find({"employer_id": employer_id}, {"_id": 0}).to_list(200)
    docs.sort(key=lambda j: j.get("created_at", ""), reverse=True)
    return [Job(**{k: v for k, v in d.items() if k in Job.model_fields}) for d in docs]


# ============== Complaints / Support ==============
SUPPORT_EMAIL = "manarastudio22@gmail.com"

# Emergent managed email proxy (constant by design — survives deployment).
EMAIL_BASE_URL = "https://integrations.emergentagent.com"
EMERGENT_EMAIL_KEY = os.environ.get("EMERGENT_EMAIL_KEY", "").strip()
EMAIL_FROM_NAME = os.environ.get("EMAIL_FROM_NAME", "WorkHop")


async def _send_email(to: str, subject: str, html: str) -> bool:
    """Best-effort transactional email via the Emergent managed proxy."""
    if not EMERGENT_EMAIL_KEY:
        logging.warning("EMERGENT_EMAIL_KEY missing — email to %s skipped", to)
        return False
    try:
        async with httpx.AsyncClient(timeout=30) as hc:
            r = await hc.post(
                f"{EMAIL_BASE_URL}/api/v1/email/send",
                headers={"X-Email-Key": EMERGENT_EMAIL_KEY},
                json={"to": [to], "subject": subject, "html": html, "from_name": EMAIL_FROM_NAME},
            )
        if r.status_code in (200, 202):
            return True
        logging.error("email send failed: %s %s", r.status_code, r.text[:200])
        return False
    except Exception as exc:
        logging.error("email send error: %s", exc)
        return False


async def send_complaint_email(complaint: dict) -> None:
    """Best-effort dispatch to the support inbox. HTML escaped. Never raises."""
    c_id = html.escape(str(complaint.get('complaint_id', '')))
    c_name = html.escape(str(complaint.get('name', '')))
    c_email = html.escape(str(complaint.get('email', '')))
    c_role = html.escape(str(complaint.get('role', '')))
    c_subject = html.escape(str(complaint.get('subject', '')))
    c_message = html.escape(str(complaint.get('message', ''))).replace('\n', '<br/>')
    c_time = html.escape(str(complaint.get('created_at', '')))
    html_content = f"""
    <h2>New WorkHop Complaint</h2>
    <p><strong>Complaint ID:</strong> {c_id}</p>
    <p><strong>Name:</strong> {c_name}</p>
    <p><strong>Email:</strong> {c_email}</p>
    <p><strong>Role:</strong> {c_role}</p>
    <p><strong>Subject:</strong> {c_subject}</p>
    <p><strong>Message:</strong></p>
    <p>{c_message}</p>
    <p><em>Submitted at {c_time}</em></p>
    """
    await _send_email(SUPPORT_EMAIL, f"[WorkHop Complaint] {c_subject}", html_content)


class ComplaintRequest(BaseModel):
    name: str
    email: str
    role: str = "user"
    subject: str
    message: str


@api_router.post("/complaints")
async def create_complaint(req: ComplaintRequest, background_tasks: BackgroundTasks):
    if not req.subject.strip() or not req.message.strip():
        raise HTTPException(status_code=400, detail="Subject and message are required.")
    cid = str(uuid.uuid4())
    doc = {
        "_id": cid, "complaint_id": cid,
        "name": req.name.strip()[:80], "email": req.email.strip()[:120],
        "role": req.role, "subject": req.subject.strip()[:150],
        "message": req.message.strip()[:2000],
        "status": "open", "created_at": _now_iso(),
    }
    await db.complaints.insert_one(doc)
    background_tasks.add_task(send_complaint_email, doc)
    return {"ok": True, "complaint_id": cid, "support_email": SUPPORT_EMAIL}


# ============== Fiverr-style Category Catalog ==============
CATALOG = [
    {"category": "Graphics & Design", "icon": "color-palette", "subcategories": [
        "Logo Design", "Brand Style Guides", "Business Cards & Stationery", "Illustration",
        "Image Editing", "Presentation Design", "Packaging & Label Design", "Web & App Design",
        "UX Design", "Landing Page Design", "Icon Design", "Infographic Design",
        "T-Shirts & Merchandise", "3D Architecture", "Interior Design", "Fashion Design"]},
    {"category": "Programming & Tech", "icon": "code-slash", "subcategories": [
        "Website Development", "WordPress", "Shopify", "Custom Websites", "Mobile App Development",
        "Software Development", "AI Development", "Chatbot Development", "Game Development",
        "Cloud & DevOps", "Cybersecurity", "Data Engineering", "QA & Review",
        "Blockchain & Cryptocurrency", "Electronics Engineering", "Database Administration"]},
    {"category": "Digital Marketing", "icon": "megaphone", "subcategories": [
        "SEO", "Social Media Marketing", "Paid Advertising (PPC)", "Influencer Marketing",
        "Email Marketing", "Content Marketing", "Video Marketing", "Marketing Strategy",
        "Public Relations", "Affiliate Marketing", "Local SEO", "E-Commerce Marketing"]},
    {"category": "Writing & Translation", "icon": "create", "subcategories": [
        "Content Writing", "Copywriting", "Technical Writing", "UX Writing", "Translation",
        "Proofreading & Editing", "Resume Writing", "Ghostwriting", "Book & eBook Writing",
        "Scriptwriting", "Speechwriting", "Transcription"]},
    {"category": "Video & Animation", "icon": "videocam", "subcategories": [
        "Video Editing", "Video Ads & Commercials", "Animated Explainers", "Character Animation",
        "Whiteboard Animation", "Logo Animation", "3D Product Animation", "Social Media Videos",
        "Subtitles & Captions", "Videographers", "Drone Videography", "Intro & Outro Videos"]},
    {"category": "AI Services", "icon": "sparkles", "subcategories": [
        "AI Chatbots", "AI App Development", "Prompt Engineering", "AI Content Editing",
        "AI Art & Images", "AI Music & Audio", "AI Video Art", "Data Annotation",
        "Machine Learning", "Computer Vision"]},
    {"category": "Music & Audio", "icon": "musical-notes", "subcategories": [
        "Voice Over", "Music Production", "Mixing & Mastering", "Singers & Vocalists",
        "Session Musicians", "Jingles & Intros", "Podcast Production", "Audiobook Production",
        "Sound Design", "DJ Mixing", "Audio Editing"]},
    {"category": "Business", "icon": "briefcase", "subcategories": [
        "Virtual Assistant", "Market Research", "Business Plans", "Accounting & Bookkeeping",
        "Legal Consulting", "Financial Consulting", "HR Consulting", "Presentations",
        "Project Management", "CRM Management", "Supply Chain Management", "Event Management"]},
    {"category": "Consulting", "icon": "people", "subcategories": [
        "Business Consulting", "Marketing Advice", "Tech Consulting", "Career Counseling",
        "Life Coaching", "Startup Consulting", "Data Analytics Consulting", "Legal Advice",
        "Financial Planning"]},
]


@api_router.get("/catalog")
async def get_catalog():
    return CATALOG


@app.on_event("startup")
async def startup_indexes():
    await db.users.create_index("email", unique=True)
    await db.users.create_index("user_id", unique=True)
    await db.user_sessions.create_index("session_token", unique=True)
    await db.user_sessions.create_index("user_id")
    await db.user_sessions.create_index("expires_at", expireAfterSeconds=0)
    # Idempotent coupon seeding (preserves used_count on redeploys).
    for c in SEED_COUPONS:
        await db.coupons.update_one({"_id": c["_id"]}, {"$setOnInsert": c}, upsert=True)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled error on {request.method} {request.url.path}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "An internal server error occurred. Please try again later."}
    )


app.include_router(api_router)

cors_origins_env = os.environ.get("CORS_ORIGINS", "")
if cors_origins_env.strip():
    allowed_origins = [o.strip() for o in cors_origins_env.split(",") if o.strip()]
else:
    allowed_origins = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://localhost:3000",
        "http://localhost:5173",
    ]

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origin_regex=r"^https:\/\/.*\.vercel\.app$|^http:\/\/localhost:\d+$",
    allow_origins=allowed_origins,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
