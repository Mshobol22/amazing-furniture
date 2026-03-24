"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tag, X } from "lucide-react";

interface Banner {
  id: string;
  message: string;
  bg_color: string;
  text_color: string;
  link_url: string | null;
  link_text: string | null;
  is_active: boolean;
  created_at: string;
}

export default function BannersPage() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const [form, setForm] = useState({
    message: "",
    bg_color: "#1C1C1C",
    text_color: "#FAF8F5",
    link_url: "",
    link_text: "",
  });

  const fetchBanners = async () => {
    const res = await fetch("/api/admin/banners");
    const data = await res.json();
    setBanners(Array.isArray(data) ? data : []);
    setLoading(false);
  };

  useEffect(() => {
    fetchBanners();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.message.trim()) return;
    const res = await fetch("/api/admin/banners", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: form.message.trim(),
        bg_color: form.bg_color,
        text_color: form.text_color,
        link_url: form.link_url.trim() || null,
        link_text: form.link_text.trim() || null,
      }),
    });
    if (res.ok) {
      setForm({ message: "", bg_color: "#1C1C1C", text_color: "#FAF8F5", link_url: "", link_text: "" });
      setEditingId(null);
      fetchBanners();
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId || !form.message.trim()) return;
    const res = await fetch(`/api/admin/banners/${editingId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: form.message.trim(),
        bg_color: form.bg_color,
        text_color: form.text_color,
        link_url: form.link_url.trim() || null,
        link_text: form.link_text.trim() || null,
      }),
    });
    if (res.ok) {
      setEditingId(null);
      setForm({ message: "", bg_color: "#1C1C1C", text_color: "#FAF8F5", link_url: "", link_text: "" });
      fetchBanners();
    }
  };

  const handleToggleActive = async (banner: Banner) => {
    const res = await fetch(`/api/admin/banners/${banner.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: !banner.is_active }),
    });
    if (res.ok) fetchBanners();
  };

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/admin/banners/${id}`, { method: "DELETE" });
    if (res.ok) {
      setDeleteConfirmId(null);
      if (editingId === id) {
        setEditingId(null);
        setForm({ message: "", bg_color: "#1C1C1C", text_color: "#FAF8F5", link_url: "", link_text: "" });
      }
      fetchBanners();
    }
  };

  const startEdit = (banner: Banner) => {
    setEditingId(banner.id);
    setForm({
      message: banner.message,
      bg_color: banner.bg_color,
      text_color: banner.text_color,
      link_url: banner.link_url ?? "",
      link_text: banner.link_text ?? "",
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm({ message: "", bg_color: "#1C1C1C", text_color: "#FAF8F5", link_url: "", link_text: "" });
  };

  return (
    <div>
      <h1 className="mb-8 text-2xl font-semibold text-charcoal">
        Banners
      </h1>

      {/* Create / Edit form */}
      <section className="mb-12">
        <h2 className="mb-4 text-lg font-semibold text-charcoal">
          {editingId ? "Edit Banner" : "Create Banner"}
        </h2>

        {/* Live Preview Widget */}
        <div className="mb-6">
          <p className="text-sm font-medium text-gray-500 mb-3">Live Preview</p>
          <div className="flex justify-center bg-gray-100 rounded-xl p-8">
            <div
              className="relative flex items-start gap-3 p-4 rounded-2xl shadow-xl max-w-[280px] w-full border border-white/10"
              style={{ backgroundColor: form.bg_color, color: form.text_color }}
            >
              <div
                className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: `${form.text_color}20` }}
              >
                <Tag className="w-4 h-4" style={{ color: form.text_color }} />
              </div>
              <div className="flex-1 pr-4">
                <p className="text-sm font-semibold leading-snug" style={{ color: form.text_color }}>
                  {form.message || "Your message will appear here..."}
                </p>
                {form.link_text && (
                  <span className="mt-1.5 inline-flex items-center gap-1 text-xs font-semibold" style={{ color: form.text_color, opacity: 0.85 }}>
                    {form.link_text} →
                  </span>
                )}
              </div>
              <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-black/10 flex items-center justify-center">
                <X className="w-3 h-3" style={{ color: form.text_color }} />
              </div>
            </div>
          </div>
        </div>

        <form
          onSubmit={editingId ? handleUpdate : handleCreate}
          className="space-y-4 rounded-lg border border-gray-200 bg-white p-6"
        >
          <div>
            <Label htmlFor="message">Message (required)</Label>
            <textarea
              id="message"
              value={form.message}
              onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
              rows={3}
              className="mt-1 w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
              placeholder="Free shipping on all orders this weekend!"
              required
            />
          </div>
          {/* Color presets */}
          <div className="mb-4">
            <p className="text-sm font-medium text-gray-600 mb-2">Color Presets</p>
            <div className="flex gap-2 flex-wrap">
              {[
                { label: "Walnut", bg: "#2D4A3E", text: "#FAF8F5" },
                { label: "Charcoal", bg: "#1C1C1C", text: "#FAF8F5" },
                { label: "Forest", bg: "#0D2818", text: "#FAF8F5" },
                { label: "Cream", bg: "#FAF8F5", text: "#1C1C1C" },
                { label: "Sale Red", bg: "#B91C1C", text: "#FAF8F5" },
                { label: "Navy", bg: "#1E3A5F", text: "#FAF8F5" },
              ].map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => setForm((prev) => ({ ...prev, bg_color: preset.bg, text_color: preset.text }))}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium border-2 transition-all hover:scale-105"
                  style={{
                    backgroundColor: preset.bg,
                    color: preset.text,
                    borderColor: form.bg_color === preset.bg ? preset.text : "transparent",
                  }}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="bg_color">Background color</Label>
              <div className="mt-1 flex items-center gap-2">
                <input
                  type="color"
                  id="bg_color"
                  value={form.bg_color}
                  onChange={(e) => setForm((f) => ({ ...f, bg_color: e.target.value }))}
                  className="h-10 w-14 cursor-pointer rounded border border-gray-200"
                />
                <Input
                  value={form.bg_color}
                  onChange={(e) => setForm((f) => ({ ...f, bg_color: e.target.value }))}
                  className="flex-1 font-mono text-sm"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="text_color">Text color</Label>
              <div className="mt-1 flex items-center gap-2">
                <input
                  type="color"
                  id="text_color"
                  value={form.text_color}
                  onChange={(e) => setForm((f) => ({ ...f, text_color: e.target.value }))}
                  className="h-10 w-14 cursor-pointer rounded border border-gray-200"
                />
                <Input
                  value={form.text_color}
                  onChange={(e) => setForm((f) => ({ ...f, text_color: e.target.value }))}
                  className="flex-1 font-mono text-sm"
                />
              </div>
            </div>
          </div>
          <div>
            <Label htmlFor="link_url">Link URL (optional)</Label>
            <Input
              id="link_url"
              value={form.link_url}
              onChange={(e) => setForm((f) => ({ ...f, link_url: e.target.value }))}
              placeholder="/collections/sofa"
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="link_text">Link text (optional)</Label>
            <Input
              id="link_text"
              value={form.link_text}
              onChange={(e) => setForm((f) => ({ ...f, link_text: e.target.value }))}
              placeholder="Shop Now"
              className="mt-1"
            />
          </div>
          <div className="flex gap-2">
            <Button type="submit" className="bg-walnut text-cream hover:bg-walnut/90">
              {editingId ? "Update Banner" : "Create Banner"}
            </Button>
            {editingId && (
              <Button type="button" variant="outline" onClick={cancelEdit}>
                Cancel
              </Button>
            )}
          </div>
        </form>
      </section>

      {/* Active banners list */}
      <section>
        <h2 className="mb-4 text-lg font-semibold text-charcoal">
          Active Banners
        </h2>
        {loading ? (
          <p className="text-warm-gray">Loading...</p>
        ) : banners.length === 0 ? (
          <p className="rounded-lg border border-gray-200 bg-white p-8 text-center text-warm-gray">
            No banners yet. Create one above.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="px-4 py-3 text-left font-medium text-charcoal">
                    Message
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-charcoal">
                    Colors
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-charcoal">
                    Active
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-charcoal">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {banners.map((banner) => (
                  <tr
                    key={banner.id}
                    className="border-b border-gray-100 hover:bg-gray-50"
                  >
                    <td className="px-4 py-2 text-charcoal">
                      {banner.message.length > 60
                        ? banner.message.slice(0, 60) + "..."
                        : banner.message}
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex gap-1">
                        <span
                          className="inline-block h-5 w-5 rounded border border-gray-200"
                          style={{ backgroundColor: banner.bg_color }}
                          title="Background"
                        />
                        <span
                          className="inline-block h-5 w-5 rounded border border-gray-200"
                          style={{ backgroundColor: banner.text_color }}
                          title="Text"
                        />
                      </div>
                    </td>
                    <td className="px-4 py-2">
                      <button
                        type="button"
                        role="switch"
                        aria-checked={banner.is_active}
                        onClick={() => handleToggleActive(banner)}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-walnut focus:ring-offset-2 ${
                          banner.is_active ? "bg-green-500" : "bg-gray-200"
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition-transform ${
                            banner.is_active
                              ? "translate-x-5"
                              : "translate-x-0.5"
                          }`}
                        />
                      </button>
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => startEdit(banner)}
                        >
                          Edit
                        </Button>
                        {deleteConfirmId === banner.id ? (
                          <>
                            <Button
                              size="sm"
                              className="bg-red-600 text-white hover:bg-red-700"
                              onClick={() => handleDelete(banner.id)}
                            >
                              Confirm
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setDeleteConfirmId(null)}
                            >
                              Cancel
                            </Button>
                          </>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-red-600 hover:bg-red-50"
                            onClick={() => setDeleteConfirmId(banner.id)}
                          >
                            Delete
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
