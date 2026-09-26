"use client";

import { useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { InsightCard, type InsightCardProps } from "@/components/insights/insight-card";
import { paiseToRupees } from "@/lib/money";

export function WhatIfDialog({
  open,
  onClose,
  productId,
  productName,
  currentPricePaise,
}: {
  open: boolean;
  onClose: () => void;
  productId: string;
  productName: string;
  currentPricePaise: number;
}) {
  const [priceRupees, setPriceRupees] = useState(() => String(paiseToRupees(currentPricePaise)));
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<InsightCardProps | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSimulate() {
    setLoading(true);
    setError(null);
    setResult(null);
    const res = await fetch("/api/insights/what-if", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId, newPriceRupees: Number(priceRupees) }),
    });
    setLoading(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Could not run the simulation.");
      return;
    }
    const body = await res.json();
    setResult(body.insight);
  }

  return (
    <Dialog
      open={open}
      onClose={() => {
        setResult(null);
        setError(null);
        onClose();
      }}
      title={`What if? — ${productName}`}
      description="See the estimated monthly impact of a price change, assuming the same sales volume."
    >
      <div className="space-y-4">
        <div>
          <Label htmlFor="whatif-price">New selling price (₹)</Label>
          <Input
            id="whatif-price"
            type="number"
            min="0"
            step="0.01"
            value={priceRupees}
            onChange={(e) => setPriceRupees(e.target.value)}
          />
        </div>
        {error && <p className="text-xs text-danger">{error}</p>}
        <div className="flex justify-end">
          <Button onClick={handleSimulate} disabled={loading}>
            {loading ? "Simulating…" : "Simulate"}
          </Button>
        </div>
        {result && <InsightCard {...result} />}
      </div>
    </Dialog>
  );
}
