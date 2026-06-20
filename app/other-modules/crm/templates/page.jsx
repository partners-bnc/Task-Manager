"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Archive,
  Bot,
  Check,
  Code2,
  Copy,
  Eye,
  FileCode2,
  Loader2,
  Mail,
  Monitor,
  Plus,
  Save,
  Search,
  Smartphone,
  Sparkles,
  Wand2,
} from "lucide-react";
import { useCrm } from "../context/CrmContext";
import {
  buildPreviewDocument,
  normalizeVariables,
  renderTemplateVariables,
  SAMPLE_VARIABLES,
  sanitizeEmailHtml,
  STARTER_EMAIL_TEMPLATES,
  TEMPLATE_CATEGORIES,
  TEMPLATE_STATUSES,
} from "../utils/emailTemplates";

const EMPTY_TEMPLATE = {
  id: null,
  name: "Untitled Template",
  category: "Follow-up",
  subject: "",
  preheader: "",
  html_body: "",
  plain_text_body: "",
  variables: ["ContactName", "CompanyName", "AgentName"],
  status: "Draft",
  source: "Manual",
};

const TONES = ["Professional", "Warm", "Concise", "Premium", "Urgent"];
const LOCAL_TEMPLATE_KEY = "crm-email-templates-local";

export default function TemplatesPage() {
  const { currentUser, permissions } = useCrm();
  const router = useRouter();
  const [templates, setTemplates] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [draft, setDraft] = useState(EMPTY_TEMPLATE);
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [query, setQuery] = useState("");
  const [previewMode, setPreviewMode] = useState("desktop");
  const [sampleVariables, setSampleVariables] = useState(SAMPLE_VARIABLES);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRemoteTemplateStoreReady, setIsRemoteTemplateStoreReady] = useState(true);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [aiPrompt, setAiPrompt] = useState("Create a polished follow-up email after a product demo for an enterprise lead.");
  const [aiTone, setAiTone] = useState("Professional");
  const [aiCategory, setAiCategory] = useState("Follow-up");

  const filteredTemplates = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return templates.filter((template) => {
      const categoryMatch = categoryFilter === "All" || template.category === categoryFilter;
      const queryMatch =
        !normalizedQuery ||
        [template.name, template.subject, template.category, template.status]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery);
      return categoryMatch && queryMatch;
    });
  }, [templates, categoryFilter, query]);

  const previewDoc = useMemo(() => buildPreviewDocument(draft, sampleVariables), [draft, sampleVariables]);
  const renderedSubject = renderTemplateVariables(draft.subject, sampleVariables);

  useEffect(() => {
    let isActive = true;

    async function loadTemplates() {
      try {
        const response = await fetch("/other-modules/crm/api/templates");
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Failed to load templates.");
        if (!isActive) return;

        const loaded = mergeTemplates(loadLocalTemplates(), data.templates?.length ? data.templates : starterFallback());
        setTemplates(loaded);
        setSelectedId(loaded[0]?.id || null);
        setDraft(normalizeForDraft(loaded[0] || EMPTY_TEMPLATE));
        if (data.fallback && data.error) {
          setIsRemoteTemplateStoreReady(false);
          setNotice("Using starter templates until Supabase migration is applied.");
        } else {
          setIsRemoteTemplateStoreReady(true);
        }
      } catch (err) {
        if (!isActive) return;
        const fallback = mergeTemplates(loadLocalTemplates(), starterFallback());
        setTemplates(fallback);
        setSelectedId(fallback[0]?.id || null);
        setDraft(normalizeForDraft(fallback[0] || EMPTY_TEMPLATE));
        setIsRemoteTemplateStoreReady(false);
        setError(err.message || "Failed to load templates.");
      } finally {
        if (isActive) setIsLoading(false);
      }
    }

    loadTemplates();
    return () => {
      isActive = false;
    };
  }, []);

  if (!permissions.canManageEmailTemplates) {
    return (
      <div className="flex h-[80vh] items-center justify-center p-8 text-center transition-colors">
        <div className="max-w-md bg-white dark:bg-slate-800 p-8 rounded-xl shadow-lg border border-red-200 dark:border-red-900/50">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl font-bold">!</div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">Access Denied</h1>
          <p className="text-slate-500 dark:text-slate-400 mb-6">
            Your role (<span className="uppercase font-bold">{currentUser.role}</span>) does not have authorization to view or edit outbound email templates. Administrator access required.
          </p>
          <button
            onClick={() => router.push("/other-modules/crm/dashboard")}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md font-medium transition"
          >
            Acknowledge
          </button>
        </div>
      </div>
    );
  }

  function selectTemplate(template) {
    setSelectedId(template.id);
    setDraft(normalizeForDraft(template));
    setNotice("");
    setError("");
  }

  function createBlankTemplate() {
    const blank = {
      ...EMPTY_TEMPLATE,
      id: `draft-${Date.now()}`,
      name: "New Follow-up Template",
      subject: "Following up with {{CompanyName}}",
      html_body: STARTER_EMAIL_TEMPLATES[1].html_body,
      plain_text_body: STARTER_EMAIL_TEMPLATES[1].plain_text_body,
    };
    setTemplates((prev) => [blank, ...prev]);
    setSelectedId(blank.id);
    setDraft(normalizeForDraft(blank));
    setNotice("Draft template created. Save it to persist.");
  }

  function updateDraft(field, value) {
    setDraft((prev) => ({ ...prev, [field]: value }));
  }

  async function saveTemplate(templateOverride = null) {
    setIsSaving(true);
    setError("");
    setNotice("");
    const templateToSave = isTemplateLike(templateOverride) ? templateOverride : draft;
    const payload = {
      ...templateToSave,
      html_body: sanitizeEmailHtml(templateToSave.html_body),
      variables: normalizeVariables(templateToSave.variables),
    };

    if (!String(payload.name || "").trim() || !String(payload.subject || "").trim() || !String(payload.html_body || "").trim()) {
      setError("Template name, subject, and HTML body are required before saving.");
      setIsSaving(false);
      return;
    }

    if (!isRemoteTemplateStoreReady || String(payload.id || "").startsWith("local-")) {
      const localTemplate = {
        ...payload,
        id: String(payload.id || "").startsWith("local-") ? payload.id : `local-${Date.now()}`,
        updated_at: new Date().toISOString(),
        created_at: payload.created_at || new Date().toISOString(),
      };
      saveLocalTemplate(localTemplate);
      setTemplates((prev) => [localTemplate, ...prev.filter((template) => template.id !== localTemplate.id)]);
      setSelectedId(localTemplate.id);
      setDraft(normalizeForDraft(localTemplate));
      setNotice(isRemoteTemplateStoreReady ? "Template saved locally." : "Template saved locally because Supabase is unavailable.");
      setIsSaving(false);
      return;
    }

    try {
      const isPersisted =
        payload.id &&
        !String(payload.id).startsWith("starter-") &&
        !String(payload.id).startsWith("draft-") &&
        !String(payload.id).startsWith("local-");
      const response = await fetch("/other-modules/crm/api/templates", {
        method: isPersisted ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to save template.");

      setTemplates((prev) => {
        const withoutCurrent = prev.filter((template) => template.id !== templateToSave.id && template.id !== data.template.id);
        return [data.template, ...withoutCurrent];
      });
      setSelectedId(data.template.id);
      setDraft(normalizeForDraft(data.template));
      setNotice("Template saved.");
    } catch (err) {
      setIsRemoteTemplateStoreReady(false);
      const localTemplate = {
        ...templateToSave,
        id: String(templateToSave.id || "").startsWith("local-") ? templateToSave.id : `local-${Date.now()}`,
        html_body: payload.html_body,
        variables: payload.variables,
        updated_at: new Date().toISOString(),
        created_at: templateToSave.created_at || new Date().toISOString(),
      };

      saveLocalTemplate(localTemplate);
      setTemplates((prev) => {
        const withoutCurrent = prev.filter((template) => template.id !== templateToSave.id && template.id !== localTemplate.id);
        return [localTemplate, ...withoutCurrent];
      });
      setSelectedId(localTemplate.id);
      setDraft(normalizeForDraft(localTemplate));
      setNotice(`Template saved locally. Supabase save failed: ${err.message || "Unknown error"}`);
    } finally {
      setIsSaving(false);
    }
  }

  async function archiveTemplate() {
    if (!draft.id) return;
    if (String(draft.id).startsWith("starter-") || String(draft.id).startsWith("draft-")) {
      setTemplates((prev) => prev.filter((template) => template.id !== draft.id));
      const next = templates.find((template) => template.id !== draft.id) || null;
      setSelectedId(next?.id || null);
      setDraft(normalizeForDraft(next || EMPTY_TEMPLATE));
      return;
    }

    const archived = { ...draft, status: "Archived" };
    setDraft(archived);
    await saveTemplate(archived);
  }

  async function generateTemplate() {
    if (!aiPrompt.trim()) return;
    setIsGenerating(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/other-modules/crm/api/templates/ai-design", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: aiPrompt, tone: aiTone, category: aiCategory }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to generate template.");

      const generated = {
        ...data.template,
        id: `draft-ai-${Date.now()}`,
      };
      setTemplates((prev) => [generated, ...prev]);
      setSelectedId(generated.id);
      setDraft(normalizeForDraft(generated));
      setNotice("AI template generated. Review and save it to persist.");
    } catch (err) {
      setError(err.message || "Failed to generate template.");
    } finally {
      setIsGenerating(false);
    }
  }

  async function copyHtml() {
    await navigator.clipboard.writeText(sanitizeEmailHtml(draft.html_body));
    setNotice("HTML copied to clipboard.");
  }

  return (
    <div className="h-full overflow-y-auto bg-slate-100 p-6 text-slate-900 transition-colors dark:bg-slate-900 dark:text-slate-100">
      <div className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-blue-600 dark:text-blue-400">
            <Mail className="h-4 w-4" />
            CRM Email Studio
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-950 dark:text-white">Email Templates</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Design professional outreach and follow-up emails with live HTML preview.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button onClick={createBlankTemplate} className="inline-flex items-center rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700">
            <Plus className="mr-2 h-4 w-4" />
            New
          </button>
          <button onClick={copyHtml} className="inline-flex items-center rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700">
            <Copy className="mr-2 h-4 w-4" />
            Copy HTML
          </button>
          <button onClick={() => saveTemplate()} disabled={isSaving || isLoading} className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-400">
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Save
          </button>
        </div>
      </div>

      {(notice || error) && (
        <div className={`mb-4 rounded-md border px-4 py-3 text-sm ${error ? "border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300" : "border-green-200 bg-green-50 text-green-700 dark:border-green-900/60 dark:bg-green-950/30 dark:text-green-300"}`}>
          {error || notice}
        </div>
      )}

      <div className="grid min-h-[calc(100vh-190px)] grid-cols-1 gap-4 xl:grid-cols-[300px_minmax(360px,0.9fr)_minmax(420px,1.1fr)]">
        <aside className="rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <div className="border-b border-slate-200 p-4 dark:border-slate-700">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search templates"
                className="w-full rounded-md border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
              />
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {["All", ...TEMPLATE_CATEGORIES].map((category) => (
                <button
                  key={category}
                  onClick={() => setCategoryFilter(category)}
                  className={`rounded-md px-2.5 py-1.5 text-xs font-semibold transition ${categoryFilter === category ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600"}`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>

          <div className="max-h-[72vh] overflow-y-auto p-2">
            {isLoading ? (
              <div className="flex items-center justify-center py-16 text-sm text-slate-500">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading templates
              </div>
            ) : (
              filteredTemplates.map((template) => (
                <button
                  key={template.id}
                  onClick={() => selectTemplate(template)}
                  className={`mb-2 w-full rounded-md border p-3 text-left transition ${selectedId === template.id ? "border-blue-300 bg-blue-50 dark:border-blue-700 dark:bg-blue-950/40" : "border-transparent hover:bg-slate-50 dark:hover:bg-slate-700/60"}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-bold text-slate-900 dark:text-white">{template.name}</div>
                      <div className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">{template.subject}</div>
                    </div>
                    {template.source === "AI" ? <Sparkles className="h-4 w-4 shrink-0 text-blue-500" /> : <FileCode2 className="h-4 w-4 shrink-0 text-slate-400" />}
                  </div>
                  <div className="mt-3 flex items-center gap-2 text-[11px] font-semibold">
                    <span className="rounded bg-slate-100 px-2 py-1 text-slate-600 dark:bg-slate-700 dark:text-slate-300">{template.category}</span>
                    <span className={template.status === "Active" ? "text-green-600 dark:text-green-400" : "text-slate-400"}>{template.status}</span>
                  </div>
                </button>
              ))
            )}
          </div>
        </aside>

        <section className="space-y-5">
          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-950 dark:text-white">Template Details</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">Edit content, variables, and fallback copy.</p>
              </div>
              <button onClick={archiveTemplate} className="rounded-md p-2 text-slate-400 transition hover:bg-slate-100 hover:text-red-500 dark:hover:bg-slate-700" title="Archive template">
                <Archive className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field label="Template Name">
                <input value={draft.name} onChange={(event) => updateDraft("name", event.target.value)} className="field-input" />
              </Field>
              <Field label="Category">
                <select value={draft.category} onChange={(event) => updateDraft("category", event.target.value)} className="field-input">
                  {TEMPLATE_CATEGORIES.map((category) => <option key={category}>{category}</option>)}
                </select>
              </Field>
              <Field label="Status">
                <select value={draft.status} onChange={(event) => updateDraft("status", event.target.value)} className="field-input">
                  {TEMPLATE_STATUSES.map((status) => <option key={status}>{status}</option>)}
                </select>
              </Field>
              <Field label="Variables">
                <input value={normalizeVariables(draft.variables).join(", ")} onChange={(event) => updateDraft("variables", event.target.value)} className="field-input" />
              </Field>
            </div>

            <div className="mt-4 space-y-4">
              <Field label="Subject">
                <input value={draft.subject} onChange={(event) => updateDraft("subject", event.target.value)} className="field-input" />
              </Field>
              <Field label="Preheader">
                <input value={draft.preheader} onChange={(event) => updateDraft("preheader", event.target.value)} className="field-input" />
              </Field>
              <Field label="HTML Body">
                <textarea value={draft.html_body} onChange={(event) => updateDraft("html_body", event.target.value)} rows={12} className="field-input font-mono text-xs leading-5" />
              </Field>
              <Field label="Plain-text Fallback">
                <textarea value={draft.plain_text_body} onChange={(event) => updateDraft("plain_text_body", event.target.value)} rows={4} className="field-input" />
              </Field>
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <div className="mb-4 flex items-center gap-2">
              <Bot className="h-5 w-5 text-blue-500" />
              <h2 className="text-lg font-bold text-slate-950 dark:text-white">AI Template Designer</h2>
            </div>
            <textarea value={aiPrompt} onChange={(event) => setAiPrompt(event.target.value)} rows={3} className="field-input" placeholder="Describe the email you want OpenAI to design." />
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <select value={aiTone} onChange={(event) => setAiTone(event.target.value)} className="field-input">
                {TONES.map((tone) => <option key={tone}>{tone}</option>)}
              </select>
              <select value={aiCategory} onChange={(event) => setAiCategory(event.target.value)} className="field-input">
                {TEMPLATE_CATEGORIES.map((category) => <option key={category}>{category}</option>)}
              </select>
            </div>
            <button onClick={generateTemplate} disabled={isGenerating || !aiPrompt.trim()} className="mt-4 inline-flex w-full items-center justify-center rounded-md bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400 dark:bg-blue-600 dark:hover:bg-blue-700">
              {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
              Generate with OpenAI
            </button>
          </div>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <div className="flex flex-col gap-3 border-b border-slate-200 p-4 dark:border-slate-700 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-950 dark:text-white">
                <Eye className="h-4 w-4 text-blue-500" />
                Live Preview
              </div>
              <p className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">{renderedSubject || "Add a subject to preview it here."}</p>
            </div>
            <div className="flex rounded-md border border-slate-300 bg-slate-50 p-1 dark:border-slate-600 dark:bg-slate-900">
              <button onClick={() => setPreviewMode("desktop")} className={`rounded px-3 py-1.5 text-xs font-semibold ${previewMode === "desktop" ? "bg-white text-blue-600 shadow-sm dark:bg-slate-700 dark:text-blue-300" : "text-slate-500"}`}>
                <Monitor className="mr-1 inline h-3.5 w-3.5" />
                Desktop
              </button>
              <button onClick={() => setPreviewMode("mobile")} className={`rounded px-3 py-1.5 text-xs font-semibold ${previewMode === "mobile" ? "bg-white text-blue-600 shadow-sm dark:bg-slate-700 dark:text-blue-300" : "text-slate-500"}`}>
                <Smartphone className="mr-1 inline h-3.5 w-3.5" />
                Mobile
              </button>
            </div>
          </div>

          <div className="border-b border-slate-200 p-4 dark:border-slate-700">
            <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-500">
              <Code2 className="h-3.5 w-3.5" />
              Preview Variables
            </div>
            <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
              {Object.entries(sampleVariables).map(([key, value]) => (
                <label key={key} className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                  {key}
                  <input
                    value={value}
                    onChange={(event) => setSampleVariables((prev) => ({ ...prev, [key]: event.target.value }))}
                    className="mt-1 w-full rounded border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-800 outline-none focus:border-blue-500 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                  />
                </label>
              ))}
            </div>
          </div>

          <div className="flex justify-center overflow-auto bg-slate-200 p-4 dark:bg-slate-950/60">
            <div className={`overflow-hidden rounded-md border border-slate-300 bg-white shadow-xl transition-all dark:border-slate-700 ${previewMode === "mobile" ? "w-[390px]" : "w-full max-w-[920px]"}`}>
              <iframe
                title="Email template preview"
                sandbox=""
                srcDoc={previewDoc}
                className="h-[720px] w-full bg-white"
              />
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-slate-200 p-4 text-xs text-slate-500 dark:border-slate-700 dark:text-slate-400">
            <span className="flex items-center">
              <Check className="mr-1.5 h-3.5 w-3.5 text-green-500" />
              Preview is sandboxed and variables are rendered locally.
            </span>
            <span>{normalizeVariables(draft.variables).length} variables</span>
          </div>
        </section>
      </div>

      <style jsx global>{`
        .field-input {
          width: 100%;
          border-radius: 0.375rem;
          border: 1px solid rgb(203 213 225);
          background: white;
          padding: 0.625rem 0.75rem;
          font-size: 0.875rem;
          color: rgb(15 23 42);
          outline: none;
          transition: border-color 150ms ease, box-shadow 150ms ease;
        }
        .field-input:focus {
          border-color: rgb(37 99 235);
          box-shadow: 0 0 0 3px rgb(37 99 235 / 0.16);
        }
        .dark .field-input {
          border-color: rgb(71 85 105);
          background: rgb(15 23 42);
          color: white;
        }
      `}</style>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-bold text-slate-600 dark:text-slate-300">{label}</span>
      {children}
    </label>
  );
}

function normalizeForDraft(template) {
  return {
    ...EMPTY_TEMPLATE,
    ...(template || {}),
    html_body: sanitizeEmailHtml(template?.html_body || template?.html || ""),
    variables: normalizeVariables(template?.variables || EMPTY_TEMPLATE.variables),
  };
}

function starterFallback() {
  return STARTER_EMAIL_TEMPLATES.map((template, index) => ({
    ...template,
    id: `starter-${index + 1}`,
    created_at: new Date(2026, 4, 24 - index).toISOString(),
    updated_at: new Date(2026, 4, 24 - index).toISOString(),
  }));
}

function isTemplateLike(value) {
  return Boolean(value && typeof value === "object" && !value.nativeEvent && ("html_body" in value || "subject" in value));
}

function loadLocalTemplates() {
  if (typeof window === "undefined") return [];

  try {
    const parsed = JSON.parse(window.localStorage.getItem(LOCAL_TEMPLATE_KEY) || "[]");
    return Array.isArray(parsed)
      ? parsed
          .map(normalizeForDraft)
          .filter((template) => template.name && template.subject && template.html_body)
      : [];
  } catch {
    return [];
  }
}

function saveLocalTemplate(template) {
  if (typeof window === "undefined") return;

  const existing = loadLocalTemplates();
  const next = [template, ...existing.filter((item) => item.id !== template.id)];
  window.localStorage.setItem(LOCAL_TEMPLATE_KEY, JSON.stringify(next));
}

function mergeTemplates(primary, secondary) {
  const seen = new Set();
  return [...primary, ...secondary].filter((template) => {
    if (!template?.id || seen.has(template.id)) return false;
    seen.add(template.id);
    return true;
  });
}
