"use client";

import React, { useState, useEffect } from "react";
import { X, QrCode, Download, Building2, Copy, Check, ShieldCheck, ShieldAlert, Loader2 } from "lucide-react";
import toast from "react-hot-toast";

interface StoreQrModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function StoreQrModal({ isOpen, onClose }: StoreQrModalProps) {
  const [branchInfo, setBranchInfo] = useState<{
    _id: string;
    name: string;
    code: string;
    qrCodePayload: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);
  const [isSigned, setIsSigned] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen && typeof window !== "undefined") {
      const rawBranch = localStorage.getItem("rms_branch");
      if (rawBranch) {
        try {
          const b = JSON.parse(rawBranch);
          const branchId = b._id || b.id;
          const branchName = b.name || "Restaurant Store";
          const branchCode = b.code || "BRANCH";
          const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

          // Show branch info with empty QR while fetching signed token
          setBranchInfo({ _id: branchId, name: branchName, code: branchCode, qrCodePayload: "" });
          setIsSigned(false);
          setIsLoading(true);

          // Fetch signed HMAC QR token from backend
          const getCookie = (name: string) =>
            document.cookie
              .split("; ")
              .find((row) => row.startsWith(`${name}=`))
              ?.split("=")[1] ?? null;
          const token = getCookie("rms_branch_token");

          fetch(`${apiUrl}/delivery/qr-token/${branchId}`, {
            credentials: "include",
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          })
            .then((res) => res.json())
            .then((data) => {
              if (data.success && data.data?.signedToken) {
                setBranchInfo({ _id: branchId, name: branchName, code: branchCode, qrCodePayload: data.data.signedToken });
                setIsSigned(true);
              } else {
                // Fallback: plain JSON with apiUrl (still functional, less secure)
                setBranchInfo({
                  _id: branchId, name: branchName, code: branchCode,
                  qrCodePayload: JSON.stringify({ type: "BRANCH_PAIRING_QR", branchId, branchName, branchCode, apiUrl }),
                });
                setIsSigned(false);
              }
            })
            .catch(() => {
              // Network error fallback
              setBranchInfo({
                _id: branchId, name: branchName, code: branchCode,
                qrCodePayload: JSON.stringify({ type: "BRANCH_PAIRING_QR", branchId, branchName, branchCode, apiUrl }),
              });
              setIsSigned(false);
              toast.error("Could not fetch secure QR. Using basic QR.");
            })
            .finally(() => setIsLoading(false));
        } catch (e) {
          console.error("Failed to parse branch info:", e);
          setIsLoading(false);
        }
      }
    } else {
      setBranchInfo(null);
      setIsSigned(false);
      setIsLoading(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const qrImageUrl =
    branchInfo?.qrCodePayload
      ? `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(branchInfo.qrCodePayload)}`
      : "";

  const handleDownloadQr = async () => {
    if (!qrImageUrl || isLoading) return;
    try {
      const response = await fetch(qrImageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${branchInfo?.name || "Store"}_QR_Code.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast.success("Store QR Code downloaded!");
    } catch (err) {
      toast.error("Failed to download QR code image");
    }
  };

  const handleCopyCode = () => {
    // Copy only allowed for signed (HMAC) tokens — not plain JSON
    if (!branchInfo?.qrCodePayload || !isSigned) return;
    navigator.clipboard.writeText(branchInfo.qrCodePayload);
    setCopied(true);
    toast.success("Signed QR token copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="fixed inset-0" onClick={onClose} />

      <div className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl border border-neutral-100 overflow-hidden z-10 animate-in zoom-in-95 duration-200 select-none">
        {/* Top Header */}
        <div className="bg-neutral-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-500 flex items-center justify-center font-bold">
              <QrCode size={18} />
            </div>
            <div>
              <h3 className="text-sm font-900 tracking-wide text-white">Store QR Code</h3>
              <p className="text-[10.5px] text-neutral-400 font-500">Driver App Pairing QR</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 text-center space-y-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-neutral-100 border border-neutral-200 rounded-full text-xs font-800 text-neutral-700">
            <Building2 size={13} className="text-brand-primary" />
            <span>{branchInfo?.name || "Restaurant Store"}</span>
            <span className="text-[10px] bg-neutral-200 px-1.5 py-0.5 rounded font-mono text-neutral-600">
              {branchInfo?.code}
            </span>
          </div>

          {/* Security Status Badge */}
          {/* {!isLoading && (
            <div
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                isSigned
                  ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                  : "bg-amber-50 border-amber-200 text-amber-700"
              }`}
            >
              {isSigned ? (
                <>
                  <ShieldCheck size={11} />
                  <span>HMAC Signed — Tamper-Proof</span>
                </>
              ) : (
                <>
                  <ShieldAlert size={11} />
                  <span>Basic QR — Backend Unreachable</span>
                </>
              )}
            </div>
          )} */}

          {/* QR Code Container */}
          <div className="p-4 bg-neutral-50 rounded-2xl border border-neutral-200 inline-block shadow-inner">
            {isLoading ? (
              <div className="w-52 h-52 bg-neutral-100 flex flex-col items-center justify-center gap-3 text-neutral-400">
                <Loader2 size={28} className="animate-spin text-brand-primary" />
                <span className="text-[10px] font-semibold">Generating Secure QR...</span>
              </div>
            ) : qrImageUrl ? (
              <img
                src={qrImageUrl}
                alt="Store Pairing QR Code"
                className="w-52 h-52 object-contain mx-auto rounded-xl shadow-xs"
              />
            ) : (
              <div className="w-52 h-52 bg-neutral-100 flex items-center justify-center text-neutral-400 text-xs">
                QR Generation Failed
              </div>
            )}
          </div>

          <p className="text-[11px] text-neutral-500 font-500 leading-relaxed max-w-xs mx-auto">
            Drivers can scan this QR code from their <strong>Driver Web App</strong> to pair this store.
          </p>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 pt-2">
            <button
              onClick={handleDownloadQr}
              disabled={isLoading || !qrImageUrl}
              className="flex-1 py-3 rounded-xl bg-brand-primary text-white text-xs font-800 hover:bg-brand-primary/90 transition-all cursor-pointer flex items-center justify-center gap-2 shadow-md active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download size={15} />
              <span>Download QR Image</span>
            </button>
            {/* Copy only shown for signed HMAC tokens — plain JSON copy disabled */}
            {isSigned && (
              <button
                onClick={handleCopyCode}
                className="p-3 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-700 transition-all cursor-pointer border border-neutral-200"
                title="Copy Signed QR Token"
              >
                {copied ? <Check size={16} className="text-emerald-600" /> : <Copy size={16} />}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
