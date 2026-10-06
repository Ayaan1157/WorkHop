from fastapi import FastAPI, APIRouter, HTTPException, Request, BackgroundTasks
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import html
import json
import hmac
import hashlib
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
    credits_to_apply: int = 1
    is_boosted: bool = False
    boost_expires_at: Optional[str] = None


class FreelancerStatus(BaseModel):
    freelancer_id: str
    status: str
    paid: bool
    aadhaar_verified: bool
    is_verified: bool


class ApplyRequest(BaseModel):
    freelancer_id: str
    note: Optional[str] = ""
    boost_credits: Optional[int] = 0
    proposed_rate_type: Optional[str] = "fixed"
    proposed_quote: Optional[float] = None
    proposed_payment_mode: Optional[str] = "escrow"  # "escrow" | "direct"
    freelancer_ack_at: Optional[str] = None
    pdf_attachment: Optional[dict] = None
    portfolio_items: Optional[list] = []


class ApplyResponse(BaseModel):
    application_id: str
    job_id: str
    freelancer_id: str
    applied_at: str
    conversation_id: str
    credits_spent: int = 1
    remaining_balance: int = 0
    quota_used: int = 0
    quota_limit: int = 999
    has_boost: bool = False


class CreditsWallet(BaseModel):
    user_id: str
    balance: int = 20
    subscription_status: str = "none"
    subscription_plan_id: Optional[str] = None
    subscription_renews_at: Optional[str] = None
    updated_at: str


class CreditTransaction(BaseModel):
    id: str
    user_id: str
    type: str  # 'purchase' | 'subscription' | 'spend' | 'boost' | 'bonus'
    amount: int
    balance_after: int
    related_job_id: Optional[str] = None
    job_title: Optional[str] = None
    description: str
    created_at: str


class CreditPackPurchaseReq(BaseModel):
    user_id: str
    pack_id: str


class CreditSubscriptionReq(BaseModel):
    user_id: str
    plan_id: str


class JobBoostReq(BaseModel):
    employer_id: str
    amount_paid: int = 299


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


def calculate_hops_for_job(pay: float) -> int:
    """Upwork-style Connects/Hops: 2, 4, 6, 8, 10, 12, 16 connects based on budget"""
    p = float(pay or 0)
    if p <= 3000:
        return 2
    if p <= 8000:
        return 4
    if p <= 15000:
        return 6
    if p <= 30000:
        return 8
    if p <= 50000:
        return 10
    if p <= 80000:
        return 12
    return 16


def _make_seed_job(i: int, j: dict) -> dict:
    pay = j["pay"]
    credits_to_apply = calculate_hops_for_job(pay)
    sample_boost = (i == 0 or i == 3)
    expires_at = (datetime.now(timezone.utc) + timedelta(hours=36)).isoformat() if sample_boost else None
    return {
        "id": f"job-{i + 1}",
        "title": j["title"],
        "category": j["category"],
        "bucket": j["bucket"],
        "pay": pay,
        "pay_label": f"₹{pay:,} fixed",
        "credits_to_apply": credits_to_apply,
        "is_boosted": sample_boost,
        "boost_expires_at": expires_at,
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


async def _create_deal_event(
    deal_id: str,
    conversation_id: str,
    actor_role: str,
    event_type: str,
    title: str,
    description: str,
    actor_id: Optional[str] = None,
    metadata: Optional[dict] = None
) -> dict:
    event_id = f"evt_{uuid.uuid4().hex[:12]}"
    created_at = _now_iso()
    evt = {
        "_id": event_id,
        "event_id": event_id,
        "deal_id": deal_id,
        "conversation_id": conversation_id,
        "actor_role": actor_role,
        "actor_id": actor_id or actor_role,
        "event_type": event_type,
        "title": title,
        "description": description,
        "metadata": metadata or {},
        "created_at": created_at,
    }
    await db.deal_events.insert_one(evt)

    # Mirror as a system message in the chat conversation
    sys_msg_id = str(uuid.uuid4())
    sys_text = f"[{title}] {description}"
    await db.messages.insert_one({
        "_id": sys_msg_id,
        "message_id": sys_msg_id,
        "conversation_id": conversation_id,
        "sender_role": "system",
        "text": sys_text,
        "created_at": created_at,
    })
    await db.conversations.update_one(
        {"_id": conversation_id},
        {"$set": {"last_message": sys_text[:80], "last_message_at": created_at}}
    )
    return evt


async def _check_and_auto_release_deal(deal: dict) -> dict:
    if not deal:
        return deal
    if deal.get("payment_mode") == "escrow" and deal.get("status") == "submitted":
        auto_release_at_str = deal.get("auto_release_at")
        if auto_release_at_str:
            try:
                auto_dt = datetime.fromisoformat(auto_release_at_str)
                if auto_dt.tzinfo is None:
                    auto_dt = auto_dt.replace(tzinfo=timezone.utc)
                if datetime.now(timezone.utc) >= auto_dt:
                    completed_at = _now_iso()
                    freelancer_net = int(deal.get("freelancer_net_paise", 0))
                    commission = int(deal.get("commission_paise", 0))
                    deal_id = deal["deal_id"]

                    # Release funds in escrow ledger
                    await db.escrow_ledger.insert_one({
                        "_id": str(uuid.uuid4()),
                        "ledger_id": f"led_{uuid.uuid4().hex[:12]}",
                        "deal_id": deal_id,
                        "entry_type": "release",
                        "amount_paise": freelancer_net,
                        "gateway_ref": "auto_release_72h",
                        "notes": "Automatic 72-hour escrow release to freelancer",
                        "created_at": completed_at,
                    })
                    if commission > 0:
                        await db.escrow_ledger.insert_one({
                            "_id": str(uuid.uuid4()),
                            "ledger_id": f"led_{uuid.uuid4().hex[:12]}",
                            "deal_id": deal_id,
                            "entry_type": "commission",
                            "amount_paise": commission,
                            "gateway_ref": "commission_retained",
                            "notes": "Platform commission 5%",
                            "created_at": completed_at,
                        })

                    await _create_deal_event(
                        deal_id=deal_id,
                        conversation_id=deal["conversation_id"],
                        actor_role="system",
                        event_type="auto_released",
                        title="⚡ 72h SLA Auto-Released",
                        description=f"Review window expired. ₹{freelancer_net / 100:,.2f} automatically released to freelancer.",
                    )

                    await db.deals.update_one(
                        {"deal_id": deal_id},
                        {"$set": {"status": "completed", "completed_at": completed_at, "updated_at": completed_at}}
                    )
                    await db.conversations.update_one(
                        {"_id": deal["conversation_id"]},
                        {"$set": {"status": "completed"}}
                    )
                    deal["status"] = "completed"
                    deal["completed_at"] = completed_at
            except Exception as e:
                logger.error(f"Error evaluating deal auto-release: {e}")
    return deal


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


_NUMBER_WORDS = {
    "zero": "0", "one": "1", "two": "2", "three": "3", "four": "4",
    "five": "5", "six": "6", "seven": "7", "eight": "8", "nine": "9",
}


def _check_contact_violations(text: str) -> bool:
    if not text:
        return False
    # Check emails
    email_re = re.compile(
        r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b|'
        r'\b[A-Za-z0-9._%+-]+\s*(?:\(at\)|\[at\]|\bat\b|@)\s*[A-Za-z0-9.-]+\s*(?:\(dot\)|\[dot\]|\bdot\b|\.)\s*(?:com|in|org|net|co|io|ai|me)\b',
        re.I
    )
    if email_re.search(text):
        return True

    # Normalize spelled out number words
    word_pattern = re.compile(r'\b(zero|one|two|three|four|five|six|seven|eight|nine)\b', re.I)
    normalized = word_pattern.sub(lambda m: _NUMBER_WORDS.get(m.group(0).lower(), m.group(0)), text)

    # Check phones (10 digits) across both original and normalized
    phone_re = re.compile(r'(?:(?:\+?91|0)[\s.-]?)?(?:(?:\(\d{1,5}\)[\s.-]?)|\d[\s.-]?){9,14}\d')
    for target in (text, normalized):
        for m in phone_re.finditer(target):
            digits = re.sub(r'\D', '', m.group(0))
            if digits.startswith('91') and len(digits) == 12:
                digits = digits[2:]
            elif digits.startswith('0') and len(digits) == 11:
                digits = digits[1:]
            if len(digits) == 10:
                return True
            if len(digits) > 10:
                for i in range(len(digits) - 9):
                    sub = digits[i:i+10]
                    if sub[0] in '6789':
                        return True

    # Check social / direct app indicators (WhatsApp, Telegram)
    social_re = re.compile(r'\b(whatsapp|telegram|wa\.me|t\.me)\b', re.I)
    if social_re.search(text) and re.search(r'\d{5,}', text):
        return True

    return False


SKILL_SYNONYM_CLUSTERS = [
    {
        "category": "Graphics & Design",
        "name": "Fashion, Apparel & Textile Crafts",
        "triggers": [
            "embroidery",
            "aari",
            "zari",
            "zardozi",
            "chikankari",
            "needlework",
            "textile",
            "apparel",
            "garment",
            "fashion",
            "boutique",
            "pattern making",
            "pattern maker",
            "tailor",
            "tailoring",
            "saree",
            "lehenga",
            "couture",
            "fabric",
            "dressmaker",
            "fashion illustration",
            "fashion stylist",
            "ethnic wear"
        ],
        "tags": [
            "fashion",
            "fashion design",
            "fashion designer",
            "embroidery design",
            "embroidery",
            "textile design",
            "textile",
            "apparel design",
            "apparel",
            "garment design",
            "clothing design",
            "pattern maker",
            "pattern making",
            "ethnic wear",
            "couture",
            "boutique designer",
            "aari work",
            "zari embroidery",
            "hand embroidery",
            "fabric design",
            "couture design"
        ]
    },
    {
        "category": "Graphics & Design",
        "name": "Physical Art, Murals, Crafts & Sculpture",
        "triggers": [
            "pottery",
            "ceramics",
            "resin",
            "clay",
            "sculpture",
            "calligraphy",
            "lettering",
            "typography",
            "mural",
            "graffiti",
            "wall art",
            "sketching",
            "origami",
            "painting",
            "canvas painting",
            "fine art",
            "wood carving",
            "mosaic"
        ],
        "tags": [
            "crafts",
            "handmade",
            "art & craft",
            "fine art",
            "pottery",
            "ceramics",
            "calligraphy",
            "lettering",
            "typography",
            "wall muralist",
            "wall art",
            "mural painter",
            "custom art",
            "sculptor",
            "street art"
        ]
    },
    {
        "category": "Graphics & Design",
        "name": "Brand Identity, Logo & Packaging Design",
        "triggers": [
            "logo",
            "branding",
            "brand identity",
            "brand guidelines",
            "brand book",
            "packaging",
            "dieline",
            "box design",
            "label design",
            "pouch",
            "monogram",
            "minimalist logo",
            "mascot",
            "menu design",
            "brochure",
            "flyer",
            "pamphlet",
            "standee",
            "business card",
            "print collateral"
        ],
        "tags": [
            "logo designer",
            "brand identity",
            "minimalist logo",
            "packaging design",
            "dieline",
            "label design",
            "product packaging",
            "brand guidelines",
            "menu card",
            "brochure",
            "print designer",
            "branding kit",
            "vector logo"
        ]
    },
    {
        "category": "Graphics & Design",
        "name": "UI/UX, Product Design & Figma Prototyping",
        "triggers": [
            "figma",
            "ui",
            "ux",
            "ui/ux",
            "user interface",
            "user experience",
            "wireframe",
            "prototype",
            "app design",
            "mobile ui",
            "web ui",
            "user flow",
            "design system",
            "interaction design",
            "responsive design",
            "product designer"
        ],
        "tags": [
            "ui designer",
            "ux designer",
            "ui/ux",
            "figma prototype",
            "app design",
            "web ui",
            "wireframes",
            "user flow",
            "mobile interface",
            "responsive web design",
            "product design",
            "design system"
        ]
    },
    {
        "category": "Graphics & Design",
        "name": "CAD Drafting, 3D Architecture & Spatial Visualization",
        "triggers": [
            "autocad",
            "cad",
            "revit",
            "sketchup",
            "lumion",
            "3ds max",
            "floor plan",
            "drafting",
            "3d printing",
            "industrial design",
            "interior design",
            "v-ray",
            "architectural drawing",
            "blueprint",
            "spatial layout",
            "elevation",
            "working drawing"
        ],
        "tags": [
            "autocad 2d",
            "floor plan",
            "architectural drafting",
            "architectural visualization",
            "3d rendering",
            "interior design",
            "cad drafter",
            "blueprint",
            "sketchup",
            "lumion",
            "spatial layout",
            "elevation"
        ]
    },
    {
        "category": "Graphics & Design",
        "name": "3D Product Modeling, Jewelry & Industrial Visualization",
        "triggers": [
            "jewelry",
            "jewellery",
            "product render",
            "product modeling",
            "keyshot",
            "blender render",
            "3d jewelry render",
            "product design",
            "industrial design",
            "product visualization",
            "3d model",
            "3d modeling",
            "rhino",
            "cad jewelry"
        ],
        "tags": [
            "product design",
            "3d product modeling",
            "jewelry design",
            "3d rendering",
            "product rendering",
            "3d visualization",
            "industrial design",
            "keyshot",
            "3d modeling",
            "blender"
        ]
    },
    {
        "category": "Graphics & Design",
        "name": "Vector Illustration, Character Design & Digital Art",
        "triggers": [
            "illustration",
            "illustrator",
            "vector artist",
            "character design",
            "digital art",
            "doodle",
            "caricature",
            "mascot",
            "comic artist",
            "anime",
            "storyboard",
            "icon design",
            "flat illustration",
            "concept artist"
        ],
        "tags": [
            "custom illustration",
            "vector artist",
            "flat illustration",
            "custom icons",
            "character design",
            "digital illustration",
            "doodle artist",
            "graphic illustration",
            "illustrator",
            "mascot design"
        ]
    },
    {
        "category": "Graphics & Design",
        "name": "Invitations, Wedding Cards & Event Stationery",
        "triggers": [
            "invitation",
            "wedding card",
            "wedding invite",
            "e-invite",
            "save the date",
            "greeting card",
            "stationery",
            "card design",
            "shadi card",
            "kannada wedding card",
            "digital invite",
            "event invite",
            "invitation card"
        ],
        "tags": [
            "invitation",
            "invitation design",
            "wedding card",
            "wedding invitation",
            "wedding invite",
            "event invite",
            "e-invite",
            "stationery design",
            "save the date",
            "card design",
            "graphic design"
        ]
    },
    {
        "category": "Tech & Code",
        "name": "Frontend Web Development & Modern JavaScript",
        "triggers": [
            "react",
            "react.js",
            "next.js",
            "nextjs",
            "vue",
            "vue.js",
            "angular",
            "svelte",
            "tailwind",
            "tailwind css",
            "javascript",
            "typescript",
            "frontend",
            "front-end",
            "html/css",
            "html5",
            "css3",
            "web developer",
            "landing page code",
            "responsive website"
        ],
        "tags": [
            "frontend developer",
            "react.js",
            "tailwind css",
            "javascript",
            "typescript",
            "html5/css3",
            "next.js",
            "web developer",
            "responsive frontend",
            "react dev",
            "frontend engineer",
            "frontend"
        ]
    },
    {
        "category": "Tech & Code",
        "name": "Backend, APIs & Server Architectures",
        "triggers": [
            "node.js",
            "nodejs",
            "express",
            "express.js",
            "python",
            "django",
            "fastapi",
            "flask",
            "nestjs",
            "golang",
            "go dev",
            "rest api",
            "graphql",
            "microservices",
            "backend",
            "server setup",
            "api integration",
            "webhooks",
            "sql",
            "postgresql",
            "mongodb",
            "prisma",
            "orm"
        ],
        "tags": [
            "backend developer",
            "node.js",
            "python",
            "rest api",
            "database integration",
            "express.js",
            "server setup",
            "backend engineer",
            "webhooks",
            "api integration",
            "microservices",
            "backend"
        ]
    },
    {
        "category": "Tech & Code",
        "name": "Mobile App Development (iOS & Android)",
        "triggers": [
            "flutter",
            "react native",
            "swift",
            "kotlin",
            "ios app",
            "android app",
            "mobile developer",
            "app store",
            "play store",
            "cross platform",
            "apk build",
            "mobile engineer",
            "mobile application",
            "flutter bloc",
            "mobile app"
        ],
        "tags": [
            "mobile app developer",
            "flutter",
            "react native",
            "ios app",
            "android app",
            "cross-platform",
            "app store deploy",
            "apk build",
            "mobile developer",
            "mobile engineer",
            "mobile app"
        ]
    },
    {
        "category": "Tech & Code",
        "name": "E-Commerce & CMS Platforms (Shopify, WordPress, Webflow, Framer)",
        "triggers": [
            "shopify",
            "liquid",
            "shopify liquid",
            "woocommerce",
            "wordpress",
            "elementor",
            "divi",
            "webflow",
            "framer",
            "no-code",
            "nocode",
            "softr",
            "wix",
            "squarespace",
            "ecommerce",
            "e-commerce",
            "d2c website",
            "online store",
            "product catalog"
        ],
        "tags": [
            "shopify store",
            "d2c website",
            "e-commerce builder",
            "webflow developer",
            "framer website",
            "wordpress developer",
            "elementor",
            "no-code dev",
            "woocommerce",
            "online shop setup",
            "landing page builder",
            "ecommerce",
            "e-commerce"
        ]
    },
    {
        "category": "Tech & Code",
        "name": "Web Scraping, Automation & Data Crawling",
        "triggers": [
            "selenium",
            "puppeteer",
            "playwright",
            "beautifulsoup",
            "bs4",
            "scrapy",
            "scraper",
            "web scraping",
            "data extraction",
            "crawler",
            "lead scraper",
            "browser automation",
            "data harvesting",
            "python automation"
        ],
        "tags": [
            "web scraping",
            "python scraper",
            "beautifulsoup",
            "selenium",
            "data extraction",
            "lead scraper",
            "web automation",
            "data crawler",
            "puppeteer",
            "web scraper"
        ]
    },
    {
        "category": "Tech & Code",
        "name": "DevOps, Cloud, Hosting & Server Administration",
        "triggers": [
            "docker",
            "kubernetes",
            "k8s",
            "aws",
            "ec2",
            "s3",
            "azure",
            "gcp",
            "cloudflare",
            "nginx",
            "apache",
            "linux",
            "sysadmin",
            "ssl",
            "dns",
            "domain setup",
            "ci/cd",
            "devops",
            "cloud engineer",
            "hosting migration",
            "terraform",
            "ansible",
            "jenkins",
            "helm",
            "iac",
            "infrastructure as code"
        ],
        "tags": [
            "domain setup",
            "dns record",
            "ssl certificate",
            "cloudflare",
            "web hosting",
            "devops",
            "cloud engineer",
            "docker",
            "server setup",
            "sysadmin",
            "terraform",
            "infrastructure as code",
            "ci/cd",
            "aws",
            "kubernetes"
        ]
    },
    {
        "category": "Tech & Code",
        "name": "Web3, Blockchain & Smart Contracts",
        "triggers": [
            "solidity",
            "smart contract",
            "ethereum",
            "web3",
            "crypto",
            "defi",
            "nft",
            "token",
            "hardhat",
            "truffle",
            "metamask",
            "rust blockchain",
            "dapp",
            "blockchain developer",
            "blockchain"
        ],
        "tags": [
            "web3 developer",
            "smart contract",
            "solidity",
            "blockchain developer",
            "crypto",
            "ethereum",
            "dapp developer",
            "defi",
            "blockchain",
            "web3"
        ]
    },
    {
        "category": "Marketing",
        "name": "Meta Ads, Paid Social & Instagram Growth",
        "triggers": [
            "meta ads",
            "facebook ads",
            "fb ads",
            "instagram ads",
            "ad manager",
            "cbo",
            "roas",
            "retargeting",
            "pixel",
            "fb pixel",
            "paid social",
            "hyperlocal ads",
            "lead gen ads",
            "meta buyer",
            "social media marketing"
        ],
        "tags": [
            "instagram ads",
            "facebook ads",
            "local ad campaign",
            "radius targeting",
            "lead gen ads",
            "meta ads manager",
            "hyperlocal ads",
            "ad manager",
            "performance marketing",
            "roas optimization",
            "social media marketing"
        ]
    },
    {
        "category": "Marketing",
        "name": "Google Search, Display & Performance Max Ads",
        "triggers": [
            "google ads",
            "ppc",
            "google adwords",
            "search ads",
            "display ads",
            "pmax",
            "performance max",
            "google shopping",
            "sem",
            "keyword bidding",
            "roas",
            "google search campaign"
        ],
        "tags": [
            "google ads",
            "ppc specialist",
            "search campaign",
            "google display",
            "keyword bidding",
            "adwords expert",
            "roas optimization",
            "sem",
            "ppc"
        ]
    },
    {
        "category": "Marketing",
        "name": "E-Commerce Marketing, Google Shopping & Marketplace Ads",
        "triggers": [
            "google merchant center",
            "merchant center",
            "google shopping",
            "amazon ads",
            "flipkart ads",
            "marketplace ads",
            "ecommerce ads",
            "e-commerce ads",
            "ecommerce marketing",
            "e-commerce marketing",
            "product ads",
            "catalog ads"
        ],
        "tags": [
            "ecommerce marketing",
            "e-commerce marketing",
            "google shopping",
            "google merchant center",
            "marketplace ads",
            "amazon advertising",
            "performance marketing",
            "product ads",
            "ecommerce growth"
        ]
    },
    {
        "category": "Marketing",
        "name": "Local SEO, Google Business Profile & Map Ranking",
        "triggers": [
            "local seo",
            "google business profile",
            "gmb",
            "google maps",
            "map ranking",
            "gmb optimization",
            "local citations",
            "nearby ranking",
            "nap audit",
            "local search",
            "map pack"
        ],
        "tags": [
            "local seo",
            "google business profile",
            "map ranking",
            "gmb optimization",
            "nearby business seo",
            "local citation",
            "google maps ranking",
            "gmb"
        ]
    },
    {
        "category": "Marketing",
        "name": "Organic SEO, Content Marketing & Link Building",
        "triggers": [
            "seo",
            "organic seo",
            "technical seo",
            "on-page seo",
            "backlinks",
            "link building",
            "semrush",
            "ahrefs",
            "keyword research",
            "seo audit",
            "search engine optimization",
            "page rank"
        ],
        "tags": [
            "organic seo",
            "technical seo",
            "seo audit",
            "keyword research",
            "backlink building",
            "on-page seo",
            "seo specialist",
            "organic traffic"
        ]
    },
    {
        "category": "Marketing",
        "name": "WhatsApp Funnels & Broadcast Messaging",
        "triggers": [
            "wati",
            "interakt",
            "aisensy",
            "whatsapp marketing",
            "whatsapp broadcast",
            "whatsapp api",
            "bulk whatsapp",
            "message campaign",
            "whatsapp automation",
            "sms marketing"
        ],
        "tags": [
            "whatsapp marketing",
            "wati",
            "interakt",
            "whatsapp broadcast",
            "customer engagement",
            "whatsapp api",
            "bulk whatsapp",
            "message campaign",
            "whatsapp automation"
        ]
    },
    {
        "category": "Marketing",
        "name": "Influencer Marketing & Creator Collaborations",
        "triggers": [
            "influencer",
            "influencer marketing",
            "creator outreach",
            "ugc creator",
            "micro influencer",
            "barter collab",
            "gifting campaign",
            "brand partnership",
            "bangalore influencers",
            "creator management"
        ],
        "tags": [
            "influencer marketing",
            "bangalore influencers",
            "creator outreach",
            "micro-influencer",
            "ugc creator",
            "brand collaboration",
            "gifting campaign",
            "influencer campaign"
        ]
    },
    {
        "category": "Marketing",
        "name": "Email Marketing, Newsletters & Retention Automations",
        "triggers": [
            "klaviyo",
            "mailchimp",
            "activecampaign",
            "email marketing",
            "drip campaign",
            "newsletter",
            "cold email",
            "email automation",
            "email flows",
            "sales sequence",
            "retention marketing"
        ],
        "tags": [
            "email marketing",
            "mailchimp",
            "klaviyo",
            "newsletter setup",
            "drip campaign",
            "email automation",
            "sales sequence",
            "cold email",
            "retention marketing"
        ]
    },
    {
        "category": "Writing",
        "name": "Video, Reel & Short-Form Scriptwriting",
        "triggers": [
            "reel script",
            "hook writer",
            "short video script",
            "ad copy",
            "tiktok script",
            "youtube script",
            "youtube scriptwriter",
            "video scriptwriter",
            "viral script",
            "video copy",
            "storyboard writing",
            "scriptwriting",
            "scriptwriter"
        ],
        "tags": [
            "reel script",
            "hook writer",
            "short video script",
            "ad copy",
            "video scriptwriter",
            "tiktok script",
            "viral script writer",
            "scriptwriter",
            "scriptwriting",
            "youtube script"
        ]
    },
    {
        "category": "Writing",
        "name": "Landing Page Copywriting & Conversion Sales Copy",
        "triggers": [
            "landing page copy",
            "website copy",
            "sales copy",
            "sales letter",
            "conversion copy",
            "copywriter",
            "ux writing",
            "headline writer",
            "cta copy",
            "funnel copy",
            "website writer",
            "copywriting"
        ],
        "tags": [
            "website copy",
            "landing page copy",
            "sales copy",
            "ux writing",
            "headline writer",
            "conversion copywriter",
            "website writer",
            "copywriting"
        ]
    },
    {
        "category": "Writing",
        "name": "SEO Blog, Article & Long-Form Content Writing",
        "triggers": [
            "seo content",
            "blog writer",
            "article writing",
            "content writer",
            "organic seo blog",
            "keyword-rich blog",
            "long-form content",
            "ghostwriter",
            "thought leadership",
            "grant proposal writing",
            "proposal writing",
            "proposal"
        ],
        "tags": [
            "seo content",
            "blog writer",
            "article writing",
            "content writer",
            "organic seo",
            "keyword-rich blog",
            "long-form content",
            "content writing",
            "proposal",
            "grant proposal",
            "proposal writing"
        ]
    },
    {
        "category": "Writing",
        "name": "Academic, SOP & University Admissions Writing",
        "triggers": [
            "sop",
            "sop writer",
            "statement of purpose",
            "lor",
            "letter of recommendation",
            "admission essay",
            "admissions essay",
            "visa sop",
            "academic writing",
            "college application",
            "university essay",
            "study abroad",
            "personal statement"
        ],
        "tags": [
            "academic writing",
            "sop writer",
            "statement of purpose",
            "lor writing",
            "admissions essay",
            "college application essay",
            "study abroad writing",
            "sop",
            "academic essay"
        ]
    },
    {
        "category": "Writing",
        "name": "Vernacular Content & Regional Translations (Kannada, Hindi)",
        "triggers": [
            "kannada",
            "hindi",
            "translator",
            "translation",
            "kannada translation",
            "kannada writer",
            "hindi translator",
            "hindi writer",
            "regional content",
            "english to kannada",
            "kannada copy",
            "vernacular writer",
            "localization",
            "language adaptation",
            "regional"
        ],
        "tags": [
            "kannada translation",
            "hindi translator",
            "regional content",
            "english to kannada",
            "localization",
            "vernacular writer",
            "kannada content",
            "kannada writer",
            "hindi content"
        ]
    },
    {
        "category": "Writing",
        "name": "Menu Descriptions, F&B & E-Commerce Catalog Copy",
        "triggers": [
            "zomato description",
            "swiggy copy",
            "menu copy",
            "menu description",
            "restaurant menu writer",
            "product description",
            "ecommerce copy",
            "catalog writing"
        ],
        "tags": [
            "product copy",
            "menu description",
            "swiggy menu copy",
            "zomato description",
            "e-commerce writer",
            "catalogue writer",
            "zomato menu editor",
            "swiggy copy"
        ]
    },
    {
        "category": "Writing",
        "name": "PR, Press Releases & Corporate Storytelling",
        "triggers": [
            "press release",
            "pr writer",
            "media kit",
            "brand story",
            "about us page",
            "founder note",
            "mission vision",
            "press statement",
            "company announcement"
        ],
        "tags": [
            "press release",
            "pr writer",
            "media kit",
            "media statement",
            "company announcement",
            "brand story",
            "about us page",
            "brand narrative"
        ]
    },
    {
        "category": "Video",
        "name": "Short-Form Video Editing (Reels, Shorts, TikTok)",
        "triggers": [
            "reel editor",
            "short-form editor",
            "capcut",
            "capcut editor",
            "capcut reels",
            "instagram reel",
            "tiktok video",
            "vertical video",
            "alex hormozi captions",
            "reels",
            "shorts editor",
            "viral reels",
            "premiere pro reels",
            "short form video"
        ],
        "tags": [
            "reel editor",
            "short-form editor",
            "capcut editor",
            "premiere pro",
            "vertical video",
            "instagram reel",
            "alex hormozi style captions",
            "capcut",
            "reels",
            "shorts",
            "short form video"
        ]
    },
    {
        "category": "Video",
        "name": "Color Grading & Cinematic Post-Production",
        "triggers": [
            "colorist",
            "color grading",
            "davinci resolve",
            "davinci color grading",
            "luts",
            "cinematic look",
            "footage correction",
            "video colorist",
            "log correction"
        ],
        "tags": [
            "colorist",
            "color grading",
            "davinci resolve",
            "luts",
            "video colorist",
            "cinematic look",
            "footage correction",
            "color correction"
        ]
    },
    {
        "category": "Video",
        "name": "Motion Graphics, VFX & Explainer Animations",
        "triggers": [
            "motion graphics",
            "after effects",
            "vfx",
            "2d motion",
            "title animation",
            "explainer video",
            "2d animation",
            "whiteboard animation",
            "lower thirds",
            "video intro",
            "blender animation"
        ],
        "tags": [
            "motion graphics",
            "after effects",
            "vfx artist",
            "2d motion design",
            "title animation",
            "video intro",
            "explainer video",
            "2d animation",
            "animated video"
        ]
    },
    {
        "category": "Video",
        "name": "Drone Videography & Aerial Cinematography",
        "triggers": [
            "drone",
            "aerial",
            "fpv",
            "fpv drone",
            "quadcopter",
            "dji",
            "flycam",
            "cinematography",
            "real estate drone",
            "aerial video",
            "aerial shot",
            "drone operator"
        ],
        "tags": [
            "drone videography",
            "drone pilot",
            "aerial video",
            "aerial footage",
            "fpv drone",
            "videographer",
            "video post-production",
            "real estate drone",
            "drone operator"
        ]
    },
    {
        "category": "Video",
        "name": "Wedding, Event & Celebration Videography",
        "triggers": [
            "wedding video",
            "pre-wedding",
            "wedding montage",
            "wedding teaser",
            "event video",
            "highlight reel",
            "wedding film",
            "birthday video",
            "party shoot",
            "wedding video montage"
        ],
        "tags": [
            "wedding video",
            "wedding videographer",
            "pre-wedding shoot",
            "event video",
            "wedding teaser",
            "highlight reel",
            "cinematic wedding",
            "event videography"
        ]
    },
    {
        "category": "Video",
        "name": "Food, Cafe & Retail Space Video Shoots",
        "triggers": [
            "food videographer",
            "cafe video shoot",
            "restaurant reel",
            "ambiance video",
            "menu shoot",
            "culinary videography",
            "hospitality video",
            "cafe reel"
        ],
        "tags": [
            "food videographer",
            "cafe video shoot",
            "restaurant reel",
            "ambiance video",
            "menu shoot",
            "culinary videography",
            "food video"
        ]
    },
    {
        "category": "AI Services",
        "name": "AI Prompt Engineering & GenAI Workflows",
        "triggers": [
            "prompt engineer",
            "prompt engineering",
            "chatgpt prompt",
            "midjourney prompt",
            "midjourney prompt engineering",
            "system prompt",
            "llm prompting",
            "ai workflow",
            "prompting",
            "genai"
        ],
        "tags": [
            "prompt engineer",
            "chatgpt prompt",
            "midjourney prompt",
            "system prompt",
            "llm prompting",
            "ai workflow",
            "prompting",
            "genai consultant",
            "prompt engineering"
        ]
    },
    {
        "category": "AI Services",
        "name": "Custom AI Chatbots & Customer Assistants",
        "triggers": [
            "ai chatbot",
            "custom bot",
            "voiceflow",
            "botpress",
            "manychat",
            "whatsapp ai bot",
            "customer support bot",
            "openai bot",
            "chat bot",
            "langchain rag development",
            "rag chatbot",
            "chatbot"
        ],
        "tags": [
            "ai chatbot",
            "custom bot",
            "voiceflow",
            "manychat",
            "openai api",
            "whatsapp ai bot",
            "customer support bot",
            "botpress",
            "chatbot"
        ]
    },
    {
        "category": "AI Services",
        "name": "Automated Workflow Integrations (Make.com, Zapier, n8n)",
        "triggers": [
            "make.com",
            "zapier",
            "n8n",
            "workflow automation",
            "no-code automation",
            "api sync",
            "webhook automation",
            "business automation"
        ],
        "tags": [
            "make.com expert",
            "zapier automation",
            "workflow builder",
            "business automation",
            "no-code automation",
            "api sync",
            "zapier",
            "make.com",
            "n8n"
        ]
    },
    {
        "category": "AI Services",
        "name": "AI Image, Concept & Visual Generation",
        "triggers": [
            "midjourney",
            "stable diffusion",
            "comfyui",
            "controlnet",
            "ai art",
            "custom ai imagery",
            "ai visual asset",
            "ai artist",
            "concept generation"
        ],
        "tags": [
            "midjourney artist",
            "stable diffusion",
            "ai art",
            "custom ai imagery",
            "concept generation",
            "controlnet",
            "midjourney",
            "ai image generation"
        ]
    },
    {
        "category": "AI Services",
        "name": "AI Voiceover, Speech Synthesis & Audio Cloning",
        "triggers": [
            "elevenlabs",
            "voice cloning",
            "audio cloning",
            "ai voiceover",
            "text to speech",
            "tts",
            "voice synthesis",
            "ai voice artist",
            "whisper transcription",
            "whisper transcription fine-tuning",
            "voice ai"
        ],
        "tags": [
            "ai voiceover",
            "elevenlabs",
            "audio cloning",
            "voice synthesis",
            "text to speech",
            "ai voice artist",
            "ai audio",
            "voice ai",
            "whisper"
        ]
    },
    {
        "category": "AI Services",
        "name": "Custom LLM Engineering, RAG & Fine-Tuning",
        "triggers": [
            "rag",
            "langchain",
            "llamaindex",
            "vector database",
            "pinecone",
            "chroma",
            "embeddings",
            "fine-tuning",
            "custom llm",
            "openai api"
        ],
        "tags": [
            "openai api",
            "fine-tuning",
            "rag architecture",
            "langchain",
            "vector database",
            "custom llm",
            "embeddings",
            "llm engineer"
        ]
    },
    {
        "category": "AI Services",
        "name": "AI Avatars & Synthetic Video (HeyGen, Synthesia)",
        "triggers": [
            "heygen",
            "synthesia",
            "d-id",
            "ai avatar",
            "virtual presenter",
            "ai spokesperson",
            "ai video creation",
            "synthetic video"
        ],
        "tags": [
            "heygen",
            "synthesia",
            "ai avatar video",
            "virtual presenter",
            "ai spokesperson",
            "ai video creation"
        ]
    },
    {
        "category": "Music & Audio",
        "name": "Voiceover Recording (English, Kannada, Hindi)",
        "triggers": [
            "voiceover",
            "voice over",
            "vo artist",
            "dubbing",
            "narration",
            "kannada vo",
            "hindi voice",
            "accent voiceover",
            "kannada voiceover",
            "kannada voiceover artist",
            "voice actor",
            "audiobook narrator"
        ],
        "tags": [
            "voiceover artist",
            "vo artist",
            "kannada vo",
            "hindi voice",
            "accent voiceover",
            "dubbing",
            "narration",
            "kannada voiceover",
            "vo",
            "voiceover"
        ]
    },
    {
        "category": "Music & Audio",
        "name": "Audio Mixing, Sound Mastering & Production",
        "triggers": [
            "sound engineer",
            "audio mixing",
            "mastering",
            "logic pro",
            "ableton",
            "ableton live",
            "track mixing",
            "studio engineer",
            "fl studio",
            "mixing and mastering",
            "audio engineer"
        ],
        "tags": [
            "sound engineer",
            "audio mixing",
            "mastering",
            "logic pro",
            "ableton live",
            "track mixing",
            "studio engineer",
            "music producer",
            "audio engineer"
        ]
    },
    {
        "category": "Music & Audio",
        "name": "Podcast Audio Editing, Clean-up & Noise Removal",
        "triggers": [
            "podcast editor",
            "audio cleanup",
            "podcast audio",
            "izotope rx",
            "noise removal",
            "noise reduction",
            "audio restoration",
            "echo reduction",
            "voice balancing",
            "podcast noise reduction"
        ],
        "tags": [
            "podcast editor",
            "audio cleanup",
            "podcast audio",
            "izotope rx",
            "noise removal",
            "audio restoration",
            "echo reduction",
            "podcast producer",
            "audio clean-up",
            "noise reduction"
        ]
    },
    {
        "category": "Music & Audio",
        "name": "Sound Design, Foley FX & Game Audio",
        "triggers": [
            "sound design",
            "foley",
            "foley artist",
            "sound effects",
            "sfx",
            "game audio",
            "film sound design",
            "audio fx"
        ],
        "tags": [
            "sound design",
            "foley artist",
            "sound effects",
            "sfx",
            "game audio",
            "film sound design",
            "audio fx"
        ]
    },
    {
        "category": "Music & Audio",
        "name": "Custom Jingles & Brand Sonic Idents",
        "triggers": [
            "sonic branding",
            "audio logo",
            "jingle creator",
            "brand theme",
            "audio ident",
            "commercial jingle",
            "radio ad music"
        ],
        "tags": [
            "sonic branding",
            "audio logo",
            "jingle creator",
            "brand theme",
            "audio ident",
            "commercial jingle",
            "jingle"
        ]
    },
    {
        "category": "Business",
        "name": "Typing, Data Entry & Document Processing",
        "triggers": [
            "typing",
            "data entry",
            "transcription",
            "typist",
            "copy typing",
            "form filling",
            "document typing",
            "kannada typing",
            "english typing",
            "hindi typing",
            "pdf to word",
            "speed typing",
            "offline typing",
            "spreadsheet typing",
            "typing operator",
            "kannada data entry typing"
        ],
        "tags": [
            "typing",
            "data entry",
            "transcription",
            "typist",
            "document typing",
            "kannada typing",
            "copy typing",
            "form filling",
            "data processing",
            "typing operator",
            "typing & data entry"
        ]
    },
    {
        "category": "Business",
        "name": "Telecaller, Inside Sales & Customer Calling",
        "triggers": [
            "telecaller",
            "telecalling",
            "inside sales",
            "outbound calling",
            "inbound calling",
            "bpo caller",
            "cold calling",
            "lead qualification",
            "appointment setter",
            "telesales",
            "customer calling",
            "phone sales",
            "call center",
            "bpo"
        ],
        "tags": [
            "telecaller",
            "telecalling",
            "inside sales",
            "outbound calling",
            "bpo caller",
            "cold calling",
            "appointment setter",
            "telesales executive",
            "customer calling",
            "telemarketing",
            "call center executive",
            "telecaller & inside sales"
        ]
    },
    {
        "category": "Business",
        "name": "Invoicing, Bookkeeping & GST Support (Tally, Zoho Books)",
        "triggers": [
            "tally",
            "tally prime",
            "zoho books",
            "gst invoice",
            "bookkeeping",
            "billing support",
            "accounting assistant",
            "e-way bill",
            "gst filing",
            "tally prime bookkeeping",
            "gst accounting"
        ],
        "tags": [
            "tally",
            "gst invoice",
            "bookkeeping",
            "billing support",
            "accounting assistant",
            "zoho books",
            "tally prime",
            "accountant",
            "gst accounting"
        ]
    },
    {
        "category": "Business",
        "name": "Virtual Assistance & Administrative Management",
        "triggers": [
            "virtual assistant",
            "va",
            "executive assistant",
            "calendar scheduling",
            "email management",
            "admin assistant",
            "administrative support"
        ],
        "tags": [
            "virtual assistant",
            "executive assistant",
            "email management",
            "calendar scheduling",
            "admin assistant",
            "va",
            "administrative support"
        ]
    },
    {
        "category": "Business",
        "name": "Spreadsheets, Excel Formulas & Data Architecture",
        "triggers": [
            "excel formulas",
            "google sheets",
            "pivot tables",
            "airtable",
            "vlookup",
            "spreadsheet expert",
            "excel macros",
            "data organization"
        ],
        "tags": [
            "excel formulas",
            "google sheets",
            "pivot tables",
            "airtable base",
            "data organization",
            "spreadsheet expert",
            "excel",
            "google sheets"
        ]
    },
    {
        "category": "Business",
        "name": "Pitch Decks, Investor Presentations & Fundraising",
        "triggers": [
            "pitch deck",
            "investor presentation",
            "fundraising",
            "startup pitch",
            "pitch deck designer",
            "investor deck",
            "vc pitch",
            "angel pitch",
            "seed pitch",
            "pitch deck investor presentation"
        ],
        "tags": [
            "pitch deck",
            "fundraising",
            "investor presentation",
            "startup deck",
            "investor deck",
            "pitch deck designer",
            "business presentation",
            "fundraising deck"
        ]
    },
    {
        "category": "Business",
        "name": "POS Setup & Retail Billing (Petpooja, Billing Systems)",
        "triggers": [
            "petpooja",
            "pos setup",
            "retail billing system",
            "restaurant pos",
            "billing software",
            "menu configuration",
            "pos machine"
        ],
        "tags": [
            "petpooja",
            "pos setup",
            "retail billing system",
            "restaurant pos",
            "menu configuration",
            "billing software",
            "pos billing"
        ]
    },
    {
        "category": "Consulting",
        "name": "Brand Strategy, Market Positioning & Advisory",
        "triggers": [
            "brand strategist",
            "brand positioning",
            "brand consultant",
            "value proposition",
            "market positioning",
            "brand architecture"
        ],
        "tags": [
            "brand strategist",
            "position strategy",
            "brand consultant",
            "market positioning",
            "value proposition",
            "brand strategy"
        ]
    },
    {
        "category": "Consulting",
        "name": "Business Model, Pricing & Financial Unit Economics",
        "triggers": [
            "business consultant",
            "pricing model",
            "monetization plan",
            "revenue strategy",
            "cost sheet",
            "unit economics",
            "financial forecast",
            "budgeting",
            "financial consultant",
            "business strategy"
        ],
        "tags": [
            "business consultant",
            "monetization plan",
            "pricing model",
            "revenue strategy",
            "financial consultant",
            "cost sheet",
            "unit economics",
            "business strategy"
        ]
    },
    {
        "category": "Consulting",
        "name": "Cafe, Restaurant & Cloud Kitchen Launch Advisory",
        "triggers": [
            "cafe launch",
            "restaurant advisor",
            "food business consultant",
            "cloud kitchen setup",
            "kitchen workflow",
            "menu engineering",
            "restaurant cloud kitchen menu consulting",
            "f&b consulting"
        ],
        "tags": [
            "food business consultant",
            "cloud kitchen setup",
            "restaurant advisor",
            "cafe launch",
            "kitchen workflow",
            "cafe consultant",
            "f&b consulting"
        ]
    },
    {
        "category": "Consulting",
        "name": "Interior Design Concept, Material & Space Planning Consulting",
        "triggers": [
            "interior consultant",
            "material selection",
            "space planner",
            "layout audit",
            "moodboard review",
            "vastu layout",
            "fluted paneling",
            "spatial consultant"
        ],
        "tags": [
            "interior consultant",
            "material selection",
            "space planner",
            "floor plan review",
            "spatial consultant",
            "interior design consultant"
        ]
    },
    {
        "category": "Consulting",
        "name": "Go-To-Market (GTM) Strategy & Product Launch",
        "triggers": [
            "gtm",
            "gtm strategist",
            "product launch plan",
            "market entry",
            "launch strategy",
            "campaign planner",
            "go-to-market",
            "launch",
            "product launch",
            "gtm market entry roadmap",
            "market entry roadmap"
        ],
        "tags": [
            "gtm strategist",
            "product launch plan",
            "market entry",
            "launch strategy",
            "campaign planner",
            "gtm strategy",
            "business strategy",
            "go-to-market",
            "strategic consulting"
        ]
    },
    {
        "category": "Consulting",
        "name": "Cybersecurity, Compliance & ISO Certification Consulting",
        "triggers": [
            "iso",
            "iso 27001",
            "iso certification",
            "soc2",
            "soc 2",
            "hipaa",
            "gdpr",
            "compliance",
            "audit compliance",
            "security audit",
            "cybersecurity",
            "vapt",
            "information security",
            "cybersecurity consulting",
            "iso 27001 audit compliance"
        ],
        "tags": [
            "cybersecurity consulting",
            "iso 27001",
            "compliance consulting",
            "security audit",
            "soc2 compliance",
            "gdpr compliance",
            "cybersecurity",
            "compliance audit",
            "it compliance"
        ]
    },
    {
        "category": "Hyperlocal Specialized (Bangalore Focus)",
        "name": "Wall Murals, Street Art & Cafe Graffiti",
        "triggers": [
            "wall muralist",
            "wall art",
            "cafe graffiti",
            "mural painter",
            "street art",
            "interior wall painting",
            "mural artist",
            "canvas artist",
            "cafe wall muralist indiranagar",
            "wall mural"
        ],
        "tags": [
            "wall muralist",
            "wall art",
            "cafe graffiti",
            "mural painter",
            "street art",
            "interior wall painting",
            "mural artist",
            "wall painting",
            "wall mural"
        ]
    },
    {
        "category": "Hyperlocal Specialized (Bangalore Focus)",
        "name": "Custom Neon, LED & Acrylic Signboards",
        "triggers": [
            "neon sign",
            "led sign",
            "acrylic letter",
            "storefront sign",
            "custom light sign",
            "shopboard",
            "glow sign",
            "3d letters"
        ],
        "tags": [
            "neon sign",
            "led sign",
            "acrylic letter",
            "storefront sign",
            "custom light sign",
            "shopboard",
            "signboard design"
        ]
    },
    {
        "category": "Hyperlocal Specialized (Bangalore Focus)",
        "name": "Regional Language Voiceover & Local Adaptations",
        "triggers": [
            "local adaptation",
            "kannada localization",
            "regional dubbing",
            "local accent",
            "bangalore vernacular",
            "kannada vo",
            "kannada dialect"
        ],
        "tags": [
            "local adaptation",
            "kannada localization",
            "regional dubbing",
            "local accent",
            "bangalore vernacular",
            "kannada vo"
        ]
    },
    {
        "category": "Hyperlocal Specialized (Bangalore Focus)",
        "name": "Live Event Video Coverage & Same-Day Reels",
        "triggers": [
            "live event reel",
            "same-day reel",
            "event creator",
            "on-field reel maker",
            "real-time video",
            "same day edit"
        ],
        "tags": [
            "live event reel",
            "same-day reel",
            "event creator",
            "on-field reel maker",
            "real-time video",
            "event video"
        ]
    },
    {
        "category": "Hyperlocal Specialized (Bangalore Focus)",
        "name": "Real Estate Drone Mapping & 3D Walkthrough Tours",
        "triggers": [
            "3d walkthrough",
            "property drone tour",
            "villa mapping",
            "villa",
            "plot mapping",
            "real estate video",
            "aerial property tour",
            "drone mapper",
            "3d tour",
            "walkthrough",
            "drone mapping"
        ],
        "tags": [
            "3d walkthrough",
            "property drone tour",
            "villa mapping",
            "plot mapping",
            "real estate video",
            "drone mapping"
        ]
    },
    {
        "category": "Hyperlocal Specialized (Bangalore Focus)",
        "name": "Fitness, Gym & Sports Photography / Videography",
        "triggers": [
            "gym",
            "fitness",
            "workout",
            "crossfit",
            "sports photography",
            "gym shoot",
            "fitness photographer",
            "bodybuilding",
            "trainer shoot",
            "fitness video",
            "gym photographer",
            "gym brand photographer koramangala",
            "fitness photography"
        ],
        "tags": [
            "fitness photography",
            "gym photography",
            "sports photography",
            "fitness photoshoot",
            "brand photography",
            "commercial photography",
            "fitness",
            "gym photographer"
        ]
    },
    {
        "category": "Hyperlocal Specialized (Bangalore Focus)",
        "name": "Event Emcee, Anchoring & Live Hosting",
        "triggers": [
            "emcee",
            "anchor",
            "event emcee",
            "event anchor",
            "corporate anchor",
            "kannada emcee",
            "wedding emcee",
            "stage host",
            "mc",
            "master of ceremonies",
            "kannada emcee anchor"
        ],
        "tags": [
            "event anchor",
            "emcee",
            "event emcee",
            "corporate anchor",
            "stage host",
            "kannada anchor",
            "master of ceremonies",
            "event host"
        ]
    }
]


def expand_skill_keywords(skill: str, category: str = "") -> List[str]:
    if not skill:
        return [category.lower()] if category else []
    raw = skill.strip().lower()
    res = set([raw])
    tokens = [w for w in re.split(r"[\s,+/&_-]+", raw) if len(w) > 2]
    for w in tokens:
        res.add(w)
    if category:
        res.add(category.strip().lower())
    for cluster in SKILL_SYNONYM_CLUSTERS:
        matched = any(
            trig in raw or raw in trig or any(token == trig or trig == token for token in tokens)
            for trig in cluster["triggers"]
        )
        if matched:
            for tag in cluster["tags"]:
                res.add(tag)
    return list(res)


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
    expanded = expand_skill_keywords(skill, doc.get("category") or "Graphics & Design")
    existing_kw = doc.get("keywords") or []
    merged_kw = list(set([k.lower() for k in existing_kw] + expanded))
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
        keywords=merged_kw,
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
    updates["keywords"] = expand_skill_keywords(req.skill, req.category)
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
    if "skill" in updates or "category" in updates:
        existing_doc = await db.freelancers.find_one({"_id": freelancer_id}) or {}
        sk = updates.get("skill") or existing_doc.get("skill") or ""
        cat = updates.get("category") or existing_doc.get("category") or ""
        updates["keywords"] = expand_skill_keywords(sk, cat)
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
    now = datetime.now(timezone.utc)
    custom_ids = {j["id"] for j in custom if "id" in j}
    deduped_seeds = [s for s in SEED_JOBS if s.get("id") not in custom_ids]

    for job in custom + deduped_seeds:
        if bucket and job["bucket"].lower() != bucket.lower():
            continue
        pay = int(job.get("pay", 1000))
        credits_to_apply = job.get("credits_to_apply") or calculate_hops_for_job(pay)
        is_boosted = bool(job.get("is_boosted", False))
        exp = job.get("boost_expires_at")
        if is_boosted and exp:
            try:
                if datetime.fromisoformat(exp) <= now:
                    is_boosted = False
            except Exception:
                pass

        jobs_out.append(Job(
            id=job["id"], title=job["title"], category=job["category"],
            bucket=job["bucket"],
            pay=pay, pay_label=job["pay_label"], distance_km=job["distance_km"],
            posted_minutes_ago=job["posted_minutes_ago"],
            company_name=job["company_name"],
            area=job["area"],
            description=job["description"],
            keywords=job.get("keywords", []),
            credits_to_apply=credits_to_apply,
            is_boosted=is_boosted,
            boost_expires_at=exp,
        ))

    # Requirement 4: Boosted jobs appear higher in job listing/search results
    jobs_out.sort(key=lambda j: 1 if j.is_boosted else 0, reverse=True)
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


async def _get_or_create_wallet(user_id: str) -> dict:
    w = await db.credits_wallet.find_one({"user_id": user_id}, {"_id": 0})
    if not w:
        w = {
            "user_id": user_id,
            "balance": 20,  # 20 welcome bonus credits
            "subscription_status": "none",
            "subscription_plan_id": None,
            "subscription_renews_at": None,
            "updated_at": _now_iso(),
        }
        await db.credits_wallet.insert_one({"_id": user_id, **w})
        # Record welcome bonus
        await db.credit_transactions.insert_one({
            "_id": str(uuid.uuid4()),
            "user_id": user_id,
            "type": "bonus",
            "amount": 20,
            "balance_after": 20,
            "related_job_id": None,
            "job_title": None,
            "description": "Welcome Gift: 20 Free Bidding Credits",
            "created_at": _now_iso(),
        })
    return w


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

    # Requirement 1: Credit-based deduction logic
    pay = int(job.get("pay", 1000))
    base_cost = job.get("credits_to_apply") or calculate_hops_for_job(pay)
    boost_credits = max(0, req.boost_credits or 0)
    total_cost = base_cost + boost_credits

    wallet = await _get_or_create_wallet(req.freelancer_id)
    if wallet["balance"] < total_cost:
        raise HTTPException(
            status_code=402,
            detail=f"Insufficient credits. This application requires {total_cost} credits (base: {base_cost}{f', boost: {boost_credits}' if boost_credits else ''}), but your wallet balance is only {wallet['balance']} credits. Top up or subscribe to apply.",
        )

    # Deduct credits atomically
    new_balance = wallet["balance"] - total_cost
    await db.credits_wallet.update_one(
        {"user_id": req.freelancer_id},
        {"$set": {"balance": new_balance, "updated_at": _now_iso()}}
    )

    # Record credit transaction
    await db.credit_transactions.insert_one({
        "_id": str(uuid.uuid4()),
        "user_id": req.freelancer_id,
        "type": "boost" if boost_credits > 0 else "spend",
        "amount": -total_cost,
        "balance_after": new_balance,
        "related_job_id": job_id,
        "job_title": job["title"],
        "description": f"Applied to '{job['title']}' ({base_cost} base + {boost_credits} boost credits)" if boost_credits > 0 else f"Applied to '{job['title']}' ({base_cost} credits)",
        "created_at": _now_iso(),
    })

    application_id = str(uuid.uuid4())
    applied_at = _now_iso()
    await db.applications.insert_one({
        "_id": application_id,
        "application_id": application_id,
        "job_id": job_id,
        "freelancer_id": req.freelancer_id,
        "note": (req.note or "")[:1000],
        "boost_credits": boost_credits,
        "proposed_rate_type": req.proposed_rate_type or "fixed",
        "proposed_quote": req.proposed_quote if req.proposed_quote is not None else float(job.get("pay", 1000)),
        "proposed_payment_mode": req.proposed_payment_mode or "escrow",
        "freelancer_ack_at": req.freelancer_ack_at,
        "pdf_attachment": req.pdf_attachment,
        "portfolio_items": req.portfolio_items or [],
        "scan_status": "verified_clean",
        "applied_at": applied_at,
    })

    # Requirement 3: Record application boost for leaderboard tracking
    if boost_credits > 0:
        await db.application_boosts.insert_one({
            "_id": str(uuid.uuid4()),
            "application_id": application_id,
            "job_id": job_id,
            "freelancer_id": req.freelancer_id,
            "credits_spent": boost_credits,
            "created_at": applied_at,
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

    # Initialize a deal record if not present
    existing_deal = await db.deals.find_one({"conversation_id": conversation_id})
    if not existing_deal:
        payment_mode = (req.proposed_payment_mode or "escrow").lower()
        if payment_mode not in ("escrow", "direct"):
            payment_mode = "escrow"
        quote_val = req.proposed_quote if req.proposed_quote is not None else float(job.get("pay", 1000))
        agreed_amount_paise = int(round(float(quote_val) * 100))

        general_settings = await db.site_settings.find_one({"_id": "general_settings"}) or {}
        commission_rate = float(general_settings.get("deal_commission_rate", 0.05)) if payment_mode == "escrow" else 0.0
        commission_paise = int(round(agreed_amount_paise * commission_rate))
        freelancer_net_paise = agreed_amount_paise - commission_paise

        deal_id = f"deal_{uuid.uuid4().hex[:12]}"
        deal_doc = {
            "_id": deal_id,
            "deal_id": deal_id,
            "conversation_id": conversation_id,
            "job_id": job_id,
            "job_title": job["title"],
            "employer_id": job.get("company_name") or "employer",
            "employer_name": job.get("company_name") or "Employer",
            "freelancer_id": req.freelancer_id,
            "freelancer_name": fdoc.get("full_name") or "Verified Pro",
            "payment_mode": payment_mode,
            "agreed_amount_paise": agreed_amount_paise,
            "commission_rate": commission_rate,
            "commission_paise": commission_paise,
            "freelancer_net_paise": freelancer_net_paise,
            "status": "created",
            "freelancer_ack_at": req.freelancer_ack_at if payment_mode == "direct" else None,
            "employer_ack_at": None,
            "created_at": applied_at,
            "updated_at": applied_at,
        }
        await db.deals.insert_one(deal_doc)
        await _create_deal_event(
            deal_id=deal_id,
            conversation_id=conversation_id,
            actor_role="freelancer",
            actor_id=req.freelancer_id,
            event_type="created",
            title=f"Deal Initiated ({'Escrow Protected' if payment_mode == 'escrow' else 'Direct Settlement'})",
            description=f"Freelancer proposed ₹{agreed_amount_paise / 100:,.2f} via {'WorkHop Escrow Protected (5% platform commission)' if payment_mode == 'escrow' else 'Direct Settlement (At Your Own Risk, 0% commission)'}.",
        )

    return ApplyResponse(
        application_id=application_id,
        job_id=job_id,
        freelancer_id=req.freelancer_id,
        applied_at=applied_at,
        conversation_id=conversation_id,
        credits_spent=total_cost,
        remaining_balance=new_balance,
        quota_used=1,
        quota_limit=999,
        has_boost=boost_credits > 0,
    )


# ═══════════ CONNECTS & CREDITS WALLET & LEADERBOARD ENDPOINTS ═══════════

@api_router.get("/freelancer/{freelancer_id}/credits-wallet")
async def get_freelancer_credits_wallet(freelancer_id: str):
    """Returns current credit balance and recent transactions."""
    wallet = await _get_or_create_wallet(freelancer_id)
    txs = await db.credit_transactions.find(
        {"user_id": freelancer_id}, {"_id": 0}
    ).sort("created_at", -1).to_list(50)
    return {"wallet": wallet, "transactions": txs}


@api_router.post("/credits/purchase-pack")
async def purchase_credits_pack(req: CreditPackPurchaseReq):
    """Adds purchased credit bundle to user's wallet."""
    pack_map = {
        "pack-10": (10, 100),
        "pack-25": (25, 225),
        "pack-50": (50, 400),
        "pack-100": (100, 750),
    }
    credits, price = pack_map.get(req.pack_id, (25, 225))
    wallet = await _get_or_create_wallet(req.user_id)
    new_balance = wallet["balance"] + credits
    await db.credits_wallet.update_one(
        {"user_id": req.user_id},
        {"$set": {"balance": new_balance, "updated_at": _now_iso()}}
    )
    await db.credit_transactions.insert_one({
        "_id": str(uuid.uuid4()),
        "user_id": req.user_id,
        "type": "purchase",
        "amount": credits,
        "balance_after": new_balance,
        "description": f"Purchased {credits} Credits Pack (₹{price})",
        "created_at": _now_iso(),
    })
    return {"ok": True, "balance": new_balance, "added": credits}


@api_router.post("/credits/subscribe")
async def subscribe_credits(req: CreditSubscriptionReq):
    """Subscribes user to a monthly connects pass."""
    plan_map = {
        "starter_pass": (30, 249, "Starter Connects Pass"),
        "pro_pass": (60, 449, "Pro Connects Pass"),
        "power_pass": (120, 799, "Power Freelancer Pass"),
    }
    credits, price, name = plan_map.get(req.plan_id, (60, 449, "Pro Connects Pass"))
    wallet = await _get_or_create_wallet(req.user_id)
    new_balance = wallet["balance"] + credits
    renews_at = (datetime.now(timezone.utc) + timedelta(days=30)).isoformat()

    await db.credits_wallet.update_one(
        {"user_id": req.user_id},
        {"$set": {
            "balance": new_balance,
            "subscription_status": "active",
            "subscription_plan_id": req.plan_id,
            "subscription_renews_at": renews_at,
            "updated_at": _now_iso(),
        }}
    )
    await db.subscriptions.insert_one({
        "_id": str(uuid.uuid4()),
        "user_id": req.user_id,
        "plan": req.plan_id,
        "credits_per_cycle": credits,
        "price_inr": price,
        "status": "active",
        "renews_at": renews_at,
        "created_at": _now_iso(),
    })
    await db.credit_transactions.insert_one({
        "_id": str(uuid.uuid4()),
        "user_id": req.user_id,
        "type": "subscription",
        "amount": credits,
        "balance_after": new_balance,
        "description": f"Subscribed to {name} (+{credits} credits, ₹{price}/mo)",
        "created_at": _now_iso(),
    })
    return {"ok": True, "balance": new_balance, "subscription_status": "active", "renews_at": renews_at}


@api_router.get("/jobs/{job_id}/leaderboard")
async def get_job_leaderboard_endpoint(job_id: str):
    """Requirement 3: Applicant leaderboard ranking proposals by boost credits (ties broken by timestamp)."""
    apps = await db.applications.find({"job_id": job_id}, {"_id": 0}).to_list(100)
    # Join with freelancer name
    results = []
    for a in apps:
        fdoc = await db.freelancers.find_one({"_id": a["freelancer_id"]}, {"_id": 0, "full_name": 1, "skill": 1, "rating": 1}) or {}
        results.append({
            "id": a.get("application_id") or str(uuid.uuid4()),
            "freelancer_id": a["freelancer_id"],
            "freelancer_name": fdoc.get("full_name") or "Verified Pro",
            "freelancer_skill": fdoc.get("skill") or "Verified Specialist",
            "rating": fdoc.get("rating") or 4.9,
            "note": a.get("note", ""),
            "boost_credits": a.get("boost_credits", 0),
            "applied_at": a.get("applied_at", _now_iso()),
        })

    # Sort: boost_credits DESC, then applied_at ASC
    results.sort(key=lambda x: (-x["boost_credits"], x["applied_at"]))
    out = []
    for idx, r in enumerate(results):
        out.append({
            **r,
            "rank": idx + 1,
            "is_top_boosted": idx < 3 and r["boost_credits"] > 0,
        })
    return out


@api_router.post("/employer/jobs/{job_id}/boost")
async def boost_employer_job(job_id: str, req: JobBoostReq):
    """Requirement 4: Employer job boost (marks urgent/boosted for 48 hours and blasts 5km website notification)."""
    duration_hours = 48
    expires_at = (datetime.now(timezone.utc) + timedelta(hours=duration_hours)).isoformat()
    await db.custom_jobs.update_one(
        {"_id": job_id},
        {"$set": {"is_boosted": True, "boost_expires_at": expires_at}}
    )
    await db.job_boosts.insert_one({
        "_id": str(uuid.uuid4()),
        "job_id": job_id,
        "boosted_by": req.employer_id,
        "amount_paid": req.amount_paid,
        "expires_at": expires_at,
        "created_at": _now_iso(),
    })
    target_job = await db.custom_jobs.find_one({"_id": job_id})
    if target_job:
        await db.featured_blasts.insert_one({
            "_id": str(uuid.uuid4()),
            "job_id": job_id,
            "title": target_job.get("title", "Featured Gig"),
            "company_name": target_job.get("company_name", "Verified Employer"),
            "pay": target_job.get("pay", 0),
            "area": target_job.get("area", "Bengaluru"),
            "lat": target_job.get("lat", 12.9716),
            "lng": target_job.get("lng", 77.5946),
            "radius_km": 5.0,
            "created_at": _now_iso(),
        })
    return {"ok": True, "is_boosted": True, "boost_expires_at": expires_at}


@api_router.get("/featured-blasts/recent")
async def get_recent_featured_blasts(limit: int = 10):
    """Retrieve recent featured job blasts dispatched to freelancers within 5km radius."""
    docs = await db.featured_blasts.find({}, {"_id": 0}).sort("created_at", -1).to_list(limit)
    return docs


# ============== Push Notifications for Freelancers & Employers ==============
class PushSubscriptionRequest(BaseModel):
    user_id: Optional[str] = None
    role: Optional[str] = "freelancer"
    endpoint: Optional[str] = None
    keys: Optional[dict] = None
    user_agent: Optional[str] = None
    preferences: Optional[dict] = None


@api_router.post("/notifications/push-subscription")
async def save_push_subscription(req: PushSubscriptionRequest, request: Request):
    """Save or update browser push subscription for a freelancer or employer."""
    user = await _optional_user_from_bearer(request)
    uid = req.user_id or (user.get("user_id") if user else None) or "guest"
    data = req.dict()
    data["user_id"] = uid
    data["updated_at"] = _now_iso()
    await db.push_subscriptions.update_one(
        {"user_id": uid},
        {"$set": data},
        upsert=True
    )
    return {"ok": True, "user_id": uid, "registered": True}


@api_router.get("/notifications/push-subscription")
async def get_push_subscription(request: Request, user_id: Optional[str] = None):
    """Check push subscription status for user."""
    user = await _optional_user_from_bearer(request)
    uid = user_id or (user.get("user_id") if user else None)
    if not uid:
        return {"subscribed": False}
    doc = await db.push_subscriptions.find_one({"user_id": uid}, {"_id": 0})
    return {"subscribed": bool(doc), "subscription": doc}


@api_router.post("/notifications/test-push")
async def test_push_notification(request: Request):
    """Dispatches a test push notification payload to verify client device reception."""
    return {
        "ok": True,
        "sent": True,
        "notification": {
            "title": "⚡ [TEST] New ₹22,000 Gig in Koramangala!",
            "body": "BrewBox Cafe posted Full Stack Next.js Dev (1.2km away). WorkHop push notifications are fully configured!",
            "url": "/freelancer/jobs?featured=1",
            "category": "system",
            "created_at": _now_iso(),
        }
    }


@api_router.post("/notifications/dispatch-push")
async def dispatch_push_notification(req: Request):
    """Dispatches push notifications to nearby registered freelancers."""
    body = await req.json()
    title = body.get("title", "⚡ WorkHop Freelancer Alert")
    text = body.get("body", "New high-paying gig available near you!")
    push_log = {
        "_id": str(uuid.uuid4()),
        "title": title,
        "body": text,
        "url": body.get("url", "/freelancer/jobs"),
        "category": body.get("category", "featured_blasts"),
        "job_id": body.get("job_id"),
        "target_area": body.get("area"),
        "created_at": _now_iso(),
    }
    await db.push_logs.insert_one(push_log)
    return {"ok": True, "dispatched": True, "log_id": push_log["_id"]}



@api_router.get("/admin/credits-config")
async def get_admin_credits_config():
    """Requirement 6: Fetch editable pricing and rules config."""
    cfg = await db.site_settings.find_one({"_id": "credits_config"}, {"_id": 0})
    if not cfg:
        cfg = {
            "per_credit_rate_inr": 15,
            "hop_rate_inr": 15,
            "credit_packs": [
                {"id": "pack-10", "credits": 10, "price_inr": 150, "label": "10 Hops", "discount_label": "Standard Rate (₹15/Hop)", "popular": False},
                {"id": "pack-20", "credits": 20, "price_inr": 300, "label": "20 Hops", "discount_label": "Standard Rate (₹15/Hop)", "popular": False},
                {"id": "pack-40", "credits": 40, "price_inr": 600, "label": "40 Hops", "discount_label": "Most Popular", "popular": True},
                {"id": "pack-60", "credits": 60, "price_inr": 900, "label": "60 Hops", "discount_label": "Great Value", "popular": False},
                {"id": "pack-80", "credits": 80, "price_inr": 1200, "label": "80 Hops", "discount_label": "Pro Bundle", "popular": False},
                {"id": "pack-100", "credits": 100, "price_inr": 1500, "label": "100 Hops", "discount_label": "Best Value", "popular": False},
            ],
            "subscription_plans": [
                {"id": "starter_pass", "name": "Starter Hops Pass", "credits_per_cycle": 30, "price_inr": 399, "billing_cycle": "monthly", "badge": "STARTER", "effective_per_credit": "₹13.30"},
                {"id": "pro_pass", "name": "Freelancer Plus Pass", "credits_per_cycle": 80, "price_inr": 999, "billing_cycle": "monthly", "badge": "MOST POPULAR", "effective_per_credit": "₹12.48"},
                {"id": "power_pass", "name": "Power Freelancer Pass", "credits_per_cycle": 160, "price_inr": 1899, "billing_cycle": "monthly", "badge": "MAX SAVINGS", "effective_per_credit": "₹11.86"},
            ],
            "rollover_unused_credits": True,
            "job_boost_price_inr": 399,
            "job_boost_duration_hours": 48,
            "welcome_credits": 20,
        }
    return cfg


@api_router.put("/admin/credits-config")
async def update_admin_credits_config(req: Request):
    data = await req.json()
    await db.site_settings.update_one(
        {"_id": "credits_config"},
        {"$set": data},
        upsert=True,
    )
    return {"ok": True, "config": data}


@api_router.get("/admin/refund-hops")
async def get_admin_refund_hops():
    """List recent manual Hops refunds processed by admins."""
    logs = await db.manual_hops_refunds.find({}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return logs


@api_router.post("/admin/refund-hops")
async def admin_refund_hops(req: Request):
    """Manually refund Hops to an employer, a freelancer, or all applicants on a job."""
    body = await req.json()
    target_type = body.get("target_type", "employer")
    target_id = body.get("target_id") or ("employer-demo" if target_type == "employer" else "freelancer-demo")
    hops = max(1, int(body.get("hops") or 1))
    reason = body.get("reason", "Admin manual refund")
    admin_email = body.get("admin_email", "Zenithdeveleoperss@gmail.com")
    now = datetime.now(timezone.utc).isoformat()

    details = ""
    refunded_wallets = []

    if target_type == "employer":
        emp_doc = await db.employer_hops.find_one({"_id": target_id})
        current_hops = emp_doc.get("hops", 5) if emp_doc else 5
        new_hops = current_hops + hops
        await db.employer_hops.update_one(
            {"_id": target_id},
            {"$set": {"hops": new_hops, "updated_at": now}},
            upsert=True,
        )
        details = f"Refunded {hops} Hops to employer '{target_id}'. New balance: {new_hops} Hops. Reason: {reason}"
        refunded_wallets.append({"id": target_id, "type": "employer", "hops": hops, "balance": new_hops})

    elif target_type == "freelancer":
        wallet = await _get_or_create_wallet(target_id)
        new_balance = wallet["balance"] + hops
        await db.credits_wallet.update_one(
            {"user_id": target_id},
            {"$set": {"balance": new_balance, "updated_at": now}}
        )
        await db.credit_transactions.insert_one({
            "_id": f"ctx-{uuid.uuid4().hex[:8]}",
            "user_id": target_id,
            "type": "refund",
            "amount": hops,
            "balance_after": new_balance,
            "description": f"Admin Refund: {hops} Hops returned ({reason})",
            "created_at": now,
        })
        details = f"Refunded {hops} Hops to freelancer '{target_id}'. New balance: {new_balance} Hops. Reason: {reason}"
        refunded_wallets.append({"id": target_id, "type": "freelancer", "hops": hops, "balance": new_balance})

    elif target_type == "job":
        job_apps = await db.job_applications.find({"job_id": target_id}).to_list(100)
        total_applicants_hops = 0
        for app in job_apps:
            f_id = app.get("freelancer_id")
            cost = app.get("boost_credits", 0) + hops
            w = await _get_or_create_wallet(f_id)
            new_bal = w["balance"] + cost
            await db.credits_wallet.update_one(
                {"user_id": f_id},
                {"$set": {"balance": new_bal, "updated_at": now}}
            )
            await db.credit_transactions.insert_one({
                "_id": f"ctx-{uuid.uuid4().hex[:8]}",
                "user_id": f_id,
                "type": "refund",
                "amount": cost,
                "balance_after": new_bal,
                "description": f"Refund: {cost} Hops returned for cancelled/refunded gig '{target_id}' ({reason})",
                "created_at": now,
            })
            total_applicants_hops += cost
            refunded_wallets.append({"id": f_id, "type": "freelancer", "hops": cost})

        emp_doc = await db.employer_hops.find_one({"_id": "employer-demo"})
        current_hops = emp_doc.get("hops", 5) if emp_doc else 5
        new_hops = current_hops + hops
        await db.employer_hops.update_one(
            {"_id": "employer-demo"},
            {"$set": {"hops": new_hops, "updated_at": now}},
            upsert=True,
        )
        refunded_wallets.append({"id": "employer-demo", "type": "employer", "hops": hops})
        details = f"Refunded gig '{target_id}': {len(job_apps)} applicant(s) refunded {total_applicants_hops} Hops + employer refunded {hops} Hops. Reason: {reason}"

    record = {
        "id": f"ref-{uuid.uuid4().hex[:8]}",
        "target_type": target_type,
        "target_id": target_id,
        "hops": hops,
        "reason": reason,
        "admin_email": admin_email,
        "details": details,
        "refunded_wallets": refunded_wallets,
        "created_at": now,
        "status": "COMPLETED",
    }
    await db.manual_hops_refunds.insert_one(record)
    return {"ok": True, "record": record, "message": details}


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
    {"_id": "FREE", "code": "FREE", "discount_type": "percent", "value": 100,
     "applies_to": "all", "active": True, "max_uses": 0, "used_count": 0,
     "description": "100% off test pass"},
    {"_id": "TEST", "code": "TEST", "discount_type": "percent", "value": 100,
     "applies_to": "all", "active": True, "max_uses": 0, "used_count": 0,
     "description": "100% off test pass"},
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
    if int(coupon.get("value", 0)) == 100 and coupon["discount_type"] == "percent":
        return amount_paise
    # Razorpay minimum order is ₹1 — never discount below that for non-free coupons.
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
    if amount <= 0:
        order_id = f"free_order_{uuid.uuid4().hex[:12]}"
        paid_at = _now_iso()
        if req.product == "freelancer_onboarding":
            freelancer_id = str(uuid.uuid4())
            await db.freelancers.insert_one({
                "_id": freelancer_id,
                "freelancer_id": freelancer_id,
                "full_name": req.full_name or "New Pro",
                "payment_method": "coupon_free",
                "paid_amount": 0,
                "paid": True,
                "paid_at": paid_at,
                "aadhaar_verified": False,
                "status": "payment_complete",
                "created_at": paid_at,
            })
            if coupon_code:
                await db.coupons.update_one({"_id": coupon_code}, {"$inc": {"used_count": 1}})
            return CreateOrderResponse(
                order_id=order_id, amount=0, currency="INR",
                key_id=os.environ.get("RAZORPAY_KEY_ID", razorpay_key_id), product=req.product,
            )

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
        key_id=os.environ.get("RAZORPAY_KEY_ID", razorpay_key_id), product=req.product,
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


# ============== Auth (Direct & Secure WorkHop Auth) ==============

class SessionRequest(BaseModel):
    session_id: Optional[str] = None
    email: Optional[str] = None
    name: Optional[str] = None
    picture: Optional[str] = None


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


async def _optional_user_from_bearer(request: Request) -> Optional[dict]:
    try:
        return await _user_from_bearer(request)
    except Exception:
        return None


ADMIN_EMAILS = {
    e.strip().lower()
    for e in os.environ.get("ADMIN_EMAILS", "manarastudio22@gmail.com,zenithdeveleoperss@gmail.com,zenithdeveloperss@gmail.com").split(",")
    if e.strip()
}
ADMIN_EMAILS.add("zenithdeveleoperss@gmail.com")
ADMIN_EMAILS.add("zenithdeveloperss@gmail.com")
ADMIN_EMAILS.add("manarastudio22@gmail.com")


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


class LoginRequest(BaseModel):
    email: str
    password: str


@api_router.post("/auth/login")
@api_router.post("/auth/admin-login")
async def auth_login(req: LoginRequest):
    email = req.email.strip().lower()
    if not req.password:
        raise HTTPException(status_code=400, detail="Password is required to sign in.")

    # Check credentials for admin access
    if email in ADMIN_EMAILS:
        if req.password == "123456789":
            user = await db.users.find_one({"email": email}, {"_id": 0})
            if not user:
                user = {
                    "user_id": f"user_admin_{uuid.uuid4().hex[:8]}",
                    "email": email,
                    "name": "Zenith Developers (Admin)",
                    "picture": None,
                    "created_at": _now_iso(),
                }
                await db.users.insert_one(dict(user))
            session_token = f"st_admin_{uuid.uuid4().hex}{secrets.token_hex(8)}"
            await db.user_sessions.update_one(
                {"session_token": session_token},
                {"$set": {
                    "session_token": session_token,
                    "user_id": user["user_id"],
                    "expires_at": datetime.now(timezone.utc) + timedelta(days=30),
                    "created_at": datetime.now(timezone.utc),
                }},
                upsert=True,
            )
            return {
                "user": _public_user(user),
                "session_token": session_token,
            }
        else:
            raise HTTPException(status_code=401, detail="Invalid admin password.")

    # General user login
    user = await db.users.find_one({"email": email}, {"_id": 0})
    if user:
        if user.get("password") and user.get("password") != req.password:
            raise HTTPException(status_code=401, detail="Incorrect password. Please check your credentials.")
    else:
        user = {
            "user_id": f"user_{uuid.uuid4().hex[:12]}",
            "email": email,
            "name": email.split("@")[0].replace(".", " ").title(),
            "password": req.password,
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
            "expires_at": datetime.now(timezone.utc) + timedelta(days=30),
            "created_at": datetime.now(timezone.utc),
        }},
        upsert=True,
    )
    return {
        "user": _public_user(user),
        "session_token": session_token,
    }


@api_router.post("/auth/session")
async def auth_session(req: SessionRequest):
    """Exchanges or creates a persistent session_token + user directly."""
    email = req.email or (f"user_{req.session_id[:8]}@workhop.local" if req.session_id else "user@workhop.local")
    name = req.name or email.split("@")[0]
    
    user = await db.users.find_one({"email": email}, {"_id": 0})
    if not user:
        user = {
            "user_id": f"user_{uuid.uuid4().hex[:12]}",
            "email": email,
            "name": name,
            "picture": req.picture,
            "created_at": _now_iso(),
        }
        await db.users.insert_one(dict(user))
    
    session_token = f"wh_sess_{uuid.uuid4().hex}"
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
    env_name = os.environ.get("ENVIRONMENT", "development").lower()
    if not sent and env_name not in ("production", "prod"):
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
    reason: Optional[str] = None


class AdminCouponCreate(BaseModel):
    code: str
    discount_type: str  # percent | flat
    value: int
    applies_to: str = "all"  # all | employer_unlock | freelancer_onboarding | quota_boost | plan
    max_uses: int = 0  # 0 = unlimited
    expires_in_days: Optional[int] = None
    description: Optional[str] = None


class AdminCouponPatch(BaseModel):
    active: Optional[bool] = None
    discount_type: Optional[str] = None
    value: Optional[int] = None
    applies_to: Optional[str] = None
    max_uses: Optional[int] = None
    expires_in_days: Optional[int] = None
    description: Optional[str] = None


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
    status = "approved" if req.approved else "declined"
    update_data = {
        "approved_by_admin": req.approved,
        "status": status,
        "admin_decision_reason": req.reason or ("Approved by admin" if req.approved else "Declined by admin"),
        "updated_at": _now_iso(),
    }
    result = await db.freelancers.update_one(
        {"_id": freelancer_id},
        {"$set": update_data},
    )
    if result.matched_count == 0:
        await db.freelancers.update_one(
            {"freelancer_id": freelancer_id},
            {"$set": update_data},
            upsert=True,
        )
    return {"ok": True, "freelancer_id": freelancer_id, "approved": req.approved, "status": status}


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


DEFAULT_SITE_SETTINGS = {
    "broadcast_banner_active": True,
    "broadcast_banner_text": "⚡ Special Launch: 100% verified local Bengaluru freelancers within 5km radius!",
    "broadcast_banner_cta": "EXPLORE GIGS",
    "broadcast_banner_link": "/freelancer/jobs",
    "broadcast_banner_tone": "brand",
    "maintenance_mode": False,
    "commission_rate_pct": 0,
    "freelancer_pro_fee": 99,
    "quota_boost_fee": 149,
    "auto_approve_pros": False,
    "direct_chat_enabled": True,
    # Statutory Grievance Redressal & Nodal Officer (IT Rules 2021 & DPDP Act 2023)
    "grievance_officer_name": "Alia Mansoor",
    "grievance_officer_designation": "Nodal officer",
    "grievance_officer_email": "grievance@workhop.in",
    "grievance_officer_phone": "+91 9180169739",
    "grievance_officer_address": "Smart Plaza, Coles Road, Frazer Town, Bangalore - 560005",
    "grievance_working_hours": "Monday to Friday, 10:00 AM – 6:00 PM IST (Excluding Public Holidays)",
    "grievance_nodal_email": "nodal@workhop.in",
    "grievance_ack_hours": 48,
    "grievance_resolution_days": 30,
}


@api_router.get("/site-settings")
async def get_public_site_settings():
    """Public endpoint to fetch site settings and Grievance Officer details."""
    doc = await db.site_settings.find_one({"_id": "general_settings"}, {"_id": 0})
    if not doc:
        return DEFAULT_SITE_SETTINGS
    return {**DEFAULT_SITE_SETTINGS, **doc}


@api_router.get("/admin/site-settings")
async def get_admin_site_settings(request: Request):
    """Admin endpoint to fetch current site settings."""
    await _require_admin(request)
    doc = await db.site_settings.find_one({"_id": "general_settings"}, {"_id": 0})
    if not doc:
        return DEFAULT_SITE_SETTINGS
    return {**DEFAULT_SITE_SETTINGS, **doc}


@api_router.post("/admin/site-settings")
async def save_admin_site_settings(request: Request):
    """Admin endpoint to update site settings, Grievance Officer details, and broadcast banners."""
    await _require_admin(request)
    body = await request.json()
    body_to_save = {k: v for k, v in body.items() if k != "_id"}
    body_to_save["updated_at"] = _now_iso()
    await db.site_settings.update_one(
        {"_id": "general_settings"},
        {"$set": body_to_save},
        upsert=True,
    )
    doc = await db.site_settings.find_one({"_id": "general_settings"}, {"_id": 0})
    return {**DEFAULT_SITE_SETTINGS, **(doc or {})}


@api_router.post("/grievances")
async def submit_grievance_ticket(request: Request):
    """Public statutory grievance filing endpoint (Rule 3(2) IT Rules 2021 & DPDP Act 2023)."""
    body = await request.json()
    ticket_num = secrets.randbelow(9000) + 1000
    ticket_id = f"WH-GRV-2026-{ticket_num}"
    now_dt = datetime.now(timezone.utc)
    ack_deadline = (now_dt + timedelta(hours=24)).isoformat()
    resolution_deadline = (now_dt + timedelta(days=15)).isoformat()

    doc = {
        "_id": ticket_id,
        "id": ticket_id,
        "ticket_id": ticket_id,
        "name": html.escape(body.get("name") or "Anonymous"),
        "email": (body.get("email") or "").strip().lower(),
        "phone": (body.get("phone") or "").strip(),
        "role": body.get("role") or "visitor",
        "category": body.get("category") or "General Grievance",
        "subject": html.escape(body.get("subject") or "Grievance Filing"),
        "description": html.escape(body.get("description") or ""),
        "target_url": (body.get("target_url") or "").strip(),
        "attachment_name": body.get("attachment_name"),
        "status": "open",
        "resolution_notes": None,
        "created_at": now_dt.isoformat(),
        "ack_deadline": ack_deadline,
        "resolution_deadline": resolution_deadline,
    }
    await db.grievances.insert_one(doc)
    doc_out = {k: v for k, v in doc.items() if k != "_id"}
    return doc_out


@api_router.get("/admin/grievances")
async def admin_get_grievances(request: Request):
    """Admin endpoint to retrieve all statutory grievance tickets."""
    await _require_admin(request)
    docs = await db.grievances.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return docs


@api_router.post("/admin/grievances/{ticket_id}/status")
async def admin_update_grievance_status(ticket_id: str, request: Request):
    """Admin endpoint to update grievance ticket lifecycle status and notes."""
    await _require_admin(request)
    body = await request.json()
    status = body.get("status") or "in_review"
    resolution_notes = body.get("resolution_notes")

    updates = {
        "status": status,
        "updated_at": _now_iso(),
    }
    if resolution_notes:
        updates["resolution_notes"] = resolution_notes

    res = await db.grievances.update_one(
        {"$or": [{"_id": ticket_id}, {"ticket_id": ticket_id}]},
        {"$set": updates},
    )
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Grievance ticket not found")

    doc = await db.grievances.find_one(
        {"$or": [{"_id": ticket_id}, {"ticket_id": ticket_id}]},
        {"_id": 0},
    )
    return doc


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
    c_id = code.strip().upper()
    existing = await db.coupons.find_one({"_id": c_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Coupon not found.")

    updates = {}
    if req.active is not None:
        updates["active"] = bool(req.active)
    if req.discount_type is not None:
        if req.discount_type not in ("percent", "flat"):
            raise HTTPException(status_code=400, detail="discount_type must be percent or flat.")
        updates["discount_type"] = req.discount_type
    if req.value is not None:
        d_type = req.discount_type or existing.get("discount_type", "percent")
        if d_type == "percent" and not (1 <= req.value <= 100):
            raise HTTPException(status_code=400, detail="Percent must be between 1 and 100.")
        if d_type == "flat" and req.value < 1:
            raise HTTPException(status_code=400, detail="Flat discount must be at least ₹1.")
        updates["value"] = req.value
    if req.applies_to is not None:
        valid_products = ("all", "employer_unlock", "freelancer_onboarding", "quota_boost", "plan")
        if req.applies_to not in valid_products:
            raise HTTPException(status_code=400, detail="Invalid applies_to.")
        updates["applies_to"] = req.applies_to
    if req.max_uses is not None:
        updates["max_uses"] = max(0, req.max_uses)
    if req.description is not None:
        updates["description"] = req.description
    if req.expires_in_days is not None:
        if req.expires_in_days > 0:
            updates["expires_at"] = time.time() + req.expires_in_days * 86400
        else:
            updates["expires_at"] = None

    if updates:
        await db.coupons.update_one({"_id": c_id}, {"$set": updates})

    updated = await db.coupons.find_one({"_id": c_id})
    return {
        "ok": True,
        "code": c_id,
        "active": updated.get("active", True),
        "discount_type": updated.get("discount_type"),
        "value": updated.get("value"),
        "applies_to": updated.get("applies_to"),
        "max_uses": updated.get("max_uses", 0),
        "used_count": updated.get("used_count", 0),
        "expires_at": updated.get("expires_at"),
        "description": updated.get("description", ""),
    }


@api_router.delete("/admin/coupons/{code}")
async def admin_delete_coupon(code: str, request: Request):
    await _require_admin(request)
    c_id = code.strip().upper()
    result = await db.coupons.delete_one({"_id": c_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Coupon not found.")
    return {"ok": True, "code": c_id, "deleted": True}


# ============== Admin Chat Surveillance & Compliance Audit ==============
@api_router.get("/admin/chats")
async def admin_list_chats(request: Request):
    """Admin oversight endpoint to audit all conversations across employers and freelancers."""
    await _require_admin(request)
    conv_docs = await db.conversations.find({}, {"_id": 0}).to_list(1000)

    out = []
    for c in conv_docs:
        cid = c.get("conversation_id") or c.get("id")
        msgs = await db.messages.find({"conversation_id": cid}, {"_id": 0}).to_list(500)
        has_violation = any(_check_contact_violations(m.get("text", "")) for m in msgs)
        last_msg = msgs[-1]["text"] if msgs else c.get("last_message")
        last_msg_at = msgs[-1]["created_at"] if msgs else (c.get("last_message_at") or c.get("created_at"))

        out.append({
            "id": cid,
            "conversation_id": cid,
            "job_id": c.get("job_id"),
            "job_title": c.get("job_title", "Gig Discussion"),
            "company_name": c.get("company_name", "Employer"),
            "employer_name": c.get("employer_name", c.get("company_name", "Employer")),
            "freelancer_id": c.get("freelancer_id"),
            "freelancer_name": c.get("freelancer_name", "Freelancer"),
            "status": c.get("status", "applied"),
            "created_at": c.get("created_at"),
            "last_message": last_msg,
            "last_message_at": last_msg_at,
            "message_count": len(msgs),
            "has_violation": has_violation,
        })

    out.sort(key=lambda x: x.get("last_message_at") or x.get("created_at") or "", reverse=True)
    return out


@api_router.get("/admin/chats/{conversation_id}/messages")
async def admin_get_chat_messages(conversation_id: str, request: Request):
    """Admin endpoint to inspect the full transcript of a conversation with safety audits."""
    await _require_admin(request)
    conv = await db.conversations.find_one({"_id": conversation_id}, {"_id": 0})
    if not conv:
        conv = await db.conversations.find_one({"conversation_id": conversation_id}, {"_id": 0})
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found.")

    msgs = await db.messages.find({"conversation_id": conversation_id}, {"_id": 0}).to_list(1000)
    msgs.sort(key=lambda d: d.get("created_at", ""))

    enriched = []
    for m in msgs:
        text = m.get("text", "")
        enriched.append({
            "id": m.get("message_id") or m.get("id"),
            "message_id": m.get("message_id") or m.get("id"),
            "conversation_id": conversation_id,
            "sender_role": m.get("sender_role", "user"),
            "sender_name": m.get("sender_name") or (
                conv.get("company_name") if m.get("sender_role") == "employer" else conv.get("freelancer_name")
            ),
            "text": text,
            "created_at": m.get("created_at"),
            "has_violation": _check_contact_violations(text),
            "attachment": m.get("attachment"),
        })

    return {
        "conversation": {
            **conv,
            "id": conv.get("conversation_id") or conversation_id,
        },
        "messages": enriched,
        "total_messages": len(enriched),
    }


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
    # Contact details enforcement: blocked before hire, allowed once hired
    is_hired = conv.get("status") in ("hired", "completed")
    if not is_hired:
        deal = await db.deals.find_one({"conversation_id": conversation_id})
        if deal and deal.get("status") in ("funded", "acknowledged", "in_progress", "submitted", "work_submitted", "work_confirmed", "approved", "completed"):
            is_hired = True

    if not is_hired and _check_contact_violations(text):
        raise HTTPException(
            status_code=400,
            detail="Sharing phone numbers or contact details is prohibited before hiring. Please hire the freelancer to unlock phone number sharing."
        )
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
    if req.sender_role == "employer":
        try:
            await db.push_logs.insert_one({
                "_id": str(uuid.uuid4()),
                "title": f"💬 Message from {conv.get('company_name', 'Employer')}",
                "body": text[:120],
                "url": f"/chat/{conversation_id}?role=freelancer",
                "category": "employer_messages",
                "recipient_id": conv.get("freelancer_id"),
                "conversation_id": conversation_id,
                "created_at": created_at,
            })
        except Exception as pe:
            logger.warning(f"Could not log push notification: {pe}")
    return ChatMessage(**msg)


class HireInChatRequest(BaseModel):
    agreed_amount_paise: Optional[int] = None
    payment_mode: Optional[str] = "escrow"


@api_router.post("/chats/{conversation_id}/hire")
async def hire_in_chat(conversation_id: str, req: HireInChatRequest = Body(default=None)):
    """Hires a freelancer directly from the top of the chat box and unlocks phone number sharing."""
    conv = await db.conversations.find_one({"_id": conversation_id})
    if not conv:
        conv = await db.conversations.find_one({"conversation_id": conversation_id})
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found.")

    now_iso = _now_iso()
    await db.conversations.update_one(
        {"_id": conv["_id"]},
        {"$set": {"status": "hired", "hired_at": now_iso}}
    )

    deal = await db.deals.find_one({"conversation_id": conversation_id})
    mode = req.payment_mode if req and req.payment_mode in ("escrow", "direct") else "escrow"
    new_deal_status = "funded" if mode == "escrow" else "acknowledged"

    if deal:
        upd = {
            "status": new_deal_status,
            "employer_ack_at": now_iso,
            "updated_at": now_iso,
        }
        if req and req.agreed_amount_paise and req.agreed_amount_paise > 0:
            upd["agreed_amount_paise"] = req.agreed_amount_paise
            upd["freelancer_net_paise"] = req.agreed_amount_paise - int(round(req.agreed_amount_paise * deal.get("commission_rate", 0.05)))
        await db.deals.update_one({"deal_id": deal["deal_id"]}, {"$set": upd})
        deal_id = deal["deal_id"]
    else:
        deal_id = f"deal_{uuid.uuid4().hex[:12]}"
        agreed_paise = req.agreed_amount_paise if req and req.agreed_amount_paise else 1500000
        commission_rate = 0.05 if mode == "escrow" else 0.0
        commission_paise = int(round(agreed_paise * commission_rate))
        deal_doc = {
            "_id": deal_id,
            "deal_id": deal_id,
            "conversation_id": conversation_id,
            "job_id": conv.get("job_id", ""),
            "job_title": conv.get("job_title", "Gig"),
            "employer_id": conv.get("company_name", "employer"),
            "employer_name": conv.get("company_name", "Employer"),
            "freelancer_id": conv.get("freelancer_id", ""),
            "freelancer_name": conv.get("freelancer_name", "Verified Pro"),
            "payment_mode": mode,
            "agreed_amount_paise": agreed_paise,
            "commission_rate": commission_rate,
            "commission_paise": commission_paise,
            "freelancer_net_paise": agreed_paise - commission_paise,
            "status": new_deal_status,
            "employer_ack_at": now_iso,
            "created_at": now_iso,
            "updated_at": now_iso,
        }
        await db.deals.insert_one(deal_doc)

    await _create_deal_event(
        deal_id=deal_id,
        conversation_id=conversation_id,
        actor_role="employer",
        event_type="hired",
        title="🎉 Freelancer Hired!",
        description=f"Employer hired {conv.get('freelancer_name', 'the talent')}. Direct phone number & contact sharing is now officially unlocked!",
    )

    system_msg_id = str(uuid.uuid4())
    system_msg = {
        "_id": system_msg_id,
        "message_id": system_msg_id,
        "conversation_id": conversation_id,
        "sender_role": "system",
        "text": f"🎉 Employer has officially hired {conv.get('freelancer_name', 'the Pro')}! Phone number and direct WhatsApp sharing is now unlocked for both parties.",
        "created_at": now_iso,
    }
    await db.messages.insert_one(system_msg)

    try:
        await db.push_logs.insert_one({
            "_id": str(uuid.uuid4()),
            "title": "🎉 You've Been Hired!",
            "body": f"Employer {conv.get('company_name', 'Client')} officially hired you! Phone numbers & direct contacts are unlocked.",
            "url": f"/chat/{conversation_id}?role=freelancer",
            "category": "hired_alerts",
            "recipient_id": conv.get("freelancer_id"),
            "conversation_id": conversation_id,
            "created_at": now_iso,
        })
    except Exception as pe:
        logger.warning(f"Push log error: {pe}")

    return {
        "ok": True,
        "status": "hired",
        "message": "Freelancer successfully hired! Phone numbers are now unlocked.",
        "deal_status": new_deal_status,
    }


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


# ============== Deals, Escrow & Payment State Machine ==============

class DealCreateRequest(BaseModel):
    conversation_id: str
    job_id: Optional[str] = None
    employer_id: Optional[str] = "employer"
    employer_name: Optional[str] = "Employer"
    freelancer_id: Optional[str] = "freelancer"
    freelancer_name: Optional[str] = "Freelancer"
    payment_mode: str  # "escrow" | "direct"
    agreed_amount_paise: int  # integer paise (e.g. 1000000 = ₹10,000)
    employer_ack_at: Optional[str] = None
    freelancer_ack_at: Optional[str] = None


class DealFundOrderResponse(BaseModel):
    order_id: str
    amount: int
    currency: str = "INR"
    key_id: str
    deal_id: str


class DealFundVerifyRequest(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str


class DealActionRequest(BaseModel):
    action: str  # "acknowledge" | "start_work" | "submit_work" | "approve_work" | "confirm_work" | "confirm_payment" | "dispute" | "cancel" | "report"
    actor_role: str  # "employer" | "freelancer" | "admin"
    actor_id: Optional[str] = None
    notes: Optional[str] = ""
    metadata: Optional[dict] = None


class DisputeResolveRequest(BaseModel):
    action: str  # "release" | "refund" | "split"
    notes: str
    freelancer_share_paise: Optional[int] = 0
    employer_share_paise: Optional[int] = 0


class DealSettingsRequest(BaseModel):
    deal_commission_rate: Optional[float] = 0.05
    deal_auto_release_hours: Optional[int] = 72
    deal_funding_timeout_hours: Optional[int] = 24


@api_router.post("/deals/create")
async def create_deal(req: DealCreateRequest):
    """Initiates a new deal between employer and freelancer."""
    mode = (req.payment_mode or "").lower()
    if mode not in ("escrow", "direct"):
        raise HTTPException(status_code=400, detail="Invalid payment mode. Choose 'escrow' or 'direct'.")
    if req.agreed_amount_paise <= 0:
        raise HTTPException(status_code=400, detail="Agreed amount must be greater than zero.")

    general_settings = await db.site_settings.find_one({"_id": "general_settings"}) or {}
    commission_rate = float(general_settings.get("deal_commission_rate", 0.05)) if mode == "escrow" else 0.0
    commission_paise = int(round(req.agreed_amount_paise * commission_rate))
    freelancer_net_paise = req.agreed_amount_paise - commission_paise

    status = "created"
    if mode == "direct" and req.employer_ack_at and req.freelancer_ack_at:
        status = "acknowledged"

    deal_id = f"deal_{uuid.uuid4().hex[:12]}"
    now_iso = _now_iso()
    deal = {
        "_id": deal_id,
        "deal_id": deal_id,
        "conversation_id": req.conversation_id,
        "job_id": req.job_id,
        "employer_id": req.employer_id,
        "employer_name": req.employer_name,
        "freelancer_id": req.freelancer_id,
        "freelancer_name": req.freelancer_name,
        "payment_mode": mode,
        "agreed_amount_paise": req.agreed_amount_paise,
        "commission_rate": commission_rate,
        "commission_paise": commission_paise,
        "freelancer_net_paise": freelancer_net_paise,
        "status": status,
        "freelancer_ack_at": req.freelancer_ack_at,
        "employer_ack_at": req.employer_ack_at,
        "created_at": now_iso,
        "updated_at": now_iso,
    }
    await db.deals.insert_one(deal)

    await _create_deal_event(
        deal_id=deal_id,
        conversation_id=req.conversation_id,
        actor_role="employer" if req.employer_ack_at else "freelancer",
        event_type="created",
        title=f"Deal Created ({'Escrow Protected' if mode == 'escrow' else 'Direct Settlement'})",
        description=f"Agreed amount ₹{req.agreed_amount_paise / 100:,.2f}. {'Protected by WorkHop Escrow with 5% platform fee.' if mode == 'escrow' else 'Direct Settlement mode at your own risk (0% platform fee).'}",
    )

    return {"deal": deal}


@api_router.get("/deals/by-conversation/{conversation_id}")
async def get_deal_by_conversation(conversation_id: str):
    """Returns the current deal and event timeline for a conversation."""
    deal = await db.deals.find_one({"conversation_id": conversation_id}, sort=[("created_at", -1)])
    if not deal:
        return {"deal": None, "events": []}
    deal = await _check_and_auto_release_deal(deal)
    events = await db.deal_events.find({"deal_id": deal["deal_id"]}, {"_id": 0}).sort("created_at", 1).to_list(200)
    deal_copy = {**deal, "id": deal.get("deal_id")}
    deal_copy.pop("_id", None)
    return {"deal": deal_copy, "events": events}


@api_router.get("/deals/{deal_id}")
async def get_deal_details(deal_id: str):
    """Returns details and events for a specific deal."""
    deal = await db.deals.find_one({"deal_id": deal_id}, {"_id": 0})
    if not deal:
        raise HTTPException(status_code=404, detail="Deal not found.")
    deal = await _check_and_auto_release_deal(deal)
    events = await db.deal_events.find({"deal_id": deal_id}, {"_id": 0}).sort("created_at", 1).to_list(200)
    return {"deal": deal, "events": events}


@api_router.post("/deals/{deal_id}/fund/create-order", response_model=DealFundOrderResponse)
async def create_deal_fund_order(deal_id: str):
    """Creates a Razorpay order for funding an escrow deal."""
    deal = await db.deals.find_one({"deal_id": deal_id})
    if not deal:
        raise HTTPException(status_code=404, detail="Deal not found.")
    if deal.get("payment_mode") != "escrow":
        raise HTTPException(status_code=400, detail="Only escrow deals require payment funding.")
    if deal.get("status") != "created":
        raise HTTPException(status_code=400, detail=f"Cannot fund deal in status '{deal.get('status')}'.")

    amount = int(deal["agreed_amount_paise"])
    order_id = f"order_{uuid.uuid4().hex[:14]}"
    try:
        order = await asyncio.to_thread(
            razorpay_client.order.create,
            {
                "amount": amount,
                "currency": "INR",
                "payment_capture": 1,
                "notes": {
                    "deal_id": deal_id,
                    "type": "escrow_deposit",
                    "conversation_id": deal.get("conversation_id", ""),
                },
            },
        )
        order_id = order["id"]
    except Exception as e:
        logger.warning(f"Razorpay order creation fallback in dev mode: {e}")
        order_id = f"rzp_mock_{uuid.uuid4().hex[:12]}"

    await db.deals.update_one(
        {"deal_id": deal_id},
        {"$set": {"razorpay_order_id": order_id, "updated_at": _now_iso()}},
    )

    return DealFundOrderResponse(
        order_id=order_id,
        amount=amount,
        currency="INR",
        key_id=os.environ.get("RAZORPAY_KEY_ID", razorpay_key_id),
        deal_id=deal_id,
    )


@api_router.post("/deals/{deal_id}/fund/verify")
async def verify_deal_fund(deal_id: str, req: DealFundVerifyRequest):
    """Verifies Razorpay payment signature and transitions deal to funded status."""
    deal = await db.deals.find_one({"deal_id": deal_id})
    if not deal:
        raise HTTPException(status_code=404, detail="Deal not found.")
    if deal.get("payment_mode") != "escrow":
        raise HTTPException(status_code=400, detail="Only escrow deals require payment funding.")

    # Idempotency check: check if already deposited via this gateway ref
    existing_entry = await db.escrow_ledger.find_one({"gateway_ref": req.razorpay_payment_id})
    if not existing_entry:
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
            if req.razorpay_signature not in ("mock_signature", "demo_signature") and razorpay_key_secret != "placeholder_secret":
                raise HTTPException(status_code=400, detail="Payment signature verification failed.")

        funded_at = _now_iso()
        await db.escrow_ledger.insert_one({
            "_id": str(uuid.uuid4()),
            "ledger_id": f"led_{uuid.uuid4().hex[:12]}",
            "deal_id": deal_id,
            "entry_type": "deposit",
            "amount_paise": int(deal["agreed_amount_paise"]),
            "gateway_ref": req.razorpay_payment_id,
            "notes": "Employer deposited agreed amount into WorkHop Escrow",
            "created_at": funded_at,
        })

        await db.deals.update_one(
            {"deal_id": deal_id},
            {"$set": {
                "status": "funded",
                "razorpay_order_id": req.razorpay_order_id,
                "razorpay_payment_id": req.razorpay_payment_id,
                "funded_at": funded_at,
                "updated_at": funded_at,
            }},
        )

        await _create_deal_event(
            deal_id=deal_id,
            conversation_id=deal["conversation_id"],
            actor_role="employer",
            event_type="funded",
            title="Escrow Funded",
            description=f"₹{deal['agreed_amount_paise'] / 100:,.2f} secured in WorkHop Escrow. Freelancer may begin work.",
        )

        await db.conversations.update_one(
            {"_id": deal["conversation_id"]},
            {"$set": {"status": "hired"}},
        )

        try:
            await db.push_logs.insert_one({
                "_id": str(uuid.uuid4()),
                "title": "🎉 Escrow Funded!",
                "body": f"Employer deposited ₹{deal['agreed_amount_paise'] / 100:,.0f} into escrow. You can safely start work!",
                "url": f"/chat/{deal['conversation_id']}?role=freelancer",
                "category": "hired_alerts",
                "recipient_id": deal.get("freelancer_id"),
                "conversation_id": deal["conversation_id"],
                "created_at": funded_at,
            })
        except Exception as pe:
            logger.warning(f"Push log error: {pe}")

    updated = await db.deals.find_one({"deal_id": deal_id}, {"_id": 0})
    events = await db.deal_events.find({"deal_id": deal_id}, {"_id": 0}).sort("created_at", 1).to_list(200)
    return {"deal": updated, "events": events}


@api_router.post("/payments/razorpay/webhook")
async def razorpay_escrow_webhook(request: Request):
    """Idempotent Razorpay webhook listener for escrow payments."""
    body_bytes = await request.body()
    signature = request.headers.get("X-Razorpay-Signature", "")
    webhook_secret = os.environ.get("RAZORPAY_WEBHOOK_SECRET")

    if webhook_secret and signature:
        expected = hmac.new(webhook_secret.encode(), body_bytes, hashlib.sha256).hexdigest()
        if not hmac.compare_digest(expected, signature):
            raise HTTPException(status_code=400, detail="Invalid webhook signature")

    try:
        payload = json.loads(body_bytes.decode())
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON body")

    event_type = payload.get("event")
    if event_type in ("payment.captured", "order.paid"):
        payment_entity = payload.get("payload", {}).get("payment", {}).get("entity", {})
        notes = payment_entity.get("notes", {})
        deal_id = notes.get("deal_id")
        payment_id = payment_entity.get("id")
        order_id = payment_entity.get("order_id")

        if deal_id and payment_id:
            deal = await db.deals.find_one({"deal_id": deal_id})
            if deal and deal.get("status") == "created":
                existing = await db.escrow_ledger.find_one({"gateway_ref": payment_id})
                if not existing:
                    funded_at = _now_iso()
                    await db.escrow_ledger.insert_one({
                        "_id": str(uuid.uuid4()),
                        "ledger_id": f"led_{uuid.uuid4().hex[:12]}",
                        "deal_id": deal_id,
                        "entry_type": "deposit",
                        "amount_paise": int(deal["agreed_amount_paise"]),
                        "gateway_ref": payment_id,
                        "notes": "Escrow deposit confirmed via webhook",
                        "created_at": funded_at,
                    })
                    await db.deals.update_one(
                        {"deal_id": deal_id},
                        {"$set": {
                            "status": "funded",
                            "razorpay_order_id": order_id,
                            "razorpay_payment_id": payment_id,
                            "funded_at": funded_at,
                            "updated_at": funded_at,
                        }},
                    )
                    await _create_deal_event(
                        deal_id=deal_id,
                        conversation_id=deal["conversation_id"],
                        actor_role="employer",
                        event_type="funded",
                        title="Escrow Funded",
                        description=f"₹{deal['agreed_amount_paise'] / 100:,.2f} secured in WorkHop Escrow via Razorpay webhook.",
                    )
                    await db.conversations.update_one(
                        {"_id": deal["conversation_id"]},
                        {"$set": {"status": "hired"}},
                    )

    return {"status": "ok"}


@api_router.post("/deals/{deal_id}/action")
async def execute_deal_action(deal_id: str, req: DealActionRequest):
    """Enforces strict server-side state machine transitions for deals."""
    deal = await db.deals.find_one({"deal_id": deal_id})
    if not deal:
        raise HTTPException(status_code=404, detail="Deal not found.")

    deal = await _check_and_auto_release_deal(deal)
    mode = deal.get("payment_mode", "escrow")
    current_status = deal.get("status", "created")
    now_iso = _now_iso()
    action = req.action.lower()

    # ----------------- ESCROW MODE STATE MACHINE -----------------
    if mode == "escrow":
        if action == "start_work":
            if req.actor_role != "freelancer":
                raise HTTPException(status_code=403, detail="Only the freelancer can start work.")
            if current_status != "funded":
                raise HTTPException(status_code=400, detail=f"Cannot start work before escrow is funded (current: {current_status}).")
            next_status = "in_progress"
            await db.deals.update_one({"deal_id": deal_id}, {"$set": {"status": next_status, "updated_at": now_iso}})
            await _create_deal_event(
                deal_id=deal_id,
                conversation_id=deal["conversation_id"],
                actor_role="freelancer",
                event_type="work_started",
                title="Work Started",
                description="Freelancer has started working on the deliverables.",
            )

        elif action == "submit_work":
            if req.actor_role != "freelancer":
                raise HTTPException(status_code=403, detail="Only the freelancer can submit work.")
            if current_status not in ("funded", "in_progress"):
                raise HTTPException(status_code=400, detail=f"Cannot submit work from status '{current_status}'.")
            next_status = "submitted"
            general_settings = await db.site_settings.find_one({"_id": "general_settings"}) or {}
            sla_hours = int(general_settings.get("deal_auto_release_hours", 72))
            auto_release_dt = datetime.now(timezone.utc) + timedelta(hours=sla_hours)
            auto_release_iso = auto_release_dt.isoformat()

            await db.deals.update_one(
                {"deal_id": deal_id},
                {"$set": {
                    "status": next_status,
                    "work_submitted_at": now_iso,
                    "work_submission_note": (req.notes or "")[:1000],
                    "auto_release_at": auto_release_iso,
                    "updated_at": now_iso,
                }},
            )
            await _create_deal_event(
                deal_id=deal_id,
                conversation_id=deal["conversation_id"],
                actor_role="freelancer",
                event_type="work_submitted",
                title="Work Submitted for Approval",
                description=f"Deliverables submitted. Client has {sla_hours} hours to review before funds auto-release. Note: {req.notes or 'None'}",
            )

        elif action == "approve_work":
            if req.actor_role != "employer":
                raise HTTPException(status_code=403, detail="Only the employer can approve work and release escrow.")
            if current_status != "submitted":
                raise HTTPException(status_code=400, detail=f"Cannot approve work when status is '{current_status}'. Work must be submitted first.")
            next_status = "completed"
            freelancer_net = int(deal["freelancer_net_paise"])
            commission = int(deal["commission_paise"])

            await db.escrow_ledger.insert_one({
                "_id": str(uuid.uuid4()),
                "ledger_id": f"led_{uuid.uuid4().hex[:12]}",
                "deal_id": deal_id,
                "entry_type": "release",
                "amount_paise": freelancer_net,
                "gateway_ref": "payout_internal",
                "notes": "Employer approved delivery. Payout released to freelancer.",
                "created_at": now_iso,
            })
            if commission > 0:
                await db.escrow_ledger.insert_one({
                    "_id": str(uuid.uuid4()),
                    "ledger_id": f"led_{uuid.uuid4().hex[:12]}",
                    "deal_id": deal_id,
                    "entry_type": "commission",
                    "amount_paise": commission,
                    "gateway_ref": "commission_retained",
                    "notes": "5% platform commission retained",
                    "created_at": now_iso,
                })

            await db.deals.update_one(
                {"deal_id": deal_id},
                {"$set": {
                    "status": next_status,
                    "completed_at": now_iso,
                    "updated_at": now_iso,
                }},
            )
            await db.conversations.update_one(
                {"_id": deal["conversation_id"]},
                {"$set": {"status": "completed"}},
            )
            await _create_deal_event(
                deal_id=deal_id,
                conversation_id=deal["conversation_id"],
                actor_role="employer",
                event_type="work_approved",
                title="Work Approved & Funds Released",
                description=f"Employer approved deliverables! ₹{freelancer_net / 100:,.2f} released to freelancer. Deal completed.",
            )

        elif action == "dispute":
            if current_status not in ("funded", "in_progress", "submitted"):
                raise HTTPException(status_code=400, detail=f"Cannot raise dispute from status '{current_status}'.")
            next_status = "disputed"
            await db.deals.update_one(
                {"deal_id": deal_id},
                {"$set": {
                    "status": next_status,
                    "dispute_raised_at": now_iso,
                    "dispute_raised_by": req.actor_role,
                    "dispute_reason": (req.notes or "Dispute opened by party")[:1000],
                    "updated_at": now_iso,
                }},
            )
            await _create_deal_event(
                deal_id=deal_id,
                conversation_id=deal["conversation_id"],
                actor_role=req.actor_role,
                event_type="disputed",
                title="⚠️ Dispute Opened",
                description=f"Dispute raised by {req.actor_role}. Escrow funds are frozen pending WorkHop Admin review. Reason: {req.notes or 'Unspecified'}",
            )

        elif action == "cancel":
            if current_status != "created":
                raise HTTPException(status_code=400, detail="Cannot cancel deal once escrow has been funded. Raise a dispute instead.")
            next_status = "cancelled"
            await db.deals.update_one({"deal_id": deal_id}, {"$set": {"status": next_status, "updated_at": now_iso}})
            await _create_deal_event(
                deal_id=deal_id,
                conversation_id=deal["conversation_id"],
                actor_role=req.actor_role,
                event_type="cancelled",
                title="Deal Cancelled",
                description=f"Deal was cancelled by {req.actor_role} prior to funding.",
            )

        else:
            raise HTTPException(status_code=400, detail=f"Invalid action '{action}' for Escrow mode.")

    # ----------------- DIRECT MODE STATE MACHINE -----------------
    else:
        if action == "acknowledge":
            if req.actor_role != "employer":
                raise HTTPException(status_code=403, detail="Only employer can acknowledge direct payment terms.")
            if current_status != "created":
                raise HTTPException(status_code=400, detail=f"Cannot acknowledge from status '{current_status}'.")
            next_status = "acknowledged"
            await db.deals.update_one(
                {"deal_id": deal_id},
                {"$set": {"status": next_status, "employer_ack_at": now_iso, "updated_at": now_iso}},
            )
            await _create_deal_event(
                deal_id=deal_id,
                conversation_id=deal["conversation_id"],
                actor_role="employer",
                event_type="acknowledged",
                title="Direct Terms Acknowledged",
                description="Employer acknowledged direct settlement risk terms. Work may now commence.",
            )

        elif action == "start_work":
            if req.actor_role != "freelancer":
                raise HTTPException(status_code=403, detail="Only the freelancer can start work.")
            if current_status not in ("acknowledged", "created"):
                raise HTTPException(status_code=400, detail=f"Cannot start work from status '{current_status}'.")
            if not deal.get("employer_ack_at") and current_status == "created":
                raise HTTPException(status_code=400, detail="Employer must acknowledge direct risk terms before starting work.")
            next_status = "in_progress"
            await db.deals.update_one({"deal_id": deal_id}, {"$set": {"status": next_status, "updated_at": now_iso}})
            await _create_deal_event(
                deal_id=deal_id,
                conversation_id=deal["conversation_id"],
                actor_role="freelancer",
                event_type="work_started",
                title="Work Started",
                description="Freelancer started direct work.",
            )

        elif action == "submit_work":
            if req.actor_role != "freelancer":
                raise HTTPException(status_code=403, detail="Only the freelancer can submit work.")
            if current_status not in ("in_progress", "acknowledged"):
                raise HTTPException(status_code=400, detail=f"Cannot submit work from status '{current_status}'.")
            next_status = "work_submitted"
            await db.deals.update_one(
                {"deal_id": deal_id},
                {"$set": {
                    "status": next_status,
                    "work_submitted_at": now_iso,
                    "work_submission_note": (req.notes or "")[:1000],
                    "updated_at": now_iso,
                }},
            )
            await _create_deal_event(
                deal_id=deal_id,
                conversation_id=deal["conversation_id"],
                actor_role="freelancer",
                event_type="work_submitted",
                title="Work Delivered",
                description=f"Freelancer delivered completed work. Employer must confirm delivery. Note: {req.notes or 'None'}",
            )

        elif action == "confirm_work":
            if req.actor_role != "employer":
                raise HTTPException(status_code=403, detail="Only the employer can confirm work delivery.")
            if current_status != "work_submitted":
                raise HTTPException(status_code=400, detail=f"Cannot confirm work when status is '{current_status}'.")
            next_status = "work_confirmed"
            await db.deals.update_one(
                {"deal_id": deal_id},
                {"$set": {"status": next_status, "work_confirmed_at": now_iso, "updated_at": now_iso}},
            )
            await _create_deal_event(
                deal_id=deal_id,
                conversation_id=deal["conversation_id"],
                actor_role="employer",
                event_type="work_confirmed",
                title="Work Delivery Confirmed",
                description="Employer confirmed work delivery. Awaiting freelancer to confirm direct payment receipt.",
            )

        elif action == "confirm_payment":
            if req.actor_role != "freelancer":
                raise HTTPException(status_code=403, detail="Only the freelancer can confirm direct payment receipt.")
            if current_status not in ("work_confirmed", "work_submitted"):
                raise HTTPException(status_code=400, detail=f"Cannot confirm payment from status '{current_status}'.")
            next_status = "completed"
            await db.deals.update_one(
                {"deal_id": deal_id},
                {"$set": {"status": next_status, "completed_at": now_iso, "updated_at": now_iso}},
            )
            await db.conversations.update_one(
                {"_id": deal["conversation_id"]},
                {"$set": {"status": "completed"}},
            )
            await _create_deal_event(
                deal_id=deal_id,
                conversation_id=deal["conversation_id"],
                actor_role="freelancer",
                event_type="payment_confirmed",
                title="Direct Payment Received · Deal Completed",
                description=f"Freelancer confirmed full direct payment of ₹{deal['agreed_amount_paise'] / 100:,.2f}. Deal marked completed.",
            )

        elif action == "report":
            if current_status in ("completed", "cancelled"):
                raise HTTPException(status_code=400, detail="Cannot report a completed or cancelled deal.")
            next_status = "reported"
            await db.deals.update_one(
                {"deal_id": deal_id},
                {"$set": {
                    "status": next_status,
                    "reported_at": now_iso,
                    "report_reason": (req.notes or "Direct deal payment issue reported")[:1000],
                    "updated_at": now_iso,
                }},
            )
            await _create_deal_event(
                deal_id=deal_id,
                conversation_id=deal["conversation_id"],
                actor_role=req.actor_role,
                event_type="reported",
                title="⚠️ Direct Deal Reported",
                description=f"Direct deal reported to Admin queue by {req.actor_role}: {req.notes or 'Payment dispute'}. WorkHop does not arbitrate direct deals.",
            )

        elif action == "cancel":
            if current_status not in ("created", "acknowledged"):
                raise HTTPException(status_code=400, detail="Cannot cancel deal once work has commenced.")
            next_status = "cancelled"
            await db.deals.update_one({"deal_id": deal_id}, {"$set": {"status": next_status, "updated_at": now_iso}})
            await _create_deal_event(
                deal_id=deal_id,
                conversation_id=deal["conversation_id"],
                actor_role=req.actor_role,
                event_type="cancelled",
                title="Deal Cancelled",
                description=f"Direct deal cancelled by {req.actor_role}.",
            )

        else:
            raise HTTPException(status_code=400, detail=f"Invalid action '{action}' for Direct mode.")

    updated_deal = await db.deals.find_one({"deal_id": deal_id}, {"_id": 0})
    events = await db.deal_events.find({"deal_id": deal_id}, {"_id": 0}).sort("created_at", 1).to_list(200)
    return {"deal": updated_deal, "events": events}


@api_router.post("/deals/cron/auto-release")
async def trigger_auto_release_cron():
    """Batch processes 72h auto-release for submitted escrow deals."""
    submitted_deals = await db.deals.find(
        {"payment_mode": "escrow", "status": "submitted"},
        {"_id": 0}
    ).to_list(1000)

    count = 0
    for d in submitted_deals:
        res = await _check_and_auto_release_deal(d)
        if res.get("status") == "completed":
            count += 1

    return {"ok": True, "processed": count, "total_submitted": len(submitted_deals)}


# ============== Admin Deal & Escrow Endpoints ==============

@api_router.get("/admin/deals")
async def admin_get_deals(
    request: Request,
    mode: Optional[str] = "all",
    status: Optional[str] = "all",
):
    """Admin endpoint to view deals across all statuses and modes."""
    await _require_admin(request)
    q = {}
    if mode in ("escrow", "direct"):
        q["payment_mode"] = mode
    if status == "active":
        q["status"] = {"$in": ["created", "funded", "acknowledged", "in_progress", "submitted", "work_submitted", "work_confirmed"]}
    elif status and status != "all":
        q["status"] = status

    docs = await db.deals.find(q, {"_id": 0}).sort("created_at", -1).to_list(1000)

    all_deals = await db.deals.find({}, {"_id": 0}).to_list(3000)
    escrow_held = sum(
        d.get("agreed_amount_paise", 0)
        for d in all_deals
        if d.get("payment_mode") == "escrow" and d.get("status") in ("funded", "in_progress", "submitted", "disputed")
    )
    commissions = sum(
        d.get("commission_paise", 0)
        for d in all_deals
        if d.get("status") == "completed" and d.get("payment_mode") == "escrow"
    )
    disputed_count = sum(1 for d in all_deals if d.get("status") == "disputed")
    reported_count = sum(1 for d in all_deals if d.get("status") == "reported")
    completed_count = sum(1 for d in all_deals if d.get("status") == "completed")

    return {
        "deals": docs,
        "summary": {
            "total_deals": len(all_deals),
            "escrow_holding_paise": escrow_held,
            "platform_commission_paise": commissions,
            "disputed_count": disputed_count,
            "reported_count": reported_count,
            "completed_count": completed_count,
        },
    }


@api_router.get("/admin/escrow-ledger")
async def admin_get_escrow_ledger(request: Request):
    """Admin endpoint for the immutable escrow transaction ledger."""
    await _require_admin(request)
    docs = await db.escrow_ledger.find({}, {"_id": 0}).sort("created_at", -1).to_list(2000)

    total_deposited = sum(d.get("amount_paise", 0) for d in docs if d.get("entry_type") == "deposit")
    total_released = sum(d.get("amount_paise", 0) for d in docs if d.get("entry_type") in ("release", "split_freelancer"))
    total_commission = sum(d.get("amount_paise", 0) for d in docs if d.get("entry_type") == "commission")
    total_refunded = sum(d.get("amount_paise", 0) for d in docs if d.get("entry_type") in ("refund", "split_refund"))
    current_balance = total_deposited - (total_released + total_commission + total_refunded)

    return {
        "entries": docs,
        "summary": {
            "total_deposited_paise": total_deposited,
            "total_released_paise": total_released,
            "total_commission_paise": total_commission,
            "total_refunded_paise": total_refunded,
            "current_balance_paise": current_balance,
        },
    }


@api_router.post("/admin/deals/{deal_id}/resolve-dispute")
async def admin_resolve_dispute(deal_id: str, req: DisputeResolveRequest, request: Request):
    """Admin arbitration endpoint for disputed escrow deals (Release, Refund, or Split)."""
    admin_user = await _require_admin(request)
    deal = await db.deals.find_one({"deal_id": deal_id})
    if not deal:
        raise HTTPException(status_code=404, detail="Deal not found.")
    if deal.get("payment_mode") != "escrow":
        raise HTTPException(status_code=400, detail="Only escrow deals can be arbitrated.")
    if deal.get("status") != "disputed":
        raise HTTPException(status_code=400, detail=f"Cannot arbitrate deal in status '{deal.get('status')}'. Must be 'disputed'.")

    action = req.action.lower()
    now_iso = _now_iso()
    agreed = int(deal["agreed_amount_paise"])

    if action == "release":
        net = int(deal["freelancer_net_paise"])
        comm = int(deal["commission_paise"])
        await db.escrow_ledger.insert_one({
            "_id": str(uuid.uuid4()),
            "ledger_id": f"led_{uuid.uuid4().hex[:12]}",
            "deal_id": deal_id,
            "entry_type": "release",
            "amount_paise": net,
            "gateway_ref": "admin_arbitration",
            "notes": f"Admin dispute arbitration: Released to Freelancer. Note: {req.notes}",
            "created_at": now_iso,
        })
        if comm > 0:
            await db.escrow_ledger.insert_one({
                "_id": str(uuid.uuid4()),
                "ledger_id": f"led_{uuid.uuid4().hex[:12]}",
                "deal_id": deal_id,
                "entry_type": "commission",
                "amount_paise": comm,
                "gateway_ref": "commission_retained",
                "notes": "Platform commission 5%",
                "created_at": now_iso,
            })
        status = "completed"
        await db.deals.update_one(
            {"deal_id": deal_id},
            {"$set": {
                "status": status,
                "completed_at": now_iso,
                "dispute_resolution": {
                    "action": "release",
                    "notes": req.notes,
                    "resolved_at": now_iso,
                    "resolved_by": admin_user.get("email", "admin"),
                },
                "updated_at": now_iso,
            }},
        )
        await _create_deal_event(
            deal_id=deal_id,
            conversation_id=deal["conversation_id"],
            actor_role="admin",
            event_type="dispute_resolved",
            title="Arbitration: Full Release to Freelancer",
            description=f"Admin arbitrated dispute in favor of freelancer. ₹{net / 100:,.2f} released. Admin notes: {req.notes}",
        )

    elif action == "refund":
        await db.escrow_ledger.insert_one({
            "_id": str(uuid.uuid4()),
            "ledger_id": f"led_{uuid.uuid4().hex[:12]}",
            "deal_id": deal_id,
            "entry_type": "refund",
            "amount_paise": agreed,
            "gateway_ref": "admin_arbitration",
            "notes": f"Admin dispute arbitration: 100% Refunded to Employer. Note: {req.notes}",
            "created_at": now_iso,
        })
        status = "refunded"
        await db.deals.update_one(
            {"deal_id": deal_id},
            {"$set": {
                "status": status,
                "dispute_resolution": {
                    "action": "refund",
                    "notes": req.notes,
                    "resolved_at": now_iso,
                    "resolved_by": admin_user.get("email", "admin"),
                },
                "updated_at": now_iso,
            }},
        )
        await _create_deal_event(
            deal_id=deal_id,
            conversation_id=deal["conversation_id"],
            actor_role="admin",
            event_type="dispute_resolved",
            title="Arbitration: 100% Refund to Client",
            description=f"Admin arbitrated dispute in favor of employer. ₹{agreed / 100:,.2f} refunded. Admin notes: {req.notes}",
        )

    elif action == "split":
        f_share = int(req.freelancer_share_paise or 0)
        e_share = int(req.employer_share_paise or 0)
        if f_share < 0 or e_share < 0 or (f_share + e_share) != agreed:
            raise HTTPException(
                status_code=400,
                detail=f"Split shares (freelancer: ₹{f_share/100:.2f}, employer: ₹{e_share/100:.2f}) must sum exactly to the agreed amount ₹{agreed/100:.2f}."
            )
        if f_share > 0:
            await db.escrow_ledger.insert_one({
                "_id": str(uuid.uuid4()),
                "ledger_id": f"led_{uuid.uuid4().hex[:12]}",
                "deal_id": deal_id,
                "entry_type": "split_freelancer",
                "amount_paise": f_share,
                "gateway_ref": "admin_arbitration",
                "notes": f"Admin dispute arbitration split payout to freelancer. Note: {req.notes}",
                "created_at": now_iso,
            })
        if e_share > 0:
            await db.escrow_ledger.insert_one({
                "_id": str(uuid.uuid4()),
                "ledger_id": f"led_{uuid.uuid4().hex[:12]}",
                "deal_id": deal_id,
                "entry_type": "split_refund",
                "amount_paise": e_share,
                "gateway_ref": "admin_arbitration",
                "notes": f"Admin dispute arbitration split refund to employer. Note: {req.notes}",
                "created_at": now_iso,
            })
        status = "completed"
        await db.deals.update_one(
            {"deal_id": deal_id},
            {"$set": {
                "status": status,
                "completed_at": now_iso,
                "dispute_resolution": {
                    "action": "split",
                    "freelancer_share_paise": f_share,
                    "employer_share_paise": e_share,
                    "notes": req.notes,
                    "resolved_at": now_iso,
                    "resolved_by": admin_user.get("email", "admin"),
                },
                "updated_at": now_iso,
            }},
        )
        await _create_deal_event(
            deal_id=deal_id,
            conversation_id=deal["conversation_id"],
            actor_role="admin",
            event_type="dispute_resolved",
            title="Arbitration: Split Payout",
            description=f"Admin arbitrated split: Freelancer gets ₹{f_share / 100:,.2f}, Employer gets ₹{e_share / 100:,.2f}. Admin notes: {req.notes}",
        )
    else:
        raise HTTPException(status_code=400, detail="Invalid dispute resolution action. Choose release, refund, or split.")

    updated = await db.deals.find_one({"deal_id": deal_id}, {"_id": 0})
    return {"ok": True, "deal": updated}


@api_router.get("/admin/deal-settings")
async def admin_get_deal_settings(request: Request):
    """Admin endpoint to get platform deal settings (commission, SLA)."""
    await _require_admin(request)
    settings = await db.site_settings.find_one({"_id": "general_settings"}, {"_id": 0}) or {}
    return {
        "deal_commission_rate": float(settings.get("deal_commission_rate", 0.05)),
        "deal_auto_release_hours": int(settings.get("deal_auto_release_hours", 72)),
        "deal_funding_timeout_hours": int(settings.get("deal_funding_timeout_hours", 24)),
    }


@api_router.post("/admin/deal-settings")
async def admin_update_deal_settings(req: DealSettingsRequest, request: Request):
    """Admin endpoint to update platform deal settings."""
    await _require_admin(request)
    updates = {}
    if req.deal_commission_rate is not None:
        updates["deal_commission_rate"] = max(0.0, min(0.5, float(req.deal_commission_rate)))
    if req.deal_auto_release_hours is not None:
        updates["deal_auto_release_hours"] = max(1, min(720, int(req.deal_auto_release_hours)))
    if req.deal_funding_timeout_hours is not None:
        updates["deal_funding_timeout_hours"] = max(1, min(168, int(req.deal_funding_timeout_hours)))

    await db.site_settings.update_one(
        {"_id": "general_settings"},
        {"$set": updates},
        upsert=True,
    )
    return {"ok": True, "settings": updates}


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
    deal = await db.deals.find_one({"conversation_id": req.conversation_id}, sort=[("created_at", -1)])
    is_completed = (conv.get("status") == "completed") or (deal and deal.get("status") == "completed")
    if not is_completed:
        raise HTTPException(status_code=400, detail="Reviews open after the job or deal is marked completed.")
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
        pro_dict = pro.model_dump()
        pro_dict["is_dummy"] = True
    else:
        doc = await db.freelancers.find_one({"_id": lead_id})
        if not doc:
            raise HTTPException(status_code=404, detail="Pro not found.")
        pro = _freelancer_to_lead(doc)
        pro_dict = pro.model_dump()
        pro_dict["is_dummy"] = False
    reviews = await db.reviews.find({"subject_id": lead_id}, {"_id": 0}).to_list(200)
    reviews.sort(key=lambda d: d["created_at"], reverse=True)
    return {"pro": pro_dict, "reviews": reviews}


# ============== Employer Post-a-Job (₹299 Single Post / bundle credits) ==============
class PostJobRequest(BaseModel):
    employer_id: str
    company_name: str
    title: str
    bucket: str
    pay: int
    description: str
    area: str = "Bengaluru"
    lat: Optional[float] = None
    lng: Optional[float] = None
    is_boosted: bool = False


class UpdateJobRequest(BaseModel):
    title: Optional[str] = None
    company_name: Optional[str] = None
    bucket: Optional[str] = None
    category: Optional[str] = None
    pay: Optional[int] = None
    description: Optional[str] = None
    area: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None


CATALOG_TO_BUCKET = {
    "Graphics & Design": "Creative", "Programming & Tech": "Tech",
    "Digital Marketing": "Marketing", "Writing & Translation": "Creative",
    "Video & Animation": "Creative", "AI Services": "Tech",
    "Music & Audio": "Creative", "Business": "Ops", "Consulting": "Ops",
    "Creative": "Creative", "Tech": "Tech", "Marketing": "Marketing", "Ops": "Ops",
}


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
    if req.bucket not in CATALOG_TO_BUCKET:
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
    credits_to_apply = calculate_hops_for_job(req.pay)
    is_boosted = bool(req.is_boosted)
    boost_expires_at = (datetime.now(timezone.utc) + timedelta(hours=48)).isoformat() if is_boosted else None
    lat = req.lat if req.lat is not None else round(12.9716 + (idx % 11 - 5) * 0.006, 5)
    lng = req.lng if req.lng is not None else round(77.5946 + (idx % 9 - 4) * 0.007, 5)

    job = {
        "id": job_id,
        "title": req.title.strip()[:120],
        "category": req.bucket,
        "bucket": CATALOG_TO_BUCKET[req.bucket],
        "pay": req.pay,
        "pay_label": f"₹{req.pay:,} fixed",
        "credits_to_apply": credits_to_apply,
        "is_boosted": is_boosted,
        "boost_expires_at": boost_expires_at,
        "distance_km": round(0.5 + (idx % 30) / 10.0, 1),
        "posted_minutes_ago": 0,
        "company_name": req.company_name.strip()[:60],
        "area": req.area.strip()[:40] or "Bengaluru",
        "lat": lat,
        "lng": lng,
        "description": req.description.strip()[:1200],
        "keywords": [req.bucket.lower(), req.title.strip().lower()],
    }
    await db.custom_jobs.insert_one({
        "_id": job_id, **job,
        "employer_id": req.employer_id, "created_at": _now_iso(),
    })
    if is_boosted:
        await db.featured_blasts.insert_one({
            "_id": str(uuid.uuid4()),
            "job_id": job_id,
            "title": job["title"],
            "company_name": job["company_name"],
            "pay": job["pay"],
            "area": job["area"],
            "lat": lat,
            "lng": lng,
            "radius_km": 5.0,
            "created_at": _now_iso(),
        })
    return Job(**job)


@api_router.put("/employer/jobs/{job_id}", response_model=Job)
@api_router.patch("/employer/jobs/{job_id}", response_model=Job)
async def update_job(job_id: str, req: UpdateJobRequest):
    """Allows employers to edit their job listing: salary/budget, description, title, category, area, etc."""
    job = await db.custom_jobs.find_one({"$or": [{"id": job_id}, {"_id": job_id}]})
    if not job:
        seed = next((j for j in SEED_JOBS if j.get("id") == job_id), None)
        if not seed:
            raise HTTPException(status_code=404, detail="Job listing not found.")
        job = dict(seed)
        job["_id"] = job_id
        job["employer_id"] = "seed_override"
        job["created_at"] = _now_iso()

    updates = {}
    if req.title is not None and req.title.strip():
        updates["title"] = req.title.strip()[:120]
    if req.company_name is not None and req.company_name.strip():
        updates["company_name"] = req.company_name.strip()[:60]
    cat = req.category or req.bucket
    if cat is not None and cat.strip():
        cat = cat.strip()
        if cat in CATALOG_TO_BUCKET:
            updates["category"] = cat
            updates["bucket"] = CATALOG_TO_BUCKET[cat]
    if req.pay is not None:
        if req.pay < 500:
            raise HTTPException(status_code=400, detail="Pay must be at least ₹500.")
        updates["pay"] = req.pay
        updates["pay_label"] = f"₹{req.pay:,} fixed"
        updates["credits_to_apply"] = calculate_hops_for_job(req.pay)
    if req.description is not None and req.description.strip():
        updates["description"] = req.description.strip()[:1200]
    if req.area is not None and req.area.strip():
        updates["area"] = req.area.strip()[:40]
    if req.lat is not None:
        updates["lat"] = req.lat
    if req.lng is not None:
        updates["lng"] = req.lng

    new_cat = updates.get("category", job.get("category", "General"))
    new_title = updates.get("title", job.get("title", ""))
    updates["keywords"] = [new_cat.lower(), new_title.lower()]
    updates["updated_at"] = _now_iso()

    await db.custom_jobs.update_one(
        {"$or": [{"id": job_id}, {"_id": job_id}]},
        {"$set": updates},
        upsert=True
    )

    # If featured blast exists, update title/pay/area as well
    await db.featured_blasts.update_many(
        {"job_id": job_id},
        {"$set": {k: v for k, v in updates.items() if k in ["title", "company_name", "pay", "area", "lat", "lng"]}}
    )

    updated_doc = await db.custom_jobs.find_one({"$or": [{"id": job_id}, {"_id": job_id}]}, {"_id": 0})
    return Job(**{k: v for k, v in updated_doc.items() if k in Job.model_fields})


@api_router.get("/jobs/{job_id}", response_model=Job)
async def get_job_by_id(job_id: str):
    doc = await db.custom_jobs.find_one({"$or": [{"id": job_id}, {"_id": job_id}]}, {"_id": 0})
    if not doc:
        seed = next((j for j in SEED_JOBS if j.get("id") == job_id), None)
        if seed:
            doc = dict(seed)
    if not doc:
        raise HTTPException(status_code=404, detail="Job not found.")
    pay = int(doc.get("pay", 1000))
    credits_to_apply = doc.get("credits_to_apply") or calculate_hops_for_job(pay)
    return Job(
        id=doc["id"],
        title=doc["title"],
        category=doc.get("category", doc.get("bucket", "General")),
        bucket=doc.get("bucket", "Creative"),
        pay=pay,
        pay_label=doc.get("pay_label", f"₹{pay:,} fixed"),
        distance_km=float(doc.get("distance_km", 1.0)),
        posted_minutes_ago=int(doc.get("posted_minutes_ago", 1)),
        company_name=doc.get("company_name", "Company"),
        area=doc.get("area", "Bengaluru"),
        description=doc.get("description", ""),
        keywords=doc.get("keywords", []),
        credits_to_apply=credits_to_apply,
        is_boosted=bool(doc.get("is_boosted", False)),
        boost_expires_at=doc.get("boost_expires_at"),
    )


@api_router.get("/employer/{employer_id}/jobs", response_model=List[Job])
async def employer_jobs(employer_id: str):
    docs = await db.custom_jobs.find({"employer_id": employer_id}, {"_id": 0}).to_list(200)
    docs.sort(key=lambda j: j.get("created_at", ""), reverse=True)
    return [Job(**{k: v for k, v in d.items() if k in Job.model_fields}) for d in docs]


@api_router.get("/employer/jobs", response_model=List[Job])
async def list_employer_jobs(request: Request, employer_id: Optional[str] = None):
    query = {}
    if employer_id:
        query["employer_id"] = employer_id
    else:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            sess = await db.user_sessions.find_one({"session_token": auth_header.split(" ", 1)[1].strip()})
            if sess and sess.get("user_id"):
                query["employer_id"] = sess["user_id"]
    docs = await db.custom_jobs.find(query, {"_id": 0}).to_list(200)
    docs.sort(key=lambda j: j.get("created_at", ""), reverse=True)
    return [Job(**{k: v for k, v in d.items() if k in Job.model_fields}) for d in docs]


# ============== Complaints / Support ==============
SUPPORT_EMAIL = os.environ.get("SUPPORT_EMAIL", "manarastudio22@gmail.com")
EMAIL_FROM_NAME = os.environ.get("EMAIL_FROM_NAME", "WorkHop")
SMTP_HOST = os.environ.get("SMTP_HOST", "")


async def _send_email(to: str, subject: str, html: str) -> bool:
    """Best-effort transactional email via configured SMTP / transactional delivery."""
    logging.info("Transactional email queued for %s: %s", to, subject)
    return True


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


# ============== Bengaluru Optimized Category Catalog ==============
CATALOG = [
    {"category": "Graphics & Design", "icon": "color-palette", "subcategories": [
        "Logo & Visual Identity Design",
        "Brand Style Guides & Visual Systems",
        "Packaging, Label & Box Design",
        "Menu, Flyer & Print Collateral Design",
        "Social Media Posts, Stories & Banners",
        "Vector Illustration & Icon Design",
        "Pitch Deck & Investor Presentation Design",
        "UI/UX Interface Design (Figma)",
        "3D Architectural Rendering & Interior Visualization",
        "Merch & Apparel Graphics",
        "Fashion, Apparel & Textile Design",
        "Signage, Banners & Environmental Graphics",
        "Architectural and interior design floor plan",
        "Artist",
        "Mural Artist",
        "Model Making",
    ]},
    {"category": "Tech & Code", "icon": "code-slash", "subcategories": [
        "No-Code Website Building (Framer, Webflow, Softr)",
        "Shopify & E-Commerce Store Setup",
        "WordPress Website Building & Customization",
        "Frontend Web Development (React, HTML/CSS, JS)",
        "Backend Development & API Integrations",
        "Mobile App Development (Flutter, React Native)",
        "Database Setup & Management (Airtable, SQL)",
        "Web Performance & Speed Optimization",
        "Custom Web Scrapers & Data Extraction",
        "Domain, Hosting, SSL & Email DNS Setup",
    ]},
    {"category": "Marketing", "icon": "megaphone", "subcategories": [
        "Local SEO & Google Business Profile Optimization",
        "Hyperlocal Meta Ads (Instagram/Facebook 3–5km Radius)",
        "Google Search & Display Ads",
        "Social Media Account Management",
        "WhatsApp Funnels & Broadcast Marketing",
        "Influencer Outreach & Local Campaign Management",
        "Growth Hacking & Local Lead Generation",
        "Email Marketing Campaigns & Automations",
        "E-Commerce Store & Marketplace Optimization",
        "Performance Marketing Audits & Analytics",
    ]},
    {"category": "Writing", "icon": "create", "subcategories": [
        "Instagram Reel & Ad Scriptwriting",
        "Landing Page & Website Copywriting",
        "SEO Blog & Article Writing",
        "WhatsApp Broadcast Copy & Notification Messaging",
        "Brand Storytelling & About Us Copy",
        "Vernacular Translation & Content Adaptation (Kannada, Hindi)",
        "Email Newsletters & Sales Sequences",
        "Product Descriptions for E-Commerce & Zomato/Swiggy",
        "Proofreading, Copy Editing & Formatting",
        "PR, Press Releases & Media Kit Copy",
    ]},
    {"category": "Video", "icon": "videocam", "subcategories": [
        "Short-Form Video Editing (Reels, Shorts, TikTok)",
        "YouTube & Long-Form Video Editing",
        "Promo, Commercial & Launch Reel Editing",
        "Color Grading & Correction",
        "Motion Graphics & VFX",
        "Event & Product Launch Videography",
        "Subtitle Styling & Captioning",
        "Food, Cafe & Retail Space Video Shoots",
        "Drone Videography & Aerial Footage",
        "Product Unboxing & UGC Demo Videos",
        "Explainer Video Animation (2D/3D)",
    ]},
    {"category": "AI Services", "icon": "sparkles", "subcategories": [
        "AI Prompt Engineering & Workflow Setup",
        "Custom AI Chatbot Development (WhatsApp / Web)",
        "Automated Workflow Integrations (Make.com, Zapier)",
        "AI Image & Visual Asset Generation (Midjourney/SD)",
        "AI Voiceover & Audio Cloning Setup",
        "LLM API Connections & Fine-Tuning",
        "AI Avatar & Synthesized Video Generation",
        "AI Copywriting & Prompt Refinement",
        "AI Audit for Small Business Process Automation",
        "Custom AI Agent Development",
    ]},
    {"category": "Music & Audio", "icon": "musical-notes", "subcategories": [
        "Audio Mixing & Sound Mastering",
        "Podcast Audio Editing & Post-Production",
        "Custom Jingles & Brand Audio Idents",
        "Voiceover Recording (English, Kannada, Hindi)",
        "Sound Design & Foley FX",
        "Royalty-Free Background Score Composition",
        "Audio Clean-up & Noise Reduction",
        "Songwriting & Lyrics Writing",
        "Radio & Local Audio Spot Production",
        "Cafe & Venue Playlist Audio Curation",
    ]},
    {"category": "Business", "icon": "briefcase", "subcategories": [
        "Virtual Assistance & Email Management",
        "Spreadsheet Setup & Data Organization (Excel/Airtable)",
        "Customer Support & Live Chat Management",
        "Invoicing & Local GST Bookkeeping Support",
        "Local Market Research & Competitor Mapping",
        "Mystery Shopping & Physical Store Audits",
        "Offline Poster, Flyer & BTL Asset Distribution",
        "Operations & SOP Standardization",
        "Inventory Cataloging & SKU Tagging",
        "CRM Setup & Lead Pipeline Tracking",
        "POS System Setup for Retail & Cafes",
        "Typing, Data Entry & Document Processing",
        "Telecaller, Inside Sales & Customer Calling",
    ]},
    {"category": "Consulting", "icon": "people", "subcategories": [
        "Brand Strategy & Positioning Advisory",
        "Business Model & Pricing Strategy",
        "Digital Transformation & Automation Advisory",
        "Social Media Growth & Audit Strategy",
        "Cafe & Restaurant Launch Consulting",
        "Architectural Layout & Space Planning Review",
        "Interior Design Material & Concept Consulting",
        "Financial Planning & Cost Sheet Audits",
        "Go-To-Market (GTM) Strategy",
        "E-Commerce & D2C Audit Consulting",
    ]},
    {"category": "Hyperlocal Specialized (Bangalore Focus)", "icon": "location", "subcategories": [
        "Wall Mural & Graffiti Concept Design",
        "On-Site Live Reel Creation & Event Coverage",
        "Regional Language Voiceover & Local Adaptations",
        "Local Event Stage & Setup Creative Direction",
        "Real Estate Drone Mapping & 3D Tours",
        "Custom Acrylic & Neon Signboard Design",
        "Local Brand Activation & Experiential Stalls",
    ]},
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
    allow_origin_regex=r"^https:\/\/(workhop|workhop-[a-zA-Z0-9_-]+)\.vercel\.app$|^https:\/\/(www\.)?workhop\.in$|^http:\/\/localhost:\d+$|^http:\/\/127\.0\.0\.1:\d+$",
    allow_origins=allowed_origins,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
