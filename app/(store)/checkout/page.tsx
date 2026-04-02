"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Lock, ShieldCheck, Truck, BadgeCheck } from "lucide-react";
import type { User } from "@supabase/supabase-js";
import { useCartStore, useCartItemCount, useCartTotal, getEffectivePrice } from "@/store/cartStore";
import { Button } from "@/components/ui/button";
import { ProductImage } from "@/components/ui/ProductImage";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatPrice } from "@/lib/format-price";

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!
);

const SHIPPING_THRESHOLD = 299;
const SHIPPING_COST = 29;
const ILLINOIS_TAX_RATE = 0.1025;

const shippingSchema = z.object({
  fullName: z.string().min(1, "Name is required"),
  email: z.string().email("Valid email is required"),
  address: z.string().min(1, "Address is required"),
  city: z.string().min(1, "City is required"),
  state: z.string().min(1, "State is required"),
  zipCode: z.string().min(1, "ZIP code is required"),
  country: z.string().min(1, "Country is required"),
});

type ShippingFormData = z.infer<typeof shippingSchema>;
type AppliedDiscount = {
  code: string;
  discountPercent: number;
};

const CARD_ELEMENT_OPTIONS = {
 style: {
 base: {
 color: "#1C1C1C",
 fontFamily: "var(--font-dm-sans), system-ui, sans-serif",
 fontSize: "16px",
 "::placeholder": { color: "#6B6560" },
 },
 invalid: {
 color: "#dc2626",
 },
 },
};

function CheckoutForm() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [shippingData, setShippingData] = useState<ShippingFormData | null>(
    null
  );
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [orderNumber, setOrderNumber] = useState<string>("");
  const [consented, setConsented] = useState(false);
  const [promoExpanded, setPromoExpanded] = useState(false);
  const [promoCodeInput, setPromoCodeInput] = useState("");
  const [promoError, setPromoError] = useState<string | null>(null);
  const [promoLoading, setPromoLoading] = useState(false);
  const [appliedDiscount, setAppliedDiscount] = useState<AppliedDiscount | null>(null);

  const items = useCartStore((state) => state.items);
  const clearCart = useCartStore((state) => state.clearCart);
  const subtotal = useCartTotal();
  const shipping = subtotal >= SHIPPING_THRESHOLD ? 0 : SHIPPING_COST;
  const tax = Math.round(subtotal * ILLINOIS_TAX_RATE * 100) / 100;
  const discountAmount = appliedDiscount
    ? Math.round(subtotal * (appliedDiscount.discountPercent / 100) * 100) / 100
    : 0;
  const total = Math.max(0.5, subtotal - discountAmount + shipping + tax);

  const stripe = useStripe();
  const elements = useElements();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ShippingFormData>({
    resolver: zodResolver(shippingSchema),
    defaultValues: { country: "US" },
  });

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase
        .from("profiles")
        .select("address_line1, city, state, zip, country")
        .eq("user_id", user.id)
        .maybeSingle()
        .then(({ data: profile }) => {
        const name =
          user.user_metadata?.full_name ??
          user.user_metadata?.name ??
          "";
        reset({
          fullName: name,
          email: user.email ?? "",
          address: (profile?.address_line1 as string | null) ?? "",
          city: (profile?.city as string | null) ?? "",
          state: (profile?.state as string | null) ?? "",
          zipCode: (profile?.zip as string | null) ?? "",
          country: (profile?.country as string | null) ?? "US",
        });
      });
    });
  }, [reset]);

  const onShippingSubmit = (data: ShippingFormData) => {
    setShippingData(data);
    setStep(2);
  };

  const onPaymentSubmit = async () => {
    if (!stripe || !elements || !shippingData) return;

    setPaymentError(null);
    setIsProcessing(true);

    try {
      const cardElement = elements.getElement(CardElement);
      if (!cardElement) {
        setPaymentError("Card element not found");
        setIsProcessing(false);
        return;
      }

      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          consent: true,
          customerEmail: shippingData.email,
          discountCode: appliedDiscount?.code,
          items,
          shippingAddress: {
            name: shippingData.fullName,
            email: shippingData.email,
            address: shippingData.address,
            city: shippingData.city,
            state: shippingData.state,
            zip: shippingData.zipCode,
            country: shippingData.country,
          },
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setPaymentError(data.error || "Failed to create payment");
        setIsProcessing(false);
        return;
      }

      const { error, paymentIntent } = await stripe.confirmCardPayment(data.clientSecret, {
        payment_method: { card: cardElement },
      });

      if (error) {
        setPaymentError(error.message || "Payment failed");
        setIsProcessing(false);
        return;
      }

      setOrderNumber(paymentIntent?.id?.slice(-10).toUpperCase() ?? "");
      if (data.orderId) {
        clearCart();
        router.push(`/order-confirmation/${data.orderId}`);
        return;
      }
      setStep(3);
    } catch (err) {
      setPaymentError("An unexpected error occurred");
      setIsProcessing(false);
    }
  };

  const applyPromoCode = async () => {
    if (!shippingData?.email) {
      setPromoError("Please complete shipping information first.");
      return;
    }

    const normalizedCode = promoCodeInput.trim().toUpperCase();
    if (!normalizedCode) {
      setPromoError("Please enter a promo code.");
      return;
    }

    setPromoLoading(true);
    setPromoError(null);
    try {
      const response = await fetch("/api/validate-discount", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: normalizedCode,
          email: shippingData.email,
        }),
      });

      const data = (await response.json()) as {
        error?: string;
        valid?: boolean;
        code?: string;
        discountPercent?: number;
      };

      if (!response.ok || !data.valid || !data.code || !data.discountPercent) {
        setAppliedDiscount(null);
        setPromoError(data.error ?? "Unable to apply promo code.");
        return;
      }

      setAppliedDiscount({
        code: data.code,
        discountPercent: data.discountPercent,
      });
      setPromoCodeInput(data.code);
    } catch {
      setAppliedDiscount(null);
      setPromoError("Unable to apply promo code.");
    } finally {
      setPromoLoading(false);
    }
  };

  const onContinueShopping = () => {
    clearCart();
    router.push("/collections/all");
  };

  if (items.length === 0 && step < 3) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-6 px-4 py-16">
        <p className="text-charcoal">Your cart is empty.</p>
        <Button asChild className="bg-walnut text-cream hover:bg-walnut/90">
          <Link href="/collections/all">Shop All</Link>
        </Button>
      </div>
    );
  }

  const steps = ["Cart", "Details", "Payment", "Confirmation"];
  const currentStepIndex = step === 1 ? 1 : step === 2 ? 2 : 3;

  return (
    <div className="px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        {/* Progress indicator */}
        <div className="mb-10 rounded-xl border border-light-sand bg-white p-4 sm:p-5">
          <div className="flex items-center justify-between">
            {steps.map((label, i) => (
              <div key={label} className="flex flex-1 items-center">
              <div
                className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-medium ${
                  currentStepIndex >= i
                    ? "bg-walnut text-cream"
                    : "bg-light-sand text-warm-gray"
                }`}
              >
                {currentStepIndex > i ? <Check className="h-4 w-4" /> : i + 1}
              </div>
              <span
                className={`ml-2 hidden text-sm sm:inline ${
                  currentStepIndex >= i ? "text-charcoal" : "text-warm-gray"
                }`}
              >
                {label}
              </span>
              {i < steps.length - 1 ? (
                <div
                  className={`mx-4 flex-1 border-t-2 ${
                    currentStepIndex > i ? "border-walnut" : "border-light-sand"
                  }`}
                />
              ) : null}
            </div>
            ))}
          </div>
        </div>

        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]"
            >
              <div className="rounded-lg border border-light-sand bg-cream p-6">
                <h2 className="mb-6 text-2xl font-semibold text-charcoal">
                  Shipping Information
                </h2>
                <form
                  onSubmit={handleSubmit(onShippingSubmit)}
                  className="space-y-4"
                >
                <div>
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input
                    id="fullName"
                    {...register("fullName")}
                    className="mt-1"
                  />
                  {errors.fullName && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.fullName.message}
                    </p>
                  )}
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    {...register("email")}
                    className="mt-1"
                  />
                  {errors.email && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.email.message}
                    </p>
                  )}
                </div>
                <div>
                  <Label htmlFor="address">Address</Label>
                  <Input
                    id="address"
                    {...register("address")}
                    className="mt-1"
                  />
                  {errors.address && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.address.message}
                    </p>
                  )}
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="city">City</Label>
                    <Input id="city" {...register("city")} className="mt-1" />
                    {errors.city && (
                      <p className="mt-1 text-sm text-red-600">
                        {errors.city.message}
                      </p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="state">State</Label>
                    <Input
                      id="state"
                      {...register("state")}
                      className="mt-1"
                    />
                    {errors.state && (
                      <p className="mt-1 text-sm text-red-600">
                        {errors.state.message}
                      </p>
                    )}
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="zipCode">ZIP Code</Label>
                    <Input
                      id="zipCode"
                      {...register("zipCode")}
                      className="mt-1"
                    />
                    {errors.zipCode && (
                      <p className="mt-1 text-sm text-red-600">
                        {errors.zipCode.message}
                      </p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="country">Country</Label>
                    <Input
                      id="country"
                      {...register("country")}
                      className="mt-1"
                    />
                    {errors.country && (
                      <p className="mt-1 text-sm text-red-600">
                        {errors.country.message}
                      </p>
                    )}
                  </div>
                </div>
                  <Button
                    type="submit"
                    className="w-full bg-walnut text-cream hover:bg-walnut/90"
                  >
                    Continue to Payment
                  </Button>
                </form>
              </div>
              <aside className="h-fit rounded-lg border border-light-sand bg-white p-5 lg:sticky lg:top-6">
                <h3 className="mb-4 text-lg font-semibold text-charcoal">Order Summary</h3>
                <div className="max-h-72 space-y-3 overflow-y-auto pr-1">
                  {items.map((item) => (
                    <div key={item.product.id} className="flex gap-3 text-sm">
                      <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded bg-gray-50 p-0.5">
                        <ProductImage
                          src={item.product.images[0]}
                          alt={item.product.name}
                          manufacturer={item.product.manufacturer}
                          fill
                          className="object-contain"
                          sizes="48px"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-2 font-medium">{item.product.name}</p>
                        <p className="text-warm-gray">
                          {item.quantity} x {formatPrice(getEffectivePrice(item.product))}
                        </p>
                      </div>
                      <p className="font-medium">
                        {formatPrice(getEffectivePrice(item.product) * item.quantity)}
                      </p>
                    </div>
                  ))}
                </div>
                <div className="mt-4 space-y-1 border-t pt-4 text-sm">
                  <div className="flex justify-between">
                    <span className="text-warm-gray">Subtotal</span>
                    <span>{formatPrice(subtotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-warm-gray">Shipping</span>
                    <span>{shipping === 0 ? "FREE" : `$${shipping.toFixed(2)}`}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-warm-gray">Tax</span>
                    <span>${tax.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-semibold">
                    <span>Total</span>
                    <span>${total.toFixed(2)}</span>
                  </div>
                </div>
              </aside>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]"
            >
              <div className="rounded-lg border border-light-sand bg-cream p-6">
                <h2 className="mb-4 text-2xl font-semibold text-charcoal">
                  Payment
                </h2>
                <div className="rounded-md border border-warm-gray/30 bg-white p-4">
                  <CardElement options={CARD_ELEMENT_OPTIONS} />
                </div>
                {paymentError && (
                  <p className="mt-2 text-sm text-red-600">{paymentError}</p>
                )}
                <label className="mt-4 flex cursor-pointer items-start gap-3">
                  <input
                    type="checkbox"
                    checked={consented}
                    onChange={(e) => setConsented(e.target.checked)}
                    className="mt-0.5 h-4 w-4 shrink-0 accent-walnut"
                  />
                  <span className="text-sm text-warm-gray">
                    I have read and agree to the{" "}
                    <a
                      href="/terms"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-walnut underline hover:text-walnut/80"
                    >
                      Terms of Service
                    </a>{" "}
                    and{" "}
                    <a
                      href="/privacy-policy"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-walnut underline hover:text-walnut/80"
                    >
                      Privacy Policy
                    </a>
                  </span>
                </label>
                <div className="mt-4 rounded-lg border border-[#1C1C1C]/10 bg-[#FAF8F5] p-3">
                  <div className="grid gap-2 text-xs text-[#1C1C1C]/75 sm:grid-cols-3">
                    <div className="flex items-center gap-1.5">
                      <ShieldCheck className="h-4 w-4 text-[#2D4A3E]" />
                      <span>SSL Secured</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Truck className="h-4 w-4 text-[#2D4A3E]" />
                      <span>Free Shipping $299+</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <BadgeCheck className="h-4 w-4 text-[#2D4A3E]" />
                      <span>All Sales Final</span>
                    </div>
                  </div>
                </div>
                <div className="mt-4 flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setStep(1)}
                  >
                    Back
                  </Button>
                  <Button
                    onClick={onPaymentSubmit}
                    disabled={!stripe || isProcessing || !consented}
                    className="flex-1 bg-walnut text-cream hover:bg-walnut/90 disabled:opacity-50"
                  >
                    {isProcessing ? "Processing..." : `Pay $${total.toFixed(2)}`}
                  </Button>
                </div>
              </div>
              <aside className="h-fit rounded-lg border border-light-sand bg-white p-5 lg:sticky lg:top-6">
                <h3 className="mb-4 text-lg font-semibold text-charcoal">Order Summary</h3>
                <div className="max-h-48 space-y-2 overflow-y-auto">
                  {items.map((item) => (
                    <div
                      key={item.product.id}
                      className="flex gap-3 text-sm"
                    >
                      <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded bg-gray-50 p-0.5">
                        <ProductImage
                          src={item.product.images[0]}
                          alt={item.product.name}
                          manufacturer={item.product.manufacturer}
                          fill
                          className="object-contain"
                          sizes="48px"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium">{item.product.name}</p>
                        <p className="text-warm-gray">
                          {item.quantity} × {formatPrice(getEffectivePrice(item.product))}
                        </p>
                      </div>
                      <p className="font-medium">
                        {formatPrice(getEffectivePrice(item.product) * item.quantity)}
                      </p>
                    </div>
                  ))}
                </div>
                <div className="mt-4 space-y-1 border-t pt-4 text-sm">
                  <button
                    type="button"
                    onClick={() => setPromoExpanded((prev) => !prev)}
                    className="text-left text-[#2D4A3E] underline underline-offset-2 hover:text-[#1E3329]"
                  >
                    Have a promo code?
                  </button>
                  {promoExpanded ? (
                    <div className="mt-2 rounded-md border border-[#1C1C1C]/15 bg-white p-3">
                      <div className="flex gap-2">
                        <Input
                          value={promoCodeInput}
                          onChange={(e) => {
                            setPromoCodeInput(e.target.value.toUpperCase());
                            setPromoError(null);
                          }}
                          placeholder="Enter code (e.g. WELCOME10)"
                          className="h-10"
                        />
                        <Button
                          type="button"
                          onClick={applyPromoCode}
                          disabled={promoLoading}
                          className="h-10 bg-[#2D4A3E] px-4 text-[#FAF8F5] hover:bg-[#1E3329]"
                        >
                          {promoLoading ? "Applying..." : "Apply"}
                        </Button>
                      </div>
                      {appliedDiscount ? (
                        <p className="mt-2 text-sm text-green-700">
                          ✓ {appliedDiscount.code} applied — {appliedDiscount.discountPercent}% off!{" "}
                          <button
                            type="button"
                            onClick={() => {
                              setAppliedDiscount(null);
                              setPromoError(null);
                              setPromoCodeInput("");
                            }}
                            className="ml-1 text-xs underline"
                          >
                            Remove
                          </button>
                        </p>
                      ) : null}
                      {!appliedDiscount && promoError ? (
                        <p className="mt-2 text-sm text-red-600">{promoError}</p>
                      ) : null}
                    </div>
                  ) : null}
                  <div className="flex justify-between">
                    <span className="text-warm-gray">Subtotal</span>
                    <span>{formatPrice(subtotal)}</span>
                  </div>
                  {appliedDiscount ? (
                    <div className="flex justify-between">
                      <span className="text-green-700">
                        Discount ({appliedDiscount.code})
                      </span>
                      <span className="text-green-700">
                        -${discountAmount.toFixed(2)}
                      </span>
                    </div>
                  ) : null}
                  <div className="flex justify-between">
                    <span className="text-warm-gray">Shipping</span>
                    <span>
                      {shipping === 0 ? "FREE" : `$${shipping.toFixed(2)}`}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-warm-gray">
                      Illinois Sales Tax (10.25%)
                    </span>
                    <span>${tax.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-semibold">
                    <span>Total</span>
                    <span>${total.toFixed(2)}</span>
                  </div>
                  <p className="mt-2 text-xs text-warm-gray">
                    Tax is calculated based on Illinois state and local rates
                    (6.25% state + 1.75% county + 1.25% city + 1% RTA).
                  </p>
                </div>
              </aside>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="rounded-lg border border-light-sand bg-cream p-8 text-center"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 15 }}
                className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-green-100"
              >
                <Check className="h-10 w-10 text-green-600" />
              </motion.div>
              <h2 className="mb-2 text-3xl font-semibold text-charcoal">
                Order Confirmed!
              </h2>
              <p className="mb-2 text-warm-gray">
                Thank you {shippingData?.fullName}, your order is on its way.
              </p>
              <p className="mb-8 text-xs uppercase tracking-[0.18em] text-[#2D4A3E]">
                Order #{orderNumber || "Pending"}
              </p>
              <div className="mb-8 rounded-lg border border-light-sand bg-white p-4 text-left">
                <h3 className="mb-3 font-medium">What happens next?</h3>
                <div className="grid gap-3 sm:grid-cols-4">
                  {["Order Confirmed", "Processing", "Shipped", "Delivered"].map((label, idx) => (
                    <div key={label} className="flex items-center gap-2">
                      <div
                        className={`flex h-6 w-6 items-center justify-center rounded-full text-xs ${
                          idx === 0 ? "bg-green-100 text-green-700" : "bg-[#FAF8F5] text-[#6B6560]"
                        }`}
                      >
                        {idx === 0 ? <Check className="h-3.5 w-3.5" /> : idx + 1}
                      </div>
                      <span className="text-xs text-[#1C1C1C]/75">{label}</span>
                    </div>
                  ))}
                </div>
                <p className="mt-3 text-xs text-[#6B6560]">
                  Estimated delivery window: 5-10 business days after shipment.
                </p>
              </div>
              <div className="mb-8 rounded-lg border border-light-sand p-4 text-left">
                <h3 className="mb-4 font-medium">Order Summary</h3>
                {items.map((item) => (
                  <div
                    key={item.product.id}
                    className="flex justify-between text-sm"
                  >
                    <span>
                      {item.product.name} × {item.quantity}
                    </span>
                    <span>
                      {formatPrice(getEffectivePrice(item.product) * item.quantity)}
                    </span>
                  </div>
                ))}
                <div className="mt-2 space-y-1 border-t pt-2 text-sm">
                  {appliedDiscount ? (
                    <div className="flex justify-between text-green-700">
                      <span>Discount ({appliedDiscount.code})</span>
                      <span>-{formatPrice(discountAmount)}</span>
                    </div>
                  ) : null}
                  <div className="flex justify-between text-warm-gray">
                    <span>Tax (10.25%)</span>
                    <span>${tax.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-semibold">
                    <span>Total</span>
                    <span>${total.toFixed(2)}</span>
                  </div>
                </div>
              </div>
              <Button
                onClick={onContinueShopping}
                className="w-full bg-walnut text-cream hover:bg-walnut/90"
              >
                Continue Shopping
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  const itemCount = useCartItemCount();
  const [user, setUser] = useState<User | null | "loading">("loading");

  useEffect(() => {
    createClient().auth.getUser().then(({ data: { user } }) => setUser(user ?? null));
  }, []);

  if (user === "loading") {
    return (
      <div className="min-h-screen bg-[#FAF8F5] flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-walnut border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#FAF8F5]">
      <div className="mx-auto mt-20 max-w-md px-4">
        <div className="flex flex-col items-center text-center">
          <Lock className="mb-4 h-12 w-12 text-[#2D4A3E]" />
          <h1 className="mb-2 text-[28px] font-semibold text-charcoal">
            Sign In to Complete Your Order
          </h1>
          <p className="mb-8 text-warm-gray">
            Create a free account to checkout and track your orders. Your cart will be saved.
          </p>
          <div className="flex w-full flex-col gap-3">
            <Button asChild className="w-full bg-[#2D4A3E] text-[#FAF8F5] hover:bg-[#6d5210]">
              <Link href="/auth/login?redirect=/checkout">Sign In</Link>
            </Button>
            <Button asChild variant="outline" className="w-full border-[#1C1C1C]">
              <Link href="/auth/signup?redirect=/checkout">Create Account</Link>
            </Button>
          </div>
          <Link
            href="/"
            className="mt-6 text-sm text-warm-gray hover:text-charcoal hover:underline"
          >
            ← Continue Shopping
          </Link>
        </div>
      </div>
      </div>
    );
  }

  if (itemCount === 0) {
    return (
      <div className="min-h-screen bg-[#FAF8F5] flex flex-col items-center justify-center gap-6 px-4 py-16">
        <p className="text-charcoal">Your cart is empty.</p>
        <Button asChild className="bg-walnut text-cream hover:bg-walnut/90">
          <Link href="/collections/all">Shop All</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF8F5]">
    <Elements
      stripe={stripePromise}
      options={{
        appearance: {
          theme: "stripe",
          variables: {
            colorPrimary: "#2D4A3E",
            colorBackground: "#FAF8F5",
            colorText: "#1C1C1C",
            colorDanger: "#dc2626",
          },
        },
      }}
    >
      <CheckoutForm />
    </Elements>
    </div>
  );
}
