import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  FolderPlus,
  Layers,
  Check,
  Edit,
  Trash,
  Image as ImageIcon,
  Loader2,
  Store,
  Search,
  X,
  Copy,
} from "lucide-react";
import toast from "react-hot-toast";
import { Product, Category, ModifierGroup } from "../types";
import { API_URL, compressImage, getAuthConfig } from "../utils";
import BranchVisibilityModal from "./BranchVisibilityModal";

interface ProductsTabProps {
  products: Product[];
  categories: Category[];
  modifiers: ModifierGroup[];
  fetchProducts: () => void;
  showToast: (text: string, type?: "success" | "error") => void;
}

const DEFAULT_PIZZA_SIZES = [
  { sizeCode: "personal", sizeName: '6" Personal', price: 8.99, isDefault: false },
  { sizeCode: "small", sizeName: '9" Small', price: 14.99, isDefault: false },
  { sizeCode: "medium", sizeName: '12" Medium', price: 18.99, isDefault: true },
  { sizeCode: "large", sizeName: '14" Large', price: 22.99, isDefault: false },
  { sizeCode: "panalicious", sizeName: 'Panalicious', price: 27.99, isDefault: false },
  { sizeCode: "xl", sizeName: "XL Panormous", price: 26.99, isDefault: false },
];

export default function ProductsTab({
  products,
  categories,
  modifiers,
  fetchProducts,
  showToast,
}: ProductsTabProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [modGroupSearch, setModGroupSearch] = useState("");
  const [loading, setLoading] = useState(false);

  const sortedModifiers = React.useMemo(() => {
    const list = [...modifiers];
    const getBase = (n: string) =>
      n.replace(/\s*\([^)]*copy[^)]*\)/gi, "").trim().toLowerCase();

    const result: ModifierGroup[] = [];
    const addedIds = new Set<string>();

    list.forEach((group) => {
      const gId = (group.id || group._id) as string;
      if (addedIds.has(gId)) return;

      const isCopy = /\([^)]*copy[^)]*\)/i.test(group.name);
      if (!isCopy) {
        result.push(group);
        addedIds.add(gId);

        const base = getBase(group.name);
        list.forEach((other) => {
          const oId = (other.id || other._id) as string;
          if (
            !addedIds.has(oId) &&
            /\([^)]*copy[^)]*\)/i.test(other.name) &&
            getBase(other.name) === base
          ) {
            result.push(other);
            addedIds.add(oId);
          }
        });
      }
    });

    list.forEach((group) => {
      const gId = (group.id || group._id) as string;
      if (!addedIds.has(gId)) {
        result.push(group);
        addedIds.add(gId);
      }
    });

    return result;
  }, [modifiers]);

  const filteredProducts = React.useMemo(() => {
    const list = products.filter((prod) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      return (
        prod.name.toLowerCase().includes(q) ||
        (prod.description && prod.description.toLowerCase().includes(q))
      );
    });

    return [...list].sort((a, b) => {
      const orderA = a.displayOrder || 0;
      const orderB = b.displayOrder || 0;
      if (orderA > 0 && orderB > 0) return orderA - orderB;
      if (orderA > 0 && orderB === 0) return -1;
      if (orderA === 0 && orderB > 0) return 1;
      return a.name.localeCompare(b.name);
    });
  }, [products, searchQuery]);
  const [uploading, setUploading] = useState(false);
  const [editProd, setEditProd] = useState<Product | null>(null);
  const [visibilityTarget, setVisibilityTarget] = useState<{
    id: string;
    name: string;
    disabledBranches: string[];
  } | null>(null);

  const [prodForm, setProdForm] = useState<Product>({
    name: "",
    description: "",
    price: 0,
    image: "",
    itemType: "combo",
    hasVariants: false,
    variants: [],
    includedToppings: [],
    categoryId: "",
    modifierGroups: [],
    badge: null,
    isActive: true,
    kitchenLabel: "pizza",
    displayOrder: 0,
  });

  // Sync default category
  useEffect(() => {
    if (categories.length > 0 && !prodForm.categoryId && !editProd) {
      setProdForm((prev) => ({
        ...prev,
        categoryId: (categories[0].id || categories[0]._id) as string,
      }));
    }
  }, [categories, editProd, prodForm.categoryId]);

  const handleImageUpload = async (file: File | undefined) => {
    if (!file) return;

    const oldImage = prodForm.image;
    setUploading(true);

    try {
      const compressedFile = await compressImage(file, 800, 800, 0.8);

      if (compressedFile.size > 5 * 1024 * 1024) {
        showToast("File size too large. Max limit is 5MB.", "error");
        setUploading(false);
        return;
      }

      const formData = new FormData();
      formData.append("image", compressedFile);

      const res = await axios.post(`${API_URL}/upload`, formData, {
        ...getAuthConfig(),
        headers: {
          ...getAuthConfig().headers,
          "Content-Type": "multipart/form-data",
        },
      });
      if (res.data.success) {
        setProdForm((prev) => ({ ...prev, image: res.data.url }));
        showToast("Product image uploaded!");

        if (oldImage) {
          try {
            await axios.post(`${API_URL}/upload/delete`, { url: oldImage }, getAuthConfig());
          } catch (delErr) {
            console.error("Failed to delete old product image:", delErr);
          }
        }
      }
    } catch (err: any) {
      console.error(err);
      showToast(err.response?.data?.message || "Image upload failed.", "error");
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveProductImage = async () => {
    const url = prodForm.image;
    if (!url) return;
    try {
      setProdForm((prev) => ({ ...prev, image: "" }));
      showToast("Product image removed locally.");
      await axios.post(`${API_URL}/upload/delete`, { url }, getAuthConfig());
      showToast("Product image deleted!");
    } catch (err) {
      console.error(err);
      showToast("Failed to delete product image.", "error");
    }
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    const mainEl = document.querySelector("main");
    if (mainEl) {
      mainEl.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const startEditProduct = (prod: Product) => {
    setEditProd(prod);
    const existingVariants =
      prod.variants && prod.variants.length > 0
        ? [...prod.variants]
        : [...DEFAULT_PIZZA_SIZES];
    if (prod.hasVariants) {
      DEFAULT_PIZZA_SIZES.forEach((defSize) => {
        if (!existingVariants.some((v) => v.sizeCode === defSize.sizeCode)) {
          existingVariants.push(defSize);
        }
      });
    }
    setProdForm({
      name: prod.name,
      description: prod.description || "",
      price: prod.price || 0,
      image: prod.image || "",
      itemType: prod.itemType || "combo",
      hasVariants: !!prod.hasVariants,
      variants: existingVariants,
      categoryId:
        typeof prod.categoryId === "object"
          ? prod.categoryId.id || prod.categoryId._id
          : prod.categoryId,
      modifierGroups: (prod.modifierGroups || []).map((g: any) =>
        typeof g === "object" ? g.id || g._id : g,
      ),
      includedToppings: prod.includedToppings || [],
      badge: prod.badge || null,
      isActive: prod.isActive !== false,
      kitchenLabel: (prod.kitchenLabel as any) || "make_table",
      modifierKitchenLabels: prod.modifierKitchenLabels || [],
      displayOrder: prod.displayOrder ?? 0,
    });
    scrollToTop();
  };

  const cancelEditProduct = () => {
    setEditProd(null);
    setProdForm({
      name: "",
      description: "",
      price: 0,
      image: "",
      itemType: "combo",
      hasVariants: false,
      variants: [],
      includedToppings: [],
      categoryId: categories[0]?.id || categories[0]?._id || "",
      modifierGroups: [],
      badge: null,
      isActive: true,
      kitchenLabel: "make_table",
      modifierKitchenLabels: [],
      displayOrder: 0,
    });
  };

  const handleProductModifierToggle = (groupId: string) => {
    const cur = prodForm.modifierGroups;
    const has = cur.includes(groupId);
    const next = has
      ? cur.filter((id: string) => id !== groupId)
      : [...cur, groupId];
    setProdForm({ ...prodForm, modifierGroups: next });
  };

  const handleProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prodForm.name || !prodForm.categoryId) {
      showToast("Name and Category are required", "error");
      return;
    }
    setLoading(true);
    try {
      if (editProd) {
        const id = editProd.id || editProd._id;
        const res = await axios.put(`${API_URL}/products/${id}`, prodForm, getAuthConfig());
        if (res.data.success) {
          showToast("Product updated successfully!");
          cancelEditProduct();
          fetchProducts();
        }
      } else {
        const res = await axios.post(`${API_URL}/products`, prodForm, getAuthConfig());
        if (res.data.success) {
          showToast("Product created successfully!");
          setProdForm({
            name: "",
            description: "",
            price: 0,
            image: "",
            itemType: "combo",
            categoryId: categories[0]?.id || categories[0]?._id || "",
            modifierGroups: [],
            badge: null,
            isActive: true,
            kitchenLabel: "make_table",
            displayOrder: 0,
          });
          fetchProducts();
        }
      }
    } catch (err: any) {
      showToast(err.response?.data?.message || "Error saving product", "error");
    } finally {
      setLoading(false);
    }
  };

  const executeDeleteProduct = async (id: string) => {
    const prodToDelete = products.find((p) => p.id === id || p._id === id);
    try {
      const res = await axios.delete(`${API_URL}/products/${id}`, getAuthConfig());
      if (res.data.success) {
        showToast("Product deleted!");
        if (editProd && (editProd.id === id || editProd._id === id))
          cancelEditProduct();
        fetchProducts();

        if (prodToDelete?.image) {
          try {
            await axios.post(`${API_URL}/upload/delete`, {
              url: prodToDelete.image,
            }, getAuthConfig());
          } catch (delErr) {
            console.error("Failed to delete product image", delErr);
          }
        }
      }
    } catch (err: any) {
      showToast(
        err.response?.data?.message || "Error deleting product",
        "error",
      );
    }
  };

  const handleDeleteProduct = (id: string) => {
    toast((t) => (
      <div className="flex flex-col gap-2 p-1 text-xs">
        <p className="font-700 text-neutral-900">Are you sure you want to delete this product?</p>
        <div className="flex items-center justify-end gap-2 mt-1">
          <button
            onClick={() => toast.dismiss(t.id)}
            className="px-2.5 py-1 font-600 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-lg cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              toast.dismiss(t.id);
              executeDeleteProduct(id);
            }}
            className="px-2.5 py-1 font-700 bg-red-600 hover:bg-red-700 text-white rounded-lg cursor-pointer shadow-sm"
          >
            Delete Product
          </button>
        </div>
      </div>
    ), { duration: 5000, position: "top-center" });
  };

  const isProductButtonDisabled =
    loading ||
    uploading ||
    !prodForm.name.trim() ||
    !prodForm.categoryId;

  const selectedCatObj = categories.find((c) => (c.id || c._id) === prodForm.categoryId);
  const isDealsCategory = selectedCatObj
    ? selectedCatObj.slug === "deals" || selectedCatObj.name.toLowerCase().includes("deal")
    : false;

  return (
    <>
      <div className="bg-white rounded-2xl border border-neutral-200 p-5 shadow-sm space-y-4 h-fit">
        <div className="flex items-center justify-between pb-2.5 border-b border-neutral-100">
          <div className="flex items-center gap-2">
            <FolderPlus size={16} className="text-brand-primary" />
            <h3 className="text-[12px] font-800 text-neutral-800 uppercase tracking-wider">
              {editProd ? "Edit Product" : "Add Product"}
            </h3>
          </div>
          {editProd && (
            <button
              onClick={cancelEditProduct}
              className="text-[9px] font-700 text-neutral-400 hover:text-neutral-600 uppercase tracking-wider cursor-pointer"
            >
              Cancel
            </button>
          )}
        </div>

        {categories.length === 0 ? (
          <div className="text-center py-6 text-neutral-500 italic text-[11px]">
            Create a Category first in the Categories tab before adding
            products.
          </div>
        ) : (
          <form onSubmit={handleProductSubmit} className="space-y-4">
            <div>
              <label className="block text-[9px] font-700 text-neutral-400 uppercase tracking-wider mb-1.5">
                Product Name
              </label>
              <input
                type="text"
                placeholder="e.g. Deluxe Chicken Burger"
                value={prodForm.name}
                onChange={(e) =>
                  setProdForm({ ...prodForm, name: e.target.value })
                }
                className="w-full bg-[#FAFAF9] border border-neutral-200 rounded-xl px-3 py-2.5 text-[11px] focus:outline-none focus:border-brand-primary"
              />
            </div>
            <div className="grid grid-cols-2 gap-3.5">
              <div>
                <label className="block text-[9px] font-700 text-neutral-400 uppercase tracking-wider mb-1.5">
                  Category
                </label>
                <select
                  value={prodForm.categoryId}
                  onChange={(e) =>
                    setProdForm({ ...prodForm, categoryId: e.target.value })
                  }
                  className="w-full bg-[#FAFAF9] border border-neutral-200 rounded-xl px-2.5 py-2.5 text-[11px] focus:outline-none"
                >
                  <option value="">Select Category</option>
                  {categories.map((c) => (
                    <option key={c.id || c._id} value={c.id || c._id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[9px] font-700 text-neutral-400 uppercase tracking-wider mb-1.5">
                  Base Price (Optional)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="9.99"
                  value={prodForm.price || ""}
                  onChange={(e) =>
                    setProdForm({
                      ...prodForm,
                      price: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="w-full bg-[#FAFAF9] border border-neutral-200 rounded-xl px-3 py-2.5 text-[11px] focus:outline-none"
                />
              </div>
            </div>
            <div>
              <label className="block text-[9px] font-700 text-neutral-400 uppercase tracking-wider mb-1.5">
                Description (Optional)
              </label>
              <textarea
                rows={2}
                placeholder="Product details..."
                value={prodForm.description}
                onChange={(e) =>
                  setProdForm({ ...prodForm, description: e.target.value })
                }
                className="w-full bg-[#FAFAF9] border border-neutral-200 rounded-xl p-3 text-[11px] resize-none focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[9px] font-700 text-neutral-400 uppercase tracking-wider mb-1.5">
                Product Image <span className="normal-case font-500 text-neutral-300">(Optional)</span>
              </label>
              <div className="flex items-center gap-3">
                {prodForm.image ? (
                  <div className="relative w-16 h-16 rounded-xl overflow-hidden border border-neutral-200 bg-neutral-50 flex-shrink-0">
                    <img
                      src={prodForm.image}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={handleRemoveProductImage}
                      className="absolute inset-0 bg-black/40 flex items-center justify-center text-white text-[9px] font-700 hover:bg-black/60 transition-all cursor-pointer"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <label className="w-16 h-16 rounded-xl border-2 border-dashed border-neutral-300 hover:border-brand-primary flex flex-col items-center justify-center text-neutral-400 hover:text-brand-primary bg-neutral-50 cursor-pointer transition-all flex-shrink-0 select-none">
                    <ImageIcon size={16} />
                    <span className="text-[7px] font-700 uppercase mt-1">
                      Upload
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleImageUpload(e.target.files?.[0])}
                      disabled={uploading}
                    />
                  </label>
                )}

                <div className="flex-1">
                  {uploading ? (
                    <div className="text-[10px] font-700 text-brand-primary animate-pulse">
                      Image Uploading...
                    </div>
                  ) : (
                    <div className="text-[9px] text-neutral-400 leading-normal">
                      Select image file. Max size 5MB.
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3.5">
              <div>
                <label className="block text-[9px] font-700 text-neutral-400 uppercase tracking-wider mb-1.5">
                  Display Order
                </label>
                <input
                  type="number"
                  min="0"
                  placeholder="e.g. 1"
                  value={prodForm.displayOrder || 0}
                  onChange={(e) =>
                    setProdForm({
                      ...prodForm,
                      displayOrder: parseInt(e.target.value) || 0,
                    })
                  }
                  className="w-full bg-[#FAFAF9] border border-neutral-200 rounded-xl px-3 py-2.5 text-[11px] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[9px] font-700 text-neutral-400 uppercase tracking-wider mb-1.5">
                  Badge (Optional)
                </label>
                <select
                  value={prodForm.badge || ""}
                  onChange={(e) =>
                    setProdForm({
                      ...prodForm,
                      badge: (e.target.value === ""
                        ? null
                        : e.target.value) as any,
                    })
                  }
                  className="w-full bg-[#FAFAF9] border border-neutral-200 rounded-xl px-2.5 py-2.5 text-[11px] focus:outline-none"
                >
                  <option value="">None</option>
                  <option value="Popular">Popular</option>
                  <option value="Best Seller">Best Seller</option>
                  <option value="New">New</option>
                </select>
              </div>
            </div>

            {!isDealsCategory && (
              <div>
                <label className="block text-[9px] font-700 text-neutral-400 uppercase tracking-wider mb-1.5">
                  Kitchen Label
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setProdForm({ ...prodForm, kitchenLabel: "make_table" })}
                    className={`flex-1 py-2.5 rounded-xl text-[10px] font-700 uppercase tracking-wider transition-all cursor-pointer border ${
                      prodForm.kitchenLabel === "make_table" || prodForm.kitchenLabel === "pizza"
                        ? "bg-orange-500 border-orange-500 text-white shadow-md shadow-orange-500/15"
                        : "bg-[#FAFAF9] border-neutral-200 text-neutral-600 hover:bg-neutral-100"
                    }`}
                  >
                    🍕 Make Table
                  </button>
                  <button
                    type="button"
                    onClick={() => setProdForm({ ...prodForm, kitchenLabel: "wings_station" })}
                    className={`flex-1 py-2.5 rounded-xl text-[10px] font-700 uppercase tracking-wider transition-all cursor-pointer border ${
                      prodForm.kitchenLabel === "wings_station" || prodForm.kitchenLabel === "chicken"
                        ? "bg-amber-600 border-amber-600 text-white shadow-md shadow-amber-600/15"
                        : "bg-[#FAFAF9] border-neutral-200 text-neutral-600 hover:bg-neutral-100"
                    }`}
                  >
                    🍗 Wings Station
                  </button>
                </div>
                <p className="text-[8px] text-neutral-400 mt-1.5 leading-normal">
                  Determines which Kitchen View filter this product appears under.
                </p>
              </div>
            )}

            {/* Pizza Sizes & Variants toggle */}
            <div className="p-3 bg-[#FAFAF9] border border-neutral-200 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="block text-[10px] font-800 text-neutral-700 uppercase tracking-wider">
                    Pizza / Size Variants
                  </span>
                  <span className="block text-[8px] text-neutral-400 leading-normal">
                    Enable if this item has sizes (e.g. Personal, Small, Medium, Large, XL).
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const nextHasVariants = !prodForm.hasVariants;
                    const nextVariants = nextHasVariants
                      ? (prodForm.variants && prodForm.variants.length > 0 ? prodForm.variants : DEFAULT_PIZZA_SIZES)
                      : [];
                    const defaultVar = nextVariants.find((v) => v.isDefault) || nextVariants[0];
                    const nextPrice = defaultVar ? defaultVar.price : prodForm.price;
                    setProdForm({
                      ...prodForm,
                      hasVariants: nextHasVariants,
                      variants: nextVariants,
                      kitchenLabel: nextHasVariants ? "pizza" : prodForm.kitchenLabel,
                      price: nextPrice,
                    });
                  }}
                  className={`relative inline-flex h-5 w-10 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    prodForm.hasVariants ? "bg-brand-primary" : "bg-neutral-300"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      prodForm.hasVariants ? "translate-x-[20px]" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              {prodForm.hasVariants && (
                <div className="space-y-2 pt-2 border-t border-neutral-200">
                  <p className="text-[9px] font-700 text-neutral-500 uppercase tracking-wider">
                    Variant Base Prices
                  </p>
                  <div className="space-y-1.5">
                    {(prodForm.variants || DEFAULT_PIZZA_SIZES).map((variant, idx) => (
                      <div key={variant.sizeCode} className="flex items-center gap-2 bg-white p-2 rounded-lg border border-neutral-200">
                        <span className="text-[10px] font-700 text-neutral-700 w-28 truncate">
                          {variant.sizeName}
                        </span>
                        <div className="relative flex-1 flex items-center">
                          <span className="absolute left-2.5 text-[10px] font-700 text-neutral-400">
                            $
                          </span>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={variant.price || ""}
                            onChange={(e) => {
                              const newPrice = parseFloat(e.target.value) || 0;
                              const updatedVariants = (prodForm.variants || []).map((v, i) =>
                                i === idx ? { ...v, price: newPrice } : v
                              );
                              const defVar = updatedVariants.find((v) => v.isDefault) || updatedVariants[0];
                              setProdForm({
                                ...prodForm,
                                variants: updatedVariants,
                                price: defVar ? defVar.price : newPrice,
                              });
                            }}
                            className="w-full bg-[#FAFAF9] border border-neutral-200 rounded-lg pl-5 pr-2 py-1 text-[10.5px] focus:outline-none focus:border-brand-primary"
                          />
                        </div>
                        <label className="flex items-center gap-1 text-[9px] font-600 text-neutral-500 cursor-pointer select-none">
                          <input
                            type="radio"
                            name="defaultVariant"
                            checked={!!variant.isDefault}
                            onChange={() => {
                              const updatedVariants = (prodForm.variants || []).map((v, i) => ({
                                ...v,
                                isDefault: i === idx,
                              }));
                              setProdForm({
                                ...prodForm,
                                variants: updatedVariants,
                                price: variant.price,
                              });
                            }}
                            className="text-brand-primary focus:ring-brand-primary w-3 h-3"
                          />
                          <span>Default</span>
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between p-3 bg-[#FAFAF9] border border-neutral-200 rounded-xl">
              <div>
                <span className="block text-[10px] font-800 text-neutral-700 uppercase tracking-wider">Active Status</span>
                <span className="block text-[8px] text-neutral-400 leading-normal">
                  Toggle whether this product is visible on the menu and POS.
                </span>
              </div>
              <button
                type="button"
                onClick={() => setProdForm({ ...prodForm, isActive: prodForm.isActive !== false ? false : true })}
                className={`relative inline-flex h-5 w-10 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  prodForm.isActive !== false ? 'bg-[#16A34A]' : 'bg-neutral-300'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    prodForm.isActive !== false ? 'translate-x-[20px]' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {(prodForm.itemType === "combo" || prodForm.hasVariants) && (
              <div className="space-y-2.5 pt-2 border-t border-neutral-100">
                <div className="flex items-center justify-between">
                  <label className="block text-[9px] font-700 text-neutral-400 uppercase tracking-wider">
                    Link Modifier Groups
                  </label>
                  {modifiers.length > 0 && (
                    <span className="text-[8.5px] font-700 text-neutral-500 bg-neutral-100 px-1.5 py-0.5 rounded">
                      {prodForm.modifierGroups.length} Selected
                    </span>
                  )}
                </div>

                {modifiers.length === 0 ? (
                  <p className="text-[9px] text-neutral-400 italic">
                    No modifier groups created yet.
                  </p>
                ) : (
                  <div className="space-y-2">
                    <div className="relative">
                      <Search size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400" />
                      <input
                        type="text"
                        value={modGroupSearch}
                        onChange={(e) => setModGroupSearch(e.target.value)}
                        placeholder="Search modifier groups..."
                        className="w-full bg-[#FAFAF9] border border-neutral-200 rounded-lg py-1 pl-7 pr-6 text-[10px] text-neutral-800 placeholder-neutral-400 focus:outline-none focus:border-brand-primary"
                      />
                      {modGroupSearch && (
                        <button
                          type="button"
                          onClick={() => setModGroupSearch("")}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                        >
                          <X size={10} />
                        </button>
                      )}
                    </div>

                    <div className="border border-neutral-200 rounded-xl bg-[#FAFAF9] overflow-hidden">
                      <div className="max-h-48 overflow-y-auto p-2.5">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
                          {sortedModifiers
                            .filter((g) => {
                              if (!modGroupSearch.trim()) return true;
                              const q = modGroupSearch.toLowerCase().trim();
                              return (
                                g.name.toLowerCase().includes(q) ||
                                g.options.some((opt) => opt.name.toLowerCase().includes(q))
                              );
                            })
                            .map((g) => {
                              const gid = (g.id || g._id) as string;
                              const linked = prodForm.modifierGroups.includes(gid);
                              const isCopy = /\([^)]*copy[^)]*\)/i.test(g.name);
                              return (
                                <button
                                  key={gid}
                                  type="button"
                                  title={g.name}
                                  onClick={() => handleProductModifierToggle(gid)}
                                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[10px] font-600 transition-all text-left cursor-pointer ${
                                    linked
                                      ? "bg-orange-50 border-brand-primary text-brand-primary font-700"
                                      : "bg-white border-neutral-200 text-neutral-600 hover:bg-neutral-50 hover:text-neutral-800"
                                  }`}
                                >
                                  <div
                                    className={`w-3.5 h-3.5 rounded border flex items-center justify-center flex-shrink-0 transition-all ${
                                      linked
                                        ? "bg-brand-primary border-brand-primary text-white"
                                        : "border-neutral-300 bg-white"
                                    }`}
                                  >
                                    {linked && <Check size={8} strokeWidth={3} />}
                                  </div>
                                  <span className="truncate flex-1 min-w-0">{g.name}</span>
                                  {isCopy && (
                                    <span className="bg-blue-100 text-blue-700 border border-blue-200 text-[7.5px] font-800 px-1 py-0.5 rounded flex-shrink-0 flex items-center gap-0.5">
                                      <Copy size={8} /> Copy
                                    </span>
                                  )}
                                </button>
                              );
                            })}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Deal Items Station Assignment - ONLY when category is Deals and modifier groups are linked */}
            {isDealsCategory && prodForm.modifierGroups.length > 0 && (
              <div className="space-y-2.5 pt-2 border-t border-neutral-100">
                <div className="flex items-center justify-between">
                  <label className="block text-[9px] font-700 text-neutral-400 uppercase tracking-wider">
                    Deal Items Station Assignment
                  </label>
                  <span className="text-[8px] text-orange-600 bg-orange-50 px-2 py-0.5 rounded font-700 border border-orange-200">
                    🔥 Deals Station Routing
                  </span>
                </div>
                <p className="text-[8px] text-neutral-400 leading-normal -mt-1">
                  Assign each deal group to Make Table (Pizzas) or Wings Station (Sides/Wings/Dessert/Dips).
                </p>
                <div className="border border-neutral-200 rounded-xl bg-[#FAFAF9] overflow-hidden p-2.5 space-y-2">
                  {prodForm.modifierGroups.map((gid: string) => {
                    const groupObj = modifiers.find((m) => ((m as any).id || (m as any)._id) === gid);
                    const groupName = groupObj ? groupObj.name : "Modifier Group";
                    const currentMapping = (prodForm.modifierKitchenLabels || []).find((m) => m.groupId === gid);
                    const currentStation = currentMapping?.kitchenLabel || "make_table";

                    return (
                      <div key={gid} className="flex items-center justify-between bg-white p-2 rounded-lg border border-neutral-200 gap-2">
                        <span className="text-[10px] font-700 text-neutral-700 truncate flex-1 min-w-0">
                          {groupName}
                        </span>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              const curList = prodForm.modifierKitchenLabels || [];
                              const filtered = curList.filter((m) => m.groupId !== gid);
                              setProdForm({
                                ...prodForm,
                                modifierKitchenLabels: [...filtered, { groupId: gid, kitchenLabel: "make_table" }],
                              });
                            }}
                            className={`px-2 py-1 rounded-md text-[9px] font-700 uppercase cursor-pointer border transition-all ${
                              currentStation === "make_table"
                                ? "bg-orange-500 border-orange-500 text-white shadow-xs"
                                : "bg-neutral-50 border-neutral-200 text-neutral-500 hover:bg-neutral-100"
                            }`}
                          >
                            🍕 Make Table
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const curList = prodForm.modifierKitchenLabels || [];
                              const filtered = curList.filter((m) => m.groupId !== gid);
                              setProdForm({
                                ...prodForm,
                                modifierKitchenLabels: [...filtered, { groupId: gid, kitchenLabel: "wings_station" }],
                              });
                            }}
                            className={`px-2 py-1 rounded-md text-[9px] font-700 uppercase cursor-pointer border transition-all ${
                              currentStation === "wings_station"
                                ? "bg-amber-600 border-amber-600 text-white shadow-xs"
                                : "bg-neutral-50 border-neutral-200 text-neutral-500 hover:bg-neutral-100"
                            }`}
                          >
                            🍗 Wings Station
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Included Toppings - only for variant products with linked modifier groups */}
            {prodForm.hasVariants && prodForm.modifierGroups.length > 0 && (
              <div className="space-y-2.5 pt-2 border-t border-neutral-100">
                <label className="block text-[9px] font-700 text-neutral-400 uppercase tracking-wider">
                  Included Toppings (Free with this product)
                </label>
                <p className="text-[8px] text-neutral-400 leading-normal -mt-1">
                  Select which toppings come pre-included (no extra charge). E.g. Super Supreme comes with Pepperoni, Mushrooms etc.
                </p>
                <div className="border border-neutral-200 rounded-xl bg-[#FAFAF9] overflow-hidden">
                  <div className="max-h-56 overflow-y-auto p-3 space-y-3">
                    {sortedModifiers
                      .filter((g) => prodForm.modifierGroups.includes((g.id || g._id) as string))
                      .map((g) => {
                        const gid = (g.id || g._id) as string;
                        const isCopy = /\([^)]*copy[^)]*\)/i.test(g.name);
                        return (
                          <div key={gid}>
                            <div className="flex items-center gap-1.5 mb-1.5">
                              <p className="text-[8.5px] font-700 text-neutral-600 uppercase tracking-wider">
                                {g.name}
                              </p>
                              {isCopy && (
                                <span className="bg-blue-100 text-blue-700 border border-blue-200 text-[7.5px] font-800 px-1 py-0.5 rounded flex items-center gap-0.5">
                                  <Copy size={8} /> Copy
                                </span>
                              )}
                            </div>
                            <div className="grid grid-cols-2 gap-1">
                              {g.options.map((opt) => {
                                const oid = (opt.id || opt._id) as string;
                                const isIncluded = (prodForm.includedToppings || []).some(
                                  (it) => it.groupId === gid && it.optionId === oid
                                );
                                return (
                                  <button
                                    key={oid}
                                    type="button"
                                    onClick={() => {
                                      const curList = prodForm.includedToppings || [];
                                      const nextList = isIncluded
                                        ? curList.filter((it) => !(it.groupId === gid && it.optionId === oid))
                                        : [...curList, { groupId: gid, optionId: oid }];
                                      setProdForm({ ...prodForm, includedToppings: nextList });
                                    }}
                                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[9.5px] font-600 transition-all text-left cursor-pointer ${
                                      isIncluded
                                        ? "bg-emerald-50 border-emerald-500 text-emerald-700 font-700"
                                        : "bg-white border-neutral-200 text-neutral-500 hover:bg-neutral-50"
                                    }`}
                                  >
                                    <div
                                      className={`w-3 h-3 rounded border flex items-center justify-center flex-shrink-0 transition-all ${
                                        isIncluded
                                          ? "bg-emerald-500 border-emerald-500 text-white"
                                          : "border-neutral-300 bg-white"
                                      }`}
                                    >
                                      {isIncluded && <Check size={7} strokeWidth={3} />}
                                    </div>
                                    <span className="truncate">{opt.name}</span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-2">
              {editProd && (
                <button
                  type="button"
                  onClick={cancelEditProduct}
                  className="flex-1 py-3 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-xl text-[10px] font-700 uppercase tracking-wider transition-all cursor-pointer text-center"
                >
                  Cancel
                </button>
              )}
              <button
                type="submit"
                disabled={isProductButtonDisabled}
                className="flex-2 py-3 bg-brand-primary hover:bg-brand-primary-hover text-white rounded-xl text-[10px] font-700 uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md active:scale-95 disabled:bg-neutral-300 disabled:text-neutral-400 disabled:cursor-not-allowed disabled:shadow-none"
              >
                {loading || uploading ? (
                  <>
                    <Loader2
                      size={13}
                      className="animate-spin text-neutral-400"
                      strokeWidth={3}
                    />
                    {uploading ? "Uploading Image..." : "Saving..."}
                  </>
                ) : editProd ? (
                  "Save Changes"
                ) : (
                  "Add Product"
                )}
              </button>
            </div>
          </form>
        )}
      </div>

      <div className="lg:col-span-2 bg-white rounded-2xl border border-neutral-200 p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-neutral-100 gap-2.5">
          <div className="flex items-center justify-between sm:justify-start gap-2">
            <div className="flex items-center gap-2">
              <Layers size={16} className="text-brand-primary" />
              <h3 className="text-[12px] font-800 text-neutral-800 uppercase tracking-wider">
                Products List
              </h3>
            </div>
            <span className="text-[9px] bg-neutral-100 text-neutral-600 px-2 py-0.5 rounded-full font-700">
              {searchQuery ? `${filteredProducts.length} / ${products.length}` : `${products.length}`} Products
            </span>
          </div>

          {/* Search Input Bar */}
          <div className="relative w-full sm:w-64">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search product name or details..."
              className="w-full bg-[#FAFAF9] border border-neutral-200 rounded-xl py-1.5 pl-8 pr-8 text-[11px] text-neutral-800 placeholder-neutral-400 focus:outline-none focus:border-brand-primary"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 cursor-pointer"
              >
                <X size={12} />
              </button>
            )}
          </div>
        </div>

        {products.length === 0 ? (
          <div className="text-center py-12 text-neutral-400 italic text-[11px]">
            No products found.
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-12 text-neutral-400 italic text-[11px]">
            No products matching &quot;{searchQuery}&quot;
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {filteredProducts.map((prod) => (
              <div
                key={prod.id || prod._id}
                className="p-4 border border-neutral-200 rounded-xl bg-[#FAFAF9] flex gap-3 shadow-xs"
              >
                <div className="w-16 h-16 rounded-lg overflow-hidden border border-neutral-200 bg-neutral-100 flex-shrink-0">
                  {prod.image ? (
                    <img
                      src={prod.image}
                      alt={prod.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-neutral-400">
                      <ImageIcon size={18} />
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0 flex flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between gap-1.5">
                      <h4 className="text-[11.5px] font-700 text-neutral-900 truncate leading-tight">
                        {prod.name}
                      </h4>
                      <span className="text-[10px] font-800 text-brand-primary flex-shrink-0">
                        ${prod.price.toFixed(2)}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap mt-1">
                      <span className="bg-orange-100 text-brand-primary text-[7.5px] font-700 px-1 py-0.2 rounded uppercase">
                        Order: {prod.displayOrder ?? 0}
                      </span>
                      <span className="bg-neutral-200 text-neutral-700 text-[7.5px] font-700 px-1 py-0.2 rounded uppercase">
                        {prod.categoryId?.name || "Uncategorized"}
                      </span>
                      <span
                        className={`text-[7.5px] font-700 px-1 py-0.2 rounded uppercase ${
                          prod.itemType === "combo"
                            ? "bg-orange-100 text-brand-primary"
                            : "bg-blue-100 text-blue-600"
                        }`}
                      >
                        {prod.itemType}
                      </span>
                      {prod.badge && (
                        <span className="bg-red-500 text-white text-[7.5px] font-700 px-1 py-0.2 rounded">
                          {prod.badge}
                        </span>
                      )}
                      {prod.productId && (
                        <span className="bg-neutral-800 text-white text-[7.5px] font-700 px-1 py-0.2 rounded uppercase">
                          {prod.productId}
                        </span>
                      )}
                      <span
                        className={`text-[7.5px] font-700 px-1 py-0.2 rounded uppercase border ${
                          prod.isActive !== false
                            ? "bg-green-100 text-green-700 border-green-200"
                            : "bg-red-100 text-red-600 border-red-200"
                        }`}
                      >
                        {prod.isActive !== false ? "Active" : "Inactive"}
                      </span>
                      <span
                        className={`text-[7.5px] font-700 px-1 py-0.2 rounded uppercase border ${
                          prod.kitchenLabel === "make_table" || prod.kitchenLabel === "pizza"
                            ? "bg-orange-100 text-orange-600 border-orange-200"
                            : "bg-yellow-50 text-yellow-700 border-yellow-200"
                        }`}
                      >
                        {prod.kitchenLabel === "make_table" || prod.kitchenLabel === "pizza" ? "🍕 Make Table" : "🍗 Wings Station"}
                      </span>
                    </div>

                    <p className="text-[9.5px] text-neutral-400 mt-2 line-clamp-2 leading-relaxed">
                      {prod.description || "No description provided."}
                    </p>

                    {prod.itemType === "combo" &&
                      prod.modifierGroups?.length > 0 && (
                        <div className="mt-2 text-[8px] text-neutral-500 font-600">
                          Modifiers:{" "}
                          {prod.modifierGroups
                            .map((g: any) => g.name)
                            .join(", ")}
                        </div>
                      )}
                  </div>

                  <div className="flex items-center justify-end gap-2 mt-3.5 pt-2 border-t border-neutral-100">
                    <button
                      onClick={() => startEditProduct(prod)}
                      className="w-7 h-7 flex items-center justify-center rounded-lg bg-orange-50 text-brand-primary hover:bg-orange-100 transition-all cursor-pointer"
                    >
                      <Edit size={11} />
                    </button>
                    <button
                      onClick={() =>
                        handleDeleteProduct((prod.id || prod._id) as string)
                      }
                      className="w-7 h-7 flex items-center justify-center rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition-all cursor-pointer"
                    >
                      <Trash size={11} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
