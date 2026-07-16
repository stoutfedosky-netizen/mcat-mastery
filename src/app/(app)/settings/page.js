"use client";
import { useState } from "react";
import { createClient } from "../../../lib/supabase";
import { useApp } from "../../../context/AppContext";

export default function SettingsPage() {
  const { user, displayName, signOut } = useApp();
  const [name, setName] = useState(displayName);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const supabase = createClient();

  const saveName = async () => {
    if (!name.trim()) return;
    setSaving(true);
    setMessage("");
    const { error } = await supabase.auth.updateUser({
      data: { display_name: name.trim() },
    });
    setSaving(false);
    if (error) {
      setMessage("Could not save your name. Try again.");
    } else {
      setMessage("Saved. It may take a moment to update everywhere.");
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500 mt-1">Manage your account.</p>
      </div>

      <div className="space-y-6">
        {/* Profile */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Profile</h3>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Display Name
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2b7bbf]"
              />
              <button
                onClick={saveName}
                disabled={saving || !name.trim() || name.trim() === displayName}
                className="px-4 py-2 rounded-lg font-semibold text-white text-sm transition-all hover:opacity-90 disabled:opacity-40"
                style={{ background: "#1a3a5c" }}
              >
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
            {message && (
              <p className="text-xs text-gray-500 mt-2">{message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <p className="text-sm text-gray-500">{user?.email}</p>
          </div>
        </div>

        {/* Account */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <h3 className="font-semibold text-gray-900 mb-1">Sign Out</h3>
          <p className="text-sm text-gray-500 mb-4">
            Sign out of your account on this device.
          </p>
          <button
            onClick={signOut}
            className="px-4 py-2 rounded-lg font-semibold text-sm border-2 border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50 transition-all"
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}
