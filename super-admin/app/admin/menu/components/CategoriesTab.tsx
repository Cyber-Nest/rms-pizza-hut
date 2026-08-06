import React, { useState } from "react";
import axios from "axios";
import {
  FolderPlus,
  Edit,
  Trash,
  Image as ImageIcon,
  Loader2,
  Store,
} from "lucide-react";
import toast from "react-hot-toast";
import { Category } from "../types";
import { API_URL, compressImage, getAuthConfig } from "../utils";
import BranchVisibilityModal from "./BranchVisibilityModal";

interface CategoriesTabProps {
  categories: Category[];
  fetchCategories: () => void;
  showToast: (text: string, type?: "success" | "error") => void;
}

export default function CategoriesTab({
  categories,
  fetchCategories,
  showToast,
}: CategoriesTabProps) {
  const [loading, setLoading] = useState(false);
  const [uploadingCategory, setUploadingCategory] = useState(false);
  const [editCat, setEditCat] = useState<Category | null>(null);
  const [visibilityTarget, setVisibilityTarget] = useState<{
    id: string;
    name: string;
    disabledBranches: string[];
  } | null>(null);

  const [catForm, setCatForm] = useState<Category>({
    name: "",
    slug: "",
    image: "",
    description: "",
    displayOrder: 0,
    isActive: true,
  });

  // Handle Category Image Upload
  const handleCategoryImageUpload = async (file: File | undefined) => {
    if (!file) return;

    const oldImage = catForm.image;
    setUploadingCategory(true);

    try {
      const compressedFile = await compressImage(file, 800, 800, 0.8);

      if (compressedFile.size > 5 * 1024 * 1024) {
        showToast("File size too large. Max limit is 5MB.", "error");
        setUploadingCategory(false);
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
        setCatForm((prev) => ({ ...prev, image: res.data.url }));
        showToast("Category image uploaded!");

        if (oldImage) {
          try {
            await axios.post(`${API_URL}/upload/delete`, { url: oldImage }, getAuthConfig());
          } catch (delErr) {
            console.error("Failed to delete old category image:", delErr);
          }
        }
      }
    } catch (err: any) {
      console.error(err);
      showToast(
        err.response?.data?.message || "Category image upload failed.",
        "error",
      );
    } finally {
      setUploadingCategory(false);
    }
  };

  const handleRemoveCategoryImage = async () => {
    const url = catForm.image;
    if (!url) return;
    try {
      setCatForm((prev) => ({ ...prev, image: "" }));
      showToast("Category image removed locally.");
      await axios.post(`${API_URL}/upload/delete`, { url }, getAuthConfig());
      showToast("Category image deleted!");
    } catch (err) {
      console.error(err);
      showToast("Failed to delete category image.", "error");
    }
  };

  const startEditCategory = (cat: Category) => {
    setEditCat(cat);
    setCatForm({
      name: cat.name,
      slug: cat.slug,
      image: cat.image || "",
      description: cat.description || "",
      displayOrder: cat.displayOrder,
      isActive: cat.isActive !== false,
    });
  };

  const cancelEditCategory = () => {
    setEditCat(null);
    setCatForm({
      name: "",
      slug: "",
      image: "",
      description: "",
      displayOrder: categories.length + 1,
      isActive: true,
    });
  };

  const handleCatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catForm.name || !catForm.slug) {
      showToast("Name and Slug are required", "error");
      return;
    }
    setLoading(true);
    try {
      if (editCat) {
        const id = editCat.id || editCat._id;
        const res = await axios.put(`${API_URL}/categories/${id}`, catForm, getAuthConfig());
        if (res.data.success) {
          showToast("Category updated successfully!");
          cancelEditCategory();
          fetchCategories();
        }
      } else {
        const res = await axios.post(`${API_URL}/categories`, catForm, getAuthConfig());
        if (res.data.success) {
          showToast("Category created successfully!");
          setCatForm({
            name: "",
            slug: "",
            image: "",
            description: "",
            displayOrder: categories.length + 1,
            isActive: true,
          });
          fetchCategories();
        }
      }
    } catch (err: any) {
      showToast(
        err.response?.data?.message || "Error saving category",
        "error",
      );
    } finally {
      setLoading(false);
    }
  };

  const executeDeleteCategory = async (id: string) => {
    const catToDelete = categories.find((c) => c.id === id || c._id === id);
    try {
      const res = await axios.delete(`${API_URL}/categories/${id}`, getAuthConfig());
      if (res.data.success) {
        showToast("Category deleted!");
        if (editCat && (editCat.id === id || editCat._id === id))
          cancelEditCategory();
        fetchCategories();

        if (catToDelete?.image) {
          try {
            await axios.post(`${API_URL}/upload/delete`, {
              url: catToDelete.image,
            }, getAuthConfig());
          } catch (delErr) {
            console.error("Failed to delete category image", delErr);
          }
        }
      }
    } catch (err: any) {
      showToast(
        err.response?.data?.message || "Error deleting category",
        "error",
      );
    }
  };

  const handleDeleteCategory = (id: string) => {
    toast((t) => (
      <div className="flex flex-col gap-2 p-1 text-xs">
        <p className="font-700 text-neutral-900">Are you sure you want to delete this category?</p>
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
              executeDeleteCategory(id);
            }}
            className="px-2.5 py-1 font-700 bg-red-600 hover:bg-red-700 text-white rounded-lg cursor-pointer shadow-sm"
          >
            Delete Category
          </button>
        </div>
      </div>
    ), { duration: 5000, position: "top-center" });
  };

  const isCategoryButtonDisabled =
    loading ||
    uploadingCategory ||
    !catForm.name.trim() ||
    !catForm.slug.trim() ||
    !catForm.image.trim() ||
    !catForm.description.trim();

  return (
    <>
      <div className="bg-white rounded-2xl border border-neutral-200 p-5 shadow-sm space-y-4 h-fit">
        <div className="flex items-center justify-between pb-2.5 border-b border-neutral-100">
          <div className="flex items-center gap-2">
            <FolderPlus size={16} className="text-brand-primary" />
            <h3 className="text-[12px] font-800 text-neutral-800 uppercase tracking-wider">
              {editCat ? "Edit Category" : "Add Category"}
            </h3>
          </div>
          {editCat && (
            <button
              onClick={cancelEditCategory}
              className="text-[9px] font-700 text-neutral-400 hover:text-neutral-600 uppercase tracking-wider cursor-pointer"
            >
              Cancel
            </button>
          )}
        </div>
        <form onSubmit={handleCatSubmit} className="space-y-4">
          <div>
            <label className="block text-[9px] font-700 text-neutral-400 uppercase tracking-wider mb-1.5">
              Category Name
            </label>
            <input
              type="text"
              placeholder="e.g. Chicken Burgers"
              value={catForm.name}
              onChange={(e) =>
                setCatForm({
                  ...catForm,
                  name: e.target.value,
                  slug: e.target.value
                    .toLowerCase()
                    .replace(/[^a-z0-9]+/g, "-"),
                })
              }
              className="w-full bg-[#FAFAF9] border border-neutral-200 rounded-xl px-3 py-2.5 text-[11px] focus:outline-none focus:border-brand-primary"
            />
          </div>
          <div>
            <label className="block text-[9px] font-700 text-neutral-400 uppercase tracking-wider mb-1.5">
              Slug (Auto generated)
            </label>
            <input
              type="text"
              placeholder="e.g. chicken-burgers"
              value={catForm.slug}
              readOnly
              className="w-full bg-neutral-100 border border-neutral-200 rounded-xl px-3 py-2.5 text-[11px] cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-[9px] font-700 text-neutral-400 uppercase tracking-wider mb-1.5">
              Category Image
            </label>
            <div className="flex items-center gap-3">
              {catForm.image ? (
                <div className="relative w-14 h-14 rounded-xl overflow-hidden border border-neutral-200 bg-neutral-50 flex-shrink-0">
                  <img
                    src={catForm.image}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={handleRemoveCategoryImage}
                    className="absolute inset-0 bg-black/40 flex items-center justify-center text-white text-[8px] font-700 hover:bg-black/60 transition-all cursor-pointer"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <label className="w-14 h-14 rounded-xl border-2 border-dashed border-neutral-300 hover:border-brand-primary flex flex-col items-center justify-center text-neutral-400 hover:text-brand-primary bg-neutral-50 cursor-pointer transition-all flex-shrink-0 select-none">
                  <ImageIcon size={14} />
                  <span className="text-[6.5px] font-700 uppercase mt-1">
                    Upload
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) =>
                      handleCategoryImageUpload(e.target.files?.[0])
                    }
                    disabled={uploadingCategory}
                  />
                </label>
              )}
              <div className="flex-1 text-[8.5px] text-neutral-400 leading-tight">
                {uploadingCategory
                  ? "Uploading..."
                  : "Category image. Max size 5MB."}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-[9px] font-700 text-neutral-400 uppercase tracking-wider mb-1.5">
              Description (Optional)
            </label>
            <textarea
              rows={3}
              placeholder="Brief details about category..."
              value={catForm.description}
              onChange={(e) =>
                setCatForm({ ...catForm, description: e.target.value })
              }
              className="w-full bg-[#FAFAF9] border border-neutral-200 rounded-xl p-3 text-[11px] resize-none focus:outline-none focus:border-brand-primary"
            />
          </div>
          <div>
            <label className="block text-[9px] font-700 text-neutral-400 uppercase tracking-wider mb-1.5">
              Display Order
            </label>
            <input
              type="number"
              value={catForm.displayOrder}
              onChange={(e) =>
                setCatForm({
                  ...catForm,
                  displayOrder: parseInt(e.target.value) || 0,
                })
              }
              className="w-full bg-[#FAFAF9] border border-neutral-200 rounded-xl px-3 py-2.5 text-[11px] focus:outline-none focus:border-brand-primary"
            />
          </div>

          <div className="flex items-center justify-between p-3 bg-[#FAFAF9] border border-neutral-200 rounded-xl">
            <div>
              <span className="block text-[10px] font-800 text-neutral-700 uppercase tracking-wider">Active Status</span>
              <span className="block text-[8px] text-neutral-400 leading-normal">
                Inactive categories and their products are hidden from POS &amp; online menu.
              </span>
            </div>
            <button
              type="button"
              onClick={() => setCatForm({ ...catForm, isActive: catForm.isActive !== false ? false : true })}
              className={`relative inline-flex h-5 w-10 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                catForm.isActive !== false ? 'bg-[#16A34A]' : 'bg-neutral-300'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  catForm.isActive !== false ? 'translate-x-[20px]' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
          <div className="flex gap-2">
            {editCat && (
              <button
                type="button"
                onClick={cancelEditCategory}
                className="flex-1 py-3 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-xl text-[10px] font-700 uppercase tracking-wider transition-all cursor-pointer text-center"
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              disabled={isCategoryButtonDisabled}
              className="flex-2 py-3 bg-brand-primary hover:bg-brand-primary-hover text-white rounded-xl text-[10px] font-700 uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md active:scale-95 disabled:bg-neutral-300 disabled:text-neutral-400 disabled:cursor-not-allowed disabled:shadow-none"
            >
              {loading || uploadingCategory ? (
                <>
                  <Loader2
                    size={13}
                    className="animate-spin text-neutral-400"
                  />
                  {uploadingCategory ? "Uploading Image..." : "Saving..."}
                </>
              ) : editCat ? (
                "Save Changes"
              ) : (
                "Add Category"
              )}
            </button>
          </div>
        </form>
      </div>

      <div className="lg:col-span-2 bg-white rounded-2xl border border-neutral-200 p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-2.5 border-b border-neutral-100">
          <div className="flex items-center gap-2">
            <FolderPlus size={16} className="text-brand-primary" />
            <h3 className="text-[12px] font-800 text-neutral-800 uppercase tracking-wider">
              Category List
            </h3>
          </div>
          <span className="text-[9px] bg-neutral-100 text-neutral-600 px-2 py-0.5 rounded-full font-700">
            {categories.length} Categories
          </span>
        </div>

        {categories.length === 0 ? (
          <div className="text-center py-12 text-neutral-400 italic text-[11px]">
            No categories found. Add your first category.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {categories.map((cat) => (
              <div
                key={cat.id || cat._id}
                className="p-4 border border-neutral-200 rounded-xl bg-[#FAFAF9] flex gap-3 shadow-xs"
              >
                <div className="w-14 h-14 rounded-lg overflow-hidden border border-neutral-200 bg-neutral-100 flex-shrink-0">
                  {cat.image ? (
                    <img
                      src={cat.image}
                      alt={cat.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-neutral-400">
                      <ImageIcon size={16} />
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between">
                      <h4 className="text-[12px] font-700 text-neutral-900 leading-tight truncate pr-2">
                        {cat.name}
                      </h4>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <span
                          className={`text-[7.5px] font-700 px-1.5 py-0.5 rounded uppercase border ${
                            cat.isActive !== false
                              ? "bg-green-100 text-green-700 border-green-200"
                              : "bg-red-100 text-red-600 border-red-200"
                          }`}
                        >
                          {cat.isActive !== false ? "Active" : "Inactive"}
                        </span>
                        <span className="bg-orange-100 text-brand-primary text-[8px] font-700 px-1.5 py-0.5 rounded">
                          Order: {cat.displayOrder}
                        </span>
                      </div>
                    </div>
                    <p className="text-[9px] font-500 text-neutral-400 font-mono">
                      /{cat.slug}
                    </p>
                    <p className="text-[10px] text-neutral-500 mt-1 line-clamp-2 leading-relaxed">
                      {cat.description || "No description."}
                    </p>
                  </div>
                  <div className="flex items-center justify-end gap-2 mt-2 pt-2 border-t border-neutral-100">
                    <button
                      onClick={() => startEditCategory(cat)}
                      className="w-7 h-7 flex items-center justify-center rounded-lg bg-orange-50 text-brand-primary hover:bg-orange-100 transition-all cursor-pointer"
                    >
                      <Edit size={12} />
                    </button>
                    <button
                      onClick={() =>
                        handleDeleteCategory((cat.id || cat._id) as string)
                      }
                      className="w-7 h-7 flex items-center justify-center rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition-all cursor-pointer"
                    >
                      <Trash size={12} />
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
