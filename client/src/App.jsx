import { useCallback, useEffect, useState } from "react";
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronDown,
  GraduationCap,
  HeartHandshake,
  LoaderCircle,
  LockKeyhole,
  LogOut,
  Mail,
  Menu,
  MessageCircle,
  Phone,
  Search,
  ShieldCheck,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import { api } from "./api.js";

const userTypes = ["Parent", "Student", "School"];
const categories = ["Scholarship", "Concert", "Admission", "General Query"];
const statuses = ["New", "In Progress", "Resolved", "Rejected"];

function viewForPath(pathname) {
  const path = pathname.replace(/\/+$/, "") || "/";
  if (path === "/admin/login") return "login";
  if (path === "/admin") return "dashboard";
  return "home";
}

function Brand({ compact = false }) {
  return (
    <a href="/" className="flex items-center gap-3" aria-label="K12 Hunar home">
      <span className="brand-mark"><GraduationCap size={22} strokeWidth={2.2} /></span>
      <span className="leading-tight">
        <span className="block text-[17px] font-extrabold tracking-tight text-navy">k12<span className="text-teal">hunar</span></span>
        {!compact && <span className="block text-[10px] font-semibold tracking-[.17em] text-slate-400">LEARN · GROW · SHINE</span>}
      </span>
    </a>
  );
}

function Alert({ type = "error", children, onClose }) {
  return (
    <div className={`alert alert-${type}`} role={type === "error" ? "alert" : "status"}>
      <span>{children}</span>
      {onClose && <button className="ml-3 shrink-0" type="button" onClick={onClose} aria-label="Dismiss message"><X size={17} /></button>}
    </div>
  );
}

function InquiryForm() {
  const [values, setValues] = useState({ userType: "", category: "", name: "", email: "", phone: "", message: "" });
  const [errors, setErrors] = useState({});
  const [state, setState] = useState("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const validate = () => {
    const next = {};
    if (values.name.trim().length < 2 || values.name.trim().length > 120) next.name = "Use 2 to 120 characters.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) next.email = "Enter a valid email address.";
    if (!/^[+()\d.\-\s]{7,25}$/.test(values.phone.trim()) || !/\d/.test(values.phone)) next.phone = "Enter a valid phone number.";
    if (!userTypes.includes(values.userType)) next.userType = "Choose who you are contacting us as.";
    if (!categories.includes(values.category)) next.category = "Choose an inquiry topic.";
    if (values.message.trim().length < 10 || values.message.trim().length > 5000) next.message = "Write between 10 and 5,000 characters.";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const update = (event) => {
    const { name, value } = event.target;
    setValues((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: undefined }));
    setState("idle");
  };

  const submit = async (event) => {
    event.preventDefault();
    if (!validate()) return;
    setState("loading");
    setErrorMessage("");
    try {
      await api.submitInquiry(values);
      setState("success");
      setValues({ userType: "", category: "", name: "", email: "", phone: "", message: "" });
      setErrors({});
    } catch (error) {
      setState("error");
      setErrorMessage(error.message);
    }
  };

  return (
    <section id="inquiry" className="form-card scroll-mt-24">
      <div className="mb-7">
        <div className="eyebrow"><span className="eyebrow-dot" /> WE'D LOVE TO HEAR FROM YOU</div>
        <h2 className="mt-3 text-2xl font-bold tracking-tight text-navy">Send us a message</h2>
        <p className="mt-2 text-sm leading-6 text-slate-500">Tell us a little about what you need. Our team will be in touch soon.</p>
      </div>
      {state === "success" && <Alert type="success"><span className="font-semibold">Thanks for reaching out!</span> Your message is with our team. We’ll get back to you soon.</Alert>}
      {state === "error" && <Alert onClose={() => setState("idle")}>{errorMessage || "We couldn’t send your message. Please try again."}</Alert>}
      <form className="space-y-5" onSubmit={submit} noValidate>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="I am a..." name="userType" error={errors.userType}>
            <select id="userType" name="userType" value={values.userType} onChange={update} aria-invalid={Boolean(errors.userType)} aria-describedby={errors.userType ? "userType-error" : undefined} required>
              <option value="">Select one</option>
              {userTypes.map((type) => <option key={type}>{type}</option>)}
            </select>
          </Field>
          <Field label="What can we help with?" name="category" error={errors.category}>
            <select id="category" name="category" value={values.category} onChange={update} aria-invalid={Boolean(errors.category)} aria-describedby={errors.category ? "category-error" : undefined} required>
              <option value="">Choose a topic</option>
              {categories.map((category) => <option key={category}>{category}</option>)}
            </select>
          </Field>
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Your name" name="name" error={errors.name}>
            <input id="name" name="name" autoComplete="name" value={values.name} onChange={update} placeholder="e.g. Aanya Sharma" maxLength={120} aria-invalid={Boolean(errors.name)} aria-describedby={errors.name ? "name-error" : undefined} required />
          </Field>
          <Field label="Phone number" name="phone" error={errors.phone}>
            <input id="phone" name="phone" type="tel" autoComplete="tel" value={values.phone} onChange={update} placeholder="+91 98765 43210" maxLength={25} aria-invalid={Boolean(errors.phone)} aria-describedby={errors.phone ? "phone-error" : undefined} required />
          </Field>
        </div>
        <Field label="Email address" name="email" error={errors.email}>
          <input id="email" name="email" type="email" autoComplete="email" value={values.email} onChange={update} placeholder="you@example.com" maxLength={255} aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? "email-error" : undefined} required />
        </Field>
        <Field label="Your message" name="message" error={errors.message}>
          <textarea id="message" name="message" value={values.message} onChange={update} placeholder="Share a few details so our team can help you better..." rows={4} maxLength={5000} aria-invalid={Boolean(errors.message)} aria-describedby={errors.message ? "message-error" : undefined} required />
          <span className="mt-1 block text-right text-xs text-slate-400">{values.message.length}/5000</span>
        </Field>
        <button className="button-primary w-full" type="submit" disabled={state === "loading"}>
          {state === "loading" ? <><LoaderCircle className="animate-spin" size={18} /> Sending your message...</> : <>Send inquiry <ArrowRight size={17} /></>}
        </button>
        <p className="flex items-center justify-center gap-2 text-center text-xs text-slate-400"><ShieldCheck size={14} /> Your details are shared only with our support team.</p>
      </form>
    </section>
  );
}

function Field({ label, name, error, children }) {
  return (
    <div>
      <label className="field-label" htmlFor={name}>{label}</label>
      {children}
      {error && <p className="mt-1 text-xs font-medium text-rose-600" id={`${name}-error`}>{error}</p>}
    </div>
  );
}

function HomePage() {
  return (
    <>
      <main id="home">
        <section className="hero-wrap">
          <div className="hero-grid">
            <div className="hero-copy">
              <div className="hero-pill"><Sparkles size={14} /> A brighter future starts here</div>
              <h1>Every learner has a story. <span>Let’s write yours.</span></h1>
              <p className="hero-description">Big dreams begin with a conversation. Whether you're exploring a scholarship, an admission, or simply have a question, our team is ready to help.</p>
              <a className="button-primary hero-cta" href="#inquiry">Start a conversation <ArrowRight size={17} /></a>
              <div className="hero-social-proof">
                <span className="benefit-icon"><HeartHandshake size={19} /></span>
                <div><p className="font-bold text-navy">Support for every step</p><p className="text-xs text-slate-500">People ready to listen and help you begin</p></div>
              </div>
            </div>
            <div className="hero-art" aria-hidden="true">
              <div className="art-orbit orbit-one" /><div className="art-orbit orbit-two" />
              <div className="art-sun"><Sparkles size={27} /></div>
              <div className="art-card art-card-main">
                <div className="art-card-top"><span className="art-icon"><GraduationCap size={23} /></span><span className="art-dots">•••</span></div>
                <div className="art-illustration"><div className="book book-one" /><div className="book book-two" /><div className="book book-three" /><div className="plant-stem" /><div className="plant-leaf leaf-a" /><div className="plant-leaf leaf-b" /></div>
                <div className="art-caption"><span className="art-caption-line" /><span className="art-caption-line short" /></div>
              </div>
              <div className="floating-note note-top"><span className="note-icon note-yellow"><HeartHandshake size={18} /></span><span><b>Guidance that gets you</b><small>One conversation away</small></span><Check className="note-check" size={17} /></div>
              <div className="floating-note note-bottom"><span className="note-icon note-purple"><GraduationCap size={18} /></span><span><b>Dream big. Start here.</b><small>Your next chapter awaits</small></span></div>
              <span className="art-star star-one">✦</span><span className="art-star star-two">✳</span>
            </div>
          </div>
        </section>
        <section className="benefit-strip">
          <div className="mx-auto grid max-w-6xl gap-5 px-5 py-7 sm:grid-cols-3">
            <Benefit icon={<HeartHandshake size={19} />} title="Real people, real support" text="A thoughtful team, ready to listen." />
            <Benefit icon={<GraduationCap size={19} />} title="Built around learners" text="Guidance for every kind of dream." />
            <Benefit icon={<MessageCircle size={19} />} title="A clear next step" text="We'll help you figure out what comes next." />
          </div>
        </section>
        <section className="contact-section mx-auto grid max-w-6xl items-start gap-12 px-5 py-16 lg:grid-cols-[.8fr_1.2fr] lg:gap-20">
          <div className="pt-4">
            <div className="eyebrow"><span className="eyebrow-dot" /> START A CONVERSATION</div>
            <h2 className="section-title">Your questions deserve <span>a real answer.</span></h2>
            <p className="mt-5 max-w-md text-[15px] leading-7 text-slate-500">No question is too small. Send us a message and a real person from the K12 Hunar team will help you find your way forward.</p>
            <div className="mt-8 space-y-4">
              <ContactLine icon={<Mail size={17} />} label="Message our team" detail="Use the inquiry form and we'll be in touch" />
              <ContactLine icon={<Phone size={17} />} label="Call our team" detail="We’re happy to help you get started" />
            </div>
            <div className="mt-9 rounded-2xl border border-teal/10 bg-mint p-5">
              <div className="flex gap-3"><span className="mt-0.5 text-teal"><Sparkles size={18} /></span><div><p className="text-sm font-bold text-navy">Not sure where to start?</p><p className="mt-1 text-sm leading-6 text-slate-500">Choose “General Query” and tell us what’s on your mind. We’ll take it from there.</p></div></div>
            </div>
          </div>
          <InquiryForm />
        </section>
      </main>
      <footer className="border-t border-slate-200/70 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-5 py-6 sm:flex-row">
          <Brand compact />
          <p className="text-xs text-slate-400">© {new Date().getFullYear()} K12 Hunar. Helping every learner shine.</p>
        </div>
      </footer>
    </>
  );
}

function Benefit({ icon, title, text }) {
  return <div className="flex items-start gap-3"><span className="benefit-icon">{icon}</span><div><p className="text-sm font-bold text-navy">{title}</p><p className="mt-1 text-sm text-slate-500">{text}</p></div></div>;
}

function ContactLine({ icon, label, detail }) {
  return <div className="flex items-center gap-3"><span className="contact-icon">{icon}</span><span><b className="block text-sm text-navy">{label}</b><span className="text-sm text-slate-500">{detail}</span></span></div>;
}

function AdminLogin({ onSuccess, onCancel }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api.login({ email, password });
      await onSuccess();
    } catch (loginError) {
      setError(loginError.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="login-shell">
      <section className="login-card">
        <div className="mx-auto mb-6 grid h-14 w-14 place-items-center rounded-2xl bg-mint text-teal"><LockKeyhole size={25} /></div>
        <p className="eyebrow justify-center"><span className="eyebrow-dot" /> TEAM PORTAL</p>
        <h1 className="mt-3 text-center text-2xl font-bold text-navy">Welcome back</h1>
        <p className="mt-2 text-center text-sm text-slate-500">Sign in to manage learner inquiries.</p>
        {error && <Alert>{error}</Alert>}
        <form className="mt-7 space-y-5" onSubmit={submit}>
          <Field label="Work email" name="admin-email"><input id="admin-email" type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} required /></Field>
          <Field label="Password" name="admin-password"><input id="admin-password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required /></Field>
          <button type="submit" className="button-primary w-full" disabled={busy}>{busy ? <><LoaderCircle size={18} className="animate-spin" /> Signing in...</> : <>Sign in securely <ArrowRight size={17} /></>}</button>
        </form>
        <button type="button" onClick={onCancel} className="mt-5 w-full text-center text-sm font-semibold text-slate-500 hover:text-teal">Back to K12 Hunar</button>
        <p className="mt-7 flex items-center justify-center gap-2 border-t border-slate-100 pt-5 text-xs text-slate-400"><ShieldCheck size={14} /> Protected team access</p>
      </section>
    </main>
  );
}

function Dashboard({ admin, onLogout, authError, clearAuthError }) {
  const [filters, setFilters] = useState({ category: "", userType: "", search: "", page: "1", limit: "25" });
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updating, setUpdating] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await api.inquiries(Object.fromEntries(Object.entries(filters).filter(([, value]) => value)));
      setData(result);
    } catch (loadError) {
      setError(loadError.message);
      if (loadError.status === 401) onLogout(false);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [filters, onLogout]);

  useEffect(() => {
    const timer = window.setTimeout(load, filters.search ? 250 : 0);
    return () => window.clearTimeout(timer);
  }, [load, filters.search]);

  const updateFilter = (key, value) => setFilters((current) => ({ ...current, [key]: value, page: "1" }));
  const updateStatus = async (id, status) => {
    setUpdating(id);
    setError("");
    try {
      await api.updateStatus(id, status);
      await load();
    } catch (updateError) {
      setError(updateError.message);
    } finally {
      setUpdating("");
    }
  };

  return (
    <main className="dashboard-shell">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div><p className="eyebrow"><span className="eyebrow-dot" /> INQUIRY MANAGEMENT</p><h1 className="mt-2 text-3xl font-bold tracking-tight text-navy">Good to see you, {admin?.name?.split(" ")[0] || "team"}</h1><p className="mt-1 text-sm text-slate-500">Here’s what’s happening with your inquiries.</p></div>
          <button className="button-quiet" onClick={onLogout} type="button"><LogOut size={16} /> Sign out</button>
        </div>
        {authError && <Alert onClose={clearAuthError}>{authError}</Alert>}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Total inquiries" value={data?.stats?.total} icon={<Users size={19} />} tone="blue" trend="All time" />
          <StatCard label="Needs attention" value={data?.stats?.new} icon={<MessageCircle size={19} />} tone="amber" trend="New" />
          <StatCard label="In progress" value={data?.stats?.in_progress} icon={<ArrowUpRight size={19} />} tone="violet" trend="Being handled" />
          <StatCard label="Resolved" value={data?.stats?.resolved} icon={<Check size={19} />} tone="green" trend="Successfully closed" />
        </div>
        <section className="dashboard-panel mt-7">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-5 sm:px-6">
            <div><h2 className="text-lg font-bold text-navy">All inquiries</h2><p className="mt-1 text-sm text-slate-500">{data?.pagination?.total ?? "—"} conversations to care for</p></div>
            <button type="button" className="button-quiet !py-2" onClick={load} aria-label="Refresh inquiries"><ArrowUpRight size={16} /> Refresh</button>
          </div>
          <div className="filter-bar">
            <label className="search-box"><Search size={17} /><span className="sr-only">Search name or phone</span><input aria-label="Search by name or phone" placeholder="Search name or phone..." value={filters.search} onChange={(event) => updateFilter("search", event.target.value)} /></label>
            <label className="select-box"><span className="sr-only">Filter by category</span><select aria-label="Filter by category" value={filters.category} onChange={(event) => updateFilter("category", event.target.value)}><option value="">All topics</option>{categories.map((category) => <option key={category}>{category}</option>)}</select><ChevronDown size={15} /></label>
            <label className="select-box"><span className="sr-only">Filter by user type</span><select aria-label="Filter by user type" value={filters.userType} onChange={(event) => updateFilter("userType", event.target.value)}><option value="">All people</option>{userTypes.map((type) => <option key={type}>{type}</option>)}</select><ChevronDown size={15} /></label>
          </div>
          {error && <div className="px-5 pt-4"><Alert onClose={() => setError("")}>{error}</Alert></div>}
          {loading && !data ? <div className="state-box"><LoaderCircle className="animate-spin text-teal" size={26} /><p>Loading inquiries...</p></div> :
            loading ? <div className="loading-line"><span /></div> : null}
          {!loading && !error && data?.inquiries?.length === 0 && <div className="state-box"><div className="empty-icon"><MessageCircle size={22} /></div><p className="font-bold text-navy">No inquiries found</p><p className="text-sm">Try changing your filters, or check back later.</p></div>}
          {!!data?.inquiries?.length && <InquiryResults inquiries={data.inquiries} updating={updating} onStatus={updateStatus} />}
          {data?.pagination?.pages > 1 && <div className="flex items-center justify-between border-t border-slate-100 px-5 py-4 text-sm sm:px-6"><span className="text-slate-500">Page {data.pagination.page} of {data.pagination.pages}</span><div className="flex gap-2"><button className="page-button" type="button" disabled={data.pagination.page <= 1} onClick={() => updateFilter("page", String(data.pagination.page - 1))}><ArrowDownRight className="rotate-45" size={15} /> Previous</button><button className="page-button" type="button" disabled={data.pagination.page >= data.pagination.pages} onClick={() => updateFilter("page", String(data.pagination.page + 1))}>Next <ArrowRight size={15} /></button></div></div>}
        </section>
        <p className="mt-5 text-center text-xs text-slate-400">Inquiry data is private and visible only to authorized K12 Hunar admins.</p>
      </div>
    </main>
  );
}

function StatCard({ label, value, icon, tone, trend }) {
  return <div className="stat-card"><div className={`stat-icon stat-${tone}`}>{icon}</div><p className="mt-4 text-sm font-medium text-slate-500">{label}</p><div className="mt-1 flex items-end justify-between"><strong className="text-3xl font-bold tracking-tight text-navy">{value ?? "—"}</strong><span className="text-xs text-slate-400">{trend}</span></div></div>;
}

function StatusBadge({ status }) {
  return <span className={`status-badge status-${status.toLowerCase().replace(" ", "-")}`}><span />{status}</span>;
}

function InquiryResults({ inquiries, updating, onStatus }) {
  return (
    <>
      <div className="hidden overflow-x-auto md:block">
        <table className="inquiry-table">
          <thead><tr><th>Person</th><th>Contact</th><th>Type</th><th>Topic</th><th>Received</th><th>Status</th></tr></thead>
          <tbody>{inquiries.map((inquiry) => <tr key={inquiry.id}>
            <td><span className="person-name">{inquiry.name}</span></td>
            <td><a className="contact-value" href={`mailto:${inquiry.email}`}>{inquiry.email}</a><a className="contact-value" href={`tel:${inquiry.phone}`}>{inquiry.phone}</a></td>
            <td><span className="type-chip">{inquiry.userType}</span></td><td><span className="topic-text">{inquiry.category}</span></td>
            <td className="date-text">{formatDate(inquiry.createdAt)}</td>
            <td><StatusControl inquiry={inquiry} updating={updating} onStatus={onStatus} /></td>
          </tr>)}</tbody>
        </table>
      </div>
      <div className="mobile-inquiries md:hidden">{inquiries.map((inquiry) => <article className="mobile-inquiry" key={inquiry.id}>
        <div className="flex items-start justify-between gap-3"><div><p className="person-name">{inquiry.name}</p><span className="type-chip mt-1 inline-flex">{inquiry.userType}</span></div><StatusControl inquiry={inquiry} updating={updating} onStatus={onStatus} /></div>
        <div className="mt-4 grid gap-2 text-sm"><a className="contact-value" href={`mailto:${inquiry.email}`}><Mail size={14} />{inquiry.email}</a><a className="contact-value" href={`tel:${inquiry.phone}`}><Phone size={14} />{inquiry.phone}</a></div>
        <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3"><span className="topic-text">{inquiry.category}</span><span className="date-text">{formatDate(inquiry.createdAt)}</span></div>
      </article>)}</div>
    </>
  );
}

function StatusControl({ inquiry, updating, onStatus }) {
  return (
    <div className="status-control">
      <StatusBadge status={inquiry.status} />
      <label className="sr-only" htmlFor={`status-${inquiry.id}`}>Update status for {inquiry.name}</label>
      <select id={`status-${inquiry.id}`} aria-label={`Update status for ${inquiry.name}`} value={inquiry.status} disabled={updating === inquiry.id} onChange={(event) => onStatus(inquiry.id, event.target.value)}>
        {statuses.map((status) => <option key={status}>{status}</option>)}
      </select>
      {updating === inquiry.id && <LoaderCircle className="animate-spin text-teal" size={14} />}
    </div>
  );
}

function formatDate(value) {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}

export default function App() {
  const [view, setView] = useState(() => viewForPath(window.location.pathname));
  const [admin, setAdmin] = useState(null);
  const [authChecking, setAuthChecking] = useState(() => viewForPath(window.location.pathname) === "dashboard");
  const [menuOpen, setMenuOpen] = useState(false);
  const [authError, setAuthError] = useState("");

  const navigate = useCallback((path) => {
    if (window.location.pathname !== path) {
      window.history.pushState({}, "", path);
    }
    setView(viewForPath(path));
    setMenuOpen(false);
  }, []);

  const signOut = useCallback(async (makeRequest = true) => {
    if (makeRequest) {
      try {
        await api.logout();
      } catch (error) {
        setAuthError(error.message);
        return;
      }
    }
    setAuthError("");
    setAdmin(null);
    navigate("/");
  }, [navigate]);

  const showDashboard = useCallback(async () => {
    setAuthChecking(true);
    try {
      const result = await api.currentAdmin();
      setAdmin(result.admin);
      navigate("/admin");
    } catch {
      setAdmin(null);
      navigate("/admin/login");
    } finally {
      setAuthChecking(false);
    }
  }, [navigate]);

  useEffect(() => {
    const handlePopState = () => {
      const nextView = viewForPath(window.location.pathname);
      setView(nextView);
      if (nextView === "dashboard") void showDashboard();
    };
    window.addEventListener("popstate", handlePopState);
    if (viewForPath(window.location.pathname) === "dashboard") void showDashboard();
    return () => window.removeEventListener("popstate", handlePopState);
  }, [showDashboard]);

  const goToAdmin = () => {
    navigate(admin ? "/admin" : "/admin/login");
  };

  return (
    <div className="min-h-screen">
      <header className="site-header">
        <div className="mx-auto flex h-[76px] max-w-6xl items-center justify-between px-5">
          <Brand />
          <nav className="hidden items-center gap-8 md:flex" aria-label="Main navigation">
            {view === "home" && <><a className="nav-link" href="/#home">Home</a><a className="nav-link" href="/#inquiry">Contact</a></>}
            <button className="nav-admin" onClick={goToAdmin} type="button">{admin ? <><Users size={15} /> Admin dashboard</> : <><LockKeyhole size={14} /> Team login</>}</button>
          </nav>
          <button className="grid h-10 w-10 place-items-center rounded-lg text-navy md:hidden" onClick={() => setMenuOpen((open) => !open)} type="button" aria-label={menuOpen ? "Close menu" : "Open menu"} aria-expanded={menuOpen}>{menuOpen ? <X size={21} /> : <Menu size={21} />}</button>
        </div>
        {menuOpen && <div className="mobile-nav md:hidden"><a href="/">Home</a><a href="/#inquiry">Contact</a><button onClick={goToAdmin} type="button">{admin ? "Admin dashboard" : "Team login"}</button></div>}
      </header>
      {view === "home" && <HomePage />}
      {view === "login" && <AdminLogin onSuccess={showDashboard} onCancel={() => navigate("/")} />}
      {view === "dashboard" && (authChecking
        ? <main className="login-shell" role="status"><LoaderCircle className="animate-spin text-teal" size={26} /><span className="sr-only">Verifying admin session...</span></main>
        : <Dashboard admin={admin} onLogout={signOut} authError={authError} clearAuthError={() => setAuthError("")} />)}
    </div>
  );
}
