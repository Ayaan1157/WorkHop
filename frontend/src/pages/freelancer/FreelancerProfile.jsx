import { useCallback, useEffect, useState, useRef, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Pencil, Plus, Trash2, ChevronLeft, Github, ExternalLink,
  Briefcase, GraduationCap, Award, Globe, Link2, Clock,
  MapPin, Star, ChevronDown, ChevronUp, X, User, DollarSign,
  Code2, Loader2, Menu, MessagesSquare, Map as MapIcon,
  LayoutGrid, Tag, LifeBuoy, FileText, Shield, ChevronRight,
  LogOut, Wallet, ShieldCheck, Camera, Upload, Coins, Sparkles, History, ArrowUpRight, Building2, CheckCircle2,
  AlertTriangle, ImageIcon, Bell, Phone
} from "lucide-react";
import { Shell } from "@/components/kit";
import EditModal from "@/components/EditModal";
import CreditsTopUpModal from "@/components/CreditsTopUpModal";
import PushSettingsModal from "@/components/PushSettingsModal";
import PushNotificationPrompt from "@/components/PushNotificationPrompt";
import DeleteAccountModal from "@/components/DeleteAccountModal";
import { useAuth } from "@/context/AuthContext";
import { apiGet, apiPut, apiPost, getFreelancerId } from "@/lib/api";
import { supabaseSyncCurrentUserProfile } from "@/lib/supabase";
import {
  getFreelancerProfile,
  saveFreelancerProfile,
  saveSubmittedProfile,
  getCreditsWallet,
  getCreditTransactions,
  getFreelancerStatuses,
  getStoredLeads,
  updateProHourlyRate,
} from "@/lib/clientStore";
import { BENGALURU_AREAS } from "@/lib/locationAreas";
import {
  validateImageFile,
  compressImage,
  formatFileSize,
  MAX_PORTFOLIO_IMAGE_SIZE_MB,
} from "@/lib/fileUpload";
import { scanText, scanUploadFile, scanPortfolioLink } from "@/lib/contactScanner";

/* ═══════════ helpers ═══════════ */
const uid = () => `id_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

const PROFICIENCY_LEVELS = [
  "Native or Bilingual",
  "Fluent",
  "Conversational",
  "Basic",
];

const SERVICE_CATEGORIES = [
  "Design & Architecture",
  "Graphics & Design",
  "Programming & Tech",
  "Digital Marketing",
  "Video & Animation",
  "AI & Smart Automations",
  "Writing & Translation",
  "Music & Audio",
  "Business",
  "Hyperlocal & Field",
];

const SKILL_SUGGESTIONS = [
  "Architecture", "Architecture & Interior Design", "Interior Design", "AutoCAD",
  "3D Architectural Rendering", "Spatial Planning", "Floor Plans", "Elevation Design",
  "UI/UX Design", "Figma", "Web Development", "Artificial Intelligence", "Web Application", "Web Design",
  "Automation", "API", "Stripe", "OpenAPI", "SaaS Development", "Responsive Design",
  "Web Application Development", "Website Redesign", "Next.js", "React", "Runway",
  "Node.js", "Python", "TypeScript", "MongoDB", "PostgreSQL", "AWS", "Docker",
  "GraphQL", "REST API", "Adobe XD", "Tailwind CSS",
  "Firebase", "Git", "CI/CD", "Linux", "Redis", "Elasticsearch",
];

/* ═══════════ main component ═══════════ */
export default function FreelancerProfile() {
  const nav = useNavigate();
  const [searchParams] = useSearchParams();
  const editParam = searchParams.get("edit");
  const { user, updateUserProfile } = useAuth();
  const freelancerId = getFreelancerId();

  const [profile, setProfile] = useState(() => getFreelancerProfile());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Modal states
  const [editingSection, setEditingSection] = useState(null);
  const [editData, setEditData] = useState(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

  // Skill input
  const [skillInput, setSkillInput] = useState("");

  // Collapsible
  const [expandedEmployment, setExpandedEmployment] = useState(true);
  const [expandedCerts, setExpandedCerts] = useState(true);

  // Top-right Menu Drawer states
  const [menuDrawerOpen, setMenuDrawerOpen] = useState(false);
  const [pushSettingsOpen, setPushSettingsOpen] = useState(false);
  const [creditsModalOpen, setCreditsModalOpen] = useState(false);
  const [txHistoryOpen, setTxHistoryOpen] = useState(false);
  const [creditsWallet, setCreditsWallet] = useState(() => getCreditsWallet(freelancerId));
  const [creditTxs, setCreditTxs] = useState(() => getCreditTransactions(freelancerId));
  const [proPhone, setProPhone] = useState(() => user?.phone || localStorage.getItem("workhop_pro_phone") || "");
  const [proSkill, setProSkill] = useState(() => user?.skill || localStorage.getItem("workhop_pro_skill") || "");
  const [proSaving, setProSaving] = useState(false);
  const [proSaveMsg, setProSaveMsg] = useState(null);

  const [portfolioImageError, setPortfolioImageError] = useState(null);
  const [portfolioLinkError, setPortfolioLinkError] = useState(null);
  const [isProcessingPortfolioImage, setIsProcessingPortfolioImage] = useState(false);
  const [avatarError, setAvatarError] = useState(null);
  const [gigNotice, setGigNotice] = useState(null);
  const [activeGallery, setActiveGallery] = useState(null);

  const getItemImages = (item) => {
    if (!item) return [];
    if (Array.isArray(item.images) && item.images.length > 0) {
      return item.images.filter((img) => img && (img.data || typeof img === "string")).map((img, i) =>
        typeof img === "string"
          ? { id: `img_${i}`, data: img, name: `image-${i + 1}.jpg`, size: "Optimized" }
          : img
      );
    }
    if (item.image_data) {
      return [
        {
          id: "img_0",
          data: item.image_data,
          name: item.image_name || "portfolio-image.jpg",
          size: item.image_size || "Optimized",
        },
      ];
    }
    return [];
  };

  const handlePortfolioLinkChange = (value) => {
    setEditData((d) => ({ ...(d || {}), link: value }));
    setPortfolioLinkError(null);
    setPortfolioImageError(null);
    if (!value || !value.trim()) return;

    const scan = scanPortfolioLink(value);
    if (scan.hasViolations) {
      setPortfolioLinkError(
        `Portfolio link contains prohibited details (${scan.violations.map((v) => v.label).join(", ")}). Direct phone numbers, emails, and company promotions are not permitted.`
      );
    }
  };

  const photoInputRef = useRef(null);

  const handlePortfolioImageChange = async (e, replaceIdx = null) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const existingImages = getItemImages(editData);
    const maxImages = 10;
    if (replaceIdx === null && existingImages.length + files.length > maxImages) {
      setPortfolioImageError(`You can upload up to ${maxImages} images per project.`);
      e.target.value = "";
      return;
    }

    // 1. Validate all selected files first (Max 5MB each)
    for (const file of files) {
      const validation = validateImageFile(file, MAX_PORTFOLIO_IMAGE_SIZE_MB);
      if (!validation.valid) {
        setPortfolioImageError(`${file.name}: ${validation.error}`);
        e.target.value = "";
        return;
      }
    }

    setPortfolioImageError(null);
    setIsProcessingPortfolioImage(true);

    try {
      const newProcessed = [];
      for (const file of files) {
        // 2. Screen image for contact info (filename, metadata, and OCR)
        const scanRes = await scanUploadFile(file);
        if (scanRes?.hasViolations) {
          const violationDetails = scanRes.violations.map((v) => v.label).join(", ");
          setPortfolioImageError(
            `"${file.name}" contains prohibited contact details (${violationDetails}). Sharing phone numbers, emails, or personal contacts on portfolio items is not allowed.`
          );
          setIsProcessingPortfolioImage(false);
          e.target.value = "";
          return;
        }

        // 3. Optimize image for web performance
        const res = await compressImage(file, { maxWidth: 1600, maxHeight: 1600, quality: 0.85 });
        if (res?.dataUrl) {
          newProcessed.push({
            id: uid(),
            data: res.dataUrl,
            name: file.name,
            size: formatFileSize(file.size),
          });
        }
      }

      if (newProcessed.length > 0) {
        setEditData((d) => {
          const currentList = getItemImages(d);
          let nextImages;
          if (replaceIdx !== null && replaceIdx >= 0 && replaceIdx < currentList.length) {
            nextImages = [...currentList];
            nextImages[replaceIdx] = newProcessed[0];
          } else {
            nextImages = [...currentList, ...newProcessed].slice(0, maxImages);
          }
          const primary = nextImages[0] || null;
          return {
            ...(d || {}),
            images: nextImages,
            image_data: primary ? primary.data : null,
            image_name: primary ? primary.name : null,
            image_size: primary ? primary.size : null,
          };
        });
      }
    } catch {
      setPortfolioImageError("Failed to process image(s). Please try another file.");
    } finally {
      setIsProcessingPortfolioImage(false);
      if (e?.target) e.target.value = "";
    }
  };

  const removePortfolioImageAt = (idx) => {
    setPortfolioImageError(null);
    setEditData((d) => {
      const currentList = getItemImages(d);
      const nextImages = currentList.filter((_, i) => i !== idx);
      const primary = nextImages[0] || null;
      return {
        ...(d || {}),
        images: nextImages,
        image_data: primary ? primary.data : null,
        image_name: primary ? primary.name : null,
        image_size: primary ? primary.size : null,
      };
    });
  };

  const syncFreelancerCoreDetails = ({
    name,
    picture,
    phone,
    area,
    category,
    skill,
    description,
    rateHr,
  }) => {
    const cleanPhone = phone !== undefined ? String(phone || "").replace(/\D/g, "").slice(-10) : (proPhone || user?.phone || "").replace(/\D/g, "").slice(-10);
    const cleanSkill = skill !== undefined ? String(skill || "").trim() : (profile.title || proSkill || user?.skill || "").trim();
    const cleanCategory = category !== undefined ? String(category || "").trim() : (profile.category || user?.category || "");
    const cleanArea = area !== undefined ? String(area || "").trim() : (user?.area || localStorage.getItem("workhop_user_area") || "Indiranagar");
    const cleanName = name !== undefined ? (String(name || "").trim() || user?.name || "WorkHop User") : (user?.name || "WorkHop User");
    const cleanBio = description !== undefined ? String(description || "") : (profile.description || user?.bio || "");
    const cleanRate = rateHr !== undefined ? (Number(rateHr) || 0) : (Number(profile.rate_hr) || 0);

    if (cleanPhone) {
      setProPhone(cleanPhone);
      localStorage.setItem("workhop_pro_phone", cleanPhone);
    }
    if (cleanSkill) {
      setProSkill(cleanSkill);
      localStorage.setItem("workhop_pro_skill", cleanSkill);
    }
    if (cleanArea) {
      localStorage.setItem("workhop_user_area", cleanArea);
    }

    const updatedSkillsList = cleanSkill && !profile.skills.includes(cleanSkill)
      ? [cleanSkill, ...profile.skills]
      : profile.skills;

    const updatedProfile = {
      ...profile,
      title: cleanSkill || profile.title,
      skill: cleanSkill || profile.skill,
      category: cleanCategory || profile.category,
      area: cleanArea,
      phone: cleanPhone,
      description: cleanBio,
      rate_hr: cleanRate,
      skills: updatedSkillsList,
    };
    persist(updatedProfile);

    if (updateUserProfile) {
      updateUserProfile({
        name: cleanName,
        picture: picture !== undefined ? (picture || null) : (user?.picture || null),
        phone: cleanPhone || user?.phone || "",
        area: cleanArea || user?.area || "Indiranagar",
        category: cleanCategory || user?.category || "",
        skill: cleanSkill || user?.skill || "",
        bio: cleanBio,
        rate_hr: cleanRate || user?.rate_hr || 0,
      });
    }

    try {
      saveSubmittedProfile({
        id: freelancerId || user?.id || `pro-${(user?.email || cleanName).toLowerCase().replace(/[^a-z0-9]/g, "")}`,
        freelancer_id: freelancerId || user?.id,
        name: cleanName,
        email: user?.email || "",
        phone: cleanPhone,
        skill: cleanSkill,
        category: cleanCategory || "Design & Architecture",
        area: cleanArea || "Indiranagar",
        rate_hr: cleanRate || 0,
        intro: cleanBio,
        picture: picture !== undefined ? (picture || null) : (user?.picture || null),
        approved: proStatusObj?.approved,
        status: proStatusObj?.status || "approved",
      });
    } catch (_) {}

    if (freelancerId) {
      apiPut(`/freelancer/${freelancerId}/profile`, {
        name: cleanName,
        phone: cleanPhone || null,
        skill: cleanSkill || null,
        category: cleanCategory || null,
        area: cleanArea || null,
      }).catch(() => {});
    }
  };

  const saveProDetails = async () => {
    const digits = proPhone.replace(/\D/g, "").slice(-10);
    if (digits.length !== 10) return setProSaveMsg({ ok: false, text: "Phone must be exactly 10 digits." });
    setProSaving(true);
    setProSaveMsg(null);
    try {
      syncFreelancerCoreDetails({
        phone: digits,
        skill: proSkill.trim(),
      });
      setProSaveMsg({ ok: true, text: `Saved · phone set to +91 ${digits}` });
    } catch (e) {
      setProSaveMsg({ ok: false, text: e?.message || "Could not save." });
    } finally {
      setProSaving(false);
    }
  };

  const navMenuItems = [
    {
      icon: Tag,
      label: "Find Gigs",
      sub: "Browse 50+ active gigs in 5km radius",
      to: "/freelancer/jobs",
      testID: "profile-jobs",
    },
    {
      icon: MessagesSquare,
      label: "My Messages",
      sub: "Chats with employers & pros",
      to: "/freelancer/chats",
      testID: "profile-chats",
    },
    {
      icon: MapIcon,
      label: "Live Map",
      sub: "Pros & employers near you",
      to: "/map",
      testID: "profile-map",
    },
    {
      icon: LayoutGrid,
      label: "Browse Categories",
      sub: "All gigs & sub-gigs",
      to: "/categories",
      testID: "profile-categories",
    },
    {
      icon: Tag,
      label: "Plans & Pricing",
      sub: "Bidding Hops (1 Hop = ₹15) & passes",
      to: "/plans?tab=freelancer",
      testID: "profile-plans",
    },
    {
      icon: LifeBuoy,
      label: "Support & Complaints",
      sub: "FAQs, help and reporting",
      to: "/support",
      testID: "profile-support",
    },
    {
      icon: FileText,
      label: "Legal & Policies",
      sub: "Terms, privacy — Bengaluru",
      to: "/legal",
      testID: "profile-legal",
    },
  ];

  const loadProfile = useCallback(async () => {
    try {
      const data = await apiGet(`/freelancer/${freelancerId}/full-profile`);
      if (data && typeof data === "object") {
        const cleaned = { ...data };
        delete cleaned.upwork_url;
        setProfile((prev) => ({ ...prev, ...cleaned, upwork_url: "" }));
      }
    } catch {
      /* use default */
    } finally {
      setLoading(false);
    }
  }, [freelancerId]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const persist = useCallback(
    async (updated) => {
      setProfile(updated);
      saveFreelancerProfile(updated);
      if (updated.rate_hr) {
        updateProHourlyRate(freelancerId, updated.rate_hr);
        if (user?.email) updateProHourlyRate(user.email, updated.rate_hr);
        if (user?.id) updateProHourlyRate(user.id, updated.rate_hr);
      }
      const portfolioList = Array.isArray(updated.portfolio) ? updated.portfolio : [];
      const allPortfolioImages = portfolioList
        .flatMap((p) => {
          if (Array.isArray(p?.images) && p.images.length > 0) {
            return p.images.map((img) => (typeof img === "string" ? img : img?.data)).filter(Boolean);
          }
          return p?.image_data ? [p.image_data] : [];
        })
        .filter(Boolean);
      supabaseSyncCurrentUserProfile({
        id: user?.id,
        email: user?.email,
        name: user?.name,
        role: "freelancer",
        phone: updated.phone || user?.phone || undefined,
        skill: updated.title || updated.skill || undefined,
        category: updated.category || undefined,
        area: updated.area || user?.area || undefined,
        bio: updated.description ?? undefined,
        rate_hr: Number(updated.rate_hr) || 0,
        languages: Array.isArray(updated.languages) ? updated.languages : [],
        skills: Array.isArray(updated.skills) ? updated.skills : [],
        portfolio: portfolioList,
        picture: user?.picture || undefined,
        github_url: updated.github_url || undefined,
      }).catch(() => {});
      try {
        saveSubmittedProfile({
          id: freelancerId || user?.id,
          freelancer_id: freelancerId || user?.id,
          email: user?.email || "",
          name: user?.name || undefined,
          picture: user?.picture || undefined,
          rate_hr: Number(updated.rate_hr) || 0,
          languages: Array.isArray(updated.languages) ? updated.languages : [],
          intro: updated.description || "",
          bio: updated.description || "",
          portfolio_items: portfolioList,
          portfolio_images: allPortfolioImages,
        });
      } catch {}
      try {
        await apiPut(`/freelancer/${freelancerId}/full-profile`, {
          ...updated,
          email: user?.email || "",
          name: user?.name || undefined,
          picture: user?.picture || undefined,
          portfolio_images: allPortfolioImages,
        });
      } catch {
        /* saved locally */
      }
    },
    [freelancerId, user?.email, user?.id, user?.name, user?.picture, user?.phone, user?.area]
  );

  const openEdit = (section, data = null) => {
    setEditingSection(section);
    setEditData(data);
    setPortfolioImageError(null);
    setPortfolioLinkError(null);
    setIsProcessingPortfolioImage(false);
    setAvatarError(null);
  };

  const openProfileInfoModal = () => {
    openEdit("name", {
      name: user?.name || "",
      picture: user?.picture || "",
      phone: (proPhone || user?.phone || "").replace(/\D/g, "").slice(-10),
      area: user?.area || profile.area || localStorage.getItem("workhop_user_area") || "Indiranagar",
      category: profile.category || user?.category || "Design & Architecture",
      skill: profile.title || proSkill || user?.skill || "",
    });
  };

  const closeEdit = () => {
    setEditingSection(null);
    setEditData(null);
    setPortfolioImageError(null);
    setPortfolioLinkError(null);
    setIsProcessingPortfolioImage(false);
    setAvatarError(null);
  };

  // Auto-open requested edit section when navigated from profile readiness bar
  useEffect(() => {
    if (!editParam) return;
    const timer = setTimeout(() => {
      if (editParam === "portfolio" || editParam === "portfolio-add") {
        openEdit("portfolio-add");
        const el = document.getElementById("portfolio-section");
        if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
      } else if (editParam === "employment") {
        openEdit("employment", {
          id: uid(),
          title: "",
          company: "",
          start_date: "",
          end_date: "",
          is_current: false,
          description: "",
        });
        const el = document.getElementById("employment-section");
        if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
      } else if (editParam === "education") {
        openEdit("education", {
          id: uid(),
          school: "",
          degree: "",
          field: "",
          start_year: "",
          end_year: "",
          is_current: false,
        });
        const el = document.getElementById("education-section");
        if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
      } else if (editParam === "skills") {
        const el = document.getElementById("skills-section");
        if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
      } else if (editParam === "description" || editParam === "bio" || editParam === "title" || editParam === "skill") {
        openEdit("title", {
          title: profile.title || proSkill || user?.skill || "",
          category: profile.category || user?.category || "Design & Architecture",
          phone: (proPhone || user?.phone || "").replace(/\D/g, "").slice(-10),
          area: user?.area || profile.area || localStorage.getItem("workhop_user_area") || "Indiranagar",
          description: profile.description || "",
          rate_hr: profile.rate_hr || 0,
        });
        const el = document.getElementById("overview-section");
        if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
      } else if (editParam === "languages") {
        openEdit("languages", {
          languages: [
            ...(profile.languages || []),
            { language: "", proficiency: "Conversational" },
          ],
        });
        const el = document.getElementById("languages-section");
        if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
      } else if (editParam === "linked") {
        openEdit("linked", { github_url: profile.github_url || "" });
      } else if (editParam === "phone" || editParam === "name" || editParam === "photo" || editParam === "contact") {
        openProfileInfoModal();
      }
    }, 250);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editParam]);

  /* ═══════════ save handlers ═══════════ */
  const saveTitle = (title, description, rateHr, category, phone, area) => {
    syncFreelancerCoreDetails({
      skill: title,
      description,
      rateHr,
      category,
      phone,
      area,
    });
    closeEdit();
  };

  const saveName = (name, picture, phone, area, category, skill) => {
    syncFreelancerCoreDetails({
      name,
      picture,
      phone,
      area,
      category,
      skill,
    });
    closeEdit();
  };

  const saveEmployment = (entry) => {
    const list = [...profile.employment_history];
    const idx = list.findIndex((e) => e.id === entry.id);
    if (idx >= 0) list[idx] = entry;
    else list.unshift(entry);
    persist({ ...profile, employment_history: list });
    closeEdit();
  };

  const deleteEmployment = (id) => {
    persist({
      ...profile,
      employment_history: profile.employment_history.filter((e) => e.id !== id),
    });
  };

  const saveCertification = (entry) => {
    const list = [...profile.certifications];
    const idx = list.findIndex((e) => e.id === entry.id);
    if (idx >= 0) list[idx] = entry;
    else list.unshift(entry);
    persist({ ...profile, certifications: list });
    closeEdit();
  };

  const deleteCertification = (id) => {
    persist({
      ...profile,
      certifications: profile.certifications.filter((e) => e.id !== id),
    });
  };

  const saveEducation = (entry) => {
    const list = [...profile.education];
    const idx = list.findIndex((e) => e.id === entry.id);
    if (idx >= 0) list[idx] = entry;
    else list.unshift(entry);
    persist({ ...profile, education: list });
    closeEdit();
  };

  const deleteEducation = (id) => {
    persist({
      ...profile,
      education: profile.education.filter((e) => e.id !== id),
    });
  };

  const addSkill = (skill) => {
    if (!skill.trim() || profile.skills.includes(skill.trim())) return;
    persist({ ...profile, skills: [...profile.skills, skill.trim()] });
  };

  const removeSkill = (skill) => {
    persist({ ...profile, skills: profile.skills.filter((s) => s !== skill) });
  };

  const saveLanguages = (languages) => {
    persist({ ...profile, languages });
    closeEdit();
  };

  const saveLinkedAccounts = (github_url, github_username) => {
    const updated = { ...profile, github_url, github_username, upwork_url: "" };
    delete updated.upwork_url;
    persist(updated);
    closeEdit();
  };

  const saveAvailability = (hours_per_week, availability) => {
    persist({ ...profile, hours_per_week, availability });
    closeEdit();
  };

  const syncPortfolioImagesToStore = (portfolioList) => {
    const allImages = (portfolioList || []).flatMap((p) =>
      getItemImages(p).map((img) => img.data)
    ).filter(Boolean);
    if (updateUserProfile) {
      updateUserProfile({ portfolio_images: allImages });
    }
    try {
      saveSubmittedProfile({
        id: freelancerId || user?.id || `pro-${(user?.email || user?.name || "user").toLowerCase().replace(/[^a-z0-9]/g, "")}`,
        freelancer_id: freelancerId || user?.id,
        name: user?.name || "WorkHop User",
        email: user?.email || "",
        phone: (proPhone || user?.phone || "").replace(/\D/g, "").slice(-10),
        skill: profile.title || proSkill || user?.skill || "",
        category: profile.category || user?.category || "Design & Architecture",
        area: user?.area || profile.area || "Indiranagar",
        rate_hr: profile.rate_hr || user?.rate_hr || 0,
        intro: profile.description || user?.bio || "",
        portfolio_images: allImages,
        approved: proStatusObj?.approved,
        status: proStatusObj?.status || "approved",
      });
    } catch (_) {}
    return allImages;
  };

  const addPortfolioItem = (item) => {
    const imgs = getItemImages(item);
    const primary = imgs[0] || null;
    const normalizedItem = {
      ...item,
      id: item.id || uid(),
      images: imgs,
      image_data: primary ? primary.data : null,
      image_name: primary ? primary.name : null,
      image_size: primary ? primary.size : null,
    };
    const existingIdx = profile.portfolio.findIndex((p) => p.id === normalizedItem.id);
    let updatedList;
    if (existingIdx >= 0) {
      updatedList = [...profile.portfolio];
      updatedList[existingIdx] = normalizedItem;
    } else {
      updatedList = [...profile.portfolio, normalizedItem];
    }
    const allImages = syncPortfolioImagesToStore(updatedList);
    persist({ ...profile, portfolio: updatedList, portfolio_images: allImages });
    closeEdit();
  };

  const deletePortfolioItem = (id) => {
    const updatedList = profile.portfolio.filter((p) => p.id !== id);
    const allImages = syncPortfolioImagesToStore(updatedList);
    persist({ ...profile, portfolio: updatedList, portfolio_images: allImages });
  };

  /* ═══════════ derived ═══════════ */
  const displayName = user?.name || "Your Name";
  const displayTitle = profile.title || "Your Professional Title";
  const displayRate = profile.rate_hr ? `₹${profile.rate_hr}/hr` : "Set your rate";

  const proStatusObj = useMemo(() => {
    const statuses = getFreelancerStatuses();
    const st = statuses[freelancerId] || statuses[user?.email] || statuses[user?.phone];
    if (st) return st;
    const leads = getStoredLeads({ includeDeclined: true });
    const match = leads.find(
      (l) =>
        l.id === freelancerId ||
        (user?.email && l.email && l.email.toLowerCase() === user.email.toLowerCase()) ||
        (user?.phone && l.phone && l.phone.replace(/\D/g, "") === user.phone.replace(/\D/g, ""))
    );
    if (match) {
      return { approved: match.approved, status: match.status, reason: match.reason };
    }
    return { approved: true, status: "approved" };
  }, [freelancerId, user]);

  const inputCls =
    "w-full bg-[#f9f9f9] dark:bg-[#1a1a1a] border border-[#ddd] dark:border-[#333] rounded-lg px-3 py-2.5 text-sm text-ink dark:text-white placeholder:text-[#999] dark:placeholder:text-[#555] focus:outline-none focus:border-[#E65A1E] transition";
  const labelCls = "text-xs font-semibold text-inkmuted dark:text-[#999] uppercase tracking-wider mb-1.5";

  if (loading) {
    return (
      <Shell>
        <div className="flex items-center justify-center min-h-[60vh] bg-[#F9F9F6] dark:bg-[#0a0a0a]">
          <Loader2 size={32} className="animate-spin text-[#E65A1E]" />
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="min-h-screen bg-[#F9F9F6] dark:bg-[#0a0a0a] text-ink dark:text-white selection:bg-[#E65A1E]">
        {/* TOP NAV BAR WITH SETTINGS MENU ON THE RIGHT */}
        <div className="border-b border-[#e5e5e5] dark:border-[#1a1a1a] bg-white/90 dark:bg-[#111]/90 backdrop-blur sticky top-0 z-30">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-8">
            <button
              onClick={() => nav("/freelancer/jobs")}
              data-testid="profile-back-btn"
              className="flex items-center gap-2 text-sm text-[#E65A1E] hover:text-[#F06B2E] transition font-semibold"
            >
              <ChevronLeft size={16} />
              Back to Dashboard
            </button>

            <div className="flex items-center gap-2">
              {user?.is_admin && (
                <button
                  type="button"
                  data-testid="profile-switch-employer-btn"
                  onClick={() => {
                    localStorage.setItem("workhop_auth_role", "employer");
                    nav("/employer/dashboard");
                  }}
                  className="hidden sm:flex items-center gap-1.5 rounded-lg border border-[#ddd] dark:border-[#333] bg-[#FFF3C4] px-3 py-1.5 text-xs font-black text-ink hover:bg-[#FFEAA0] transition shadow-xs"
                  title="Switch to Employer Dashboard (Admin)"
                >
                  <Building2 size={14} className="text-brand" />
                  <span>EMPLOYER DASHBOARD</span>
                </button>
              )}

              <button
                onClick={() => setMenuDrawerOpen(true)}
                data-testid="profile-top-menu-btn"
                className="flex items-center gap-2 rounded-lg border border-[#ddd] dark:border-[#333] bg-white dark:bg-[#1a1a1a] px-3.5 py-1.5 text-xs font-bold text-ink dark:text-white hover:bg-gray-100 dark:hover:bg-[#252525] hover:border-[#E65A1E] transition shadow-sm active:translate-y-0.5"
              >
                <Menu size={16} className="text-[#E65A1E]" />
                <span>MENU & SETTINGS</span>
              </button>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-8 py-8">
          <PushNotificationPrompt className="mb-6" />

          {/* Freelancer Profile Verification Alert Banner */}
          {proStatusObj?.status === "pending" || (!proStatusObj?.approved && proStatusObj?.status !== "declined") ? (
            <div data-testid="profile-pending-verification-banner" className="mb-6 rounded-xl border-2 border-amber-400 bg-amber-50 p-4 shadow-sm dark:bg-amber-950/30 dark:border-amber-600">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-400 text-ink shadow-sm">
                  <Clock size={20} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="rounded bg-amber-200 px-2 py-0.5 text-[10px] font-black uppercase text-amber-900 dark:bg-amber-800 dark:text-amber-100">
                      ⏳ Verification Under Review
                    </span>
                    <span className="text-xs text-amber-700 dark:text-amber-300 font-bold">
                      Awaiting Admin Approval
                    </span>
                  </div>
                  <p className="mt-1 text-sm font-bold text-ink dark:text-white">
                    Your profile has been submitted and is currently being reviewed by the WorkHop Admin team.
                  </p>
                  <p className="text-xs text-inkmuted dark:text-gray-300 mt-0.5">
                    We verify every freelancer's portfolio, identity, and skills before publishing to maintain marketplace quality. Once approved, your profile will go live in the Bengaluru talent directory. You can continue updating your portfolio and bio below in the meantime.
                  </p>
                </div>
              </div>
            </div>
          ) : proStatusObj?.status === "declined" ? (
            <div data-testid="profile-declined-verification-banner" className="mb-6 rounded-xl border-2 border-red-400 bg-red-50 p-4 shadow-sm dark:bg-red-950/30 dark:border-red-600">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-500 text-white shadow-sm">
                  <AlertTriangle size={20} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-red-200 px-2 py-0.5 text-[10px] font-black uppercase text-red-900 dark:bg-red-800 dark:text-red-100">
                      ✕ Verification Declined
                    </span>
                  </div>
                  <p className="mt-1 text-sm font-bold text-red-900 dark:text-red-200">
                    Your profile requires updates before it can be verified.
                  </p>
                  {proStatusObj?.reason && (
                    <p className="text-xs font-semibold text-red-800 dark:text-red-300 mt-1">
                      Reason from Admin: {proStatusObj.reason}
                    </p>
                  )}
                  <p className="text-xs text-inkmuted dark:text-gray-300 mt-1">
                    Please update your portfolio links, work samples, or bio below to resubmit for approval.
                  </p>
                </div>
              </div>
            </div>
          ) : null}

          <div className="flex flex-col lg:flex-row gap-8">
            {/* ═══════════ LEFT SIDEBAR ═══════════ */}
            <aside className="lg:w-[320px] shrink-0 flex flex-col gap-5 lg:sticky lg:top-8 lg:self-start">
              {/* Profile Card */}
              <div className="bg-white dark:bg-[#111] border border-[#e5e5e5] dark:border-[#222] rounded-xl p-6 shadow-sm">
                <div className="flex flex-col items-center text-center">
                  {/* Avatar */}
                  <div className="relative group mb-4">
                    <button
                      type="button"
                      onClick={openProfileInfoModal}
                      className="relative block rounded-full overflow-hidden focus:outline-none focus:ring-2 focus:ring-[#E65A1E]/50"
                      title="Click to edit profile photo, phone & details"
                      data-testid="avatar-edit-button"
                    >
                      {user?.picture ? (
                        <img
                          src={user.picture}
                          alt={displayName}
                          className="h-24 w-24 rounded-full object-cover border-2 border-white dark:border-[#222] shadow-sm group-hover:opacity-85 transition"
                        />
                      ) : (
                        <div className="h-24 w-24 rounded-full bg-[#E65A1E] flex items-center justify-center text-3xl font-bold text-white border-2 border-white dark:border-[#222] shadow-sm group-hover:brightness-105 transition">
                          {displayName.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/45 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition rounded-full text-white cursor-pointer">
                        <Camera size={22} className="drop-shadow" />
                        <span className="text-[10px] font-semibold mt-0.5">Edit</span>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={openProfileInfoModal}
                      className="absolute bottom-0 right-0 h-7 w-7 rounded-full bg-[#E65A1E] flex items-center justify-center text-white shadow-lg hover:bg-[#D44F17] transition"
                      title="Edit profile, phone number & category"
                      data-testid="avatar-pencil-button"
                    >
                      <Pencil size={12} />
                    </button>
                  </div>
                  <h2 className="text-lg font-bold text-ink dark:text-white">{displayName}</h2>
                  {(profile.category || user?.category) && (
                    <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-[#E65A1E]/10 px-2.5 py-0.5 text-[11px] font-bold text-[#E65A1E]">
                      {profile.category || user?.category}
                    </span>
                  )}
                  <p className="text-xs text-inkmuted dark:text-[#888] mt-1.5 flex items-center justify-center gap-1 flex-wrap">
                    <MapPin size={12} className="text-[#E65A1E] shrink-0" />
                    <span>{user?.area || profile.area || "Bengaluru"}</span>
                    {user?.email ? <span>· {user.email}</span> : null}
                  </p>
                  {(proPhone || user?.phone) ? (
                    <p className="text-xs font-semibold text-ink dark:text-stone-300 mt-1 flex items-center justify-center gap-1">
                      <Phone size={12} className="text-[#E65A1E] shrink-0" />
                      <span>+91 {(proPhone || user?.phone || "").replace(/\D/g, "").slice(-10)}</span>
                    </p>
                  ) : (
                    <button
                      type="button"
                      onClick={openProfileInfoModal}
                      className="mt-1.5 inline-flex items-center gap-1 text-xs font-bold text-amber-600 dark:text-amber-400 hover:underline"
                    >
                      <Phone size={12} /> + Add your phone number
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={openProfileInfoModal}
                    data-testid="edit-profile-contact-btn"
                    className="mt-3.5 w-full flex items-center justify-center gap-1.5 rounded-lg border border-[#ddd] dark:border-[#333] bg-[#f9f9f9] dark:bg-[#1a1a1a] hover:border-[#E65A1E] hover:text-[#E65A1E] px-3 py-2 text-xs font-bold text-ink dark:text-white transition"
                  >
                    <Pencil size={12} className="text-[#E65A1E]" />
                    <span>Edit Profile, Phone &amp; Category</span>
                  </button>
                </div>

                {/* Quick stats */}
                <div className="flex items-center justify-center gap-4 mt-4 pt-4 border-t border-[#e5e5e5] dark:border-[#222]">
                  <div className="text-center">
                    <p className="text-lg font-bold text-ink dark:text-white">
                      {profile.employment_history.length}
                    </p>
                    <p className="text-[10px] text-inkmuted dark:text-[#666] uppercase tracking-wider">Jobs</p>
                  </div>
                  <div className="w-px h-8 bg-[#e5e5e5] dark:bg-[#222]" />
                  <div className="text-center">
                    <p className="text-lg font-bold text-ink dark:text-white">{profile.skills.length}</p>
                    <p className="text-[10px] text-inkmuted dark:text-[#666] uppercase tracking-wider">Skills</p>
                  </div>
                  <div className="w-px h-8 bg-[#e5e5e5] dark:bg-[#222]" />
                  <div className="text-center">
                    <p className="text-lg font-bold text-ink dark:text-white">
                      {profile.portfolio.length}
                    </p>
                    <p className="text-[10px] text-inkmuted dark:text-[#666] uppercase tracking-wider">Works</p>
                  </div>
                </div>
              </div>

              {/* ═══════════ CONNECTS & CREDITS WALLET (UPWORK-STYLE) ═══════════ */}
              <div
                data-testid="credits-wallet-card"
                className="border-2 border-ink bg-white dark:bg-[#141414] p-5 shadow-[3px_3px_0px_#121212] transition hover:translate-x-0.5 hover:translate-y-0.5"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="flex h-8 w-8 items-center justify-center border-2 border-ink bg-[#FFF3C4] text-[#E65A1E]">
                      <Coins size={18} />
                    </span>
                    <div>
                      <p className="text-xs font-black uppercase text-ink dark:text-white">Connects & Credits</p>
                      <p className="text-[10px] text-inkmuted dark:text-stone-400">Bidding & Proposal Wallet</p>
                    </div>
                  </div>
                  {creditsWallet.subscription_status === "active" ? (
                    <span className="border border-ink bg-ok px-2 py-0.5 text-[8px] font-black uppercase text-white shadow-[1px_1px_0px_#121212]">
                      Pro Pass Active
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold text-inkmuted dark:text-stone-400">
                      Standard
                    </span>
                  )}
                </div>

                {/* Big Balance Number */}
                <div className="mt-4 flex items-baseline justify-between border-y-2 border-ink/20 py-3">
                  <div>
                    <span className="text-[9px] font-black uppercase tracking-wider text-inkmuted dark:text-stone-400">
                      AVAILABLE BALANCE
                    </span>
                    <p className="text-2xl font-black text-ink dark:text-white flex items-center gap-1.5" data-testid="profile-credits-balance">
                      <Coins size={22} className="text-brand" /> {creditsWallet.balance} <span className="text-xs font-bold text-inkmuted">Credits</span>
                    </p>
                  </div>
                  <button
                    type="button"
                    data-testid="view-credit-history-btn"
                    onClick={() => {
                      setCreditTxs(getCreditTransactions(freelancerId));
                      setTxHistoryOpen(true);
                    }}
                    className="flex items-center gap-1 text-[11px] font-black text-brand underline hover:opacity-80"
                  >
                    <History size={12} /> History
                  </button>
                </div>

                {/* Quick Action Buttons */}
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    data-testid="profile-topup-btn"
                    onClick={() => setCreditsModalOpen(true)}
                    className="flex-1 flex items-center justify-center gap-1 border-2 border-ink bg-ink py-2 text-xs font-black text-white hover:bg-black transition shadow-[2px_2px_0px_#121212] active:translate-y-0.5"
                  >
                    <Plus size={13} /> TOP UP
                  </button>
                  <button
                    type="button"
                    data-testid="profile-pro-pass-btn"
                    onClick={() => setCreditsModalOpen(true)}
                    className="flex-1 flex items-center justify-center gap-1 border-2 border-ink bg-brand py-2 text-xs font-black text-white hover:bg-brand/90 transition shadow-[2px_2px_0px_#121212] active:translate-y-0.5"
                  >
                    <Sparkles size={13} /> PRO PASS
                  </button>
                </div>
              </div>

              {/* Hours per week */}
              <SidebarSection
                icon={<Clock size={16} />}
                title="Hours per week"
                onEdit={() =>
                  openEdit("availability", {
                    hours_per_week: profile.hours_per_week,
                    availability: profile.availability,
                  })
                }
              >
                <p className="text-sm text-ink dark:text-[#ccc]">{profile.hours_per_week || "Not set"}</p>
                <p className="text-xs text-inkmuted dark:text-[#666] mt-0.5">
                  {profile.availability || ""}
                </p>
              </SidebarSection>

              {/* Languages */}
              <SidebarSection
                id="languages-section"
                icon={<Globe size={16} />}
                title="Languages"
                onEdit={() => openEdit("languages", { languages: [...profile.languages] })}
                onAdd={() =>
                  openEdit("languages", {
                    languages: [
                      ...profile.languages,
                      { language: "", proficiency: "Conversational" },
                    ],
                  })
                }
              >
                {profile.languages.length > 0 ? (
                  <div className="flex flex-col gap-1">
                    {profile.languages.map((l, i) => (
                      <div key={i} className="flex items-baseline justify-between">
                        <span className="text-sm text-ink dark:text-[#ccc]">{l.language}</span>
                        <span className="text-xs text-inkmuted dark:text-[#666]">{l.proficiency}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-inkmuted dark:text-[#555] italic">Add your languages</p>
                )}
              </SidebarSection>

              {/* Linked Accounts */}
              <SidebarSection
                icon={<Link2 size={16} />}
                title="Linked accounts"
                onEdit={() =>
                  openEdit("linked", {
                    github_url: profile.github_url,
                    github_username: profile.github_username,
                  })
                }
              >
                {profile.github_url ? (
                  <a
                    href={profile.github_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-ink dark:text-[#ccc] hover:text-[#E65A1E] transition"
                  >
                    <Github size={16} className="text-inkmuted dark:text-[#888]" />
                    <span>{profile.github_username || "GitHub"}</span>
                    <ExternalLink size={12} className="text-inkmuted dark:text-[#555]" />
                  </a>
                ) : (
                  <p className="text-xs text-inkmuted dark:text-[#555] italic">Link your GitHub account</p>
                )}
              </SidebarSection>

              {/* DPDP ACT PRIVACY & ACCOUNT ERASURE */}
              <div className="border-2 border-ink bg-[#FFF8F5] dark:bg-[#1a1412] p-4 text-xs shadow-[2px_2px_0px_#121212]">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-mono text-[9px] font-black uppercase tracking-wider text-brand">
                    DPDP ACT, 2023
                  </span>
                  <span className="text-[9px] bg-ink text-white px-1.5 py-0.5 font-black">
                    SEC 12
                  </span>
                </div>
                <p className="text-[11px] font-bold text-ink dark:text-white">
                  Data Protection &amp; Erasure
                </p>
                <p className="text-[10px] text-inkmuted dark:text-stone-400 mt-1 leading-relaxed">
                  Exercise your statutory right to erase your freelancer profile, portfolio, and personal data.
                </p>
                <button
                  type="button"
                  data-testid="freelancer-delete-account-btn"
                  onClick={() => setDeleteModalOpen(true)}
                  className="mt-3 w-full flex items-center justify-center gap-1.5 border border-danger text-danger hover:bg-danger hover:text-white py-1.5 px-2 text-[10px] font-black tracking-wider transition"
                >
                  <Trash2 size={12} /> DELETE PROFILE &amp; DATA
                </button>
              </div>
            </aside>

            {/* ═══════════ MAIN CONTENT ═══════════ */}
            <main className="flex-1 flex flex-col gap-6 min-w-0">
              {/* Title + Rate + Description */}
              <section id="overview-section" className="bg-white dark:bg-[#111] border border-[#e5e5e5] dark:border-[#222] rounded-xl p-6 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 flex-wrap">
                      <h1 className="text-xl font-bold text-ink dark:text-white">{displayTitle}</h1>
                      <EditBtn
                        onClick={() =>
                          openEdit("title", {
                            title: profile.title || proSkill || user?.skill || "",
                            category: profile.category || user?.category || "Design & Architecture",
                            phone: (proPhone || user?.phone || "").replace(/\D/g, "").slice(-10),
                            area: user?.area || profile.area || localStorage.getItem("workhop_user_area") || "Indiranagar",
                            description: profile.description,
                            rate_hr: profile.rate_hr,
                          })
                        }
                      />
                    </div>
                    <p className="text-[#E65A1E] font-semibold text-lg mt-1">
                      {displayRate}
                    </p>
                  </div>
                </div>
                {profile.description ? (
                  <div className="mt-4 pt-4 border-t border-[#e5e5e5] dark:border-[#222]">
                    <p className="text-sm text-ink dark:text-[#bbb] leading-relaxed whitespace-pre-wrap">
                      {profile.description}
                    </p>
                  </div>
                ) : (
                  <div className="mt-4 pt-4 border-t border-[#e5e5e5] dark:border-[#222]">
                    <p className="text-sm text-inkmuted dark:text-[#555] italic">
                      Write a professional description about yourself, your experience, and what you
                      can offer to clients...
                    </p>
                  </div>
                )}
              </section>

              {/* Portfolio */}
              <section id="portfolio-section" className="bg-white dark:bg-[#111] border border-[#e5e5e5] dark:border-[#222] rounded-xl p-6 shadow-sm">
                <SectionHeader
                  title="Portfolio"
                  onAdd={() => openEdit("portfolio-add", { title: "", description: "", link: "", images: [] })}
                />
                {profile.portfolio.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-4">
                    {profile.portfolio.map((item) => {
                      const itemImages = getItemImages(item);
                      const coverImg = itemImages[0]?.data || item.image_data;
                      return (
                        <div
                          key={item.id}
                          onClick={() => {
                            if (itemImages.length > 0) {
                              setActiveGallery({
                                title: item.title || "Portfolio Project",
                                images: itemImages,
                                index: 0,
                              });
                            }
                          }}
                          className={`group relative bg-[#f0f0f0] dark:bg-[#1a1a1a] border border-[#e5e5e5] dark:border-[#222] rounded-lg overflow-hidden aspect-[4/3] ${
                            itemImages.length > 0 ? "cursor-pointer" : ""
                          }`}
                        >
                          {itemImages.length > 1 && (
                            <span className="absolute top-2.5 right-2.5 z-10 inline-flex items-center gap-1 rounded-full bg-black/75 px-2.5 py-1 text-[10px] font-bold text-white backdrop-blur-sm border border-white/15 shadow-sm">
                              <ImageIcon size={11} className="text-[#FF8547]" />
                              {itemImages.length} Images
                            </span>
                          )}
                          {coverImg ? (
                            <img
                              src={
                                coverImg.startsWith("data:") || coverImg.startsWith("http")
                                  ? coverImg
                                  : `data:image/jpeg;base64,${coverImg}`
                              }
                              alt={item.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                          ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center text-inkmuted dark:text-[#555] p-3 text-center bg-[#f7f7f7] dark:bg-[#1a1a1a]">
                              <Code2 size={28} className="text-[#E65A1E]/70 mb-1" />
                              <p className="text-xs font-bold text-ink dark:text-white line-clamp-1">{item.title}</p>
                              {item.link && (
                                <span className="text-[10px] text-inkmuted dark:text-[#888] truncate max-w-[90%] mt-0.5">
                                  {item.link.replace(/^https?:\/\//i, "")}
                                </span>
                              )}
                            </div>
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition flex items-end p-3">
                            <div className="flex-1 min-w-0 pr-2">
                              <p className="text-sm font-semibold text-white truncate">
                                {item.title}
                              </p>
                              {item.link && (
                                <a
                                  href={item.link.startsWith("http") ? item.link : `https://${item.link}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="inline-flex items-center gap-1 text-[11px] font-bold text-[#FF8547] hover:text-white hover:underline mt-0.5"
                                  title="Open verified project link"
                                >
                                  <span>View Project</span>
                                  <ExternalLink size={11} />
                                </a>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openEdit("portfolio-add", {
                                    ...item,
                                    images: itemImages,
                                  });
                                }}
                                className="h-7 w-7 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white hover:bg-[#E65A1E] transition"
                                title="Edit project or add more images"
                              >
                                <Pencil size={12} />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deletePortfolioItem(item.id);
                                }}
                                className="h-7 w-7 rounded-full bg-red-500/80 flex items-center justify-center text-white hover:bg-red-600 transition"
                                title="Delete portfolio item"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <EmptyState text="Showcase your best work — add portfolio items" />
                )}
              </section>

              {/* Work History & Client Reviews */}
              <section className="bg-white dark:bg-[#111] border border-[#e5e5e5] dark:border-[#222] rounded-xl p-6 shadow-sm">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <History size={18} className="text-[#E65A1E]" />
                    <h2 className="text-base font-bold text-ink dark:text-white">
                      Work History &amp; Client Feedback
                    </h2>
                    <span className="text-xs font-bold text-[#E65A1E] bg-[#E65A1E]/10 px-2 py-0.5 rounded-full">
                      {(profile.work_history || []).length} Completed Gigs
                    </span>
                  </div>
                </div>

                {/* Rating & Performance Summary Banner */}
                {(() => {
                  const historyList = profile.work_history || [];
                  const completedCount = historyList.length;
                  const avgRating =
                    completedCount > 0
                      ? (
                          historyList.reduce((acc, curr) => acc + (Number(curr.rating) || 5), 0) /
                          completedCount
                        ).toFixed(1)
                      : null;
                  const successCount = historyList.filter((g) => (Number(g.rating) || 5) >= 4).length;
                  const jobSuccessPct =
                    completedCount > 0 ? `${Math.round((successCount / completedCount) * 100)}%` : "—";

                  return (
                    <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-[#F9F9FB] dark:bg-[#161618] border border-[#e5e5e5] dark:border-[#252528] rounded-lg">
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex h-11 w-11 items-center justify-center rounded-lg font-black text-lg ${
                            completedCount > 0
                              ? "bg-amber-500/10 text-amber-500"
                              : "bg-stone-200/60 dark:bg-stone-800 text-stone-400 dark:text-stone-500"
                          }`}
                        >
                          ★
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm sm:text-base font-black text-ink dark:text-white">
                              {avgRating ? avgRating : "No rating yet"}
                            </span>
                            {avgRating && (
                              <div className="flex text-amber-500 text-xs">
                                {"★".repeat(Math.max(1, Math.min(5, Math.round(Number(avgRating)))))}
                              </div>
                            )}
                          </div>
                          <p className="text-xs text-inkmuted dark:text-[#888]">
                            {completedCount > 0
                              ? `Average Rating (${completedCount} ${completedCount === 1 ? "review" : "reviews"})`
                              : "0 reviews"}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 border-t sm:border-t-0 sm:border-l border-[#e5e5e5] dark:border-[#252528] pt-2 sm:pt-0 sm:pl-3">
                        <div
                          className={`flex h-11 w-11 items-center justify-center rounded-lg font-black ${
                            completedCount > 0
                              ? "bg-ok/10 text-ok"
                              : "bg-stone-200/60 dark:bg-stone-800 text-stone-400 dark:text-stone-500"
                          }`}
                        >
                          <ShieldCheck size={22} />
                        </div>
                        <div>
                          <span className="text-sm sm:text-base font-black text-ink dark:text-white">
                            {completedCount > 0 ? jobSuccessPct : "Not yet rated"}
                          </span>
                          <p className="text-xs text-inkmuted dark:text-[#888]">
                            Job Success Score
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 border-t sm:border-t-0 sm:border-l border-[#e5e5e5] dark:border-[#252528] pt-2 sm:pt-0 sm:pl-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-[#E65A1E]/10 text-[#E65A1E] font-black">
                          <Sparkles size={20} />
                        </div>
                        <div>
                          <span className="text-sm font-black text-ink dark:text-white">
                            {completedCount} Completed {completedCount === 1 ? "Gig" : "Gigs"}
                          </span>
                          <p className="text-xs text-inkmuted dark:text-[#888]">Verified WorkHop Deals</p>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* List of completed gigs & reviews */}
                {gigNotice && (
                  <div className="mt-3 p-3 bg-[#E5F7E0] dark:bg-[#132c18] border border-[#0E6220] text-[#0E6220] dark:text-[#6ee7b7] rounded-lg text-xs flex items-center justify-between animate-in fade-in">
                    <span className="font-bold flex items-center gap-1.5">
                      <CheckCircle2 size={16} /> Job Completed · "{gigNotice}" milestone approved &amp; delivered!
                    </span>
                    <button
                      type="button"
                      onClick={() => setGigNotice(null)}
                      className="text-xs font-black underline ml-2"
                    >
                      ✕
                    </button>
                  </div>
                )}

                <div className="mt-4 flex flex-col gap-3">
                  {(profile.work_history || []).length > 0 ? (
                    (profile.work_history || []).map((gig) => (
                      <div
                        key={gig.id}
                        onClick={() => setGigNotice(gig.job_title)}
                        className="bg-[#fcfcfc] dark:bg-[#151517] border border-[#e5e5e5] dark:border-[#26262a] rounded-lg p-4 flex flex-col gap-2.5 transition hover:border-[#E65A1E]/40 cursor-pointer hover:bg-[#E5F7E0]/20"
                        title="Click to view: Job Completed"
                      >
                        <div className="flex items-start justify-between gap-3 flex-wrap">
                          <div>
                            <h3 className="text-sm font-bold text-ink dark:text-white flex items-center gap-1.5 flex-wrap">
                              <span>{gig.job_title}</span>
                              <span className="inline-flex items-center gap-1 text-[10px] font-black text-ok bg-ok/10 px-2 py-0.5 rounded border border-ok/20">
                                <CheckCircle2 size={11} /> Job Completed
                              </span>
                            </h3>
                            <p className="text-xs text-inkmuted dark:text-[#777] mt-0.5">
                              {gig.company_name || "Bengaluru Client"} · {gig.date_formatted || "Recently completed"}
                            </p>
                          </div>

                          <div className="text-right">
                            <span className="text-sm font-black text-ink dark:text-white">
                              ₹{Number(gig.pay || 15000).toLocaleString("en-IN")}
                            </span>
                            <p className="text-[10px] text-inkmuted dark:text-[#777]">Fixed Price Gig</p>
                          </div>
                        </div>

                        {/* Stars & Badges */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <div className="flex items-center text-amber-500 font-bold text-xs gap-1">
                            <span>{"★".repeat(Math.min(5, Math.floor(gig.rating || 5)))}</span>
                            <span className="text-ink dark:text-white font-black">{Number(gig.rating || 5).toFixed(1)}</span>
                          </div>

                          {Array.isArray(gig.badges) && gig.badges.map((b) => (
                            <span
                              key={b}
                              className="text-[10px] font-bold text-ink dark:text-stone-300 bg-sand dark:bg-stone-800 border border-ink/20 dark:border-stone-700 px-2 py-0.5 rounded-full"
                            >
                              {b}
                            </span>
                          ))}
                        </div>

                        {/* Employer Review / Feedback Quote */}
                        {gig.review ? (
                          <div className="bg-white dark:bg-[#1a1a1c] border-l-2 border-[#E65A1E] p-3 text-xs text-ink dark:text-[#ccc] italic leading-relaxed">
                            "{gig.review}"
                            <div className="not-italic font-bold text-[11px] text-inkmuted dark:text-[#888] mt-1.5">
                              — {gig.employer_name || "Verified Employer"}, {gig.company_name || "Bengaluru Client"}
                            </div>
                          </div>
                        ) : null}
                      </div>
                    ))
                  ) : (
                    <EmptyState
                      text="No completed work history yet. Reviews from employers after gigs are finished will show up here automatically."
                      icon={<History size={28} className="text-inkmuted dark:text-[#444]" />}
                    />
                  )}
                </div>
              </section>

              {/* Employment History */}
              <section id="employment-section" className="bg-white dark:bg-[#111] border border-[#e5e5e5] dark:border-[#222] rounded-xl p-6 shadow-sm">
                <SectionHeader
                  title="Employment history"
                  onAdd={() =>
                    openEdit("employment", {
                      id: uid(),
                      title: "",
                      company: "",
                      start_date: "",
                      end_date: "",
                      is_current: false,
                      description: "",
                    })
                  }
                  expanded={expandedEmployment}
                  onToggle={() => setExpandedEmployment((v) => !v)}
                />
                {expandedEmployment && (
                  <div className="mt-4 flex flex-col gap-4">
                    {profile.employment_history.length > 0 ? (
                      profile.employment_history.map((entry) => (
                        <HistoryCard
                          key={entry.id}
                          entry={entry}
                          onEdit={() => openEdit("employment", { ...entry })}
                          onDelete={() => deleteEmployment(entry.id)}
                        />
                      ))
                    ) : (
                      <EmptyState text="Add your work experience to build credibility" />
                    )}
                  </div>
                )}
              </section>

              {/* Certifications */}
              <section id="certifications-section" className="bg-white dark:bg-[#111] border border-[#e5e5e5] dark:border-[#222] rounded-xl p-6 shadow-sm">
                <SectionHeader
                  title="Certifications"
                  onAdd={() =>
                    openEdit("certification", {
                      id: uid(),
                      name: "",
                      issuer: "",
                      year: new Date().getFullYear(),
                      url: "",
                    })
                  }
                  expanded={expandedCerts}
                  onToggle={() => setExpandedCerts((v) => !v)}
                />
                {expandedCerts && (
                  <div className="mt-4 flex flex-col gap-3">
                    {profile.certifications.length > 0 ? (
                      profile.certifications.map((cert) => (
                        <div
                          key={cert.id}
                          className="flex items-start justify-between bg-[#f9f9f9] dark:bg-[#1a1a1a] border border-[#e5e5e5] dark:border-[#222] rounded-lg p-4"
                        >
                          <div className="flex items-start gap-3">
                            <div className="h-10 w-10 rounded-lg bg-[#E65A1E]/10 flex items-center justify-center shrink-0">
                              <Award size={18} className="text-[#E65A1E]" />
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-ink dark:text-white">
                                {cert.name}
                              </p>
                              <p className="text-xs text-inkmuted dark:text-[#888] mt-0.5">
                                {cert.issuer}
                                {cert.year ? ` · ${cert.year}` : ""}
                              </p>
                              {cert.url && (
                                <a
                                  href={cert.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs text-[#E65A1E] hover:underline mt-1 inline-flex items-center gap-1"
                                >
                                  View credential <ExternalLink size={10} />
                                </a>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <EditBtn
                              onClick={() => openEdit("certification", { ...cert })}
                            />
                            <DeleteBtn onClick={() => deleteCertification(cert.id)} />
                          </div>
                        </div>
                      ))
                    ) : (
                      <EmptyState text="Listing certifications helps prove your knowledge (+10%)" icon={<Award size={28} className="text-inkmuted dark:text-[#444]" />} />
                    )}
                  </div>
                )}
              </section>

              {/* Skills */}
              <section id="skills-section" className="bg-white dark:bg-[#111] border border-[#e5e5e5] dark:border-[#222] rounded-xl p-6 shadow-sm">
                <SectionHeader title="Skills" onEdit={() => openEdit("skills")} />
                <div className="mt-4">
                  {profile.skills.length > 0 ? (
                    <>
                      <p className="text-xs text-inkmuted dark:text-[#666] mb-3">Self-reported</p>
                      <div className="flex flex-wrap gap-2">
                        {profile.skills.map((skill) => (
                          <span
                            key={skill}
                            className="group relative px-3 py-1.5 text-xs font-medium text-ink dark:text-[#ccc] bg-[#f0f0f0] dark:bg-[#1a1a1a] border border-[#ddd] dark:border-[#333] rounded-full hover:border-[#E65A1E] transition cursor-default"
                          >
                            {skill}
                            <button
                              onClick={() => removeSkill(skill)}
                              className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
                            >
                              <X size={8} />
                            </button>
                          </span>
                        ))}
                      </div>
                    </>
                  ) : (
                    <EmptyState text="Add skills to help clients find you" />
                  )}

                  {/* Quick add */}
                  <div className="mt-4 flex gap-2">
                    <input
                      value={skillInput}
                      onChange={(e) => setSkillInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          addSkill(skillInput);
                          setSkillInput("");
                        }
                      }}
                      placeholder="Type a skill and press Enter"
                      className={inputCls}
                    />
                    <button
                      onClick={() => {
                        addSkill(skillInput);
                        setSkillInput("");
                      }}
                      className="px-4 py-2 bg-[#E65A1E] text-white text-sm font-semibold rounded-lg hover:bg-[#D44F17] transition shrink-0"
                    >
                      Add
                    </button>
                  </div>

                  {/* Suggestions */}
                  {profile.skills.length < 15 && (
                    <div className="mt-3">
                      <p className="text-xs text-inkmuted dark:text-[#555] mb-2">Suggested:</p>
                      <div className="flex flex-wrap gap-1.5">
                        {SKILL_SUGGESTIONS.filter(
                          (s) => !profile.skills.includes(s)
                        )
                          .slice(0, 8)
                          .map((s) => (
                            <button
                              key={s}
                              onClick={() => addSkill(s)}
                              className="px-2.5 py-1 text-[11px] text-inkmuted dark:text-[#888] border border-[#ddd] dark:border-[#2a2a2a] rounded-full hover:border-[#E65A1E] hover:text-[#E65A1E] transition"
                            >
                              + {s}
                            </button>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              </section>

              {/* Education */}
              <section id="education-section" className="bg-white dark:bg-[#111] border border-[#e5e5e5] dark:border-[#222] rounded-xl p-6 shadow-sm">
                <SectionHeader
                  title="Education"
                  onAdd={() =>
                    openEdit("education", {
                      id: uid(),
                      school: "",
                      degree: "",
                      field: "",
                      start_year: "",
                      end_year: "",
                      is_current: false,
                    })
                  }
                />
                <div className="mt-4 flex flex-col gap-3">
                  {profile.education.length > 0 ? (
                    profile.education.map((edu) => (
                      <div
                        key={edu.id}
                        className="flex items-start justify-between bg-[#f9f9f9] dark:bg-[#1a1a1a] border border-[#e5e5e5] dark:border-[#222] rounded-lg p-4"
                      >
                        <div className="flex items-start gap-3">
                          <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
                            <GraduationCap size={18} className="text-blue-500 dark:text-blue-400" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-ink dark:text-white">
                              {edu.school}
                            </p>
                            <p className="text-xs text-inkmuted dark:text-[#888] mt-0.5">
                              {edu.degree}
                              {edu.field ? `, ${edu.field}` : ""}
                            </p>
                            <p className="text-xs text-inkmuted dark:text-[#555] mt-0.5">
                              {edu.start_year}
                              {" - "}
                              {edu.is_current
                                ? "Present"
                                : edu.end_year || ""}
                              {edu.is_current ? " (expected)" : ""}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <EditBtn
                            onClick={() => openEdit("education", { ...edu })}
                          />
                          <DeleteBtn onClick={() => deleteEducation(edu.id)} />
                        </div>
                      </div>
                    ))
                  ) : (
                    <EmptyState text="Add your educational background" icon={<GraduationCap size={28} className="text-inkmuted dark:text-[#444]" />} />
                  )}
                </div>
              </section>
            </main>
          </div>
        </div>
      </div>

      {/* ═══════════ MODALS ═══════════ */}

      {/* Title & Rate & Description */}
      <EditModal
        isOpen={editingSection === "title"}
        onClose={closeEdit}
        title="Edit Title, Category, Rate & Bio"
        onSave={() =>
          saveTitle(
            editData?.title,
            editData?.description,
            editData?.rate_hr,
            editData?.category,
            editData?.phone,
            editData?.area
          )
        }
        wide
      >
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p className={labelCls}>Your Professional Title / Primary Skill</p>
              <input
                value={editData?.title || ""}
                onChange={(e) =>
                  setEditData((d) => ({ ...d, title: e.target.value }))
                }
                placeholder="e.g. Architecture & Interior Design"
                className={inputCls}
                data-testid="edit-title-input"
              />
            </div>
            <div>
              <p className={labelCls}>Service Category / Discipline</p>
              <select
                value={editData?.category || "Design & Architecture"}
                onChange={(e) =>
                  setEditData((d) => ({ ...d, category: e.target.value }))
                }
                className={inputCls}
                data-testid="edit-category-select"
              >
                {SERVICE_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p className={labelCls}>WhatsApp / Mobile Number (10 Digits)</p>
              <div className="flex items-center border border-[#ddd] dark:border-[#333] bg-[#f9f9f9] dark:bg-[#1a1a1a] px-3 py-2.5 rounded-lg focus-within:border-[#E65A1E]">
                <span className="font-bold text-inkmuted dark:text-[#888] mr-2 text-sm">+91</span>
                <input
                  type="tel"
                  maxLength={10}
                  value={editData?.phone || ""}
                  onChange={(e) =>
                    setEditData((d) => ({
                      ...d,
                      phone: e.target.value.replace(/\D/g, "").slice(0, 10),
                    }))
                  }
                  placeholder="9876543210"
                  className="w-full bg-transparent text-sm font-semibold text-ink dark:text-white outline-none"
                  data-testid="edit-title-phone-input"
                />
              </div>
            </div>
            <div>
              <p className={labelCls}>Bengaluru Area / Locality</p>
              <select
                value={editData?.area || "Indiranagar"}
                onChange={(e) =>
                  setEditData((d) => ({ ...d, area: e.target.value }))
                }
                className={inputCls}
                data-testid="edit-title-area-select"
              >
                {BENGALURU_AREAS.map((a) => (
                  <option key={a.name} value={a.name}>
                    {a.name} ({a.zone})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <p className={labelCls}>Hourly Rate (₹ INR / hr)</p>
            <div className="flex items-center border border-ink/20 dark:border-stone-700 bg-white dark:bg-stone-900 px-3 py-2 rounded-lg">
              <span className="font-bold text-ink dark:text-white mr-1.5">₹</span>
              <input
                type="number"
                min={100}
                max={50000}
                step={50}
                value={editData?.rate_hr || ""}
                onChange={(e) =>
                  setEditData((d) => ({
                    ...d,
                    rate_hr: e.target.value,
                  }))
                }
                placeholder="500"
                className="w-full bg-transparent text-sm font-bold text-ink dark:text-white outline-none"
              />
              <span className="text-xs text-inkmuted font-semibold ml-1">/ hr</span>
            </div>
            <div className="flex items-center gap-1.5 mt-2 flex-wrap">
              {[350, 500, 750, 1000, 1500, 2500, 5000].map((preset) => (
                <button
                  type="button"
                  key={preset}
                  onClick={() =>
                    setEditData((d) => ({
                      ...d,
                      rate_hr: preset,
                    }))
                  }
                  className={`px-2 py-0.5 text-[10px] font-bold rounded border transition ${
                    Number(editData?.rate_hr) === preset
                      ? "bg-brand text-white border-brand"
                      : "bg-stone-100 dark:bg-stone-800 border-ink/20 text-ink dark:text-zinc-300 hover:border-ink/40"
                  }`}
                >
                  ₹{preset}/hr
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className={labelCls}>Description</p>
            <textarea
              value={editData?.description || ""}
              onChange={(e) =>
                setEditData((d) => ({ ...d, description: e.target.value }))
              }
              placeholder="Write about your experience, skills, and what makes you unique..."
              rows={5}
              className={`${inputCls} resize-none`}
            />
          </div>
        </div>
      </EditModal>

      {/* Name, Phone, Location, Category & Profile Photo */}
      <EditModal
        isOpen={editingSection === "name"}
        onClose={closeEdit}
        title="Edit Profile, Contact & Category"
        onSave={() =>
          saveName(
            editData?.name,
            editData?.picture,
            editData?.phone,
            editData?.area,
            editData?.category,
            editData?.skill
          )
        }
        wide
      >
        <div className="flex flex-col gap-4">
          {/* Avatar upload / preview */}
          <div>
            <p className={labelCls}>Profile Photo</p>
            <div className="flex items-center gap-4 mt-1.5 p-3 bg-[#f9f9f9] dark:bg-[#0d0d0d] border border-[#ddd] dark:border-[#222] rounded-xl">
              <div className="relative shrink-0">
                {editData?.picture ? (
                  <img
                    src={editData.picture}
                    alt="Preview"
                    className="h-16 w-16 rounded-full object-cover border-2 border-[#E65A1E]"
                  />
                ) : (
                  <div className="h-16 w-16 rounded-full bg-[#E65A1E] flex items-center justify-center text-2xl font-bold text-white border-2 border-white dark:border-[#333] shadow-sm">
                    {(editData?.name || displayName || "U").charAt(0).toUpperCase()}
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                <input
                  type="file"
                  ref={photoInputRef}
                  accept="image/png, image/jpeg, image/webp, image/gif"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const validation = validateImageFile(file, 5);
                    if (!validation.valid) {
                      setAvatarError(validation.error);
                      return;
                    }
                    setAvatarError(null);
                    try {
                      const res = await compressImage(file, { maxWidth: 600, maxHeight: 600, quality: 0.85 });
                      if (res?.dataUrl) {
                        setEditData((d) => ({ ...d, picture: res.dataUrl }));
                      }
                    } catch {
                      setAvatarError("Failed to process photo. Please try another image.");
                    }
                  }}
                />
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => photoInputRef.current?.click()}
                    className="px-3 py-1.5 rounded-lg bg-white dark:bg-[#1f1f1f] hover:bg-gray-100 dark:hover:bg-[#282828] border border-[#ddd] dark:border-[#333] text-xs font-semibold text-ink dark:text-white flex items-center gap-1.5 transition shadow-sm"
                  >
                    <Upload size={13} className="text-[#E65A1E]" />
                    {editData?.picture ? "Change Photo" : "Upload Photo"}
                  </button>

                  {editData?.picture && (
                    <button
                      type="button"
                      onClick={() => {
                        if (photoInputRef.current) photoInputRef.current.value = "";
                        setAvatarError(null);
                        setEditData((d) => ({ ...d, picture: "" }));
                      }}
                      className="px-2.5 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-xs font-semibold text-red-500 dark:text-red-400 border border-red-500/20 flex items-center gap-1.5 transition"
                    >
                      <Trash2 size={13} />
                      Remove
                    </button>
                  )}
                </div>
                {avatarError && (
                  <p className="text-[11px] text-red-600 dark:text-red-400 font-medium">
                    {avatarError}
                  </p>
                )}
                <p className="text-[11px] text-inkmuted dark:text-[#777]">
                  Supports JPG, PNG, WebP up to 5MB.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p className={labelCls}>Full Name / Studio Name</p>
              <input
                value={editData?.name || ""}
                onChange={(e) =>
                  setEditData((d) => ({ ...d, name: e.target.value }))
                }
                placeholder="Your full name or studio name"
                className={inputCls}
                data-testid="edit-profile-name-input"
              />
            </div>

            <div>
              <p className={labelCls}>WhatsApp / Mobile Number (10 Digits)</p>
              <div className="flex items-center border border-[#ddd] dark:border-[#333] bg-[#f9f9f9] dark:bg-[#1a1a1a] px-3 py-2.5 rounded-lg focus-within:border-[#E65A1E]">
                <span className="font-bold text-inkmuted dark:text-[#888] mr-2 text-sm">+91</span>
                <input
                  type="tel"
                  maxLength={10}
                  value={editData?.phone || ""}
                  onChange={(e) =>
                    setEditData((d) => ({
                      ...d,
                      phone: e.target.value.replace(/\D/g, "").slice(0, 10),
                    }))
                  }
                  placeholder="9876543210"
                  className="w-full bg-transparent text-sm font-semibold text-ink dark:text-white outline-none"
                  data-testid="edit-profile-phone-input"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p className={labelCls}>Bengaluru Area / Neighborhood</p>
              <select
                value={editData?.area || "Indiranagar"}
                onChange={(e) =>
                  setEditData((d) => ({ ...d, area: e.target.value }))
                }
                className={inputCls}
                data-testid="edit-profile-area-select"
              >
                {BENGALURU_AREAS.map((a) => (
                  <option key={a.name} value={a.name}>
                    {a.name} ({a.zone})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <p className={labelCls}>Service Category / Discipline</p>
              <select
                value={editData?.category || "Design & Architecture"}
                onChange={(e) =>
                  setEditData((d) => ({ ...d, category: e.target.value }))
                }
                className={inputCls}
                data-testid="edit-profile-category-select"
              >
                {SERVICE_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <p className={labelCls}>Primary Skill / Specialization</p>
            <input
              value={editData?.skill || ""}
              onChange={(e) =>
                setEditData((d) => ({ ...d, skill: e.target.value }))
              }
              placeholder="e.g. Architecture & Interior Design, UI/UX Design, Full Stack Dev"
              className={inputCls}
              data-testid="edit-profile-skill-input"
            />
            <div className="flex items-center gap-1.5 mt-2 flex-wrap">
              {[
                "Architecture & Interior Design",
                "Interior Design",
                "UI/UX Design",
                "Web Development",
                "Brand & Graphic Design",
                "Video Editing & Motion",
                "Digital Marketing",
              ].map((s) => (
                <button
                  type="button"
                  key={s}
                  onClick={() =>
                    setEditData((d) => ({
                      ...d,
                      skill: s,
                      category:
                        s.includes("Architecture") || s.includes("Design")
                          ? "Design & Architecture"
                          : d?.category,
                    }))
                  }
                  className={`px-2 py-0.5 text-[10px] font-bold rounded border transition ${
                    editData?.skill === s
                      ? "bg-[#E65A1E] text-white border-[#E65A1E]"
                      : "bg-stone-100 dark:bg-stone-800 border-ink/20 text-ink dark:text-zinc-300 hover:border-[#E65A1E]"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>
      </EditModal>

      {/* Employment */}
      <EditModal
        isOpen={editingSection === "employment"}
        onClose={closeEdit}
        title={
          editData?.title
            ? "Edit Employment"
            : "Add Employment History"
        }
        onSave={() => saveEmployment(editData)}
        wide
      >
        <div className="flex flex-col gap-4">
          <div>
            <p className={labelCls}>Title / Role</p>
            <input
              value={editData?.title || ""}
              onChange={(e) =>
                setEditData((d) => ({ ...d, title: e.target.value }))
              }
              placeholder="e.g. Web Developer"
              className={inputCls}
            />
          </div>
          <div>
            <p className={labelCls}>Company</p>
            <input
              value={editData?.company || ""}
              onChange={(e) =>
                setEditData((d) => ({ ...d, company: e.target.value }))
              }
              placeholder="e.g. Wan Architects"
              className={inputCls}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className={labelCls}>Start Date</p>
              <input
                type="month"
                value={editData?.start_date || ""}
                onChange={(e) =>
                  setEditData((d) => ({ ...d, start_date: e.target.value }))
                }
                className={inputCls}
              />
            </div>
            <div>
              <p className={labelCls}>End Date</p>
              <input
                type="month"
                value={editData?.end_date || ""}
                onChange={(e) =>
                  setEditData((d) => ({ ...d, end_date: e.target.value }))
                }
                disabled={editData?.is_current}
                className={`${inputCls} disabled:opacity-40`}
              />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-ink dark:text-[#ccc] cursor-pointer">
            <input
              type="checkbox"
              checked={editData?.is_current || false}
              onChange={(e) =>
                setEditData((d) => ({
                  ...d,
                  is_current: e.target.checked,
                  end_date: e.target.checked ? "" : d.end_date,
                }))
              }
              className="accent-[#E65A1E]"
            />
            I currently work here
          </label>
          <div>
            <p className={labelCls}>Description</p>
            <textarea
              value={editData?.description || ""}
              onChange={(e) =>
                setEditData((d) => ({ ...d, description: e.target.value }))
              }
              placeholder="Describe your responsibilities and achievements..."
              rows={4}
              className={`${inputCls} resize-none`}
            />
          </div>
        </div>
      </EditModal>

      {/* Certification */}
      <EditModal
        isOpen={editingSection === "certification"}
        onClose={closeEdit}
        title="Add Certification"
        onSave={() => saveCertification(editData)}
      >
        <div className="flex flex-col gap-4">
          <div>
            <p className={labelCls}>Certification Name</p>
            <input
              value={editData?.name || ""}
              onChange={(e) =>
                setEditData((d) => ({ ...d, name: e.target.value }))
              }
              placeholder="e.g. AWS Certified Developer"
              className={inputCls}
            />
          </div>
          <div>
            <p className={labelCls}>Issuing Organization</p>
            <input
              value={editData?.issuer || ""}
              onChange={(e) =>
                setEditData((d) => ({ ...d, issuer: e.target.value }))
              }
              placeholder="e.g. Amazon Web Services"
              className={inputCls}
            />
          </div>
          <div>
            <p className={labelCls}>Year</p>
            <input
              type="number"
              value={editData?.year || ""}
              onChange={(e) =>
                setEditData((d) => ({ ...d, year: e.target.value }))
              }
              placeholder="2026"
              className={inputCls}
            />
          </div>
          <div>
            <p className={labelCls}>Credential URL (optional)</p>
            <input
              value={editData?.url || ""}
              onChange={(e) =>
                setEditData((d) => ({ ...d, url: e.target.value }))
              }
              placeholder="https://..."
              className={inputCls}
            />
          </div>
        </div>
      </EditModal>

      {/* Education */}
      <EditModal
        isOpen={editingSection === "education"}
        onClose={closeEdit}
        title="Add Education"
        onSave={() => saveEducation(editData)}
        wide
      >
        <div className="flex flex-col gap-4">
          <div>
            <p className={labelCls}>School / University</p>
            <input
              value={editData?.school || ""}
              onChange={(e) =>
                setEditData((d) => ({ ...d, school: e.target.value }))
              }
              placeholder="e.g. RV College of Engineering"
              className={inputCls}
            />
          </div>
          <div>
            <p className={labelCls}>Degree</p>
            <input
              value={editData?.degree || ""}
              onChange={(e) =>
                setEditData((d) => ({ ...d, degree: e.target.value }))
              }
              placeholder="e.g. Bachelor of Engineering (BEng)"
              className={inputCls}
            />
          </div>
          <div>
            <p className={labelCls}>Field of Study</p>
            <input
              value={editData?.field || ""}
              onChange={(e) =>
                setEditData((d) => ({ ...d, field: e.target.value }))
              }
              placeholder="e.g. Business Engineering"
              className={inputCls}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className={labelCls}>Start Year</p>
              <input
                type="number"
                value={editData?.start_year || ""}
                onChange={(e) =>
                  setEditData((d) => ({ ...d, start_year: e.target.value }))
                }
                placeholder="2025"
                className={inputCls}
              />
            </div>
            <div>
              <p className={labelCls}>End Year</p>
              <input
                type="number"
                value={editData?.end_year || ""}
                onChange={(e) =>
                  setEditData((d) => ({ ...d, end_year: e.target.value }))
                }
                placeholder="2029"
                disabled={editData?.is_current}
                className={`${inputCls} disabled:opacity-40`}
              />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-ink dark:text-[#ccc] cursor-pointer">
            <input
              type="checkbox"
              checked={editData?.is_current || false}
              onChange={(e) =>
                setEditData((d) => ({
                  ...d,
                  is_current: e.target.checked,
                  end_year: e.target.checked ? "" : d.end_year,
                }))
              }
              className="accent-[#E65A1E]"
            />
            Currently studying here
          </label>
        </div>
      </EditModal>

      {/* Languages */}
      <EditModal
        isOpen={editingSection === "languages"}
        onClose={closeEdit}
        title="Edit Languages"
        onSave={() => saveLanguages(editData?.languages?.filter((l) => l.language.trim()) || [])}
      >
        <div className="flex flex-col gap-3">
          {(editData?.languages || []).map((lang, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                value={lang.language}
                onChange={(e) => {
                  const updated = [...editData.languages];
                  updated[i] = { ...updated[i], language: e.target.value };
                  setEditData((d) => ({ ...d, languages: updated }));
                }}
                placeholder="Language"
                className={`${inputCls} flex-1`}
              />
              <select
                value={lang.proficiency}
                onChange={(e) => {
                  const updated = [...editData.languages];
                  updated[i] = { ...updated[i], proficiency: e.target.value };
                  setEditData((d) => ({ ...d, languages: updated }));
                }}
                className={`${inputCls} flex-1`}
              >
                {PROFICIENCY_LEVELS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
              <button
                onClick={() => {
                  const updated = editData.languages.filter((_, j) => j !== i);
                  setEditData((d) => ({ ...d, languages: updated }));
                }}
                className="h-8 w-8 rounded-full flex items-center justify-center text-red-500 dark:text-red-400 hover:bg-red-500/10 transition shrink-0"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
          <button
            onClick={() => {
              setEditData((d) => ({
                ...d,
                languages: [
                  ...(d.languages || []),
                  { language: "", proficiency: "Conversational" },
                ],
              }));
            }}
            className="flex items-center gap-2 text-sm text-[#E65A1E] hover:text-[#F06B2E] transition font-semibold"
          >
            <Plus size={14} /> Add another language
          </button>
        </div>
      </EditModal>

      {/* Linked Accounts */}
      <EditModal
        isOpen={editingSection === "linked"}
        onClose={closeEdit}
        title="Linked Accounts"
        onSave={() =>
          saveLinkedAccounts(
            editData?.github_url,
            editData?.github_username
          )
        }
      >
        <div className="flex flex-col gap-5">
          <div className="p-4 rounded-lg bg-[#f9f9f9] dark:bg-[#1a1a1a] border border-[#e5e5e5] dark:border-[#222]">
            <div className="flex items-center gap-2 mb-3">
              <Github size={18} className="text-ink dark:text-white" />
              <span className="text-sm font-semibold text-ink dark:text-white">GitHub</span>
            </div>
            <div className="flex flex-col gap-3">
              <div>
                <p className={labelCls}>GitHub Profile URL</p>
                <input
                  value={editData?.github_url || ""}
                  onChange={(e) =>
                    setEditData((d) => ({ ...d, github_url: e.target.value }))
                  }
                  placeholder="https://github.com/yourusername"
                  className={inputCls}
                />
              </div>
              <div>
                <p className={labelCls}>GitHub Username</p>
                <input
                  value={editData?.github_username || ""}
                  onChange={(e) =>
                    setEditData((d) => ({
                      ...d,
                      github_username: e.target.value,
                    }))
                  }
                  placeholder="yourusername"
                  className={inputCls}
                />
              </div>
            </div>
          </div>
        </div>
      </EditModal>

      {/* Availability */}
      <EditModal
        isOpen={editingSection === "availability"}
        onClose={closeEdit}
        title="Set Availability"
        onSave={() =>
          saveAvailability(editData?.hours_per_week, editData?.availability)
        }
      >
        <div className="flex flex-col gap-4">
          <div>
            <p className={labelCls}>Hours per week</p>
            <select
              value={editData?.hours_per_week || ""}
              onChange={(e) =>
                setEditData((d) => ({ ...d, hours_per_week: e.target.value }))
              }
              className={inputCls}
            >
              <option value="Less than 10 hrs/week">Less than 10 hrs/week</option>
              <option value="10-20 hrs/week">10-20 hrs/week</option>
              <option value="20-30 hrs/week">20-30 hrs/week</option>
              <option value="More than 30 hrs/week">More than 30 hrs/week</option>
            </select>
          </div>
          <div>
            <p className={labelCls}>Availability</p>
            <select
              value={editData?.availability || ""}
              onChange={(e) =>
                setEditData((d) => ({ ...d, availability: e.target.value }))
              }
              className={inputCls}
            >
              <option value="Open to contract to hire">Open to contract to hire</option>
              <option value="Open to short-term projects">Open to short-term projects</option>
              <option value="Open to long-term projects">Open to long-term projects</option>
              <option value="Not available">Not available</option>
            </select>
          </div>
        </div>
      </EditModal>

      {/* Portfolio Add / Edit */}
      <EditModal
        isOpen={editingSection === "portfolio-add"}
        onClose={closeEdit}
        title={editData?.id ? "Edit Portfolio Project" : "Add Portfolio Item"}
        wide
        onSave={() => {
          if (!editData?.title?.trim()) {
            setPortfolioImageError("Please enter a project title.");
            return;
          }

          // Screen Title for emails, phone numbers, and external links
          const titleScan = scanText(editData.title);
          if (titleScan.hasViolations) {
            setPortfolioImageError(
              `Project title contains prohibited contact info (${titleScan.violations.map((v) => v.label).join(", ")}). Sharing phone numbers, emails, or personal contacts is not allowed.`
            );
            return;
          }

          // Screen Description for emails, phone numbers, and external links
          if (editData?.description) {
            const descScan = scanText(editData.description);
            if (descScan.hasViolations) {
              setPortfolioImageError(
                `Project description contains prohibited contact info (${descScan.violations.map((v) => v.label).join(", ")}). Sharing phone numbers, emails, or personal contacts is not allowed.`
              );
              return;
            }
          }

          // Screen Portfolio Link if provided
          let cleanLink = "";
          if (editData?.link && editData.link.trim()) {
            const linkScan = scanPortfolioLink(editData.link);
            if (linkScan.hasViolations) {
              const violationMsg = `Portfolio link contains prohibited details (${linkScan.violations.map((v) => v.label).join(", ")}). Direct phone numbers, emails, and company promotions are strictly not allowed.`;
              setPortfolioLinkError(violationMsg);
              setPortfolioImageError(violationMsg);
              return;
            }
            cleanLink = linkScan.cleanUrl || editData.link.trim();
          }

          addPortfolioItem({
            ...editData,
            link: cleanLink,
          });
        }}
      >
        <div className="flex flex-col gap-4">
          <div>
            <p className={labelCls}>Project Title</p>
            <input
              value={editData?.title || ""}
              onChange={(e) =>
                setEditData((d) => ({ ...(d || {}), title: e.target.value }))
              }
              placeholder="e.g. Brand Redesign / Architectural Elevation"
              className={inputCls}
            />
          </div>
          <div>
            <p className={labelCls}>Description (optional)</p>
            <textarea
              value={editData?.description || ""}
              onChange={(e) =>
                setEditData((d) => ({
                  ...(d || {}),
                  description: e.target.value,
                }))
              }
              placeholder="Brief description of the project..."
              rows={3}
              className={`${inputCls} resize-none`}
            />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <p className={labelCls}>Portfolio / Project Link (Optional)</p>
              {editData?.link?.trim() && !portfolioLinkError && (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 size={12} /> Link Scanned &amp; Clean
                </span>
              )}
            </div>
            <div className="relative">
              <input
                type="url"
                value={editData?.link || ""}
                onChange={(e) => handlePortfolioLinkChange(e.target.value)}
                placeholder="e.g. https://behance.net/gallery/12345 or https://github.com/user/project"
                className={inputCls}
              />
            </div>
            <p className="mt-1 text-[11px] text-inkmuted dark:text-[#888] leading-relaxed">
              Paste your Behance, Dribbble, GitHub, Figma, or project demo link. Links are automatically scanned for personal contact details (phone, email) and company promotions.
            </p>
            {portfolioLinkError && (
              <div className="mt-2 flex items-start gap-2 p-2.5 bg-red-50 dark:bg-red-950/40 border border-red-300 dark:border-red-800 text-red-700 dark:text-red-300 text-xs rounded-lg">
                <AlertTriangle size={14} className="shrink-0 text-red-500 mt-0.5" />
                <div className="flex-1">
                  <p className="font-bold">Link Compliance Notice</p>
                  <p className="mt-0.5">{portfolioLinkError}</p>
                </div>
              </div>
            )}
          </div>
          <div>
            {(() => {
              const currentImages = getItemImages(editData);
              return (
                <>
                  <div className="flex items-center justify-between mb-2">
                    <p className={labelCls}>
                      Project Images ({currentImages.length}/10)
                    </p>
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#FFF0E6] dark:bg-[#E65A1E]/20 text-[#E65A1E] border border-[#E65A1E]/30 shadow-xs">
                      Up to 10 Images · Max 5 MB each
                    </span>
                  </div>

                  {portfolioImageError && (
                    <div className="mb-3 flex items-start gap-2.5 p-3 bg-red-50 dark:bg-red-950/40 border border-red-300 dark:border-red-800 text-red-700 dark:text-red-300 text-xs rounded-lg shadow-sm">
                      <AlertTriangle size={16} className="shrink-0 text-red-500 mt-0.5" />
                      <div className="flex-1">
                        <p className="font-bold text-red-800 dark:text-red-200">Upload &amp; Privacy Alert</p>
                        <p className="mt-0.5">{portfolioImageError}</p>
                      </div>
                    </div>
                  )}

                  {currentImages.length > 0 && (
                    <div className="flex flex-col gap-3 mb-3">
                      {currentImages.map((img, idx) => (
                        <div
                          key={img.id || idx}
                          className="rounded-xl overflow-hidden border-2 border-[#ddd] dark:border-[#333] bg-[#f9f9f9] dark:bg-[#1a1a1a] shadow-sm"
                        >
                          <div className="relative h-44 w-full flex items-center justify-center p-3 bg-black/5 dark:bg-black/40">
                            {idx === 0 && (
                              <span className="absolute top-2.5 left-2.5 rounded bg-[#E65A1E] px-2 py-0.5 text-[10px] font-black uppercase text-white shadow">
                                Cover Image
                              </span>
                            )}
                            <span className="absolute top-2.5 right-2.5 rounded bg-black/70 px-2 py-0.5 text-[10px] font-bold text-white">
                              #{idx + 1} of {currentImages.length}
                            </span>
                            <img
                              src={img.data}
                              alt={img.name || `Image ${idx + 1}`}
                              className="max-h-full max-w-full object-contain rounded"
                            />
                          </div>
                          <div className="p-3 bg-white dark:bg-[#1f1f1f] border-t border-[#eee] dark:border-[#333] flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <CheckCircle2 size={15} className="text-emerald-500 shrink-0" />
                                <span className="text-xs font-bold text-ink dark:text-white truncate max-w-[200px]">
                                  {img.name || `portfolio-image-${idx + 1}.jpg`}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                  {img.size || "Optimized"}
                                </span>
                                <span className="text-[11px] text-inkmuted dark:text-[#777]">
                                  Within 5 MB limit
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <label className="px-3 py-1.5 text-xs font-bold text-[#E65A1E] bg-[#FFF0E6] dark:bg-[#E65A1E]/20 hover:bg-[#FFE0CE] border border-[#E65A1E]/30 rounded-lg cursor-pointer transition">
                                Change
                                <input
                                  type="file"
                                  accept="image/png, image/jpeg, image/webp, image/gif"
                                  className="hidden"
                                  onChange={(e) => handlePortfolioImageChange(e, idx)}
                                />
                              </label>
                              <button
                                type="button"
                                onClick={() => removePortfolioImageAt(idx)}
                                className="px-2.5 py-1.5 text-xs font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition"
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {currentImages.length < 10 && (
                    <label
                      data-testid="add-more-portfolio-images-btn"
                      className={`flex flex-col items-center justify-center ${
                        currentImages.length > 0 ? "p-4" : "p-6"
                      } border-2 border-dashed border-[#ccc] dark:border-[#3a3a3a] rounded-xl cursor-pointer hover:border-[#E65A1E] dark:hover:border-[#E65A1E] transition bg-[#fcfcfc] dark:bg-[#181818] hover:bg-[#FFF9F6] dark:hover:bg-[#201612] group`}
                    >
                      {isProcessingPortfolioImage ? (
                        <div className="text-center flex flex-col items-center gap-2 py-2">
                          <Loader2 size={24} className="animate-spin text-[#E65A1E]" />
                          <p className="text-xs font-semibold text-ink dark:text-white">
                            Optimizing project image(s)...
                          </p>
                          <p className="text-[11px] text-inkmuted dark:text-[#888]">
                            Scaling for web performance
                          </p>
                        </div>
                      ) : currentImages.length > 0 ? (
                        <div className="flex items-center justify-center gap-2.5 text-sm font-bold text-[#E65A1E]">
                          <div className="h-8 w-8 rounded-full bg-[#FFE5D6] dark:bg-[#E65A1E]/20 flex items-center justify-center">
                            <Plus size={18} className="text-[#E65A1E]" />
                          </div>
                          <span>+ Add More Images ({10 - currentImages.length} remaining)</span>
                        </div>
                      ) : (
                        <div className="text-center flex flex-col items-center">
                          <div className="h-12 w-12 rounded-full bg-[#f0f0f0] dark:bg-[#262626] group-hover:bg-[#FFE5D6] dark:group-hover:bg-[#E65A1E]/30 flex items-center justify-center transition mb-3">
                            <Upload size={22} className="text-inkmuted dark:text-[#888] group-hover:text-[#E65A1E] transition" />
                          </div>
                          <p className="text-sm font-bold text-ink dark:text-white">
                            Click to upload project images (select 1 or more)
                          </p>
                          <div className="mt-2.5 flex items-center gap-2">
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-black bg-[#FFE5D6] dark:bg-[#E65A1E]/30 text-[#E65A1E] border border-[#E65A1E]/40 tracking-wider">
                              UP TO 10 IMAGES · MAX 5 MB EACH
                            </span>
                            <span className="text-[11px] text-inkmuted dark:text-[#888]">
                              JPG, PNG, WEBP, GIF
                            </span>
                          </div>
                        </div>
                      )}
                      <input
                        type="file"
                        multiple
                        accept="image/png, image/jpeg, image/webp, image/gif"
                        className="hidden"
                        onChange={(e) => handlePortfolioImageChange(e, null)}
                      />
                    </label>
                  )}
                </>
              );
            })()}
            <p className="mt-2 text-[11px] text-inkmuted dark:text-[#777]">
              Notice: You can upload up to <strong>10 images</strong> per project (maximum <strong>5 MB</strong> per image). All text and files are screened to ensure no phone numbers or email addresses are shared.
            </p>
          </div>
        </div>
      </EditModal>

      {/* ═══════════ MULTI-IMAGE PORTFOLIO GALLERY LIGHTBOX ═══════════ */}
      {activeGallery && Array.isArray(activeGallery.images) && activeGallery.images.length > 0 && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4"
          onClick={() => setActiveGallery(null)}
        >
          <div
            className="relative w-full max-w-4xl bg-[#111] border border-[#333] rounded-2xl overflow-hidden shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#262626]">
              <div>
                <h3 className="text-sm font-bold text-white">{activeGallery.title}</h3>
                <p className="text-xs text-[#888]">
                  Image {activeGallery.index + 1} of {activeGallery.images.length}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveGallery(null)}
                className="h-8 w-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition"
              >
                <X size={16} />
              </button>
            </div>

            <div className="relative h-[55vh] sm:h-[65vh] bg-black flex items-center justify-center p-4">
              <img
                src={activeGallery.images[activeGallery.index]?.data}
                alt={`${activeGallery.title} ${activeGallery.index + 1}`}
                className="max-h-full max-w-full object-contain rounded"
              />
              {activeGallery.images.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() =>
                      setActiveGallery((g) => ({
                        ...g,
                        index: (g.index - 1 + g.images.length) % g.images.length,
                      }))
                    }
                    className="absolute left-3 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-black/70 hover:bg-[#E65A1E] text-white flex items-center justify-center border border-white/20 transition"
                    title="Previous image"
                  >
                    <ChevronLeft size={20} />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setActiveGallery((g) => ({
                        ...g,
                        index: (g.index + 1) % g.images.length,
                      }))
                    }
                    className="absolute right-3 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-black/70 hover:bg-[#E65A1E] text-white flex items-center justify-center border border-white/20 transition"
                    title="Next image"
                  >
                    <ChevronRight size={20} />
                  </button>
                </>
              )}
            </div>

            {activeGallery.images.length > 1 && (
              <div className="flex items-center gap-2 p-3 bg-[#161616] border-t border-[#262626] overflow-x-auto">
                {activeGallery.images.map((img, i) => (
                  <button
                    key={img.id || i}
                    type="button"
                    onClick={() => setActiveGallery((g) => ({ ...g, index: i }))}
                    className={`h-14 w-20 shrink-0 rounded-lg overflow-hidden border-2 transition ${
                      activeGallery.index === i
                        ? "border-[#E65A1E] opacity-100"
                        : "border-transparent opacity-50 hover:opacity-80"
                    }`}
                  >
                    <img
                      src={img.data}
                      alt={`Thumb ${i + 1}`}
                      className="h-full w-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══════════ TOP RIGHT SLIDE-OVER DRAWER MENU ═══════════ */}
      {menuDrawerOpen && (
        <div
          data-testid="profile-menu-drawer-backdrop"
          className="fixed inset-0 z-50 flex justify-end bg-black/75 backdrop-blur-sm transition-opacity"
          onClick={(e) => {
            if (e.target === e.currentTarget) setMenuDrawerOpen(false);
          }}
        >
          <div
            data-testid="profile-menu-drawer"
            className="w-full max-w-md h-full bg-white dark:bg-[#111] border-l border-[#e5e5e5] dark:border-[#222] p-5 sm:p-6 overflow-y-auto flex flex-col justify-between shadow-2xl"
          >
            <div className="flex flex-col gap-4">
              {/* Drawer Header */}
              <div className="flex items-center justify-between border-b border-[#e5e5e5] dark:border-[#222] pb-4">
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#E65A1E]/15 text-[#E65A1E]">
                    <Menu size={18} />
                  </span>
                  <div>
                    <h3 className="text-base font-bold text-ink dark:text-white">Menu & Settings</h3>
                    <p className="text-[11px] text-inkmuted dark:text-[#777]">Account, platform links & preferences</p>
                  </div>
                </div>
                <button
                  onClick={() => setMenuDrawerOpen(false)}
                  data-testid="profile-menu-drawer-close"
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#ddd] dark:border-[#333] bg-white dark:bg-[#1a1a1a] text-inkmuted dark:text-[#888] hover:text-ink dark:hover:text-white hover:bg-gray-100 dark:hover:bg-[#252525] transition"
                >
                  <X size={16} />
                </button>
              </div>

              {/* PRO PROFILE SETTINGS (Phone & Skill) */}
              <div className="bg-[#f9f9f9] dark:bg-[#1a1a1a] border border-[#e5e5e5] dark:border-[#2a2a2a] rounded-xl p-4" data-testid="pro-profile-card">
                <div className="flex items-center gap-1.5 mb-2">
                  <Briefcase size={14} className="text-[#E65A1E]" />
                  <span className="text-xs font-bold uppercase tracking-wider text-ink dark:text-white">PRO PROFILE</span>
                </div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-inkmuted dark:text-[#888]">
                  Phone Number (shown to employers after unlock)
                </label>
                <input
                  data-testid="pro-phone-input"
                  value={proPhone}
                  onChange={(e) => setProPhone(e.target.value.replace(/[^0-9]/g, "").slice(0, 10))}
                  placeholder="10-digit mobile number"
                  className="w-full mt-1 bg-white dark:bg-[#111] border border-[#ddd] dark:border-[#333] rounded-lg px-3 py-2 text-sm text-ink dark:text-white placeholder:text-[#999] dark:placeholder:text-[#555] focus:outline-none focus:border-[#E65A1E] transition"
                />

                <label className="text-[10px] font-bold uppercase tracking-wider text-inkmuted dark:text-[#888] mt-3 block">
                  Primary Skill
                </label>
                <input
                  data-testid="pro-skill-input"
                  value={proSkill}
                  onChange={(e) => setProSkill(e.target.value)}
                  placeholder="e.g. Full Stack Pro"
                  className="w-full mt-1 bg-white dark:bg-[#111] border border-[#ddd] dark:border-[#333] rounded-lg px-3 py-2 text-sm text-ink dark:text-white placeholder:text-[#999] dark:placeholder:text-[#555] focus:outline-none focus:border-[#E65A1E] transition"
                />

                {proSaveMsg && (
                  <p
                    data-testid="pro-save-msg"
                    className="text-xs font-bold mt-2"
                    style={{ color: proSaveMsg.ok ? "#00A86B" : "#FF4D5A" }}
                  >
                    {proSaveMsg.text}
                  </p>
                )}

                <button
                  data-testid="pro-save-btn"
                  disabled={proSaving}
                  onClick={saveProDetails}
                  className="w-full mt-3 flex items-center justify-center bg-ink text-white dark:bg-white dark:text-black py-2.5 rounded-lg text-xs font-extrabold tracking-wider hover:bg-[#E65A1E] hover:text-white transition disabled:opacity-50"
                >
                  {proSaving ? <Loader2 size={16} className="animate-spin" /> : "SAVE PRO DETAILS"}
                </button>
              </div>

              {/* Push Notifications & 5km Alerts */}
              <div className="bg-[#f9f9f9] dark:bg-[#1a1a1a] border border-[#e5e5e5] dark:border-[#2a2a2a] rounded-xl p-3.5 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#FFE8D6] text-brand">
                    <Bell size={18} />
                  </span>
                  <div>
                    <p className="text-xs font-bold text-ink dark:text-white">Push Notifications</p>
                    <p className="text-[10px] text-inkmuted dark:text-[#777]">5km gig alerts &amp; client chats</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setPushSettingsOpen(true);
                    setMenuDrawerOpen(false);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-ink text-white dark:bg-white dark:text-black text-xs font-bold hover:bg-[#E65A1E] hover:text-white transition"
                >
                  CONFIGURE
                </button>
              </div>

              {/* Platform Navigation Cards */}
              <div className="flex flex-col gap-2">
                {user?.is_admin && (
                  <button
                    onClick={() => {
                      nav("/admin");
                      setMenuDrawerOpen(false);
                    }}
                    className="flex items-center gap-3 rounded-xl border border-[#e5e5e5] dark:border-[#333] bg-[#f9f9f9] dark:bg-[#1a1a1a] p-3 text-left transition hover:bg-gray-100 dark:hover:bg-[#252525] hover:border-[#E65A1E]"
                  >
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white dark:bg-[#222] text-[#E65A1E] shadow-sm">
                      <Shield size={18} />
                    </span>
                    <div className="flex-1">
                      <p className="text-xs font-bold text-ink dark:text-white">Admin Dashboard</p>
                      <p className="text-[10px] text-inkmuted dark:text-[#777]">Users, payments, complaints & coupons</p>
                    </div>
                    <ChevronRight size={16} className="text-inkmuted dark:text-[#666]" />
                  </button>
                )}

                {navMenuItems.map((m) => (
                  <button
                    key={m.label}
                    data-testid={m.testID}
                    onClick={() => {
                      nav(m.to);
                      setMenuDrawerOpen(false);
                    }}
                    className="flex items-center gap-3 rounded-xl border border-[#e5e5e5] dark:border-[#2a2a2a] bg-[#f9f9f9] dark:bg-[#1a1a1a] p-3 text-left transition hover:bg-gray-100 dark:hover:bg-[#252525] hover:border-[#E65A1E]"
                  >
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white dark:bg-[#111] text-[#E65A1E] shadow-sm">
                      <m.icon size={18} />
                    </span>
                    <div className="flex-1">
                      <p className="text-xs font-bold text-ink dark:text-white">{m.label}</p>
                      <p className="text-[10px] text-inkmuted dark:text-[#777]">{m.sub}</p>
                    </div>
                    <ChevronRight size={16} className="text-inkmuted dark:text-[#666]" />
                  </button>
                ))}
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="pt-4 border-t border-[#e5e5e5] dark:border-[#222] mt-4 flex flex-col gap-3">
              {user && (
                <button
                  data-testid="profile-drawer-logout-btn"
                  onClick={async () => {
                    await logout();
                    setMenuDrawerOpen(false);
                    nav("/");
                  }}
                  className="flex items-center justify-center gap-2 rounded-xl bg-red-600/10 border border-red-500/20 py-3 text-xs font-bold text-red-500 dark:text-red-400 hover:bg-red-600 hover:text-white transition"
                >
                  <LogOut size={16} /> LOG OUT
                </button>
              )}
              <p className="text-center text-[10px] text-inkmuted dark:text-[#666]">WorkHop v2 · Made in Bengaluru 🧡</p>
            </div>
          </div>
        </div>
      )}

      {/* Push Notification Settings Modal */}
      <PushSettingsModal isOpen={pushSettingsOpen} onClose={() => setPushSettingsOpen(false)} />

      {/* Credits / Connects Top Up & Subscription Modal */}
      <CreditsTopUpModal
        isOpen={creditsModalOpen}
        onClose={() => setCreditsModalOpen(false)}
        freelancerId={freelancerId}
        onWalletUpdated={(w) => {
          setCreditsWallet(w);
          setCreditTxs(getCreditTransactions(freelancerId));
        }}
      />

      {/* Credit Transactions History Modal */}
      {txHistoryOpen && (
        <div
          data-testid="credit-tx-history-backdrop"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs"
          onClick={(e) => {
            if (e.target === e.currentTarget) setTxHistoryOpen(false);
          }}
        >
          <div
            data-testid="credit-tx-history-modal"
            className="w-full max-w-lg border-2 border-ink bg-white p-6 shadow-[6px_6px_0px_#121212] dark:border-white dark:bg-[#141414] max-h-[85vh] flex flex-col"
          >
            <div className="flex items-center justify-between border-b-2 border-ink pb-4 dark:border-stone-700">
              <div className="flex items-center gap-2">
                <span className="flex h-9 w-9 items-center justify-center border-2 border-ink bg-[#FFF3C4] text-[#E65A1E]">
                  <History size={20} />
                </span>
                <div>
                  <h3 className="text-base font-black uppercase text-ink dark:text-white">Credits Transaction History</h3>
                  <p className="text-xs text-inkmuted dark:text-stone-400">Balance: <strong className="text-ink dark:text-white">{creditsWallet.balance} credits</strong></p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setTxHistoryOpen(false)}
                className="flex h-8 w-8 items-center justify-center border-2 border-ink bg-white font-black hover:bg-stone-200 dark:bg-stone-800 dark:text-white"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-4 space-y-3">
              {creditTxs && creditTxs.length > 0 ? (
                creditTxs.map((tx) => {
                  const isPositive = tx.amount > 0;
                  const typeLabel = {
                    purchase: "Packs Purchase",
                    subscription: "Monthly Subscription",
                    spend: "Job Application",
                    boost: "Proposal Boost",
                  }[tx.type] || tx.type.toUpperCase();

                  return (
                    <div
                      key={tx.id}
                      className="border-2 border-ink/40 bg-stone-50 dark:bg-stone-900/60 p-3 flex items-center justify-between text-xs"
                    >
                      <div className="flex-1 min-w-0 pr-2">
                        <div className="flex items-center gap-2">
                          <span className={`px-1.5 py-0.5 text-[9px] font-black uppercase border border-ink ${
                            tx.type === "boost"
                              ? "bg-[#FFF3C4] text-ink"
                              : tx.type === "subscription"
                              ? "bg-brand text-white"
                              : tx.type === "purchase"
                              ? "bg-ok text-white"
                              : "bg-stone-200 text-ink dark:bg-stone-800 dark:text-white"
                          }`}>
                            {typeLabel}
                          </span>
                          <span className="text-[10px] text-inkmuted dark:text-stone-400">
                            {new Date(tx.created_at).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" })}
                          </span>
                        </div>
                        <p className="mt-1 font-bold text-ink dark:text-white truncate">
                          {tx.description || (tx.related_job_id ? `Job Ref: ${tx.related_job_id}` : "Account adjustment")}
                        </p>
                        <p className="text-[10px] text-inkmuted dark:text-stone-400">
                          Balance after: {tx.balance_after} credits
                        </p>
                      </div>
                      <div className="text-right">
                        <span className={`text-sm font-black ${isPositive ? "text-ok" : "text-bad"}`}>
                          {isPositive ? `+${tx.amount}` : tx.amount} credits
                        </span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-8 text-inkmuted dark:text-stone-400">
                  <Coins size={32} className="mx-auto mb-2 opacity-40" />
                  <p className="font-bold text-xs">No credit transactions yet</p>
                  <p className="text-[11px]">Credits spent on applications or acquired will appear here.</p>
                </div>
              )}
            </div>

            <div className="border-t-2 border-ink pt-3 flex gap-2 dark:border-stone-700">
              <button
                type="button"
                onClick={() => {
                  setTxHistoryOpen(false);
                  setCreditsModalOpen(true);
                }}
                className="flex-1 border-2 border-ink bg-brand py-2 text-xs font-black text-white hover:bg-brand/90 transition shadow-[2px_2px_0px_#121212]"
              >
                + TOP UP CREDITS
              </button>
              <button
                type="button"
                onClick={() => setTxHistoryOpen(false)}
                className="border-2 border-ink bg-white dark:bg-stone-800 px-4 py-2 text-xs font-black text-ink dark:text-white hover:bg-stone-100"
              >
                CLOSE
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DPDP ACT RIGHT TO ERASURE MODAL */}
      <DeleteAccountModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
      />
    </Shell>
  );
}

/* ═══════════ sub-components ═══════════ */

function SectionHeader({ title, onAdd, onEdit, expanded, onToggle }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <h2 className="text-base font-bold text-ink dark:text-white">{title}</h2>
        {onToggle && (
          <button
            onClick={onToggle}
            className="h-6 w-6 rounded-full flex items-center justify-center text-inkmuted dark:text-[#666] hover:text-ink dark:hover:text-white transition"
          >
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        )}
      </div>
      <div className="flex items-center gap-1">
        {onEdit && <EditBtn onClick={onEdit} />}
        {onAdd && (
          <button
            onClick={onAdd}
            className="h-8 w-8 rounded-full flex items-center justify-center text-[#E65A1E] hover:bg-[#E65A1E]/10 transition"
          >
            <Plus size={18} />
          </button>
        )}
      </div>
    </div>
  );
}

function SidebarSection({ id, icon, title, children, onEdit, onAdd }) {
  return (
    <div id={id} className="bg-white dark:bg-[#111] border border-[#e5e5e5] dark:border-[#222] rounded-xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-[#E65A1E]">{icon}</span>
          <h3 className="text-sm font-semibold text-ink dark:text-white">{title}</h3>
        </div>
        <div className="flex items-center gap-1">
          {onEdit && <EditBtn onClick={onEdit} size={14} />}
          {onAdd && (
            <button
              onClick={onAdd}
              className="h-6 w-6 rounded-full flex items-center justify-center text-[#E65A1E] hover:bg-[#E65A1E]/10 transition"
            >
              <Plus size={14} />
            </button>
          )}
        </div>
      </div>
      {children}
    </div>
  );
}

function HistoryCard({ entry, onEdit, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  const formatDate = (d) => {
    if (!d) return "";
    const [y, m] = d.split("-");
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${months[parseInt(m, 10) - 1] || ""} ${y}`;
  };

  return (
    <div className="bg-[#f9f9f9] dark:bg-[#1a1a1a] border border-[#e5e5e5] dark:border-[#222] rounded-lg p-4">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-lg bg-[#E65A1E]/10 flex items-center justify-center shrink-0 mt-0.5">
            <Briefcase size={18} className="text-[#E65A1E]" />
          </div>
          <div>
            <p className="text-sm font-semibold text-ink dark:text-white">
              {entry.title}
              {entry.company ? ` | ${entry.company}` : ""}
            </p>
            <p className="text-xs text-[#E65A1E] font-medium mt-0.5">
              {formatDate(entry.start_date)}
              {" - "}
              {entry.is_current ? "Present" : formatDate(entry.end_date)}
            </p>
            {entry.description && (
              <p className={`text-xs text-inkmuted dark:text-[#888] mt-2 leading-relaxed ${!expanded && entry.description.length > 200 ? "line-clamp-2" : ""}`}>
                {entry.description}
              </p>
            )}
            {entry.description && entry.description.length > 200 && (
              <button
                onClick={() => setExpanded((v) => !v)}
                className="text-xs text-[#E65A1E] mt-1 hover:underline font-medium"
              >
                {expanded ? "less" : "more"}
              </button>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <EditBtn onClick={onEdit} />
          <DeleteBtn onClick={onDelete} />
        </div>
      </div>
    </div>
  );
}

function EditBtn({ onClick, size = 16 }) {
  return (
    <button
      onClick={onClick}
      className="h-8 w-8 rounded-full flex items-center justify-center text-[#E65A1E] hover:bg-[#E65A1E]/10 transition"
    >
      <Pencil size={size} />
    </button>
  );
}

function DeleteBtn({ onClick }) {
  return (
    <button
      onClick={onClick}
      className="h-8 w-8 rounded-full flex items-center justify-center text-red-500 dark:text-red-400 hover:bg-red-500/10 transition"
    >
      <Trash2 size={14} />
    </button>
  );
}

function EmptyState({ text, icon }) {
  return (
    <div className="flex flex-col items-center py-8 text-center">
      {icon || <Plus size={28} className="text-[#333] mb-2" />}
      <p className="text-sm text-[#555] mt-2">{text}</p>
    </div>
  );
}
