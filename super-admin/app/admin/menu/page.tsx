"use client";

import React, { useState, useEffect } from "react";
import { Check } from "lucide-react";
import axios from "axios";

import { Category, ModifierGroup, Product } from "./types";
import { API_URL, getAuthConfig } from "./utils";

import CategoriesTab from "./components/CategoriesTab";
import ModifiersTab from "./components/ModifiersTab";
import ProductsTab from "./components/ProductsTab";

export default function MenuPage() {
  const [activeTab, setActiveTab] = useState<
    "categories" | "modifiers" | "products"
  >("categories");
  const [toastMsg, setToastMsg] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Lists state
  const [categories, setCategories] = useState<Category[]>([]);
  const [modifiers, setModifiers] = useState<ModifierGroup[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  const fetchCategories = async () => {
    try {
      const res = await axios.get(`${API_URL}/categories`, getAuthConfig());
      if (res.data.success) setCategories(res.data.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchModifiers = async () => {
    try {
      const res = await axios.get(`${API_URL}/modifiers`, getAuthConfig());
      if (res.data.success) setModifiers(res.data.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await axios.get(`${API_URL}/products`, getAuthConfig());
      if (res.data.success) setProducts(res.data.data);
    } catch (err) {
      console.error(err);
    }
  };

  // Fetch initial data
  useEffect(() => {
    fetchCategories();
    fetchModifiers();
    fetchProducts();
  }, []);

  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToastMsg({ type, text });
    setTimeout(() => setToastMsg(null), 3000);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Toast Alert */}
      {toastMsg && (
        <div
          className={`fixed bottom-5 right-5 px-4 py-3 rounded-xl shadow-lg flex items-center gap-2.5 z-50 text-[11px] font-700 animate-scale-up ${
            toastMsg.type === "success"
              ? "bg-orange-500 text-white"
              : "bg-red-600 text-white"
          }`}
        >
          <Check size={14} />
          {toastMsg.text}
        </div>
      )}

      {/* ── TAB BAR CONTROL ── */}
      <div className="flex border-b border-neutral-200 bg-white p-1 rounded-xl shadow-sm border">
        {(["categories", "modifiers", "products"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-3 px-4 rounded-lg text-[10.5px] font-700 uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === tab
                ? "bg-brand-primary text-white shadow-md shadow-brand-primary/20"
                : "text-neutral-500 hover:text-neutral-900 hover:bg-neutral-50"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* ── VIEWPORT ── */}
      <div
        className={`grid grid-cols-1 gap-6 ${
          activeTab === "modifiers"
            ? "lg:grid-cols-[minmax(420px,1.15fr)_minmax(0,1.85fr)]"
            : "lg:grid-cols-3"
        }`}
      >
        {activeTab === "categories" && (
          <CategoriesTab
            categories={categories}
            fetchCategories={fetchCategories}
            showToast={showToast}
          />
        )}
        {activeTab === "modifiers" && (
          <ModifiersTab
            modifiers={modifiers}
            fetchModifiers={fetchModifiers}
            showToast={showToast}
          />
        )}
        {activeTab === "products" && (
          <ProductsTab
            products={products}
            categories={categories}
            modifiers={modifiers}
            fetchProducts={fetchProducts}
            showToast={showToast}
          />
        )}
      </div>
    </div>
  );
}
